// static/js/measurements.js

document.addEventListener("DOMContentLoaded", () => {
  // Globale Variablen & Konstanten
  const library = JSON.parse(
    document.getElementById("library-data").textContent
  );
  const transformers = library.components.transformers || [];
  let charts = { L1: null, L2: null, L3: null };
  let measurementData = { L1: {}, L2: {}, L3: {} };

  const RHO_20 = 0.0178; // Ohm * mm^2 / m
  const RHO_80 = 0.02195; // Ohm * mm^2 / m

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

  function debounce(func, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }
  const debouncedSaveToLocalStorage = debounce(saveStateToLocalStorage, 1000);

  async function initialize() {
    stromGruppeSelector.addEventListener("change", handleGroupSelect);
    transformerSelector.addEventListener("change", handleTransformerSelect);
    accuracyClassSelector.addEventListener("change", () =>
      ["L1", "L2", "L3"].forEach(updateChart)
    );
    saveAllButton.addEventListener("click", saveAllMeasurements);

    ["L1", "L2", "L3"].forEach((phase) => {
      document
        .querySelectorAll(`#context-${phase} .resistance-calc-input`)
        .forEach((el) =>
          el.addEventListener("input", () =>
            calculateAndDisplayResistance(phase)
          )
        );
      document
        .querySelectorAll(`#context-${phase} .burden-calc-input`)
        .forEach((el) =>
          el.addEventListener("input", () => calculateAndDisplayBurden(phase))
        );
      document
        .querySelectorAll(`input[name="temp-selector-${phase}"]`)
        .forEach((radio) => {
          radio.addEventListener("change", () =>
            calculateAndDisplayBurden(phase)
          );
        });

      createErrorChart(phase);
    });

    await loadAllInitialData();
    loadStateFromLocalStorage();
  }

  function saveStateToLocalStorage() {
    const state = {
      selectedGroup: stromGruppeSelector.value,
      selectedTransformer: transformerSelector.value,
      data: measurementData,
    };
    localStorage.setItem("measurementAutoSave", JSON.stringify(state));
  }

  function loadStateFromLocalStorage() {
    const savedState = JSON.parse(localStorage.getItem("measurementAutoSave"));
    if (!savedState) return;
    measurementData = savedState.data;
    if (savedState.selectedGroup) {
      stromGruppeSelector.value = savedState.selectedGroup;
      handleGroupSelect();
      if (savedState.selectedTransformer) {
        transformerSelector.value = savedState.selectedTransformer;
        handleTransformerSelect();
      }
    }
  }

  function calculateAndDisplayResistance(phase) {
    const u_mess = parseFloat(document.getElementById(`u-mess-${phase}`).value);
    const i_mess = parseFloat(document.getElementById(`i-mess-${phase}`).value);
    const result_span = document.getElementById(`rs-result-${phase}`);
    result_span.textContent =
      i_mess && !isNaN(u_mess) ? `${(u_mess / i_mess).toFixed(4)} Ω` : "-- Ω";
  }

  function calculateAndDisplayBurden(phase) {
    const length = parseFloat(
      document.getElementById(`cable-length-${phase}`).value
    );
    const area = parseFloat(
      document.getElementById(`cable-cross-section-${phase}`).value
    );
    const meter_r = parseFloat(
      document.getElementById(`meter-resistance-${phase}`).value
    );
    const temp = document.querySelector(
      `input[name="temp-selector-${phase}"]:checked`
    ).value;

    const rho = temp === "80" ? RHO_80 : RHO_20;

    const r_cable_span = document.getElementById(`rcable-result-${phase}`);
    const s_burden_span = document.getElementById(`sburden-result-${phase}`);
    const total_burden_input = document.getElementById(
      `burden-resistance-${phase}`
    );
    const burden_status_div = document.getElementById(`burden-status-${phase}`);

    let r_cable = NaN;
    if (!isNaN(length) && !isNaN(area) && area > 0) {
      r_cable = (rho * length) / area;
      r_cable_span.textContent = `${r_cable.toFixed(4)} Ω`;
    } else {
      r_cable_span.textContent = "-- Ω";
    }

    let total_burden_r = NaN;
    if (!isNaN(r_cable) && !isNaN(meter_r)) {
      total_burden_r = r_cable + meter_r;
      total_burden_input.value = total_burden_r.toFixed(4);
    } else {
      total_burden_input.value = "";
    }

    // Berechnung der Scheinleistung (Bürde in VA)
    const componentId = transformerSelector.value;
    if (componentId && !isNaN(total_burden_r)) {
      const transformer = transformers.find(
        (t) => t.templateProductInformation.name === componentId
      );
      const ratioStr =
        transformer.specificProductInformation.electrical.ratio || "0/0";
      const [, sekNenn] = ratioStr.split("/").map(Number);

      if (sekNenn) {
        const s_burden = total_burden_r * sekNenn ** 2;
        s_burden_span.textContent = `${s_burden.toFixed(4)} VA`;

        // Status-Anzeige
        const ratedBurdenVA =
          transformer.specificProductInformation.electrical.ratedBurdenVA || 0;
        if (ratedBurdenVA > 0) {
          if (s_burden > ratedBurdenVA) {
            burden_status_div.innerHTML = `<span class="status-error">Überbürdung</span> (Nenn: ${ratedBurdenVA} VA)`;
          } else if (s_burden < ratedBurdenVA) {
            burden_status_div.innerHTML = `<span class="status-warning">Unterbürdung</span> (Nenn: ${ratedBurdenVA} VA)`;
          } else {
            burden_status_div.innerHTML = `<span class="status-ok">Nennbürde erreicht</span> (${ratedBurdenVA} VA)`;
          }
        } else {
          burden_status_div.innerHTML = `<span>Keine Nennbürde definiert</span>`;
        }
      } else {
        s_burden_span.textContent = "-- VA";
        burden_status_div.innerHTML = `<span>Status: --</span>`;
      }
    } else {
      s_burden_span.textContent = "-- VA";
      burden_status_div.innerHTML = `<span>Status: --</span>`;
    }
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
      transformerSelector.add(new Option(name, name));
    });
    transformerSelector.disabled = false;
  }

  function handleTransformerSelect() {
    const componentId = transformerSelector.value;

    // Setze die Genauigkeitsklasse basierend auf dem gewählten Wandler
    if (componentId) {
      const transformer = transformers.find(
        (t) => t.templateProductInformation.name === componentId
      );
      if (
        transformer &&
        transformer.specificProductInformation.electrical.accuracyClass
      ) {
        const accuracyClass =
          transformer.specificProductInformation.electrical.accuracyClass;
        // Prüfe, ob die Klasse als Option existiert
        const optionExists = Array.from(accuracyClassSelector.options).some(
          (opt) => opt.value === accuracyClass
        );
        if (optionExists) {
          accuracyClassSelector.value = accuracyClass;
        } else {
          accuracyClassSelector.value = "all"; // Fallback, falls Klasse nicht im Dropdown ist
        }
      } else {
        accuracyClassSelector.value = "all"; // Fallback, falls keine Klasse definiert ist
      }
    } else {
      accuracyClassSelector.value = "all"; // Zurücksetzen, wenn kein Wandler gewählt ist
    }

    ["L1", "L2", "L3"].forEach((phase) => {
      const tableBody = document
        .getElementById(`measurement-table-${phase}`)
        .querySelector("tbody");
      if (!componentId) {
        tableBody.innerHTML = "";
      } else {
        const data = measurementData[phase][componentId];
        generateMeasurementTable(phase, data);
        calculateAndDisplayBurden(phase); // Berechne Bürde bei Auswahl
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
      const sollSek = ratio ? (sollPrim / ratio) * 1000 : 0;
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
        <td class="error-cell">${error.toFixed(4)}</td>`;
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

      const totalBurden = parseFloat(
        document.getElementById(`burden-resistance-${phase}`).value
      );

      const dataToSave = measurementData[phase][componentId];
      const payload = {
        component_id: component_db_id,
        phase: phase,
        measurements: dataToSave.points.map((p) => ({
          ...p,
          burden_resistance: totalBurden,
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
      localStorage.removeItem("measurementAutoSave");
    }
  }

  initialize();
});
