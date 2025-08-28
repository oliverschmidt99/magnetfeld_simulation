document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("dashboard-container");

  fetch("/measurement/data")
    .then((response) => {
      if (!response.ok) {
        // Wirft einen Fehler, wenn die Server-Antwort nicht OK ist (z.B. 404 oder 500)
        return response.json().then((err) => {
          throw new Error(
            err.description || `Server-Fehler: ${response.status}`
          );
        });
      }
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data)) {
        // Prüft, ob die Daten das erwartete Format haben
        throw new Error("Die erhaltenen Daten sind kein gültiges Array.");
      }
      if (data.length === 0) {
        container.innerHTML =
          '<p style="color: #dc3545;">Keine Plot-Daten zum Anzeigen vorhanden.</p>';
        return;
      }

      // Rendert die Plots, wenn alles in Ordnung ist
      data.forEach((plotJSON, index) => {
        const plotDiv = document.createElement("div");
        plotDiv.id = `plot-${index}`;
        plotDiv.className = "plot-container";
        container.appendChild(plotDiv);
        try {
          Plotly.newPlot(plotDiv, JSON.parse(plotJSON));
        } catch (e) {
          console.error("Fehler beim Parsen der Plot-JSON-Daten:", e);
          plotDiv.innerHTML = `<p style="color: #dc3545;">Konnte Plot ${
            index + 1
          } nicht rendern.</p>`;
        }
      });
    })
    .catch((error) => {
      // Zeigt die Fehlermeldung im Container an
      console.error(
        "Fehler beim Abrufen oder Verarbeiten der Plot-Daten:",
        error
      );
      container.innerHTML = `<div style="color: #dc3545; padding: 20px; border: 1px solid #dc3545; border-radius: 5px; background-color: #f8d7da;">
                                     <strong>Fehler:</strong><p>${error.message}</p>
                                   </div>`;
    });
});
