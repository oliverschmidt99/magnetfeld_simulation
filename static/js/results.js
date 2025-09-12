document.addEventListener("DOMContentLoaded", () => {
  const runSelector = document.getElementById("run-selector");
  const csvSelector = document.getElementById("csv-selector");
  const yAxisSelector = document.getElementById("y-axis-selector");
  const conductorSelector = document.getElementById("conductor-selector");
  const plotImg = document.getElementById("plot-img");
  const loadingMessage = document.getElementById("loading-message");

  let simulationRuns = [];

  // Lädt die Liste der Simulationsläufe beim Start
  fetch("/api/analysis/runs")
    .then((response) => response.json())
    .then((runs) => {
      simulationRuns = runs;
      if (runs.length === 0) {
        runSelector.add(new Option("Keine Simulationsläufe gefunden.", ""));
      } else {
        runs.forEach((run, index) => {
          const [date, time] = run.name.split("/");
          const formattedName = `${date.slice(0, 4)}-${date.slice(
            4,
            6
          )}-${date.slice(6, 8)} ${time.slice(0, 2)}:${time.slice(
            2,
            4
          )}:${time.slice(4, 6)}`;
          runSelector.add(new Option(formattedName, index));
        });
      }
    });

  // Funktion zum Abrufen und Anzeigen der Plots
  const fetchAndDisplayPlot = () => {
    const runIndex = runSelector.value;
    if (runIndex === "") return;

    const selectedRun = simulationRuns[runIndex];
    const selectedCsv = csvSelector.value;
    if (!selectedCsv) return;

    const selectedYAxis = yAxisSelector.value || "iSecAbs_A";
    const selectedConductors = Array.from(
      conductorSelector.querySelectorAll("input:checked")
    ).map((cb) => cb.value);

    const queryParams = new URLSearchParams();
    queryParams.append("y_axis", selectedYAxis);
    selectedConductors.forEach((c) => queryParams.append("conductors[]", c));

    plotImg.style.visibility = "hidden";
    loadingMessage.style.display = "block";

    fetch(
      `/api/analysis/pandas_plots/${
        selectedRun.name
      }/${selectedCsv}?${queryParams.toString()}`
    )
      .then((response) => response.json())
      .then((data) => {
        loadingMessage.style.display = "none";
        if (data.error) {
          plotImg.style.display = "none";
          document.getElementById(
            "results-content"
          ).innerHTML = `<p style="color: red;">Fehler: ${data.error}</p>`;
          return;
        }

        const isYAxisEmpty = yAxisSelector.options.length <= 1;
        if (isYAxisEmpty) {
          yAxisSelector.innerHTML = "";
          data.columns.forEach((col) => {
            yAxisSelector.add(new Option(col.name, col.value));
          });
          yAxisSelector.disabled = false;
        }

        conductorSelector.innerHTML = "";
        data.conductors.forEach((conductor) => {
          const label = document.createElement("label");
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.value = conductor;
          checkbox.checked = true;
          checkbox.addEventListener("change", fetchAndDisplayPlot);
          label.appendChild(checkbox);
          label.appendChild(document.createTextNode(conductor));
          conductorSelector.appendChild(label);
        });

        plotImg.src = "data:image/png;base64," + data.plot;
        plotImg.style.visibility = "visible";
      })
      .catch((error) => {
        loadingMessage.style.display = "none";
        document.getElementById(
          "results-content"
        ).innerHTML = `<p style="color: red;">Ein unerwarteter Fehler ist aufgetreten: ${error}</p>`;
      });
  };

  runSelector.addEventListener("change", () => {
    const runIndex = runSelector.value;
    csvSelector.innerHTML =
      '<option value="">Bitte zuerst einen Lauf wählen...</option>';
    csvSelector.disabled = true;
    yAxisSelector.innerHTML =
      '<option value="">Bitte zuerst eine Datei wählen...</option>';
    yAxisSelector.disabled = true;
    conductorSelector.innerHTML = "";
    plotImg.style.visibility = "hidden";

    if (runIndex !== "") {
      const selectedRun = simulationRuns[runIndex];
      csvSelector.innerHTML = "";
      selectedRun.csv_files.forEach((file) => {
        csvSelector.add(new Option(file, file));
      });
      csvSelector.disabled = false;
      // Automatisch das erste CSV-File und die Plots laden
      fetchAndDisplayPlot();
    }
  });

  csvSelector.addEventListener("change", () => {
    // Setzt nur die Y-Achse und die Leiter zurück, wenn eine neue CSV gewählt wird
    yAxisSelector.innerHTML =
      '<option value="">Bitte zuerst eine Datei wählen...</option>';
    yAxisSelector.disabled = true;
    conductorSelector.innerHTML = "";
    fetchAndDisplayPlot();
  });

  yAxisSelector.addEventListener("change", fetchAndDisplayPlot);
});
