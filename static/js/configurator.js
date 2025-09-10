document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("simulation-form")) {
    initializeConfigurator();
  }
});

function initializeConfigurator() {
  // Ruft die globale Funktion aus main.js auf (falls vorhanden)
  if (typeof initializeCardNavigation === "function") {
    initializeCardNavigation("config-nav", "config-sections");
  }
  loadState();

  const form = document.getElementById("simulation-form");
  form.addEventListener("input", saveState);
  form.addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON" && e.target.type === "button") {
      setTimeout(saveState, 50);
    }
  });

  // NEU: Event-Listener für Nennstrom, um Wandlerlisten bei Änderung neu zu filtern
  document.getElementById("ratedCurrent").addEventListener("change", () => {
    // Speichere den aktuellen Zustand, bevor die Baugruppen neu aufgebaut werden
    const data = gatherFormData();

    const asmList = document.getElementById("assemblies-list");
    asmList.innerHTML = "";
    assemblyCounter = 0; // Zähler zurücksetzen

    // Baugruppen mit den alten Daten, aber neuen gefilterten Wandlerlisten neu erstellen
    data.assemblies.forEach((asm) => addAssembly(asm));
    updateAssemblyPhaseDropdowns(); // Wichtig, um die Phasen wieder korrekt zuzuordnen
  });

  // Dein bestehender Code für Szenarien-Buttons...
  // document.getElementById("save-scenario-btn").addEventListener("click", saveScenario);
  // ...

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const data = gatherFormData();

    // Einfache Validierung
    if (!data.simulationParams.movementGroup) {
      alert(
        "Bitte wähle eine Bewegungsgruppe unter 'Allgemeine Parameter' aus."
      );
      return;
    }

    fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.error) {
          alert(`Fehler: ${result.error}`);
        } else {
          alert(result.message);
          // Optional: Zeige das Ergebnis in der Zusammenfassung an
          const output = document.getElementById("summary-output");
          if (output) output.textContent = JSON.stringify(result.data, null, 2);
        }
      });
  });
}

const libraryDataElement = document.getElementById("library-data");
const library = libraryDataElement
  ? JSON.parse(libraryDataElement.textContent)
  : {};
const SQRT2 = Math.sqrt(2);
let phaseCounter = 0;
let assemblyCounter = 0;
let standaloneCounter = 0;

// Deine bestehenden Funktionen (updatePeak, updateRms, etc.)
// ...

