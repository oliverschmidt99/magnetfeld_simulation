// static/js/measurements.js

document.addEventListener("DOMContentLoaded", () => {
  // Globale Variablen & Konstanten
  const library = JSON.parse(
    document.getElementById("library-data").textContent
  );
  const transformers = library.components.transformers || [];
  let charts = { L1: null, L2: null, L3: null };

  const RHO_20 = 0.0178; // Ohm * mm^2 / m
  const RHO_80 = 0.02195; // Ohm * mm^2 / m
  const FREQUENCY = 50; // Netzfrequenz in Hz

  // Debounce-Funktion, um das Speichern zu verzögern
  function debounce(func, delay) {
    let timeout;
    return function (...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), delay);
    };
  }

  // Eine debounced Version der Export-Funktion erstellen (2000ms = 2s Verzögerung)
  const debouncedServerExport = debounce(saveAllMeasurementsToCsv, 2000);

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

  function initialize() {
    initializeVerticalNavigation("measurement-nav", "measurement-sections");

    const form = document.getElementById("measurement-form");
    form.addEventListener("input", (e) => {
      // Automatischer Server-Export wird verzögert ausgelöst
      debouncedServerExport();

      const target = e.target;
      const phase = target.dataset.phase;

      if (target.classList.contains("resistance-calc-input")) {
        calculateAndDisplayResistance(phase);
      }
      if (target.classList.contains("inductance-calc-input")) {
        calculateAndDisplayInductance(phase);
      }
      if (target.closest(".measurement-table")) {
        const row = target.closest("tr");
        if (row && row.dataset.phase) {
          calculateAndDisplayError(
            row.dataset.phase,
            row.dataset.percent,
            row.dataset.pos
          );
          updateChart(row.dataset.phase);
        }
      }
      if (
        target.closest(".global-burden-section") ||
        target.closest('[id^="burden-content-"]')
      ) {
        ["L1", "L2", "L3"].forEach(calculateAndDisplayBurden);
      }
    });

    document
      .getElementById("strom-gruppe-selector")
      .addEventListener("change", () => {
        handleGroupSelect();
        handleTransformerSelect();
      });
    document
      .getElementById("transformer-selector")
      .addEventListener("change", () => {
        handleTransformerSelect();
      });
    document
      .getElementById("accuracy-class-selector")
      .addEventListener("change", () => {
        ["L1", "L2", "L3"].forEach((phase) => updateChart(phase, true));
      });

    ["L1", "L2", "L3"].forEach(buildBurdenAnalysisHTML);

    handleGroupSelect();
  }

  function gatherAllMeasurementData() {
    const transformerName = document.getElementById(
      "transformer-selector"
    ).value;
    const stromGruppe = document.getElementById("strom-gruppe-selector").value; // NEU

    const leerlauf_und_kurzschluss = [];
    ["L1", "L2", "L3"].forEach((phase) => {
      leerlauf_und_kurzschluss.push({
        Phase: phase,
        Typ: "Leerlauf",
        U_V: document.getElementById(`u-leerlauf-${phase}`).value || "",
        I_A: document.getElementById(`i-leerlauf-${phase}`).value || "",
        P_W: document.getElementById(`p-leerlauf-${phase}`).value || "",
      });
      leerlauf_und_kurzschluss.push({
        Phase: phase,
        Typ: "Kurzschluss",
        U_V: document.getElementById(`u-kurzschluss-${phase}`).value || "",
        I_A: document.getElementById(`i-kurzschluss-${phase}`).value || "",
        P_W: document.getElementById(`p-kurzschluss-${phase}`).value || "",
      });
    });

    const wicklungsparameter = [];
    ["L1", "L2", "L3"].forEach((phase) => {
      wicklungsparameter.push({
        Phase: phase,
        R_S_Ohm: document
          .getElementById(`rs-result-${phase}`)
          .textContent.replace(" Ω", "")
          .trim(),
        X_S_Ohm: document
          .getElementById(`xs-result-${phase}`)
          .textContent.replace(" Ω", "")
          .trim(),
        L_S_mH: document
          .getElementById(`ls-result-${phase}`)
          .textContent.replace(" mH", "")
          .trim(),
      });
    });

    const gesamtbuerde_und_kompensation = [];
    ["L1", "L2", "L3"].forEach((phase) => {
      gesamtbuerde_und_kompensation.push({
        Phase: phase,
        S_Nenn_VA: document
          .getElementById(`snenn-result-${phase}`)
          .textContent.replace(" VA", "")
          .trim(),
        S_Kabel_VA: document
          .getElementById(`scable-result-${phase}`)
          .textContent.replace(" VA", "")
          .trim(),
        S_Geraet_VA: document
          .getElementById(`smeter-result-${phase}`)
          .textContent.replace(" VA", "")
          .trim(),
        S_Ist_VA: document
          .getElementById(`sist-result-${phase}`)
          .textContent.replace(" VA", "")
          .trim(),
        Status: document.querySelector(`#burden-status-${phase} span`)
          .textContent,
      });
    });

    const messreihen = [];
    document.querySelectorAll(".measurement-table tbody tr").forEach((row) => {
      const sollStromText = row.querySelector(
        ".soll-strom-display"
      ).textContent;
      messreihen.push({
        Phase: row.dataset.phase,
        Position: row.dataset.pos,
        Prozent_Nennstrom: row.dataset.percent,
        I_prim_soll_A: sollStromText.replace(/[()A]/g, ""),
        I_prim_ist_A: row.querySelector(".iprim").value || "",
        U_prim_ist_V: row.querySelector(".uprim").value || "",
        I_sek_ist_mA: row.querySelector(".isek").value || "",
        U_sek_ist_mV: row.querySelector(".usek").value || "",
        Fehler_Prozent: row
          .querySelector(".error-cell")
          .textContent.replace(/ %/g, "")
          .trim(),
      });
    });

    return {
      transformerName,
      stromGruppe, // NEU
      leerlauf_und_kurzschluss,
      wicklungsparameter,
      gesamtbuerde_und_kompensation,
      messreihen,
    };
  }

  async function saveAllMeasurementsToCsv() {
    const dataToExport = gatherAllMeasurementData();

    if (!dataToExport.transformerName || !dataToExport.stromGruppe) {
      console.log(
        "Kein Wandler oder Gruppe ausgewählt, automatisches Speichern übersprungen."
      );
      return;
    }

    console.log(
      `Automatisches Speichern für ${dataToExport.transformerName} in Gruppe ${dataToExport.stromGruppe} wird ausgelöst...`
    );

    try {
      const response = await fetch("/api/measurements/save_csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToExport),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unbekannter Fehler");
      }

      console.log(result.message);
    } catch (error) {
      console.error(`Fehler beim automatischen Speichern: ${error.message}`);
    }
  }

  async function loadMeasurementsFromCsv(transformerName, stromGruppe) {
    if (!transformerName || !stromGruppe) {
      document.getElementById("measurement-form").reset();
      runAllCalculations();
      return;
    }

    try {
      const response = await fetch(
        `/api/measurements/load_csv/${stromGruppe}/${encodeURIComponent(
          transformerName
        )}`
      );
      if (!response.ok) {
        throw new Error("Netzwerkfehler beim Laden der Daten.");
      }
      const data = await response.json();
      populateFormWithLoadedData(data);
      runAllCalculations();
    } catch (error) {
      console.error(
        `Fehler beim Laden der CSV-Daten für ${transformerName}: ${error.message}`
      );
      document.getElementById("measurement-form").reset();
      runAllCalculations();
    }
  }

  function populateFormWithLoadedData(data) {
    (data.leerlauf_und_kurzschluss || []).forEach((item) => {
      const type = (item.Typ || "").toLowerCase();
      if (document.getElementById(`u-${type}-${item.Phase}`)) {
        document.getElementById(`u-${type}-${item.Phase}`).value =
          item.U_V || "";
        document.getElementById(`i-${type}-${item.Phase}`).value =
          item.I_A || "";
        document.getElementById(`p-${type}-${item.Phase}`).value =
          item.P_W || "";
      }
    });

    (data.messreihen || []).forEach((item) => {
      const row = document.querySelector(
        `tr[data-phase="${item.Phase}"][data-pos="${item.Position}"][data-percent="${item.Prozent_Nennstrom}"]`
      );
      if (row) {
        row.querySelector(".iprim").value = item.I_prim_ist_A || "";
        row.querySelector(".uprim").value = item.U_prim_ist_V || "";
        row.querySelector(".isek").value = item.I_sek_ist_mA || "";
        row.querySelector(".usek").value = item.U_sek_ist_mV || "";
      }
    });
  }

  function runAllCalculations() {
    ["L1", "L2", "L3"].forEach((phase) => {
      calculateAndDisplayResistance(phase);
      calculateAndDisplayInductance(phase);
      calculateAndDisplayBurden(phase);
      ["1", "2", "3"].forEach((pos) => {
        ["5", "20", "100", "120"].forEach((p) => {
          calculateAndDisplayError(phase, p, pos);
        });
      });
      updateChart(phase, true);
    });
  }

  function initializeVerticalNavigation(navId, sectionContainerId) {
    const links = document.querySelectorAll(`#${navId} .nav-link`);
    const sections = document.querySelectorAll(
      `#${sectionContainerId} .config-section`
    );
    links.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        sections.forEach((s) => s.classList.remove("active"));
        links.forEach((l) => l.classList.remove("active"));
        const targetElement = document.getElementById(link.dataset.target);
        if (targetElement) targetElement.classList.add("active");
        link.classList.add("active");
        if (link.dataset.target === "measurement-summary") {
          ["L1", "L2", "L3"].forEach((phase) => updateChart(phase, true));
        }
      });
    });
  }

  function handleGroupSelect() {
    const selectedGroup = document.getElementById(
      "strom-gruppe-selector"
    ).value;
    const transformerSelector = document.getElementById("transformer-selector");
    const validCurrents =
      {
        A: [600, 800],
        B: [1000, 1250, 1600, 2000, 2500],
        C: [3000, 4000, 5000],
      }[selectedGroup] || [];

    const currentSelection = transformerSelector.value;
    transformerSelector.innerHTML =
      '<option value="">-- Bitte wählen --</option>';

    if (validCurrents.length > 0) {
      transformers.forEach((t) => {
        const ratedCurrent =
          t.specificProductInformation?.electrical?.primaryRatedCurrentA;
        if (validCurrents.includes(ratedCurrent)) {
          transformerSelector.add(
            new Option(
              t.templateProductInformation.name,
              t.templateProductInformation.name
            )
          );
        }
      });
      transformerSelector.disabled = false;
    } else {
      transformerSelector.disabled = true;
    }

    if (
      Array.from(transformerSelector.options).some(
        (opt) => opt.value === currentSelection
      )
    ) {
      transformerSelector.value = currentSelection;
    }
  }

  function handleTransformerSelect() {
    const selectedTransformerName = document.getElementById(
      "transformer-selector"
    ).value;
    const selectedGruppe = document.getElementById(
      "strom-gruppe-selector"
    ).value;
    const transformer = transformers.find(
      (t) => t.templateProductInformation.name === selectedTransformerName
    );

    document.querySelectorAll(".measurement-table tbody tr").forEach((row) => {
      const percent = row.dataset.percent;
      const sollStromSpan = row.querySelector(".soll-strom-display");

      if (
        transformer &&
        sollStromSpan &&
        transformer.specificProductInformation?.electrical?.ratio
      ) {
        const primNenn =
          transformer.specificProductInformation.electrical.ratio.split("/")[0];
        if (!isNaN(primNenn)) {
          const sollStrom = (primNenn * (percent / 100)).toFixed(1);
          sollStromSpan.textContent = `(${sollStrom}A)`;
        } else {
          sollStromSpan.textContent = "";
        }
      } else if (sollStromSpan) {
        sollStromSpan.textContent = "";
      }
    });

    loadMeasurementsFromCsv(selectedTransformerName, selectedGruppe);
  }

  function calculateAndDisplayError(phase, percent, pos) {
    const row = document.querySelector(
      `tr[data-percent="${percent}"][data-pos="${pos}"][data-phase="${phase}"]`
    );
    if (!row) return;

    const iPrim = parseFloat(row.querySelector(".iprim").value);
    const iSek = parseFloat(row.querySelector(".isek").value) / 1000;
    const errorCell = row.querySelector(".error-cell");
    const transformer = transformers.find(
      (t) =>
        t.templateProductInformation.name ===
        document.getElementById("transformer-selector").value
    );

    if (!transformer || isNaN(iPrim) || isNaN(iSek) || iPrim === 0) {
      errorCell.textContent = "--";
      errorCell.style.color = "#dc3545";
      return;
    }

    const ratioStr =
      transformer.specificProductInformation?.electrical?.ratio || "0/0";
    const [primNenn, sekNenn] = ratioStr.split("/").map(Number);
    const ratio = primNenn && sekNenn ? primNenn / sekNenn : 0;

    if (ratio === 0) {
      errorCell.textContent = "--";
      return;
    }

    const error = ((iSek * ratio - iPrim) / iPrim) * 100;
    errorCell.textContent = `${error.toFixed(4)} %`;

    const accuracyClass =
      transformer.specificProductInformation?.electrical?.accuracyClass;
    if (accuracyClass && ACCURACY_CLASSES[accuracyClass]) {
      const limit =
        ACCURACY_CLASSES[accuracyClass].data.find((d) => d.x == percent)?.y ||
        null;
      if (limit !== null && Math.abs(error) > limit) {
        errorCell.style.color = "#dc3545";
      } else {
        errorCell.style.color = "#198754";
      }
    } else {
      errorCell.style.color = "#343a40";
    }
  }

  function buildBurdenAnalysisHTML(phase) {
    const container = document.getElementById(`burden-content-${phase}`);
    if (!container) return;
    container.innerHTML = `
            <h4>Analyse für ${phase}</h4>
            <div class="burden-summary">
                <div class="summary-item"><span><i>S</i><sub>Nenn</sub>:</span><span id="snenn-result-${phase}">-- VA</span></div>
                <div class="summary-item"><span><i>S</i><sub>Kabel</sub>:</span><span id="scable-result-${phase}">-- VA</span></div>
                <div class="summary-item"><span><i>S</i><sub>Gerät</sub>:</span><span id="smeter-result-${phase}">-- VA</span></div>
                <hr>
                <div class="summary-item total"><span><i>S</i><sub>Ist</sub>:</span><span id="sist-result-${phase}">-- VA</span></div>
            </div>
            <div id="burden-status-${phase}" class="burden-status"><span>Status: --</span></div>
            <div class="resistor-recommendation" id="resistor-recommendation-${phase}" style="display: none;">
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
            <div id="new-burden-status-${phase}" class="burden-status" style="display: none;"></div>
        `;
  }

  function calculateAndDisplayBurden(phase) {
    const length =
      parseFloat(document.getElementById(`cable-length-global`).value) || 0;
    const area =
      parseFloat(document.getElementById(`cable-cross-section-global`).value) ||
      0;
    const meter_r =
      parseFloat(document.getElementById(`meter-resistance-global`).value) || 0;
    const tempEl = document.querySelector(
      `input[name="temp-selector-global"]:checked`
    );
    if (!tempEl) return;

    const temp = tempEl.value;
    const rho = temp === "80" ? RHO_80 : RHO_20;
    const transformer = transformers.find(
      (t) =>
        t.templateProductInformation.name ===
        document.getElementById("transformer-selector").value
    );

    const snennSpan = document.getElementById(`snenn-result-${phase}`);
    const scableSpan = document.getElementById(`scable-result-${phase}`);
    const smeterSpan = document.getElementById(`smeter-result-${phase}`);
    const sistSpan = document.getElementById(`sist-result-${phase}`);
    const statusDiv = document.getElementById(`burden-status-${phase}`);

    if (!transformer) {
      if (snennSpan) snennSpan.textContent = "-- VA";
      if (scableSpan) scableSpan.textContent = "-- VA";
      if (smeterSpan) smeterSpan.textContent = "-- VA";
      if (sistSpan) sistSpan.textContent = "-- VA";
      if (statusDiv) statusDiv.innerHTML = "<span>Wandler wählen</span>";
      return;
    }

    const ratedBurdenVA =
      transformer.specificProductInformation?.electrical?.ratedBurdenVA || 0;
    const ratioStr =
      transformer.specificProductInformation?.electrical?.ratio || "0/0";
    const [, sekNenn] = ratioStr.split("/").map(Number);

    let s_cable = 0,
      s_meter = 0;
    if (area > 0 && sekNenn > 0)
      s_cable = ((rho * length) / area) * Math.pow(sekNenn, 2);
    if (sekNenn > 0) s_meter = meter_r * Math.pow(sekNenn, 2);
    const s_ist = s_cable + s_meter;

    snennSpan.textContent = `${ratedBurdenVA.toFixed(2)} VA`;
    scableSpan.textContent = `${s_cable.toFixed(4)} VA`;
    smeterSpan.textContent = `${s_meter.toFixed(4)} VA`;
    sistSpan.textContent = `${s_ist.toFixed(4)} VA`;

    if (ratedBurdenVA > 0) {
      if (s_ist > ratedBurdenVA)
        statusDiv.innerHTML = `<span class="status-error">Überbürdung</span>`;
      else if (s_ist < ratedBurdenVA * 0.25)
        statusDiv.innerHTML = `<span class="status-warning">Unterbürdung</span>`;
      else statusDiv.innerHTML = `<span class="status-ok">Bürde OK</span>`;
    } else {
      statusDiv.innerHTML = `<span>Keine Nennbürde</span>`;
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
      `resistor-recommendation-${phase}`
    );
    const outputDiv = document.getElementById(
      `resistor-recommendation-output-${phase}`
    );
    const newStatusDiv = document.getElementById(`new-burden-status-${phase}`);
    const eSeriesSelector = document.getElementById(
      `e-series-selector-${phase}`
    );

    if (
      !recommendationDiv ||
      ratedBurdenVA <= 0 ||
      s_ist >= ratedBurdenVA * 0.25 ||
      sekNenn <= 0
    ) {
      if (recommendationDiv) recommendationDiv.style.display = "none";
      if (newStatusDiv) newStatusDiv.style.display = "none";
      return;
    }
    recommendationDiv.style.display = "block";
    newStatusDiv.style.display = "block";

    const s_min = ratedBurdenVA * 0.25;
    const s_diff = s_min - s_ist;
    const r_required = s_diff / Math.pow(sekNenn, 2);

    const selectedESeries = eSeriesSelector.value;
    const e_values = E_SERIES[selectedESeries];

    let best_resistor = 0;

    if (r_required > 0) {
      const magnitude = 10 ** Math.floor(Math.log10(r_required));
      let min_diff = Infinity;

      for (let i = -2; i <= 4; i++) {
        for (const val of e_values) {
          const resistor_val = val * magnitude * 10 ** i;
          if (resistor_val >= r_required) {
            const diff = resistor_val - r_required;
            if (diff < min_diff) {
              min_diff = diff;
              best_resistor = resistor_val;
            }
          }
        }
      }
    }

    if (best_resistor === 0) {
      outputDiv.innerHTML = `Kein zusätzlicher Widerstand nötig.`;
      newStatusDiv.style.display = "none";
      return;
    }

    const p_resistor = best_resistor * Math.pow(sekNenn, 2);

    outputDiv.innerHTML = `
        Empfohlener Vorwiderstand (min.): <strong>${r_required.toFixed(
          4
        )} Ω</strong><br>
        Nächster Wert aus ${selectedESeries}-Reihe: <strong>${best_resistor.toFixed(
      2
    )} Ω</strong><br>
        Verlustleistung am Widerstand: <strong>${p_resistor.toFixed(
          3
        )} W</strong>
    `;

    const s_total_new = s_ist + p_resistor;

    if (s_total_new > ratedBurdenVA) {
      newStatusDiv.innerHTML = `<span class="status-error">Neue Bürde (${s_total_new.toFixed(
        4
      )} VA) zu hoch!</span>`;
    } else {
      newStatusDiv.innerHTML = `<span class="status-ok">Neue Bürde: ${s_total_new.toFixed(
        4
      )} VA</span>`;
    }
  }

  function createErrorChart(phase) {
    const chartCtx = document
      .getElementById(`error-chart-${phase}`)
      .getContext("2d");
    if (!chartCtx) return;

    const datasets = [];
    const selectedClass = document.getElementById(
      "accuracy-class-selector"
    ).value;

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
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: "linear",
            position: "bottom",
            title: { display: true, text: "% Nennstrom" },
            min: 0,
            max: 130,
          },
          y: { title: { display: true, text: "Amplitudenfehler (%)" } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                if (ctx.dataset.label.startsWith("Messung")) {
                  return `Messung: (${ctx.parsed.x}%, ${ctx.parsed.y.toFixed(
                    4
                  )}%)`;
                }
                return `${ctx.dataset.label}: (${
                  ctx.parsed.x
                }%, ${ctx.parsed.y.toFixed(2)}%)`;
              },
            },
          },
        },
      },
    });
  }

  function updateChart(phase, forceRedraw = false) {
    if (!document.getElementById(`error-chart-${phase}`)) return;

    if (!charts[phase] || forceRedraw) {
      if (charts[phase]) charts[phase].destroy();
      createErrorChart(phase);
    }
    const chart = charts[phase];
    if (!chart) return;

    const transformer = transformers.find(
      (t) =>
        t.templateProductInformation.name ===
        document.getElementById("transformer-selector").value
    );

    chart.data.datasets = chart.data.datasets.filter(
      (ds) => !ds.label.startsWith("Messung")
    );

    if (transformer) {
      const points = [];
      ["1", "2", "3"].forEach((pos) => {
        ["5", "20", "100", "120"].forEach((p) => {
          const row = document.querySelector(
            `tr[data-percent="${p}"][data-pos="${pos}"][data-phase="${phase}"]`
          );
          if (!row) return;

          const iPrim = parseFloat(row.querySelector(".iprim").value);
          const iSek = parseFloat(row.querySelector(".isek").value) / 1000;
          const ratioStr =
            transformer.specificProductInformation?.electrical?.ratio || "0/0";
          const [primNenn, sekNenn] = ratioStr.split("/").map(Number);
          const ratio = primNenn && sekNenn ? primNenn / sekNenn : 0;

          if (!isNaN(iPrim) && !isNaN(iSek) && ratio && iPrim > 0) {
            points.push({
              x: parseInt(p, 10),
              y: ((iSek * ratio - iPrim) / iPrim) * 100,
            });
          }
        });
      });

      chart.data.datasets.push({
        label: `Messung`,
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

  function calculateAndDisplayResistance(phase) {
    if (!phase) return;
    const u = parseFloat(document.getElementById(`u-mess-${phase}`).value);
    const i = parseFloat(document.getElementById(`i-mess-${phase}`).value);
    const resultSpan = document.getElementById(`rs-result-${phase}`);
    if (resultSpan) {
      resultSpan.textContent =
        !isNaN(u) && i > 0 ? `${(u / i).toFixed(4)} Ω` : "-- Ω";
    }
  }

  function calculateAndDisplayInductance(phase) {
    if (!phase) return;
    const u = parseFloat(document.getElementById(`u-mess-L-${phase}`).value);
    const i = parseFloat(document.getElementById(`i-mess-L-${phase}`).value);
    const phi = parseFloat(
      document.getElementById(`phi-mess-L-${phase}`).value
    );
    const xsSpan = document.getElementById(`xs-result-${phase}`);
    const lsSpan = document.getElementById(`ls-result-${phase}`);

    if (xsSpan && lsSpan) {
      if (!isNaN(u) && i > 0 && !isNaN(phi)) {
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
  }

  initialize();
});
