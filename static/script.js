// Dieser Event-Listener stellt sicher, dass der Code erst ausgeführt wird,
// wenn die gesamte HTML-Seite geladen und bereit ist.
document.addEventListener("DOMContentLoaded", () => {
  // ############ Globale Variablen und DOM-Elemente ############
  const mainMenuView = document.getElementById("main-menu-view");
  const projectEditorView = document.getElementById("project-editor-view");
  const canvas = document.getElementById("editor-canvas");
  const ctx = canvas.getContext("2d");

  // Zustandsobjekt zur Verwaltung des Editors
  let editorState = {
    currentTool: "select",
    isDrawing: false,
    startX: 0,
    startY: 0,
    snapshot: null, // Für die Live-Vorschau beim Zeichnen
  };

  // Arrays für die Undo/Redo-Funktionalität
  let history = [];
  let historyStep = -1;

  // ############ LOGIK FÜR HAUPTMENÜ ############

  // Event-Listener für den "Projekt erstellen"-Button
  document
    .getElementById("create-project-btn")
    .addEventListener("click", () => {
      const projectName = document.getElementById("proj-name").value.trim();
      if (!projectName) {
        alert("Bitte gib einen Projektnamen ein.");
        return;
      }

      // UI-Ansichten umschalten
      document.getElementById(
        "project-title-display"
      ).textContent = `Projekt: ${projectName}`;
      mainMenuView.classList.add("hidden");
      projectEditorView.classList.remove("hidden");

      // Editor zurücksetzen und ersten Zustand speichern
      resetCanvas();
      saveState();
    });

  // Event-Listener für den "Projekt schließen"-Button
  document.getElementById("close-project-btn").addEventListener("click", () => {
    // Hier könnte man eine "Wollen Sie wirklich schließen?"-Abfrage einbauen
    mainMenuView.classList.remove("hidden");
    projectEditorView.classList.add("hidden");
  });

  // Event-Listener für den "Materialien laden"-Button
  document
    .getElementById("load-materials-btn")
    .addEventListener("click", async () => {
      const container = document.getElementById("material-list-container");
      container.textContent = "Lade Materialien...";
      try {
        // Asynchroner Aufruf an den Flask-Endpunkt
        const response = await fetch("/get-materials");
        const data = await response.json();

        if (!response.ok) {
          // Zeigt Fehlermeldungen vom Server an (z.B. "Datei nicht gefunden")
          throw new Error(data.error || "Unbekannter Serverfehler");
        }

        // Materialliste im UI erstellen
        const list = document.createElement("ul");
        data.forEach((material) => {
          const item = document.createElement("li");
          item.textContent = `${material.name} (μx = ${material.mu_x})`;
          list.appendChild(item);
        });
        container.innerHTML = ""; // Alten Inhalt leeren
        container.appendChild(list);
      } catch (error) {
        console.error("Fehler beim Laden der Materialien:", error);
        container.textContent = `Fehler: ${error.message}`;
      }
    });

  // ############ LOGIK FÜR EDITOR ############

  // Werkzeugauswahl im Ribbon-Menü
  document.querySelectorAll(".tool-selector").forEach((button) => {
    button.addEventListener("click", () => {
      document
        .querySelector(".tool-selector.selected")
        ?.classList.remove("selected");
      button.classList.add("selected");
      editorState.currentTool = button.dataset.tool;
    });
  });

  // Undo/Redo-Buttons
  document.getElementById("undo-btn").addEventListener("click", undo);
  document.getElementById("redo-btn").addEventListener("click", redo);

  // Aufruf der Simulations-Route
  document
    .getElementById("start-simulation-btn")
    .addEventListener("click", runSimulation);

  // --- Canvas-Zeichenlogik ---
  canvas.addEventListener("mousedown", startDrawing);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", stopDrawing);
  canvas.addEventListener("mouseout", stopDrawing); // Beendet Zeichnen, wenn Maus Canvas verlässt

  function startDrawing(e) {
    if (editorState.currentTool === "select") return;
    editorState.isDrawing = true;
    editorState.startX = e.offsetX;
    editorState.startY = e.offsetY;
    // "Schnappschuss" der aktuellen Canvas für die Live-Vorschau machen
    editorState.snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  function draw(e) {
    if (!editorState.isDrawing) return;
    // Schnappschuss wiederherstellen, um nur die finale Form zu zeigen
    ctx.putImageData(editorState.snapshot, 0, 0);
    drawShape(e.offsetX, e.offsetY);
  }

  function stopDrawing(e) {
    if (!editorState.isDrawing) return;
    editorState.isDrawing = false;
    // Finale Form auf die Canvas zeichnen
    drawShape(e.offsetX, e.offsetY);
    // Den neuen Zustand in der History speichern
    saveState();
  }

  function drawShape(x2, y2) {
    ctx.beginPath();
    // Hier könnten in Zukunft Farbe, Linienstärke etc. aus dem UI ausgelesen werden
    ctx.strokeStyle = "#0000FF"; // Standard-Randfarbe
    ctx.lineWidth = 2;

    const x1 = editorState.startX;
    const y1 = editorState.startY;

    switch (editorState.currentTool) {
      case "line":
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke(); // Nur Rand
        break;
      case "rect":
        ctx.rect(x1, y1, x2 - x1, y2 - y1);
        ctx.stroke(); // Nur Rand
        break;
      case "circle":
        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        ctx.arc(x1, y1, radius, 0, 2 * Math.PI);
        ctx.stroke(); // Nur Rand
        break;

      // NEUER CODE FÜR BAUTEILE
      case "leiter":
        ctx.fillStyle = "#b87333"; // Kupfer-Farbe
        ctx.rect(x1, y1, x2 - x1, y2 - y1);
        ctx.fill(); // Gefülltes Rechteck
        break;
      case "wandler":
        ctx.fillStyle = "#808080"; // Grau für den Kern
        const outerRadius = Math.sqrt(
          Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)
        );
        const innerRadius = outerRadius * 0.7; // Innenradius ist 70% des Außenradius

        // Donut-Form zeichnen
        ctx.arc(x1, y1, outerRadius, 0, 2 * Math.PI); // Äußerer Kreis
        ctx.arc(x1, y1, innerRadius, 0, 2 * Math.PI, true); // Innerer Kreis (gegen Uhrzeigersinn)
        ctx.fill(); // Füllen
        break;
    }
  }

  // --- Undo/Redo-Logik ---
  function saveState() {
    historyStep++;
    // Wenn wir in der History zurückgegangen sind, wird die "Zukunft" verworfen
    if (historyStep < history.length) {
      history.length = historyStep;
    }
    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  }

  function undo() {
    if (historyStep > 0) {
      historyStep--;
      ctx.putImageData(history[historyStep], 0, 0);
    }
  }

  function redo() {
    if (historyStep < history.length - 1) {
      historyStep++;
      ctx.putImageData(history[historyStep], 0, 0);
    }
  }

  function resetCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    history = [];
    historyStep = -1;
  }

  // --- Simulations-Logik ---
  async function runSimulation() {
    const outputEl = document.getElementById("output-pre");
    outputEl.textContent = "Simulation wird ausgeführt...";
    try {
      // Hier könnten die Canvas-Daten an das Backend gesendet werden
      // const canvasData = canvas.toDataURL(); // Beispiel
      const response = await fetch("/run-simulation", {
        method: "POST",
        // body: JSON.stringify({ canvas: canvasData }), // Beispiel
        // headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();

      if (response.ok) {
        outputEl.textContent = `Erfolg:\n${result.output}`;
      } else {
        outputEl.textContent = `Fehler:\n${result.error}`;
      }
    } catch (error) {
      console.error("Fetch-Fehler:", error);
      outputEl.textContent = `Ein schwerwiegender Fehler ist aufgetreten: ${error.message}`;
    }
  }
}); // Ende von DOMContentLoaded

// ############ GLOBALE STEUERUNGSFUNKTIONEN (außerhalb von DOMContentLoaded) ############

// Umschalten der Tabs im Hauptmenü
function showMainMenuTab(tabId) {
  document
    .querySelectorAll(".main-panel")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".main-tab")
    .forEach((t) => t.classList.remove("active"));

  const panel = document.getElementById(tabId + "-panel");
  if (panel) {
    panel.classList.add("active");
  }

  // `event.currentTarget` ist eine robustere Alternative zur manuellen Selektion
  if (event && event.currentTarget) {
    event.currentTarget.classList.add("active");
  }
}

// Umschalten der Tabs in der Ribbon-Bar
function showTab(tabId) {
  document
    .querySelectorAll(".ribbon-panel")
    .forEach((panel) => panel.classList.remove("active"));
  document
    .querySelectorAll(".ribbon-tab")
    .forEach((tab) => tab.classList.remove("active"));

  // NEUE, SICHERE VERSION
  const panel = document.getElementById(tabId + "-tab");
  if (panel) {
    panel.classList.add("active");
  } else {
    console.error(
      `Fehler: Panel mit der ID '${tabId}-tab' wurde nicht gefunden.`
    );
  }

  if (event && event.currentTarget) {
    event.currentTarget.classList.add("active");
  }
}
