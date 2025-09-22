// static/js/configurator-simulation.js

let progressInterval;

/**
 * Startet den Simulationsprozess im Backend.
 */
function startSimulation() {
  const outputElement = document.getElementById("simulation-output");
  const progressContainer = document.getElementById("simulation-progress");
  const startButton = document.getElementById("start-simulation-btn");

  startButton.disabled = true;
  outputElement.textContent = "Starte Simulation...";
  progressContainer.style.display = "block";

  fetch("/start_simulation", {
    method: "POST",
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.status === "success") {
        outputElement.textContent =
          "Simulation im Hintergrund gestartet. Warte auf Fortschritt...";
        pollProgress();
      } else {
        outputElement.textContent = `Fehler: ${data.error}`;
        startButton.disabled = false;
      }
    })
    .catch((error) => {
      outputElement.textContent = `Schwerwiegender Fehler: ${error}`;
      startButton.disabled = false;
    });
}

/**
 * Fragt den Fortschritt der Simulation periodisch vom Backend ab.
 */
function pollProgress() {
  let startTime = Date.now();
  const timerElement = document.getElementById("progress-timer");

  progressInterval = setInterval(() => {
    fetch("/simulation_progress")
      .then((response) => response.json())
      .then((data) => {
        const progressBar = document.getElementById("progress-bar");
        const progressText = document.getElementById("progress-text");
        const progressSummary = document.getElementById("progress-summary");

        const elapsedTime = (Date.now() - startTime) / 1000;
        timerElement.textContent = `Verstrichene Zeit: ${formatTime(
          elapsedTime
        )}`;

        if (data.status === "running") {
          const percent =
            data.total > 0 ? (data.completed / data.total) * 100 : 0;
          progressBar.style.width = `${percent}%`;
          progressText.textContent = `${data.completed} / ${data.total} Teilschritte abgeschlossen.`;
        } else if (data.status === "complete") {
          progressBar.style.width = "100%";
          progressText.textContent = `Simulation abgeschlossen!`;
          progressSummary.textContent = `Gesamtdauer: ${formatTime(
            data.duration
          )}`;
          timerElement.textContent = "";
          clearInterval(progressInterval);
          document.getElementById("start-simulation-btn").disabled = false;
        } else if (data.status === "idle") {
          clearInterval(progressInterval);
          document.getElementById("start-simulation-btn").disabled = false;
        }
      })
      .catch((error) => {
        console.error("Fehler beim Abrufen des Fortschritts:", error);
        clearInterval(progressInterval);
        document.getElementById("start-simulation-btn").disabled = false;
      });
  }, 2000);
}

/**
 * Formatiert Sekunden in ein lesbares Zeitformat (z.B. 1h 2m 3s).
 * @param {number} seconds Die zu formatierende Zeit in Sekunden.
 * @returns {string} Ein formatierter Zeit-String.
 */
function formatTime(seconds) {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);

  let timeString = "";
  if (h > 0) timeString += `${h}h `;
  if (m > 0 || h > 0) timeString += `${m}m `;
  timeString += `${s}s`;

  return timeString.trim();
}
