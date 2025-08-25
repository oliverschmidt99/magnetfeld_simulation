document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("analysis-svg")) {
    initializeAnalysisPage();
  }
});

async function initializeAnalysisPage() {
  const runSelect = document.getElementById("run-select");
  const fileSelect = document.getElementById("file-select");
  const placeholder = document.getElementById("visualization-placeholder");

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
    clearVisualization();
    fileSelect.innerHTML =
      '<option value="">-- Wähle zuerst einen Lauf --</option>';
    fileSelect.disabled = true;

    if (!runDir) return;

    // Lade die Dateiliste für den ausgewählten Lauf
    try {
      const response = await fetch(`/analysis/files/${runDir}`);
      const files = await response.json();

      if (files.length > 0) {
        fileSelect.innerHTML =
          '<option value="">-- Ergebnisdatei auswählen --</option>';
        files.forEach((file) => {
          const option = document.createElement("option");
          option.value = file;
          option.textContent = file;
          fileSelect.appendChild(option);
        });
        fileSelect.disabled = false;
      } else {
        fileSelect.innerHTML =
          '<option value="">-- Keine .ans-Dateien gefunden --</option>';
      }
    } catch (e) {
      console.error("Dateiliste konnte nicht geladen werden:", e);
      fileSelect.innerHTML =
        '<option value="">-- Fehler beim Laden --</option>';
    }
  });

  // Event Listener für die Auswahl der Ergebnisdatei
  fileSelect.addEventListener("change", () => {
    const runDir = runSelect.value;
    const filename = fileSelect.value;
    if (!runDir || !filename) {
      clearVisualization();
      return;
    }
    placeholder.style.display = "none";
    loadAndDrawFile(runDir, filename);
  });
}

function clearVisualization() {
  d3.select("#analysis-svg").selectAll("*").remove();
  document.getElementById("visualization-placeholder").style.display = "block";
}

async function loadAndDrawFile(runDir, filename) {
  try {
    const filepath = `${runDir}/femm_files/${filename}`;
    const response = await fetch(`/analysis/data/${filepath}`);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || `Serverfehler: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.nodes || data.nodes.length === 0) {
      throw new Error(
        "Die vom Server empfangenen Daten enthalten keine Knotenpunkte."
      );
    }
    drawVisualization(data);
  } catch (error) {
    console.error("Fehler beim Laden oder Zeichnen der Visualisierung:", error);
    clearVisualization();
    const placeholder = document.getElementById("visualization-placeholder");
    placeholder.innerHTML = `<p style="color: red;"><strong>Fehler:</strong> ${error.message}</p>`;
  }
}

function drawVisualization(data) {
  const svg = d3.select("#analysis-svg");
  svg.selectAll("*").remove();

  // Finde die Grenzen der Geometrie, um die Skalierung zu bestimmen
  const xExtent = d3.extent(data.nodes, (d) => d[0]);
  const yExtent = d3.extent(data.nodes, (d) => d[1]);

  // Überprüfe, ob die Grenzen gültig sind
  if (xExtent.includes(undefined) || yExtent.includes(undefined)) {
    console.error("Ungültige Geometriegrenzen, Visualisierung abgebrochen.");
    return;
  }

  const geoWidth = xExtent[1] - xExtent[0];
  const geoHeight = yExtent[1] - yExtent[0];

  svg.attr("viewBox", `${xExtent[0]} ${yExtent[0]} ${geoWidth} ${geoHeight}`);

  const g = svg.append("g");

  // Skala für die Farbgebung basierend auf der Flussdichte (B)
  const bMax = d3.max(data.elements, (d) => d.b_mag) || 1;
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
    .attr("fill", (d) => colorScale(d.b_mag));

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
