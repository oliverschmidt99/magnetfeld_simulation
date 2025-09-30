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

  const E_SERIES = {
    E3: [1.0, 2.2, 4.7],
    E6: [1.0, 1.5, 2.2, 3.3, 4.7, 6.8],
    E12: [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2],
    E24: [
      1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9,
      4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1,
    ],
  };

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

    // Globale Listener für Bürden-Komponenten
    document
      .querySelectorAll(
        ".global-burden-section .burden-calc-input, .global-burden-section input[type='radio']"
      )
      .forEach((el) => {
        el.addEventListener("input", () => {
          ["L1", "L2", "L3"].forEach((phase) =>
            calculateAndDisplayBurden(phase)
          );
        });
      });

    ["L1", "L2", "L3"].forEach((phase) => {
      document
        .querySelectorAll(`#context-${phase} .resistance-calc-input`)
        .forEach((el) =>
          el.addEventListener("input", () =>
            calculateAndDisplayResistance(phase)
          )
        );
      document
        .getElementById(`e-series-selector-${phase}`)
        .addEventListener("input", () => calculateAndDisplayBurden(phase));

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
    // 1. Inputs auslesen (jetzt global)
    const length = parseFloat(
      document.getElementById(`cable-length-global`).value
    );
    const area = parseFloat(
      document.getElementById(`cable-cross-section-global`).value
    );
    const meter_r = parseFloat(
      document.getElementById(`meter-resistance-global`).value
    );
    const temp = document.querySelector(
      `input[name="temp-selector-global"]:checked`
    ).value;
    const rho = temp === "80" ? RHO_80 : RHO_20;

    // 2. Wandler-Daten holen
    const componentId = transformerSelector.value;
    if (!componentId) return;
    const transformer = transformers.find(
      (t) => t.templateProductInformation.name === componentId
    );
    const ratedBurdenVA =
      transformer?.specificProductInformation?.electrical?.ratedBurdenVA || 0;
    const ratioStr =
      transformer?.specificProductInformation?.electrical?.ratio || "0/0";
    const [, sekNenn] = ratioStr.split("/").map(Number);

    // 3. Berechnungen durchführen
    let s_cable = 0,
      s_meter = 0,
      s_ist = 0;
    if (!isNaN(length) && !isNaN(area) && area > 0 && sekNenn > 0) {
      const r_cable = (rho * length) / area;
      s_cable = r_cable * sekNenn ** 2;
    }
    if (!isNaN(meter_r) && sekNenn > 0) {
      s_meter = meter_r * sekNenn ** 2;
    }
    s_ist = s_cable + s_meter;

    // 4. UI-Elemente aktualisieren
    document.getElementById(
      `snenn-result-${phase}`
    ).textContent = `${ratedBurdenVA.toFixed(4)} VA`;
    document.getElementById(
      `scable-result-${phase}`
    ).textContent = `${s_cable.toFixed(4)} VA`;
    document.getElementById(
      `smeter-result-${phase}`
    ).textContent = `${s_meter.toFixed(4)} VA`;
    document.getElementById(
      `sist-result-${phase}`
    ).textContent = `${s_ist.toFixed(4)} VA`;

    // 5. Status aktualisieren
    const burden_status_div = document.getElementById(`burden-status-${phase}`);
    if (ratedBurdenVA > 0) {
      if (s_ist > ratedBurdenVA) {
        burden_status_div.innerHTML = `<span class="status-error">Überbürdung</span> (Ist > Nenn)`;
      } else if (s_ist < ratedBurdenVA * 0.25) {
        burden_status_div.innerHTML = `<span class="status-warning">Starke Unterbürdung</span> (Ist < 25% Nenn)`;
      } else {
        burden_status_div.innerHTML = `<span class="status-ok">Bürde im zulässigen Bereich</span>`;
      }
    } else {
      burden_status_div.innerHTML = `<span>Keine Nennbürde definiert</span>`;
    }

    // 6. Vorwiderstand-Empfehlung berechnen
    calculateAndDisplayRequiredResistor(phase, s_ist, ratedBurdenVA, sekNenn);
  }

  function calculateAndDisplayRequiredResistor(
    phase,
    s_ist,
    ratedBurdenVA,
    sekNenn
  ) {
    const recommendationDiv = document.getElementById(
      `resistor-recommendation-output-${phase}`
    );
    const newBurdenStatusDiv = document.getElementById(
      `new-burden-status-${phase}`
    );
    recommendationDiv.innerHTML = "";
    newBurdenStatusDiv.innerHTML = "";

    if (!ratedBurdenVA || ratedBurdenVA <= 0 || !sekNenn || sekNenn <= 0) {
      recommendationDiv.innerHTML = `<p class="subtle-text">Nennbürde/Übersetzung nicht definiert.</p>`;
      return;
    }

    if (s_ist >= ratedBurdenVA) {
      recommendationDiv.innerHTML = `<p class="status-error">Bürde bereits zu hoch. Kein Vorwiderstand möglich.</p>`;
      return;
    }

    const s_kompensiert = ratedBurdenVA - s_ist;
    if (s_kompensiert <= 0.01) {
      // Kleine Toleranz
      recommendationDiv.innerHTML = `<p class="status-ok">Nennbürde bereits erreicht. Kein Vorwiderstand nötig.</p>`;
      return;
    }

    const r_kompensiert_ideal = s_kompensiert / sekNenn ** 2;
    const r_min = r_kompensiert_ideal * 0.8; // -20% Toleranz
    const r_max = r_kompensiert_ideal * 1.2; // +20% Toleranz

    const selectedSeries = document.getElementById(
      `e-series-selector-${phase}`
    ).value;
    const e_base = E_SERIES[selectedSeries];

    const e_series_full = [];
    [-2, -1, 0, 1, 2].forEach((potenz) => {
      e_base.forEach((val) => {
        e_series_full.push(parseFloat((val * 10 ** potenz).toPrecision(3)));
      });
    });

    let candidates = e_series_full.filter((r) => r >= r_min && r <= r_max);
    let best_fit_under = null;
    let best_fit_overall = null;
    let smallest_diff_under = Infinity;
    let smallest_diff_overall = Infinity;

    for (const r of candidates) {
      // Finde besten Kandidaten (insgesamt)
      const diff_overall = Math.abs(r - r_kompensiert_ideal);
      if (diff_overall < smallest_diff_overall) {
        smallest_diff_overall = diff_overall;
        best_fit_overall = r;
      }
      // Finde besten Kandidaten, der die Nennbürde nicht überschreitet
      if (r * sekNenn ** 2 <= s_kompensiert) {
        const diff_under = r_kompensiert_ideal - r;
        if (diff_under < smallest_diff_under) {
          smallest_diff_under = diff_under;
          best_fit_under = r;
        }
      }
    }

    // Bevorzuge den besten Fit unter der Nennbürde, ansonsten den besten Fit insgesamt
    const recommendedResistor =
      best_fit_under !== null ? best_fit_under : best_fit_overall;

    let message = `
        <p>Idealer Kompensations-R: <strong>${r_kompensiert_ideal.toFixed(
          3
        )} Ω</strong></p>
        <p class="subtle-text">(Toleranzbereich: ${r_min.toFixed(
          3
        )} Ω - ${r_max.toFixed(3)} Ω)</p>
    `;

    if (recommendedResistor) {
      const s_neu = s_ist + recommendedResistor * sekNenn ** 2;
      const prozent_neu = ((s_neu / ratedBurdenVA) * 100).toFixed(1);

      let statusClass = "status-ok";
      if (prozent_neu > 100) {
        statusClass = "status-warning";
      }

      message += `<p class="${statusClass}"><strong>Empfehlung (${selectedSeries}): ${recommendedResistor} Ω</strong></p>`;

      newBurdenStatusDiv.innerHTML = `<span class="${statusClass}">Neue Gesamtbürde: ${s_neu.toFixed(
        3
      )} VA (${prozent_neu}% der Nennbürde)</span>`;
    } else {
      message += `<p class="status-warning">Kein passender Standard-Widerstand (${selectedSeries}) im ±20% Bereich gefunden.</p>`;
    }

    recommendationDiv.innerHTML = message;
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

      // HINWEIS: Speichert den Widerstand von Kabel + Messgerät, nicht die Gesamtbürde inkl. Vorwiderstand
      const meter_r =
        parseFloat(document.getElementById(`meter-resistance-global`).value) ||
        0;
      const length =
        parseFloat(document.getElementById(`cable-length-global`).value) || 0;
      const area =
        parseFloat(
          document.getElementById(`cable-cross-section-global`).value
        ) || 0;
      const temp = document.querySelector(
        `input[name="temp-selector-global"]:checked`
      ).value;
      const rho = temp === "80" ? RHO_80 : RHO_20;
      const r_cable = area > 0 ? (rho * length) / area : 0;
      const totalBurdenResistance = r_cable + meter_r;

      const dataToSave = measurementData[phase][componentId];
      const payload = {
        component_id: component_db_id,
        phase: phase,
        measurements: dataToSave.points.map((p) => ({
          ...p,
          burden_resistance: totalBurdenResistance,
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
