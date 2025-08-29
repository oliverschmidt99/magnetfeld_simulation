// static/js/measurement.js
// JavaScript für die Messungs-Seite.
// Handhabt die Konfiguration und die Visualisierung der Messungen.

document.addEventListener("DOMContentLoaded", () => {
  const configEditor = document.getElementById("config-editor");
  const plotsPanel = document.getElementById("dashboard-container");
  const saveButton = document.getElementById("save-config-btn");
  const reloadButton = document.getElementById("reload-plots-btn");
  const saveStatus = document.getElementById("save-status");

  let currentConfig = {};
  let plotLayout = {};
  let plots = {};

  // Funktion zum Laden der Konfiguration und Plots
  function loadConfigAndPlots() {
    saveStatus.textContent = "";
    fetch("/measurement/config")
      .then((response) => response.json())
      .then((config) => {
        currentConfig = config;
        renderConfigEditor();
        loadPlots();
      })
      .catch((error) => {
        saveStatus.textContent = "Fehler beim Laden der Konfiguration.";
        console.error("Error loading config:", error);
      });
  }

  // Funktion zum Laden der Plots aus dem Backend
  function loadPlots() {
    plotsPanel.innerHTML = "<p>Plots werden geladen...</p>";
    fetch("/measurement/data")
      .then((response) => response.json())
      .then((data) => {
        if (data.plots && data.plots.length > 0) {
          plotsPanel.innerHTML = "";
          data.plots.forEach((plotJson, index) => {
            const plotData = JSON.parse(plotJson);
            const plotDiv = document.createElement("div");
            plotDiv.id = `plot-${index}`;
            plotDiv.className = "measurement-plot";
            plotsPanel.appendChild(plotDiv);
            Plotly.newPlot(plotDiv, plotData.data, plotData.layout);
          });
        } else {
          plotsPanel.innerHTML =
            "<p>Keine Plots verfügbar. Prüfe die CSV-Konfiguration.</p>";
        }
      })
      .catch((error) => {
        plotsPanel.innerHTML = "<p>Fehler beim Laden der Visualisierung.</p>";
        console.error("Error loading plots:", error);
      });
  }

  // Funktion zum Rendern des Konfigurationseditors
  function renderConfigEditor() {
    // ... (Platzhalter für die UI-Erstellung)
    // Hier würde die Logik zum Erstellen der Formulare für Positionsgruppen,
    // Spielraum und Startpositionen basierend auf `currentConfig` stehen.
    // Da dies sehr umfangreich ist, wird es hier weggelassen.
    // Die `saveConfig` Funktion am Ende zeigt, wie die Daten gesendet werden.
  }

  // Funktion zum Speichern der Konfiguration
  saveButton.addEventListener("click", () => {
    // Dummy-Daten, da das UI-Rendering fehlt
    const dataToSave = {
      positionsgruppen: [{ name: "Pos1", bewegungen: [], schrittweiten: [] }],
      spielraum: [
        {
          Strom: 1000,
          "-maxX": -200,
          "+maxX": 200,
          "-maxY": -150,
          "+maxY": 150,
        },
      ],
      startpositionen: [{ Strom: 1000, x1_in: -20, x2_in: 0, x3_in: 20 }],
    };

    fetch("/measurement/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataToSave),
    })
      .then((response) => response.json())
      .then((result) => {
        saveStatus.textContent = result.message;
        saveStatus.className = "save-status success";
      })
      .catch((error) => {
        saveStatus.textContent = "Fehler beim Speichern.";
        saveStatus.className = "save-status error";
        console.error("Error saving config:", error);
      });
  });

  reloadButton.addEventListener("click", loadPlots);

  // Initialen Ladevorgang starten
  loadConfigAndPlots();
});
