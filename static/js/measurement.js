document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("dashboard-container");
  const customLegendContainer = document.getElementById(
    "custom-legend-container"
  );

  // Globale Zustände, um den Status der UI zu speichern
  let legendState = {}; // Speichert, welche Legenden-Checkboxen aktiv sind
  let activeCurrentIndexState = {}; // Speichert für jeden Plot, welcher Strom-Button aktiv ist
  let isApplyingRestyle = false; // Ein "Schloss", um Endlosschleifen zu verhindern

  // Wendet die Sichtbarkeit basierend auf den globalen Zuständen an
  function applyVisibility() {
    if (isApplyingRestyle) return; // Verhindert Rekursion
    isApplyingRestyle = true;

    const plotDivs = document.querySelectorAll(".plot-container");
    plotDivs.forEach((div, plotIndex) => {
      if (!div.plotData) return;

      const traces = div.plotData.data;
      const buttons = div.plotData.layout.updatemenus[0].buttons;
      const tracesPerCurrent = traces.length / buttons.length;
      const activeCurrentIndex = activeCurrentIndexState[plotIndex] || 0;

      const visibilityUpdates = [];
      traces.forEach((trace, traceIndex) => {
        const traceGroup = trace.legendgroup;
        const belongsToActiveCurrent =
          Math.floor(traceIndex / tracesPerCurrent) === activeCurrentIndex;

        // Eine Spur ist sichtbar, WENN ihre Gruppe in der Legende aktiviert ist UND sie zur aktiven Stromstärke gehört.
        const isVisible = legendState[traceGroup] && belongsToActiveCurrent;
        visibilityUpdates.push(isVisible);
      });

      Plotly.restyle(div, { visible: visibilityUpdates });
    });

    // Nach einer kurzen Verzögerung das "Schloss" wieder öffnen
    setTimeout(() => {
      isApplyingRestyle = false;
    }, 100);
  }

  // Erstellt die benutzerdefinierte HTML-Legende aus den Plot-Daten
  function createCustomLegend(plotsData) {
    customLegendContainer.innerHTML = "";
    legendState = {}; // Zustand zurücksetzen
    const legendGroups = new Map();

    if (plotsData.length > 0) {
      const firstPlotData = JSON.parse(plotsData[0]).data;
      firstPlotData.forEach((trace) => {
        if (trace.legendgroup && !legendGroups.has(trace.legendgroup)) {
          const isVisible = trace.visible !== "legendonly";
          legendGroups.set(trace.legendgroup, {
            name: trace.name,
            color: trace.marker ? trace.marker.color : "#ccc",
          });
          legendState[trace.legendgroup] = isVisible;
        }
      });
    }

    legendGroups.forEach((details, group) => {
      const item = document.createElement("div");
      item.className = "legend-item";
      item.innerHTML = `
                <input type="checkbox" data-group="${group}" ${
        legendState[group] ? "checked" : ""
      }>
                <span class="color-box" style="background-color:${
                  details.color
                };"></span>
                <label>${details.name}</label>
            `;
      customLegendContainer.appendChild(item);
    });
  }

  // Event-Listener für Klicks auf die Legenden-Checkboxes
  customLegendContainer.addEventListener("change", (e) => {
    if (e.target.type === "checkbox") {
      const group = e.target.dataset.group;
      legendState[group] = e.target.checked;
      applyVisibility();
    }
  });

  // Lädt die Plot-Daten vom Server und initialisiert die Seite
  function loadPlots() {
    container.innerHTML = "<p>Lade Plots...</p>";
    fetch("/measurement/data")
      .then((response) => response.json())
      .then((data) => {
        container.innerHTML = "";
        if (!data || !Array.isArray(data.plots) || data.plots.length === 0) {
          container.innerHTML =
            '<p style="color: #dc3545;">Keine Plot-Daten zum Anzeigen vorhanden.</p>';
          customLegendContainer.innerHTML = "";
          return;
        }

        createCustomLegend(data.plots);

        data.plots.forEach((plotJSON, index) => {
          const plotDiv = document.createElement("div");
          plotDiv.id = `plot-${index}`;
          plotDiv.className = "plot-container";
          container.appendChild(plotDiv);

          try {
            const plotData = JSON.parse(plotJSON);
            plotDiv.plotData = plotData;
            activeCurrentIndexState[index] =
              plotData.layout.updatemenus[0].active || 0;

            Plotly.newPlot(plotDiv, plotData.data, plotData.layout, {
              responsive: true,
            });

            // Event-Listener, der auf den Klick des Strom-Buttons reagiert
            plotDiv.on("plotly_restyle", () => {
              if (isApplyingRestyle) return; // Ignoriere Events, die wir selbst ausgelöst haben

              // Aktualisiere den Zustand und wende die Legenden-Regeln an
              activeCurrentIndexState[index] =
                plotDiv.layout.updatemenus[0].active;
              applyVisibility();
            });
          } catch (e) {
            console.error("Fehler beim Rendern von Plot " + index, e);
            plotDiv.innerHTML = `<p style="color: #dc3545;">Konnte Plot ${
              index + 1
            } nicht rendern.</p>`;
          }
        });
      })
      .catch((error) => {
        console.error("Fehler beim Abrufen der Plot-Daten:", error);
        container.innerHTML = `<div style="color: #dc3545;"><strong>Fehler:</strong><p>${error.message}</p></div>`;
        customLegendContainer.innerHTML = "";
      });
  }

  loadPlots();
});
