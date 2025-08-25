document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("analysis-svg")) {
    initializeAnalysisPage();
  }
});

let currentRunData = null;

async function initializeAnalysisPage() {
  const runSelect = document.getElementById("run-select");
  const angleSlider = document.getElementById("angle-slider");
  const angleLabel = document.getElementById("angle-label");

  // Lade die verfügbaren Simulationsläufe
  try {
    const response = await fetch("/analysis/runs");
    const runs = await response.json();
    runSelect.innerHTML = '<option value="">-- Lauf auswählen --</option>';
    runs.forEach((run) => {
      const option = document.createElement("option");
      option.value = run;
      option.textContent = run;
      runSelect.appendChild(option);
    });
  } catch (e) {
    console.error("Simulationsläufe konnten nicht geladen werden:", e);
  }

  runSelect.addEventListener("change", async () => {
    const runDir = runSelect.value;
    if (!runDir) {
      clearVisualization();
      return;
    }
    angleSlider.disabled = false;
    await loadAndDrawAngle(runDir, angleSlider.value);
  });

  angleSlider.addEventListener("input", () => {
    const runDir = runSelect.value;
    const angle = angleSlider.value;
    angleLabel.textContent = `Phasenwinkel: ${angle}°`;
    if (runDir) {
      loadAndDrawAngle(runDir, angle);
    }
  });
}

function clearVisualization() {
  const svg = d3.select("#analysis-svg");
  svg.selectAll("*").remove();
  document.getElementById("angle-slider").disabled = true;
  document.getElementById("angle-label").textContent = "Phasenwinkel: 0°";
}

async function loadAndDrawAngle(runDir, angle) {
  try {
    // KORRIGIERT: Robuste Erstellung des Dateinamens.
    // Wir nehmen jetzt einfach den Teil des Verzeichnisnamens nach dem "/"
    const baseFilename = runDir.split("/")[1];
    const filename = `${baseFilename}_angle${angle}deg.ans`;
    const filepath = `${runDir}/femm_files/${filename}`;

    const response = await fetch(`/analysis/data/${filepath}`);
    if (!response.ok)
      throw new Error(
        `Datei nicht gefunden oder Serverfehler: ${response.statusText}`
      );

    const data = await response.json();
    drawVisualization(data);
  } catch (error) {
    console.error("Fehler beim Laden oder Zeichnen der Visualisierung:", error);
    d3.select("#analysis-svg").html(
      `<text x="20" y="40" fill="red">Fehler: ${error.message}</text>`
    );
  }
}

function drawVisualization(data) {
  const svg = d3.select("#analysis-svg");
  svg.selectAll("*").remove();

  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  const width =
    svg.node().getBoundingClientRect().width - margin.left - margin.right;

  // Finde die Grenzen der Geometrie, um die Skalierung zu bestimmen
  const xExtent = d3.extent(data.nodes, (d) => d[0]);
  const yExtent = d3.extent(data.nodes, (d) => d[1]);
  const geoWidth = xExtent[1] - xExtent[0];
  const geoHeight = yExtent[1] - yExtent[0];

  const height = width * (geoHeight / geoWidth);

  svg.attr("viewBox", `${xExtent[0]} ${yExtent[0]} ${geoWidth} ${geoHeight}`);

  const g = svg.append("g");

  // Skala für die Farbgebung basierend auf der Flussdichte (B)
  const bMax = d3.max(data.elements, (d) => d.b_mag);
  const colorScale = d3
    .scaleSequential(d3.interpolateViridis)
    .domain([0, bMax]);

  // Zeichne die Dreiecks-Elemente des Netzes
  g.selectAll("path.element")
    .data(data.elements)
    .enter()
    .append("path")
    .attr(
      "d",
      (d) =>
        `M ${d.nodes[0][0]},${d.nodes[0][1]} L ${d.nodes[1][0]},${d.nodes[1][1]} L ${d.nodes[2][0]},${d.nodes[2][1]} Z`
    )
    .attr("fill", (d) => colorScale(d.b_mag))
    .attr("stroke", "#555")
    .attr("stroke-width", 0.05);

  // Zeichne die Feldlinien (Isolinien des Vektorpotenzials A)
  g.selectAll("path.fieldline")
    .data(data.field_lines)
    .enter()
    .append("path")
    .attr("d", (d) => `M ${d[0][0]},${d[0][1]} L ${d[1][0]},${d[1][1]}`)
    .attr("stroke", "white")
    .attr("stroke-width", 0.3)
    .attr("fill", "none");
}