function updateAssemblyPhaseDropdowns() {
  const phaseItems = document.querySelectorAll(
    "#electrical-system-list .list-item"
  );
  const phases = Array.from(phaseItems).map(
    (item) => item.querySelector(".phase-name").value
  );

  document.querySelectorAll(".assembly-phase-select").forEach((select) => {
    const selectedValue = select.value;
    select.innerHTML = "";
    phases.forEach((p) => {
      const option = document.createElement("option");
      option.value = p;
      option.textContent = p;
      if (p === selectedValue) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  });
}

function addPhase(data = {}) {
  phaseCounter++;
  const list = document.getElementById("electrical-system-list");
  const item = document.createElement("div");
  item.className = "list-item";
  item.id = `phase-${phaseCounter}`;
  const defaultRms = 4000;
  const peak = data.peakCurrentA || (defaultRms * SQRT2).toFixed(2);
  const rms = (peak / SQRT2).toFixed(2);
  item.innerHTML = `<h4>Phase ${phaseCounter}</h4><label>Name:</label><input type="text" class="phase-name" value="${
    data.name || `L${phaseCounter}`
  }" onkeyup="updateAssemblyPhaseDropdowns()"><label>Phasenverschiebung (°):</label><input type="number" class="phase-shift" value="${
    data.phaseShiftDeg ?? 0
  }"><div class="form-row"><div><label>Spitzenstrom (A):</label><input type="number" step="any" id="phase-${phaseCounter}-peak" class="phase-peak" value="${peak}" oninput="updateRms(${phaseCounter}, 'phase')"></div><div><label>Effektivstrom (A):</label><input type="number" step="any" id="phase-${phaseCounter}-rms" class="phase-rms" value="${rms}" oninput="updatePeak(${phaseCounter}, 'phase')"></div></div><button type="button" onclick="removeItem('phase-${phaseCounter}'); updateAssemblyPhaseDropdowns();">Entfernen</button>`;
  list.appendChild(item);
}

function addAssembly(data = {}) {
  assemblyCounter++;
  const list = document.getElementById("assemblies-list");
  const item = document.createElement("div");
  item.className = "list-item";
  item.id = `assembly-${assemblyCounter}`;

  // NEU: Filtere die Wandler basierend auf dem aktuell ausgewählten Nennstrom
  const nennstrom = document.getElementById("ratedCurrent").value;
  const searchTag = `${nennstrom} A`;

  const railOptions = (library.components?.copperRails || [])
    .map(
      (r) =>
        `<option value="${r.templateProductInformation.name}" ${
          data.copperRailName === r.templateProductInformation.name
            ? "selected"
            : ""
        }>${r.templateProductInformation.name}</option>`
    )
    .join("");

  const transformerOptions = (library.components?.transformers || [])
    .filter(
      (t) =>
        t.templateProductInformation.tags &&
        t.templateProductInformation.tags.includes(searchTag)
    )
    .map(
      (t) =>
        `<option value="${t.templateProductInformation.name}" ${
          data.transformerName === t.templateProductInformation.name
            ? "selected"
            : ""
        }>${t.templateProductInformation.name}</option>`
    )
    .join("");

  // GEÄNDERT: X- und Y-Inputs wurden entfernt.
  item.innerHTML = `
    <h4>Baugruppe ${assemblyCounter}</h4>
    <label>Name:</label><input type="text" class="assembly-name" value="${
      data.name || `Assembly_${assemblyCounter}`
    }">
    <label>Zugeordnete Phase:</label><select class="assembly-phase-select">${
      data.phaseName || ""
    }</select>
    <label>Kupferschiene:</label><select class="copper-rail">${railOptions}</select>
    <label>Wandler (gefiltert für ${nennstrom}A):</label><select class="transformer">${transformerOptions}</select>
    <button type="button" onclick="removeItem('assembly-${assemblyCounter}')">Entfernen</button>`;
  list.appendChild(item);
}

function addStandalone(data = {}) {
  standaloneCounter++;
  const list = document.getElementById("standalone-list");
  const item = document.createElement("div");
  item.className = "list-item";
  item.id = `standalone-${standaloneCounter}`;
  let sheetOptions = (library.components?.transformerSheets || [])
    .map(
      (s) =>
        `<option value="${s.templateProductInformation.name}" ${
          data.name === s.templateProductInformation.name ? "selected" : ""
        }>${s.templateProductInformation.name}</option>`
    )
    .join("");
  item.innerHTML = `<h4>Eigenständiges Bauteil ${standaloneCounter}</h4><label>Bauteil:</label><select class="standalone-name">${sheetOptions}</select><label>Position X:</label><input type="number" class="pos-x" value="${
    data.position?.x || 0
  }"><label>Position Y:</label><input type="number" class="pos-y" value="${
    data.position?.y || 0
  }"><button type="button" onclick="removeItem('standalone-${standaloneCounter}')">Entfernen</button>`;
  list.appendChild(item);
}

function removeItem(id) {
  const item = document.getElementById(id);
  if (item) item.remove();
}

function gatherFormData() {
  const form = document.getElementById("simulation-form");
  const data = {
    simulationParams: {
      // NEU: Nennstrom und Bewegungsgruppe werden mitgesammelt
      ratedCurrent: form.querySelector("#ratedCurrent").value,
      movementGroup: form.querySelector("#movementGroup").value,
      frequencyHz: form.querySelector("#frequencyHz").value,
      problemDepthM: form.querySelector("#problemDepthM").value,
      coreRelPermeability: form.querySelector("#coreRelPermeability").value,
    },
    electricalSystem: [],
    assemblies: [],
    standAloneComponents: [],
  };

  form
    .querySelectorAll("#electrical-system-list .list-item")
    .forEach((item) => {
      data.electricalSystem.push({
        name: item.querySelector(".phase-name").value,
        phaseShiftDeg: parseInt(item.querySelector(".phase-shift").value),
        peakCurrentA: parseFloat(item.querySelector(".phase-peak").value),
      });
    });

  form.querySelectorAll("#assemblies-list .list-item").forEach((item) => {
    data.assemblies.push({
      name: item.querySelector(".assembly-name").value,
      phaseName: item.querySelector(".assembly-phase-select").value,
      copperRailName: item.querySelector(".copper-rail").value,
      transformerName: item.querySelector(".transformer").value,
    });
  });

  form.querySelectorAll("#standalone-list .list-item").forEach((item) => {
    data.standAloneComponents.push({
      name: item.querySelector(".standalone-name").value,
      position: {
        x: parseInt(item.querySelector(".pos-x").value),
        y: parseInt(item.querySelector(".pos-y").value),
      },
    });
  });
  return data;
}

// Deine restlichen Funktionen (updateSummary, saveState, loadState, etc.)
// sollten weitgehend ohne Änderungen funktionieren. `loadState` muss
// die neuen Felder in `simulationParams` berücksichtigen.

function saveState() {
  if (!document.getElementById("simulation-form")) return;
  const data = gatherFormData();
  localStorage.setItem("latestSimConfig", JSON.stringify(data));
  // updateSummary(); // updateSummary aufrufen, um die Vorschau live zu aktualisieren
}

function loadState(data = null) {
  const configData =
    data || JSON.parse(localStorage.getItem("latestSimConfig"));

  const elsList = document.getElementById("electrical-system-list");
  const asmList = document.getElementById("assemblies-list");
  const stdList = document.getElementById("standalone-list");

  if (!elsList || !asmList || !stdList) return;

  // Listen leeren
  elsList.innerHTML = "";
  asmList.innerHTML = "";
  stdList.innerHTML = "";
  phaseCounter = 0;
  assemblyCounter = 0;
  standaloneCounter = 0;

  if (!configData) {
    // initializeDefaultSetup(); // Optional: Standard-Setup laden
    return;
  }

  const params = configData.simulationParams;
  // NEU: Lade auch die neuen Parameter
  document.getElementById("ratedCurrent").value = params.ratedCurrent || "600";
  document.getElementById("movementGroup").value = params.movementGroup || "";
  document.getElementById("frequencyHz").value = params.frequencyHz;
  document.getElementById("problemDepthM").value = params.problemDepthM;
  document.getElementById("coreRelPermeability").value =
    params.coreRelPermeability;

  configData.electricalSystem.forEach((phase) => addPhase(phase));
  configData.assemblies.forEach((assembly) => addAssembly(assembly));
  configData.standAloneComponents.forEach((comp) => addStandalone(comp));

  updateAssemblyPhaseDropdowns();
  configData.assemblies.forEach((assembly, index) => {
    const select = document.querySelector(
      `#assembly-${index + 1} .assembly-phase-select`
    );
    if (select) select.value = assembly.phaseName;
  });

  // updateScenarioList();
  // updateSummary();
}
