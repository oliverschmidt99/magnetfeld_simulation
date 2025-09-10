document.addEventListener("DOMContentLoaded", () => {
  const nennstromSelect = document.getElementById("nennstrom-select");
  const wandlerSelect = document.getElementById("wandler-select");
  const bewegungSelect = document.getElementById("bewegung-select");
  const generateBtn = document.getElementById("generate-json-btn");

  let libraryData = {};
  let bewegungenData = [];

  // Initialisierungsfunktion
  async function initialize() {
    await Promise.all([loadLibrary(), loadBewegungen()]);
    populateBewegungen();
    updateWandlerOptions();
  }

  async function loadLibrary() {
    try {
      const response = await fetch("/api/library");
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      libraryData = await response.json();
    } catch (error) {
      console.error("Fehler beim Laden der Bibliothek:", error);
      alert(
        "Fehler: Die Bauteil-Bibliothek (library.json) konnte nicht geladen werden."
      );
    }
  }

  async function loadBewegungen() {
    try {
      const response = await fetch("/api/csv-data/3_bewegungen.csv");
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      bewegungenData = data.rows; // KORREKTUR: Sicherstellen, dass wir auf .rows zugreifen
    } catch (error) {
      console.error("Fehler beim Laden der Bewegungsdaten:", error);
      alert(
        "Fehler: Die Bewegungsdaten (3_bewegungen.csv) konnten nicht geladen werden."
      );
    }
  }

  function populateBewegungen() {
    bewegungSelect.innerHTML = "";
    // KORREKTUR: Prüfen, ob bewegungenData definiert ist
    if (bewegungenData && bewegungenData.length > 0) {
      bewegungenData.forEach((b) => {
        const option = document.createElement("option");
        option.value = b.PosGruppe;
        option.textContent = `${b.PosGruppe}: L1(${b.L1 || " "}), L2(${
          b.L2 || " "
        }), L3(${b.L3 || " "})`;
        bewegungSelect.appendChild(option);
      });
    } else {
      const option = document.createElement("option");
      option.textContent = "Keine Bewegungsdaten gefunden";
      bewegungSelect.appendChild(option);
    }
  }

  function updateWandlerOptions() {
    const selectedNennstrom = nennstromSelect.value;
    const searchTag = `${selectedNennstrom} A`;

    const filteredWandler = (libraryData.components?.transformers || []).filter(
      (t) =>
        t.templateProductInformation.tags &&
        t.templateProductInformation.tags.includes(searchTag)
    );

    wandlerSelect.innerHTML = "";
    if (filteredWandler.length > 0) {
      filteredWandler.forEach((t) => {
        const option = document.createElement("option");
        option.value = t.templateProductInformation.name;
        option.textContent = t.templateProductInformation.name;
        wandlerSelect.appendChild(option);
      });
      wandlerSelect.disabled = false;
    } else {
      const option = document.createElement("option");
      option.textContent = "Keine passenden Wandler gefunden";
      wandlerSelect.appendChild(option);
      wandlerSelect.disabled = true;
    }
  }

  async function generateJson() {
    const payload = {
      nennstrom: nennstromSelect.value,
      wandler: wandlerSelect.value,
      bewegungsgruppe: bewegungSelect.value,
      simulationsstroeme: [
        document.getElementById("sim-strom-1").value,
        document.getElementById("sim-strom-2").value,
        document.getElementById("sim-strom-3").value,
      ],
      phasenwinkel: {
        start: document.getElementById("phase-start").value,
        end: document.getElementById("phase-end").value,
        step: document.getElementById("phase-step").value,
      },
    };

    try {
      const response = await fetch("/generate_v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (result.error) {
        alert(`Fehler: ${result.error}`);
      } else {
        document.getElementById("json-output").textContent = JSON.stringify(
          result.data,
          null,
          2
        );
        document.getElementById("result-container").style.display = "block";
        alert(result.message);
      }
    } catch (error) {
      console.error("Fehler bei der JSON-Generierung:", error);
    }
  }

  // Event Listeners
  nennstromSelect.addEventListener("change", updateWandlerOptions);
  generateBtn.addEventListener("click", generateJson);

  // Start
  initialize();
});
