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
    document
      .getElementById("strom-gruppe-selector")
      .addEventListener("change", handleGroupSelect);
    document
      .getElementById("transformer-selector")
      .addEventListener("change", handleTransformerSelect);
    document
      .getElementById("accuracy-class-selector")
      .addEventListener("change", () =>
        ["L1", "L2", "L3"].forEach((phase) => updateChart(phase, true))
      );

    document
      .querySelectorAll(
        '.burden-calc-input, input[name="temp-selector-global"]'
      )
      .forEach((el) => {
        el.addEventListener("input", () =>
          ["L1", "L2", "L3"].forEach(calculateAndDisplayBurden)
        );
      });

    ["L1", "L2", "L3"].forEach((phase) => {
      buildBurdenAnalysisHTML(phase); // This function was missing
      document
        .querySelectorAll(
          `#measurement-form .measurement-input[id*="-${phase}"], #burden-content-${phase} select`
        )
        .forEach((input) => {
          input.addEventListener("input", (e) => {
            if (e.target.classList.contains("resistance-calc-input"))
              calculateAndDisplayResistance(phase);
            if (e.target.classList.contains("inductance-calc-input"))
              calculateAndDisplayInductance(phase);
            if (e.target.closest(".measurement-table")) {
              const row = e.target.closest("tr");
              calculateAndDisplayError(
                phase,
                row.dataset.percent,
                row.dataset.pos
              );
              updateChart(phase);
            }
            if (e.target.closest(`#burden-content-${phase}`)) {
              calculateAndDisplayBurden(phase);
            }
          });
        });
    });
    handleGroupSelect();
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

    transformerSelector.innerHTML =
      '<option value="">-- Bitte wählen --</option>';
    if (validCurrents.length > 0) {
      transformers.forEach((t) => {
        const ratedCurrent =
          t.specificProductInformation.electrical.primaryRatedCurrentA;
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
    handleTransformerSelect();
  }

  function handleTransformerSelect() {
    const selectedTransformerName = document.getElementById(
      "transformer-selector"
    ).value;
    const transformer = transformers.find(
      (t) => t.templateProductInformation.name === selectedTransformerName
    );

    document.querySelectorAll(".measurement-table tbody tr").forEach((row) => {
      const percent = row.dataset.percent;
      const pos = row.dataset.pos;
      const phase = row.dataset.phase;
      const sollStromSpan = document.getElementById(
        `soll-strom-${percent}-${pos}-${phase}`
      );

      if (transformer && sollStromSpan) {
        const primNenn =
          transformer.specificProductInformation.electrical.ratio.split("/")[0];
        const sollStrom = (primNenn * (percent / 100)).toFixed(1);
        sollStromSpan.textContent = `(${sollStrom}A)`;
      } else if (sollStromSpan) {
        sollStromSpan.textContent = "";
      }
      row.querySelector(".iprim").value = "";
      row.querySelector(".isek").value = "";
      row.querySelector(".error-cell").textContent = "--";
    });
    ["L1", "L2", "L3"].forEach(calculateAndDisplayBurden);
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

    const [primNenn, sekNenn] = (
      transformer.specificProductInformation.electrical.ratio || "0/0"
    )
      .split("/")
      .map(Number);
    const ratio = primNenn && sekNenn ? primNenn / sekNenn : 0;
    if (ratio === 0) {
      errorCell.textContent = "--";
      return;
    }

    const error = ((iSek * ratio - iPrim) / iPrim) * 100;
    errorCell.textContent = `${error.toFixed(4)} %`;

    const accuracyClass =
      transformer.specificProductInformation.electrical.accuracyClass;
    if (accuracyClass && ACCURACY_CLASSES[accuracyClass]) {
      const limit =
        ACCURACY_CLASSES[accuracyClass].data.find((d) => d.x == percent)?.y ||
        null;
      if (limit !== null && Math.abs(error) > limit) {
        errorCell.style.color = "#dc3545";
      } else {
        errorCell.style.color = "#198754";
      }
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
  }

  function calculateAndDisplayBurden(phase) {
    const length =
      parseFloat(document.getElementById(`cable-length-global`).value) || 0;
    const area =
      parseFloat(document.getElementById(`cable-cross-section-global`).value) ||
      0;
    const meter_r =
      parseFloat(document.getElementById(`meter-resistance-global`).value) || 0;
    const temp = document.querySelector(
      `input[name="temp-selector-global"]:checked`
    ).value;
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
      snennSpan.textContent = "-- VA";
      scableSpan.textContent = "-- VA";
      smeterSpan.textContent = "-- VA";
      sistSpan.textContent = "-- VA";
      statusDiv.innerHTML = "<span>Wandler wählen</span>";
      return;
    }

    const ratedBurdenVA =
      transformer.specificProductInformation.electrical.ratedBurdenVA || 0;
    const [, sekNenn] = (
      transformer.specificProductInformation.electrical.ratio || "0/0"
    )
      .split("/")
      .map(Number);

    let s_cable = 0,
      s_meter = 0;
    if (area > 0 && sekNenn > 0)
      s_cable = ((rho * length) / area) * sekNenn ** 2;
    if (sekNenn > 0) s_meter = meter_r * sekNenn ** 2;
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
    // This function remains unchanged from the previous response
  }

  function createErrorChart(phase) {
    const chartCtx = document
      .getElementById(`error-chart-${phase}`)
      .getContext("2d");
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
          },
          y: { title: { display: true, text: "Amplitudenfehler (%)" } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `${ctx.dataset.label}: (${
                  ctx.parsed.x
                }%, ${ctx.parsed.y.toFixed(3)}%)`,
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
          const [primNenn, sekNenn] = (
            transformer.specificProductInformation.electrical.ratio || "0/0"
          )
            .split("/")
            .map(Number);
          const ratio = primNenn && sekNenn ? primNenn / sekNenn : 0;
          if (!isNaN(iPrim) && !isNaN(iSek) && ratio && iPrim > 0) {
            points.push({ x: p, y: ((iSek * ratio - iPrim) / iPrim) * 100 });
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
      const ls = (xs / (2 * Math.PI * 50)) * 1000;
      xsSpan.textContent = `${xs.toFixed(4)} Ω`;
      lsSpan.textContent = `${ls.toFixed(3)} mH`;
    } else {
      xsSpan.textContent = "-- Ω";
      lsSpan.textContent = "-- mH";
    }
  }

  initialize();
});
