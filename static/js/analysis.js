document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("chart-container")) {
    initializeAnalysisPage();
  }
});

let currentRunData = [];
let chartInstance = null;
let allConductors = [];

// Farbpalette für die Diagrammlinien
const chartColors = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#a855f7",
  "#f97316",
  "#14b8a6",
];

async function initializeAnalysisPage() {
  const runSelect = document.getElementById("run-select");

  // Lade die verfügbaren Simulationsläufe
  try {
    const response = await fetch("/analysis/runs");
    const runs = await response.json();
    runs.forEach((run) => {
      const option = document.createElement("option");
      option.value = run;
      option.textContent = run;
      runSelect.appendChild(option);
    });
  } catch (e) {
    console.error("Simulationsläufe konnten nicht geladen werden:", e);
  }

  // Event Listener für die Auswahl des Simulationslaufs
  runSelect.addEventListener("change", async () => {
    const runDir = runSelect.value;
    const checkboxContainer = document.getElementById("y-axis-checkboxes");
    checkboxContainer.innerHTML =
      '<p class="text-muted">-- Lade Daten... --</p>';
    clearChart();

    if (!runDir) {
      checkboxContainer.innerHTML =
        '<p class="text-muted">-- Wähle zuerst einen Lauf --</p>';
      return;
    }

    try {
      const [dateDir, timeDir] = runDir.split("/");
      const response = await fetch(
        `/analysis/summary_csv/${dateDir}/${timeDir}`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        currentRunData = data;
        allConductors = [...new Set(data.map((d) => d.conductor))];

        const headers = Object.keys(data[0]).filter(
          (h) => h !== "phaseAngle" && h !== "conductor"
        );

        checkboxContainer.innerHTML = "";
        headers.forEach((header, index) => {
          const div = document.createElement("div");
          // KORRIGIERT: Semantisch bessere Klasse verwenden
          div.className = "checkbox-item";
          const id = `check-${index}`;
          div.innerHTML = `
                        <input type="checkbox" id="${id}" value="${header}">
                        <label for="${id}">${header}</label>
                    `;
          checkboxContainer.appendChild(div);
          div.querySelector("input").addEventListener("change", drawChart);
        });
      } else {
        checkboxContainer.innerHTML =
          '<p class="text-muted">-- Keine Daten gefunden --</p>';
      }
    } catch (e) {
      console.error("CSV-Daten konnten nicht geladen werden:", e);
    }
  });
}

function clearChart() {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  document.getElementById("visualization-placeholder").style.display = "block";
}

function drawChart() {
  const selectedMetrics = Array.from(
    document.querySelectorAll("#y-axis-checkboxes input:checked")
  ).map((cb) => cb.value);

  if (selectedMetrics.length === 0) {
    clearChart();
    return;
  }

  document.getElementById("visualization-placeholder").style.display = "none";

  const datasets = [];
  let yAxis1Used = false;
  let yAxis2Used = false;
  const yAxisUnits = {};

  allConductors.forEach((conductor, condIndex) => {
    const conductorData = currentRunData.filter(
      (d) => d.conductor === conductor
    );
    const color = chartColors[condIndex % chartColors.length];

    selectedMetrics.forEach((metric) => {
      const unit = metric.split("_").pop();
      let yAxisID = "y1";

      if (!yAxis1Used || yAxisUnits.y1 === unit) {
        yAxisID = "y1";
        yAxis1Used = true;
        yAxisUnits.y1 = unit;
      } else if (!yAxis2Used || yAxisUnits.y2 === unit) {
        yAxisID = "y2";
        yAxis2Used = true;
        yAxisUnits.y2 = unit;
      } else {
        yAxisID = "y1";
      }

      datasets.push({
        label: `${conductor} - ${metric}`,
        data: conductorData.map((d) => ({ x: d.phaseAngle, y: d[metric] })),
        borderColor: color,
        backgroundColor: color,
        yAxisID: yAxisID,
        tension: 0.1,
        borderWidth: 2,
        pointRadius: 3,
        hidden: allConductors.length > 1,
      });
    });
  });

  const scales = {
    x: {
      type: "linear",
      title: { display: true, text: "Phasenwinkel (°)" },
    },
    y1: {
      type: "linear",
      position: "left",
      title: { display: true, text: `Messgröße 1 (${yAxisUnits.y1 || ""})` },
    },
  };

  if (yAxis2Used) {
    scales.y2 = {
      type: "linear",
      position: "right",
      title: { display: true, text: `Messgröße 2 (${yAxisUnits.y2 || ""})` },
      grid: { drawOnChartArea: false },
    };
  }

  if (chartInstance) {
    chartInstance.data.datasets = datasets;
    chartInstance.options.scales = scales;
    chartInstance.update();
  } else {
    const ctx = document.getElementById("analysis-chart").getContext("2d");
    chartInstance = new Chart(ctx, {
      type: "line",
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: scales,
        plugins: {
          legend: {
            position: "top",
            onClick: (e, legendItem, legend) => {
              Chart.defaults.plugins.legend.onClick(e, legendItem, legend);
              const conductorName = legendItem.text.split(" - ")[0];
              const isHidden = !legendItem.hidden;

              legend.chart.data.datasets.forEach((dataset) => {
                if (dataset.label.startsWith(conductorName)) {
                  dataset.hidden = isHidden;
                }
              });
              legend.chart.update();
            },
          },
          tooltip: { mode: "index", intersect: false },
        },
        interaction: { mode: "index", intersect: false },
      },
    });
  }
}
