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
  const FREQUENCY = 50; // Netzfrequenz in Hz

  const E_SERIES = {
    E3: [1.0, 2.2, 4.7],
    E6: [1.0, 1.5, 2.2, 3.3, 4.7, 6.8],
    E12: [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2],
    E24: [
      1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9,
      4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1,
    ],
  };

  const ACCURACY_CLASSES = {
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

  // Globale DOM-Elemente
  const stromGruppeSelector = document.getElementById("strom-gruppe-selector");
  const transformerSelector = document.getElementById("transformer-selector");
  const accuracyClassSelector = document.getElementById(
    "accuracy-class-selector"
  );
  const saveAllButton = document.getElementById("save-all-btn");

  function debounce(func, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }
  const debouncedSaveToLocalStorage = debounce(saveStateToLocalStorage, 1000);

  async function initialize() {
    // Akkordeon-Logik
    document.querySelectorAll(".accordion-button").forEach((button) => {
      button.addEventListener("click", (e) => {
        if (e.target.tagName === "INPUT") return;

        const group = button.dataset.accordionGroup;
        const buttonsInGroup = document.querySelectorAll(
          `.accordion-button[data-accordion-group="${group}"]`
        );
        const isActive = button.classList.contains("active");

        buttonsInGroup.forEach((btn) => {
          const content = btn.nextElementSibling;
          if (isActive) {
            btn.classList.remove("active");
            content.style.maxHeight = null;
          } else {
            btn.classList.add("active");
            content.style.maxHeight = content.scrollHeight + "px";
          }
        });
      });
    });

    // Globale Steuerungs-Listener
    stromGruppeSelector.addEventListener("change", handleGroupSelect);
    transformerSelector.addEventListener("change", handleTransformerSelect);
    accuracyClassSelector.addEventListener("change", () =>
      ["L1", "L2", "L3"].forEach((phase) => updateChart(phase, true))
    );
    saveAllButton.addEventListener("click", saveAllMeasurements);

    document
      .querySelectorAll(
        '.global-burden-section .burden-calc-input, .global-burden-section input[type="radio"]'
      )
      .forEach((el) => {
        el.addEventListener("input", () =>
          ["L1", "L2", "L3"].forEach(calculateAndDisplayBurden)
        );
      });

    ["L1", "L2", "L3"].forEach((phase) => {
      buildBurdenAnalysisHTML(phase); // Zuerst HTML bauen

      document
        .querySelectorAll(
          `#context-${phase} .measurement-input, #context-${phase} .resistance-calc-input, #context-${phase} .inductance-calc-input, #e-series-selector-${phase}`
        )
        .forEach((input) => {
          input.addEventListener("input", (e) => {
            const targetPhase = e.target
              .closest(".phase-context")
              .id.split("-")
              .pop();

            if (e.target.classList.contains("resistance-calc-input"))
              calculateAndDisplayResistance(targetPhase);
            if (e.target.classList.contains("inductance-calc-input"))
              calculateAndDisplayInductance(targetPhase);

            if (e.target.closest(".measurement-table")) {
              const row = e.target.closest("tr");
              const percent = row.dataset.percent;
              const pos = row.dataset.pos;
              calculateAndDisplayError(targetPhase, percent, pos);
              updateChart(targetPhase);
            }
            if (e.target.classList.contains("e-series-selector"))
              calculateAndDisplayBurden(targetPhase);

            const accordionItem = e.target.closest(".accordion-item");
            if (accordionItem) checkAccordionCompleteness(accordionItem);
            checkOverallCompleteness();
            debouncedSaveToLocalStorage();
          });
        });
      createErrorChart(phase);
    });

    await loadAllInitialData();
    loadStateFromLocalStorage();
    handleGroupSelect();
  }

  function checkAccordionCompleteness(accordionItem) {
    const checkbox = accordionItem.querySelector(
      '.accordion-button input[type="checkbox"]'
    );
    const inputs = accordionItem.querySelectorAll(
      '.measurement-input, input[type="number"]'
    );
    if (checkbox && inputs.length > 0) {
      const allFilled = Array.from(inputs).every(
        (input) => input.value.trim() !== ""
      );
      checkbox.checked = allFilled;
    }
  }

  function checkOverallCompleteness() {
    const allCheckboxes = document.querySelectorAll(
      '.accordion-item input[type="checkbox"]'
    );
    const allChecked = Array.from(allCheckboxes).every((cb) => cb.checked);

    const statusValue = document.querySelector("#overall-status .status-value");
    const statusDate = document.querySelector("#overall-status .status-date");

    if (allChecked) {
      statusValue.textContent = "Ja";
      statusValue.className = "status-value complete";
      statusDate.textContent = new Date().toLocaleDateString("de-DE");
    } else {
      statusValue.textContent = "Nein";
      statusValue.className = "status-value incomplete";
      statusDate.textContent = "--.--.----";
    }
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
    const u = parseFloat(document.getElementById(`u-mess-${phase}`).value);
    const i = parseFloat(document.getElementById(`i-mess-${phase}`).value);
    const resultSpan = document.getElementById(`rs-result-${phase}`);
    resultSpan.textContent =
      i && !isNaN(u) ? `${(u / i).toFixed(4)} Ω` : "-- Ω";
  }

  function calculateAndDisplayInductance(phase) {
    const u = parseFloat(document.getElementById(`u-mess-L-${phase}`).value);
    const i = parseFloat(document.getElementById(`i-mess-L-${phase}`).value);
    const phi = parseFloat(
      document.getElementById(`phi-mess-L-${phase}`).value
    );

    const xsSpan = document.getElementById(`xs-result-${phase}`);
    const lsSpan = document.getElementById(`ls-result-${phase}`);

    if (i && !isNaN(u) && !isNaN(phi)) {
      const z = u / i;
      const xs = z * Math.sin((phi * Math.PI) / 180);
      const ls = (xs / (2 * Math.PI * FREQUENCY)) * 1000; // in mH
      xsSpan.textContent = `${xs.toFixed(4)} Ω`;
      lsSpan.textContent = `${ls.toFixed(3)} mH`;
    } else {
      xsSpan.textContent = "-- Ω";
      lsSpan.textContent = "-- mH";
    }
  }

  function buildBurdenAnalysisHTML(phase) {
    const container = document.getElementById(`burden-content-${phase}`);
    if (container) {
      container.innerHTML = `
                <div class="burden-summary">
                    <div class="summary-item"><span><i>S</i><sub>Nenn</sub> (Nennbürde):</span><span id="snenn-result-${phase}">-- VA</span></div>
                    <div class="summary-item"><span><i>S</i><sub>Kabel</sub> (Leitungsbürde):</span><span id="scable-result-${phase}">-- VA</span></div>
                    <div class="summary-item"><span><i>S</i><sub>Messgerät</sub> (Gerätebürde):</span><span id="smeter-result-${phase}">-- VA</span></div>
                    <hr>
                    <div class="summary-item total"><span><i>S</i><sub>Ist</sub> (Gesamtbürde):</span><span id="sist-result-${phase}">-- VA</span></div>
                </div>
                <div id="burden-status-${phase}" class="burden-status"><span>Status: --</span></div>
                <div class="resistor-recommendation" id="resistor-recommendation-${phase}">
                    <div class="form-group">
                        <label for="e-series-selector-${phase}">E-Reihe für Vorwiderstand</label>
                        <select id="e-series-selector-${phase}" class="e-series-selector">
                            <option value="E3">E3 (40%)</option>
                            <option value="E6">E6 (20%)</option>
                            <option value="E12" selected>E12 (10%)</option>
                            <option value="E24">E24 (5%)</option>
                        </select>
                    </div>
                    <div id="resistor-recommendation-output-${phase}"></div>
                </div>
                <div id="new-burden-status-${phase}" class="burden-status"></div>
            `;
      document
        .getElementById(`e-series-selector-${phase}`)
        .addEventListener("input", () => calculateAndDisplayBurden(phase));
    }
  }

  function calculateAndDisplayBurden(phase) {
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

    const componentId = transformerSelector.value;
    const transformer = transformers.find(
      (t) => t.templateProductInformation.name === componentId
    );

    if (!transformer) {
      document.getElementById(`snenn-result-${phase}`).textContent = "-- VA";
      document.getElementById(`scable-result-${phase}`).textContent = "-- VA";
      document.getElementById(`smeter-result-${phase}`).textContent = "-- VA";
      document.getElementById(`sist-result-${phase}`).textContent = "-- VA";
      document.getElementById(`burden-status-${phase}`).innerHTML =
        "<span>Wandler wählen</span>";
      document.getElementById(
        `resistor-recommendation-output-${phase}`
      ).innerHTML = "";
      document.getElementById(`new-burden-status-${phase}`).innerHTML = "";
      return;
    }

    const ratedBurdenVA =
      transformer.specificProductInformation.electrical.ratedBurdenVA || 0;
    const ratioStr =
      transformer.specificProductInformation.electrical.ratio || "0/0";
    const [, sekNenn] = ratioStr.split("/").map(Number);

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

    const burden_status_div = document.getElementById(`burden-status-${phase}`);
    if (ratedBurdenVA > 0) {
      if (s_ist > ratedBurdenVA) {
        burden_status_div.innerHTML = `<span class="status-error">Überbürdung (Ist > Nenn)</span>`;
      } else if (s_ist < ratedBurdenVA * 0.25) {
        burden_status_div.innerHTML = `<span class="status-warning">Starke Unterbürdung (Ist < 25% Nenn)</span>`;
      } else {
        burden_status_div.innerHTML = `<span class="status-ok">Bürde im zulässigen Bereich</span>`;
      }
    } else {
      burden_status_div.innerHTML = `<span>Keine Nennbürde definiert</span>`;
    }

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
      recommendationDiv.innerHTML = `<p class="status-ok">Nennbürde bereits erreicht. Kein Vorwiderstand nötig.</p>`;
      return;
    }

    const r_kompensiert_ideal = s_kompensiert / sekNenn ** 2;
    const r_min = r_kompensiert_ideal * 0.8;
    const r_max = r_kompensiert_ideal * 1.2;

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
      const diff_overall = Math.abs(r - r_kompensiert_ideal);
      if (diff_overall < smallest_diff_overall) {
        smallest_diff_overall = diff_overall;
        best_fit_overall = r;
      }
      if (r * sekNenn ** 2 <= s_kompensiert) {
        const diff_under = r_kompensiert_ideal - r;
        if (diff_under < smallest_diff_under) {
          smallest_diff_under = diff_under;
          best_fit_under = r;
        }
      }
    }

    const recommendedResistor =
      best_fit_under !== null ? best_fit_under : best_fit_overall;

    let message = `<p>Idealer Kompensations-<i>R</i>: <strong>${r_kompensiert_ideal.toFixed(
      3
    )} Ω</strong></p>
                       <p class="subtle-text">(Toleranzbereich: ${r_min.toFixed(
                         3
                       )} Ω - ${r_max.toFixed(3)} Ω)</p>`;

    if (recommendedResistor) {
      const s_neu = s_ist + recommendedResistor * sekNenn ** 2;
      const prozent_neu = ((s_neu / ratedBurdenVA) * 100).toFixed(1);
      let statusClass = prozent_neu > 100 ? "status-warning" : "status-ok";

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

  function getMeasurementPoints() {
    return [5, 20, 100, 120].map((percent) => ({
      percent_nominal: percent,
      measured_primary: null,
      measured_secondary: null,
    }));
  }

  function calculateAndDisplayError(phase, percent, pos) {
    const row = document.querySelector(
      `tr[data-percent="${percent}"][data-pos="${pos}"][data-phase="${phase}"]`
    );
    if (!row) return;

    const iPrim = parseFloat(row.querySelector(".iprim").value);
    const iSek = parseFloat(row.querySelector(".isek").value);
    const errorCell = row.querySelector(".error-cell");

    const transformer = transformers.find(
      (t) => t.templateProductInformation.name === transformerSelector.value
    );
    if (!transformer) {
      errorCell.textContent = "-- %";
      return;
    }

    const ratioStr =
      transformer.specificProductInformation.electrical.ratio || "0/0";
    const [primNenn, sekNenn] = ratioStr.split("/").map(Number);
    const ratio = primNenn && sekNenn ? primNenn / sekNenn : 0;

    const error = calculateAmplitudeError(iPrim, iSek, ratio);
    errorCell.textContent = `${error.toFixed(4)} %`;
  }

  function updateChart(phase, forceRedraw = false) {
    if (!charts[phase] || forceRedraw) {
      if (charts[phase]) charts[phase].destroy();
      createErrorChart(phase);
    }

    const chart = charts[phase];
    const transformer = transformers.find(
      (t) => t.templateProductInformation.name === transformerSelector.value
    );

    chart.data.datasets = chart.data.datasets.filter(
      (ds) => !ds.label.startsWith("Messung")
    );

    if (transformer) {
      const points = [];
      [1, 2, 3].forEach((pos) => {
        [5, 20, 100, 120].forEach((p) => {
          const row = document.querySelector(
            `tr[data-percent="${p}"][data-pos="${pos}"][data-phase="${phase}"]`
          );
          if (!row) return;

          const iPrim = parseFloat(row.querySelector(".iprim").value);
          const iSek = parseFloat(row.querySelector(".isek").value);

          const ratioStr =
            transformer.specificProductInformation.electrical.ratio || "0/0";
          const [primNenn, sekNenn] = ratioStr.split("/").map(Number);
          const ratio = primNenn && sekNenn ? primNenn / sekNenn : 0;

          if (!isNaN(iPrim) && !isNaN(iSek) && ratio) {
            points.push({
              x: p,
              y: calculateAmplitudeError(iPrim, iSek, ratio),
            });
          }
        });
      });

      chart.data.datasets.push({
        label: `Messung ${transformer.templateProductInformation.name}`,
        data: points,
        backgroundColor: "#0d6efd",
        borderColor: "#0d6efd",
        fill: false,
        pointRadius: 5,
        type: "scatter",
      });
    }
    chart.update();
  }

  function createErrorChart(phase) {
    const chartCtx = document
      .getElementById(`error-chart-${phase}`)
      .getContext("2d");
    const datasets = [];
    const selectedClass = accuracyClassSelector.value;

    for (const [name, props] of Object.entries(ACCURACY_CLASSES)) {
      if (selectedClass === "all" || selectedClass === name) {
        datasets.push({
          label: `Klasse ${name} (+)`,
          data: props.data,
          borderColor: props.color,
          borderWidth: 2,
          fill: false,
          borderDash: [5, 5],
          pointRadius: 0,
          type: "line",
        });
        datasets.push({
          label: `Klasse ${name} (-)`,
          data: props.data.map((p) => ({ x: p.x, y: -p.y })),
          borderColor: props.color,
          borderWidth: 2,
          fill: false,
          borderDash: [5, 5],
          pointRadius: 0,
          type: "line",
        });
      }
    }

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

      const measurementsToSave = [];
      document
        .querySelectorAll(
          `#context-${phase} .measurement-table tr[data-percent]`
        )
        .forEach((row) => {
          measurementsToSave.push({
            percent_nominal: row.dataset.percent,
            position: row.dataset.pos,
            measured_primary:
              parseFloat(row.querySelector(".iprim").value) || null,
            measured_secondary:
              parseFloat(row.querySelector(".isek").value) || null,
            burden_resistance: totalBurdenResistance,
          });
        });

      const payload = {
        component_id: component_db_id,
        phase: phase,
        measurements: measurementsToSave,
      };

      try {
        const response = await fetch("/api/measurements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          successCount++;
          // Optional: Feedback geben
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
    }
  }

  initialize();
});
