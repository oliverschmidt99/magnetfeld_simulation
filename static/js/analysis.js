// static/js/analysis.js
// JavaScript für die Analyse-Seite
let analysisChart;

document.addEventListener("DOMContentLoaded", function () {
  const runSelect = document.getElementById("run-select");
  const yAxisCheckboxes = document.getElementById("y-axis-checkboxes");
  const chartContainer = document.getElementById("chart-container");
  const visualizationPlaceholder = document.getElementById(
    "visualization-placeholder"
  );

  // Funktion zum Laden der verfügbaren Simulationsläufe
  function loadRuns() {
    fetch("/analysis/runs")
      .then((response) => response.json())
      .then((runs) => {
        runs.forEach((run) => {
          const option = document.createElement("option");
          option.value = run;
          option.textContent = run;
          runSelect.appendChild(option);
        });
      })
      .catch((error) => console.error("Error loading runs:", error));
  }

  // Event-Listener für die Auswahl eines Simulationslaufs
  runSelect.addEventListener("change", function () {
    const runPath = this.value;
    if (runPath) {
      loadSummaryData(runPath);
    } else {
      yAxisCheckboxes.innerHTML =
        '<p class="text-muted">-- Wähle zuerst einen Lauf --</p>';
      hideChart();
    }
  });

  // Funktion zum Laden der summary.csv und Erstellen der Checkboxen
  function loadSummaryData(runPath) {
    const [dateDir, timeDir] = runPath.split("/");
    fetch(`/analysis/summary_csv/${dateDir}/${timeDir}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("CSV-Datei nicht gefunden oder leer.");
        }
        return response.json();
      })
      .then((data) => {
        const keys = Object.keys(data[0] || {});
        yAxisCheckboxes.innerHTML = "";
        keys.forEach((key) => {
          if (key !== "time_ms" && key !== "scenario_name") {
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = `checkbox-${key}`;
            checkbox.value = key;
            const label = document.createElement("label");
            label.htmlFor = `checkbox-${key}`;
            label.textContent = key;
            const div = document.createElement("div");
            div.appendChild(checkbox);
            div.appendChild(label);
            yAxisCheckboxes.appendChild(div);
            checkbox.addEventListener("change", () => updateChart(data));
          }
        });
        updateChart(data);
      })
      .catch((error) => {
        console.error("Error loading summary data:", error);
        yAxisCheckboxes.innerHTML = `<p class="text-danger">Fehler: ${error.message}</p>`;
        hideChart();
      });
  }

  // Funktion zum Aktualisieren des Chart.js-Diagramms
  function updateChart(data) {
    if (!data || data.length === 0) {
      hideChart();
      return;
    }

    const selectedKeys = Array.from(
      yAxisCheckboxes.querySelectorAll("input:checked")
    ).map((cb) => cb.value);

    if (selectedKeys.length === 0) {
      hideChart();
      return;
    }

    showChart();
    const datasets = selectedKeys.map((key) => ({
      label: key,
      data: data.map((row) => ({
        x: row.time_ms,
        y: row[key],
      })),
      borderColor: getRandomColor(),
      tension: 0.1,
      fill: false,
    }));

    const chartData = {
      datasets: datasets,
    };

    const chartConfig = {
      type: "line",
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: "linear",
            title: {
              display: true,
              text: "Zeit (ms)",
            },
          },
          y: {
            title: {
              display: true,
              text: "Messgröße",
            },
          },
        },
        plugins: {
          tooltip: {
            mode: "index",
            intersect: false,
          },
        },
      },
    };

    if (analysisChart) {
      analysisChart.data = chartData;
      analysisChart.update();
    } else {
      const ctx = document.getElementById("analysis-chart").getContext("2d");
      analysisChart = new Chart(ctx, chartConfig);
    }
  }

  function hideChart() {
    visualizationPlaceholder.style.display = "block";
    chartContainer.style.display = "none";
  }

  function showChart() {
    visualizationPlaceholder.style.display = "none";
    chartContainer.style.display = "block";
  }

  function getRandomColor() {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  loadRuns();
});
