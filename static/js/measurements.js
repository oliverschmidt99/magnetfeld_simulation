// static/js/measurements.js

document.addEventListener("DOMContentLoaded", () => {
  // Globale Variablen
  const library = JSON.parse(
    document.getElementById("library-data").textContent
  );
  const transformers = library.components.transformers || [];
  let charts = { L1: null, L2: null, L3: null };
  let measurementData = { L1: {}, L2: {}, L3: {} }; // Daten für jeden Trafo in jedem Kontext

  // Globale DOM-Elemente
  const stromGruppeSelector = document.getElementById("strom-gruppe-selector");
  const transformerSelector = document.getElementById("transformer-selector");
  const accuracyClassSelector = document.getElementById(
    "accuracy-class-selector"
  );
  const saveAllButton = document.getElementById("save-all-btn");

  const accuracyClasses = {
    0.1: {
      color: "rgba(255, 99, 132, 0.5)",
      data: [
        { x: 5, y: 0.4 },
        { x: 20, y: 0.2 },
        { x: 100, y: 0.1 },
        { x: 120, y: 0.1 },
      ],
    },
    0.2: {
      color: "rgba(54, 162, 235, 0.5)",
      data: [
        { x: 5, y: 0.75 },
        { x: 20, y: 0.35 },
        { x: 100, y: 0.2 },
        { x: 120, y: 0.2 },
      ],
    },
    0.5: {
      color: "rgba(255, 206, 86, 0.5)",
      data: [
        { x: 5, y: 1.5 },
        { x: 20, y: 0.75 },
        { x: 100, y: 0.5 },
        { x: 120, y: 0.5 },
      ],
    },
    "1.0": {
      color: "rgba(75, 192, 192, 0.5)",
      data: [
        { x: 5, y: 3.0 },
        { x: 20, y: 1.5 },
        { x: 100, y: 1.0 },
        { x: 120, y: 1.0 },
      ],
    },
  };

  // --- Debounce-Funktion für das Auto-Speichern ---
  function debounce(func, delay) {
    let timeout;
    return function (...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), delay);
    };
  }
  const debouncedSaveToLocalStorage = debounce(saveStateToLocalStorage, 1000);

  // --- Initialisierung ---
  async function initialize() {
    stromGruppeSelector.addEventListener("change", handleGroupSelect);
    transformerSelector.addEventListener("change", handleTransformerSelect);
    accuracyClassSelector.addEventListener("change", () =>
      ["L1", "L2", "L3"].forEach(updateChart)
    );
    saveAllButton.addEventListener("click", saveAllMeasurements);

    ["L1", "L2", "L3"].forEach((phase) => {
      document
        .getElementById(`burden-resistance-${phase}`)
        .addEventListener("input", (e) => {
          const componentId = transformerSelector.value;
          if (componentId) {
            measurementData[phase][componentId].burden = parseFloat(
              e.target.value
            );
            debouncedSaveToLocalStorage();
          }
        });
      createErrorChart(phase);
    });

    await loadAllInitialData();
    loadStateFromLocalStorage(); // Lade unsaved changes
  }

  // --- State Management (LocalStorage) ---
  function saveStateToLocalStorage() {
    const state = {
      selectedGroup: stromGruppeSelector.value,
      selectedTransformer: transformerSelector.value,
      data: measurementData,
    };
    localStorage.setItem("measurementAutoSave", JSON.stringify(state));
    console.log("Zwischenstand im Browser gespeichert.");
  }

  function loadStateFromLocalStorage() {
    const savedState = JSON.parse(localStorage.getItem("measurementAutoSave"));
    if (!savedState) return;

    measurementData = savedState.data;

    if (savedState.selectedGroup) {
      stromGruppeSelector.value = savedState.selectedGroup;
      handleGroupSelect(); // Filtert die Wandlerliste
      if (savedState.selectedTransformer) {
        transformerSelector.value = savedState.selectedTransformer;
        handleTransformerSelect(); // Zeigt die Daten an
      }
    }
    console.log("Zwischenstand aus Browser geladen.");
  }

  async function loadAllInitialData() {
    for (const phase of ["L1", "L2", "L3"]) {
      for (const transformer of transformers) {
        const componentName = transformer.templateProductInformation.name;
        const savedData = await fetchMeasurements(componentName, phase);

        measurementData[phase][componentName] = {
          details: transformer,
          points: getMeasurementPoints(),
          burden: savedData.length > 0 ? savedData[0].burden_resistance : 1.0,
        };

        const pointsMap = new Map(
          savedData.map((p) => [`${p.percent_nominal}`, p])
        );
        measurementData[phase][componentName].points.forEach((p) => {
          const saved = pointsMap.get(`${p.percent_nominal}`);
          if (saved) {
            p.measured_primary = saved.measured_primary;
            p.measured_secondary = saved.measured_secondary;
          }
        });
      }
    }
  }

  function getGroupForCurrent(current) {
    if (current <= 800) return "A";
    if (current <= 2500) return "B";
    return "C";
  }

  function handleGroupSelect() {
    const selectedGroup = stromGruppeSelector.value;
    transformerSelector.innerHTML =
      '<option value="">-- Wandler wählen --</option>';
    ["L1", "L2", "L3"].forEach((phase) => {
      document
        .getElementById(`measurement-table-${phase}`)
        .querySelector("tbody").innerHTML = "";
      updateChart(phase);
    });

    if (!selectedGroup) {
      transformerSelector.disabled = true;
      return;
    }

    const filteredTransformers = transformers.filter((t) => {
      const current =
        t.specificProductInformation.electrical.primaryRatedCurrentA;
      return getGroupForCurrent(current) === selectedGroup;
    });

    filteredTransformers.forEach((t) => {
      const name = t.templateProductInformation.name;
      const option = new Option(name, name);
      transformerSelector.add(option);
    });

    transformerSelector.disabled = false;
  }

  function handleTransformerSelect() {
    const componentId = transformerSelector.value;
    ["L1", "L2", "L3"].forEach((phase) => {
      const tableBody = document
        .getElementById(`measurement-table-${phase}`)
        .querySelector("tbody");
      if (!componentId) {
        tableBody.innerHTML = "";
      } else {
        const data = measurementData[phase][componentId];
        document.getElementById(`burden-resistance-${phase}`).value =
          data.burden;
        generateMeasurementTable(phase, data);
      }
      updateChart(phase);
    });
    debouncedSaveToLocalStorage();
  }

  function generateMeasurementTable(phase, data) {
    const tableBody = document
      .getElementById(`measurement-table-${phase}`)
      .querySelector("tbody");
    tableBody.innerHTML = "";

    const transformer = data.details;
    const ratioStr =
      transformer.specificProductInformation.electrical.ratio || "0/0";
    const [primNenn, sekNenn] = ratioStr.split("/").map(Number);
    const ratio = primNenn && sekNenn ? primNenn / sekNenn : 0;
    const nennstrom =
      transformer.specificProductInformation.electrical.primaryRatedCurrentA;

    data.points.forEach((p) => {
      const row = tableBody.insertRow();
      row.dataset.percent = p.percent_nominal;

      const sollPrim = nennstrom * (p.percent_nominal / 100);
      const sollSek = ratio ? (sollPrim / ratio) * 1000 : 0; // in mA
      const error = calculateAmplitudeError(
        p.measured_primary,
        p.measured_secondary,
        ratio
      );

      row.innerHTML = `
                <td>${p.percent_nominal}%</td>
                <td><input type="number" step="0.1" class="measured-prim" value="${
                  p.measured_primary || ""
                }" placeholder="${sollPrim.toFixed(1)}"></td>
                <td><input type="number" step="0.01" class="measured-sek" value="${
                  p.measured_secondary || ""
                }" placeholder="${sollSek.toFixed(2)}"></td>
                <td class="error-cell">${error.toFixed(4)}</td>
            `;
    });

    tableBody.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", (e) => {
        const row = e.target.closest("tr");
        const percent = parseInt(row.dataset.percent);
        const point = data.points.find((p) => p.percent_nominal === percent);

        point.measured_primary =
          parseFloat(row.querySelector(".measured-prim").value) || null;
        point.measured_secondary =
          parseFloat(row.querySelector(".measured-sek").value) || null;

        const newError = calculateAmplitudeError(
          point.measured_primary,
          point.measured_secondary,
          ratio
        );
        row.querySelector(".error-cell").textContent = newError.toFixed(4);
        updateChart(phase);
        debouncedSaveToLocalStorage();
      });
    });
  }

  function getMeasurementPoints() {
    return [5, 20, 100, 120].map((percent) => ({
      percent_nominal: percent,
      measured_primary: null,
      measured_secondary: null,
    }));
  }

  function calculateAmplitudeError(iPrim, iSek_mA, ratio) {
    if (iPrim === null || iSek_mA === null || !iPrim || !iSek_mA || !ratio)
      return 0;
    const iSek_A = iSek_mA / 1000;
    return ((ratio * iSek_A - iPrim) / iPrim) * 100;
  }

  function updateChart(phase) {
    const componentId = transformerSelector.value;
    const dataSet = componentId ? measurementData[phase][componentId] : null;
    createErrorChart(phase, dataSet);
  }

  function createErrorChart(phase, dataSet = null) {
    const chartCtx = document
      .getElementById(`error-chart-${phase}`)
      .getContext("2d");
    const datasets = [];
    const selectedClass = accuracyClassSelector.value;

    for (const [name, props] of Object.entries(accuracyClasses)) {
      if (selectedClass === "all" || selectedClass === name) {
        datasets.push({
          label: `Klasse ${name} (+)`,
          data: props.data,
          borderColor: props.color,
          borderWidth: 2,
          fill: false,
          borderDash: [5, 5],
          pointRadius: 0,
        });
        datasets.push({
          label: `Klasse ${name} (-)`,
          data: props.data.map((p) => ({ x: p.x, y: -p.y })),
          borderColor: props.color,
          borderWidth: 2,
          fill: false,
          borderDash: [5, 5],
          pointRadius: 0,
        });
      }
    }

    if (dataSet && dataSet.details) {
      const ratioStr =
        dataSet.details.specificProductInformation.electrical.ratio || "0/0";
      const [primNenn, sekNenn] = ratioStr.split("/").map(Number);
      const ratio = primNenn && sekNenn ? primNenn / sekNenn : 0;

      const points = dataSet.points
        .filter((p) => p.measured_primary && p.measured_secondary)
        .map((p) => ({
          x: p.percent_nominal,
          y: calculateAmplitudeError(
            p.measured_primary,
            p.measured_secondary,
            ratio
          ),
        }));

      datasets.push({
        label: dataSet.details.templateProductInformation.name,
        data: points,
        backgroundColor: "#0d6efd",
        borderColor: "#0d6efd",
        fill: false,
        pointRadius: 5,
        type: "scatter",
      });
    }

    if (charts[phase]) {
      charts[phase].data.datasets = datasets;
      charts[phase].update();
    } else {
      charts[phase] = new Chart(chartCtx, {
        type: "line",
        data: { datasets: datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: "linear",
              position: "bottom",
              title: { display: true, text: "% Nennstrom" },
            },
            y: { title: { display: true, text: "Amplitudenfehler (%)" } },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) =>
                  `${context.dataset.label}: (${
                    context.parsed.x
                  }%, ${context.parsed.y.toFixed(3)}%)`,
              },
            },
          },
        },
      });
    }
  }

  async function fetchMeasurements(componentName, phase) {
    try {
      const transformer = transformers.find(
        (t) => t.templateProductInformation.name === componentName
      );
      if (!transformer) return [];

      const component_db_id = transformers.indexOf(transformer) + 1; // Workaround

      const response = await fetch(
        `/api/measurements/${component_db_id}/${phase}`
      );
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error(
        `Fehler beim Laden der Messdaten für ${componentName}/${phase}:`,
        error
      );
      return [];
    }
  }

  async function saveAllMeasurements() {
    const componentId = transformerSelector.value;
    if (!componentId) {
      alert("Bitte zuerst einen Wandler auswählen.");
      return;
    }

    let successCount = 0;
    for (const phase of ["L1", "L2", "L3"]) {
      const transformer = transformers.find(
        (t) => t.templateProductInformation.name === componentId
      );
      const component_db_id = transformers.indexOf(transformer) + 1;
      const dataToSave = measurementData[phase][componentId];

      const payload = {
        component_id: component_db_id,
        phase: phase,
        measurements: dataToSave.points.map((p) => ({
          ...p,
          burden_resistance: dataToSave.burden,
        })),
      };

      try {
        const response = await fetch("/api/measurements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          successCount++;
          const now = new Date();
          document.getElementById(
            `last-saved-${phase}`
          ).textContent = `Gespeichert: ${now.toLocaleTimeString()}`;
        } else {
          const result = await response.json();
          alert(`Fehler beim Speichern für ${phase}: ${result.message}`);
        }
      } catch (error) {
        alert(`Netzwerkfehler beim Speichern für ${phase}: ` + error);
      }
    }
    if (successCount === 3) {
      alert("Alle Messungen für L1, L2 und L3 erfolgreich gespeichert!");
      localStorage.removeItem("measurementAutoSave"); // Lokalen Speicher nach Erfolg löschen
    }
  }

  initialize();
});
