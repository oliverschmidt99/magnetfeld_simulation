document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("chart-container")) {
    initializeAnalysisPage();
  }
});

let currentRunData = [];

async function initializeAnalysisPage() {
  const runSelect = document.getElementById("run-select");
  const yAxisSelect = document.getElementById("y-axis-select");

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
    clearChart();
    yAxisSelect.innerHTML =
      '<option value="">-- Wähle zuerst einen Lauf --</option>';
    yAxisSelect.disabled = true;

    if (!runDir) return;

    // Lade die CSV-Daten für den ausgewählten Lauf
    try {
      // KORRIGIERT: Baue die URL jetzt mit separaten Teilen, um 404-Fehler zu vermeiden.
      const [dateDir, timeDir] = runDir.split("/");
      const response = await fetch(
        `/analysis/summary_csv/${dateDir}/${timeDir}`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        currentRunData = data;
        // Fülle die Y-Achsen-Auswahl mit den Spaltennamen der CSV
        const headers = Object.keys(data[0]);
        yAxisSelect.innerHTML =
          '<option value="">-- Messgröße auswählen --</option>';
        headers.forEach((header) => {
          // Schließe die X-Achse und irrelevante Spalten aus
          if (header !== "phaseAngle" && header !== "conductor") {
            const option = document.createElement("option");
            option.value = header;
            option.textContent = header;
            yAxisSelect.appendChild(option);
          }
        });
        yAxisSelect.disabled = false;
      } else {
        yAxisSelect.innerHTML =
          '<option value="">-- Keine Daten gefunden --</option>';
      }
    } catch (e) {
      console.error("CSV-Daten konnten nicht geladen werden:", e);
    }
  });

  // Event Listener für die Auswahl der Y-Achse
  yAxisSelect.addEventListener("change", () => {
    const yAxisKey = yAxisSelect.value;
    if (!yAxisKey) {
      clearChart();
      return;
    }
    drawChart(currentRunData, "phaseAngle", yAxisKey);
  });
}

function clearChart() {
  d3.select("#chart-container").selectAll("*").remove();
  document.getElementById("visualization-placeholder").style.display = "block";
}

function drawChart(data, xKey, yKey) {
  clearChart();
  document.getElementById("visualization-placeholder").style.display = "none";

  // Abmessungen und Ränder für das Diagramm
  const margin = { top: 20, right: 30, bottom: 50, left: 60 };
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  // SVG-Element zum Container hinzufügen
  const svg = d3
    .select("#chart-container")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Skalen für X- und Y-Achse definieren
  const x = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d[xKey]))
    .range([0, width]);

  const y = d3
    .scaleLinear()
    .domain([
      d3.min(data, (d) => d[yKey]) * 0.9,
      d3.max(data, (d) => d[yKey]) * 1.1,
    ])
    .range([height, 0]);

  // X-Achse zum SVG hinzufügen
  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .append("text")
    .attr("y", 40)
    .attr("x", width / 2)
    .attr("text-anchor", "middle")
    .attr("fill", "currentColor")
    .text("Phasenwinkel (°)");

  // Y-Achse zum SVG hinzufügen
  svg
    .append("g")
    .call(d3.axisLeft(y))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 20)
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .attr("fill", "currentColor")
    .text(yKey);

  // Liniengenerator erstellen
  const line = d3
    .line()
    .x((d) => x(d[xKey]))
    .y((d) => y(d[yKey]));

  // Datenpfad (die Linie) zum SVG hinzufügen
  svg
    .append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2)
    .attr("d", line);
}
