document.addEventListener("DOMContentLoaded", () => {
  const runSelector = document.getElementById("run-selector");
  const conductorSelector = document.getElementById("conductor-selector");

  // Lädt die Liste der Simulationsläufe beim Start
  fetch("/api/analysis/runs")
    .then((response) => response.json())
    .then((runs) => {
      if (runs.length === 0) {
        runSelector.add(new Option("Keine Simulationsläufe gefunden.", ""));
      } else {
        runs.forEach((run) => {
          const [date, time] = run.split("/");
          const formattedName = `${date.slice(0, 4)}-${date.slice(
            4,
            6
          )}-${date.slice(6, 8)} ${time.slice(0, 2)}:${time.slice(
            2,
            4
          )}:${time.slice(4, 6)}`;
          runSelector.add(new Option(formattedName, run));
        });
      }
    });

  // Funktion zum Abrufen und Anzeigen der Plots
  const fetchAndDisplayPlots = () => {
    const selectedRun = runSelector.value;
    if (!selectedRun) return;

    const loadingMessage = document.getElementById("loading-message");
    const plotImg1 = document.getElementById("plot-isec");
    const plotImg2 = document.getElementById("plot-bmag");

    // Sammle alle ausgewählten Leiter aus den Checkboxen
    const selectedConductors = Array.from(
      conductorSelector.querySelectorAll("input:checked")
    ).map((cb) => cb.value);
    const queryParams = new URLSearchParams();
    selectedConductors.forEach((c) => queryParams.append("conductors[]", c));

    plotImg1.style.visibility = "hidden";
    plotImg2.style.visibility = "hidden";
    loadingMessage.style.display = "block";

    fetch(`/api/analysis/pandas_plots/${selectedRun}?${queryParams.toString()}`)
      .then((response) => response.json())
      .then((data) => {
        loadingMessage.style.display = "none";
        if (data.error) {
          document.getElementById(
            "results-content"
          ).innerHTML = `<p style="color: red;">Fehler: ${data.error}</p>`;
          return;
        }

        // Erstellt die Checkboxen, wenn sie zum ersten Mal geladen werden
        if (conductorSelector.children.length === 0) {
          data.conductors.forEach((conductor) => {
            const label = document.createElement("label");
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.value = conductor;
            checkbox.checked = true; // Standardmäßig alle anwählen
            checkbox.addEventListener("change", fetchAndDisplayPlots); // Bei Änderung neu laden

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(conductor));
            conductorSelector.appendChild(label);
          });
        }

        // Setzt die Bilddaten
        plotImg1.src = "data:image/png;base64," + data.plots.plot_isec;
        plotImg2.src = "data:image/png;base64," + data.plots.plot_bmag;
      })
      .catch((error) => {
        loadingMessage.style.display = "none";
        document.getElementById(
          "results-content"
        ).innerHTML = `<p style="color: red;">Ein unerwarteter Fehler ist aufgetreten: ${error}</p>`;
      });
  };

  // Event Listener für das Haupt-Dropdown
  runSelector.addEventListener("change", () => {
    conductorSelector.innerHTML = ""; // Setzt die Checkboxen zurück, wenn ein neuer Lauf gewählt wird
    fetchAndDisplayPlots();
  });
});
