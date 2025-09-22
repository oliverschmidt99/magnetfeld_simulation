// static/js/configurator-state.js

/**
 * Sammelt alle Daten aus dem Simulationsformular in einem strukturierten Objekt.
 * @returns {object} Der aktuelle Zustand des Formulars.
 */
function gatherFormData() {
  const form = document.getElementById("simulation-form");
  return {
    simulationParams: {
      ratedCurrent: form.querySelector("#ratedCurrent").value,
      startpositionen: {
        x_L1: form.querySelector("#startX_L1").value,
        y_L1: form.querySelector("#startY_L1").value,
        x_L2: form.querySelector("#startX_L2").value,
        y_L2: form.querySelector("#startY_L2").value,
        x_L3: form.querySelector("#startX_L3").value,
        y_L3: form.querySelector("#startY_L3").value,
      },
      bewegungsRichtungen: {
        L1: {
          x: form.querySelector("#directionL1_x").value,
          y: form.querySelector("#directionL1_y").value,
        },
        L2: {
          x: form.querySelector("#directionL2_x").value,
          y: form.querySelector("#directionL2_y").value,
        },
        L3: {
          x: form.querySelector("#directionL3_x").value,
          y: form.querySelector("#directionL3_y").value,
        },
      },
      problemDepthM: form.querySelector("#problemDepthM").value,
      spielraum: {
        Laenge: form.querySelector("#spielraumLaenge").value,
        Breite: form.querySelector("#spielraumBreite").value,
      },
      schrittweiten: {
        Pos1: form.querySelector("#schrittweitePos1").value,
        Pos2: form.querySelector("#schrittweitePos2").value,
        Pos3: form.querySelector("#schrittweitePos3").value,
        Pos4: form.querySelector("#schrittweitePos4").value,
      },
      I_1_mes: form.querySelector("#I_1_mes").value,
      I_2_mes: form.querySelector("#I_2_mes").value,
      I_3_mes: form.querySelector("#I_3_mes").value,
      phaseSweep: {
        start: form.querySelector("#phaseStart").value,
        end: form.querySelector("#phaseEnd").value,
        step: form.querySelector("#phaseStep").value,
      },
    },
    electricalSystem: Array.from(
      form.querySelectorAll("#electrical-system-list .list-item")
    ).map((item) => ({
      name: item.querySelector(".phase-name").value,
      phaseShiftDeg: parseFloat(item.querySelector(".phase-shift").value) || 0,
      peakCurrentA: parseFloat(item.dataset.peakCurrent),
    })),
    assemblies: Array.from(
      form.querySelectorAll("#assemblies-list .list-item")
    ).map((item, index) => ({
      name: item.querySelector(".assembly-name").value,
      phaseName: item.querySelector(".assembly-phase-select").value,
      copperRailName: item.querySelector(".copper-rail").value,
      transformerName: item.querySelector(".transformer").value,
      enabled:
        document.getElementById(`toggle-assembly-${index}`)?.checked ?? true,
    })),
    standAloneComponents: Array.from(
      form.querySelectorAll("#standalone-list .list-item")
    ).map((item, index) => ({
      name: item.querySelector(".standalone-name").value,
      position: {
        x: parseFloat(item.querySelector(".pos-x").value) || 0,
        y: parseFloat(item.querySelector(".pos-y").value) || 0,
      },
      rotation: parseFloat(item.querySelector(".rotation").value) || 0,
      enabled:
        document.getElementById(`toggle-standalone-${index}`)?.checked ?? true,
    })),
  };
}

/**
 * Speichert den aktuellen Formularzustand im localStorage des Browsers.
 */
function saveState() {
  const data = gatherFormData();
  localStorage.setItem("latestSimConfig", JSON.stringify(data));
}

/**
 * Lädt den Zustand aus dem localStorage oder aus einem übergebenen Objekt und wendet ihn auf das Formular an.
 * @param {object} [data=null] - Ein optionales Konfigurationsobjekt zum Laden.
 */
function loadState(data = null) {
  const configData =
    data || JSON.parse(localStorage.getItem("latestSimConfig"));

  if (!configData) {
    updateParametersFromCsv();
    addPhase({ name: "L1", phaseShiftDeg: 0 });
    addPhase({ name: "L2", phaseShiftDeg: 120 });
    addPhase({ name: "L3", phaseShiftDeg: -120 });
    updateVisualization();
    return;
  }

  const {
    simulationParams,
    electricalSystem,
    assemblies,
    standAloneComponents,
  } = configData;

  document.getElementById("ratedCurrent").value =
    simulationParams.ratedCurrent || "5000";

  updateParametersFromCsv();

  if (simulationParams.startpositionen) {
    document.getElementById("startX_L1").value =
      simulationParams.startpositionen.x_L1;
    document.getElementById("startY_L1").value =
      simulationParams.startpositionen.y_L1;
    document.getElementById("startX_L2").value =
      simulationParams.startpositionen.x_L2;
    document.getElementById("startY_L2").value =
      simulationParams.startpositionen.y_L2;
    document.getElementById("startX_L3").value =
      simulationParams.startpositionen.x_L3;
    document.getElementById("startY_L3").value =
      simulationParams.startpositionen.y_L3;
  }

  if (simulationParams.bewegungsRichtungen) {
    document.getElementById("directionL1_x").value =
      simulationParams.bewegungsRichtungen.L1?.x || 0;
    document.getElementById("directionL1_y").value =
      simulationParams.bewegungsRichtungen.L1?.y || 0;
    document.getElementById("directionL2_x").value =
      simulationParams.bewegungsRichtungen.L2?.x || 0;
    document.getElementById("directionL2_y").value =
      simulationParams.bewegungsRichtungen.L2?.y || 0;
    document.getElementById("directionL3_x").value =
      simulationParams.bewegungsRichtungen.L3?.x || 0;
    document.getElementById("directionL3_y").value =
      simulationParams.bewegungsRichtungen.L3?.y || 0;
  }

  document.getElementById("problemDepthM").value =
    simulationParams.problemDepthM;

  if (simulationParams.spielraum) {
    document.getElementById("spielraumLaenge").value =
      simulationParams.spielraum.Laenge;
    document.getElementById("spielraumBreite").value =
      simulationParams.spielraum.Breite;
  }
  if (simulationParams.schrittweiten) {
    document.getElementById("schrittweitePos1").value =
      simulationParams.schrittweiten.Pos1;
    document.getElementById("schrittweitePos2").value =
      simulationParams.schrittweiten.Pos2;
    document.getElementById("schrittweitePos3").value =
      simulationParams.schrittweiten.Pos3;
    document.getElementById("schrittweitePos4").value =
      simulationParams.schrittweiten.Pos4;
  }

  document.getElementById("I_1_mes").value = simulationParams.I_1_mes || "0";
  document.getElementById("I_2_mes").value = simulationParams.I_2_mes || "0";
  document.getElementById("I_3_mes").value = simulationParams.I_3_mes || "0";

  if (simulationParams.phaseSweep) {
    document.getElementById("phaseStart").value =
      simulationParams.phaseSweep.start || "0";
    document.getElementById("phaseEnd").value =
      simulationParams.phaseSweep.end || "180";
    document.getElementById("phaseStep").value =
      simulationParams.phaseSweep.step || "5";
  }

  document.getElementById("electrical-system-list").innerHTML = "";
  document.getElementById("assemblies-list").innerHTML = "";
  document.getElementById("standalone-list").innerHTML = "";
  phaseCounter = 0;
  assemblyCounter = 0;
  standaloneCounter = 0;

  (electricalSystem || []).forEach(addPhase);
  (assemblies || []).forEach(addAssembly);
  (standAloneComponents || []).forEach(addStandalone);

  updateAssemblyPhaseDropdowns();
  (assemblies || []).forEach((assembly, index) => {
    const select = document.querySelector(
      `#assembly-${index + 1} .assembly-phase-select`
    );
    if (select) select.value = assembly.phaseName;
  });

  updateVisualization();
}

async function populateLoadOptions() {
  const select = document.getElementById("load-config-select");
  try {
    const response = await fetch("/api/configurations");
    const configs = await response.json();
    select.innerHTML = '<option value="">-- Bitte wählen --</option>';
    configs.forEach((name) => {
      select.add(new Option(name, name));
    });
  } catch (error) {
    console.error("Fehler beim Laden der Konfigurationen:", error);
  }
}

async function populateSimulationRunOptions() {
  const select = document.getElementById("load-sim-run-select");
  try {
    const response = await fetch("/api/simulation_runs");
    const runs = await response.json();
    select.innerHTML = '<option value="">-- Bitte wählen --</option>';
    runs.forEach((run) => {
      select.add(new Option(run.name, run.path));
    });
  } catch (error) {
    console.error("Fehler beim Laden der Simulationsläufe:", error);
  }
}

async function saveConfiguration() {
  const name = document.getElementById("simulationName").value;
  if (!name) {
    alert("Bitte geben Sie einen Namen für die Konfiguration an.");
    return;
  }
  const data = gatherFormData();

  try {
    const response = await fetch("/api/configurations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, data }),
    });
    const result = await response.json();
    alert(result.message || result.error);
    if (!result.error) {
      populateLoadOptions();
    }
  } catch (error) {
    alert("Ein Fehler ist aufgetreten: " + error);
  }
}

async function loadConfiguration() {
  const name = document.getElementById("load-config-select").value;
  if (!name) return;
  try {
    const response = await fetch(`/api/configurations/${name}`);
    const data = await response.json();
    loadState(data.data || data);
    document.getElementById("simulationName").value = name;
    alert(`Konfiguration '${name}' geladen.`);
  } catch (error) {
    alert("Fehler beim Laden der Konfiguration: " + error);
  }
}

async function loadSimulationRun() {
  const path = document.getElementById("load-sim-run-select").value;
  if (!path) return;
  try {
    const response = await fetch(`/api/simulation_runs/${path}`);
    const data = await response.json();
    loadState(data);
    alert(`Konfiguration aus Lauf '${path}' geladen.`);
  } catch (error) {
    alert("Fehler beim Laden des Simulationslaufs: " + error);
  }
}

function setupDragAndDrop() {
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");

  dropZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener(
    "change",
    (e) => e.target.files.length && handleFile(e.target.files[0])
  );

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drop-zone--over");
  });
  ["dragleave", "dragend"].forEach((type) => {
    dropZone.addEventListener(type, () =>
      dropZone.classList.remove("drop-zone--over")
    );
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    dropZone.classList.remove("drop-zone--over");
  });
}

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const jsonData = JSON.parse(event.target.result);
      const configData = jsonData.simulationParams ? jsonData : jsonData.data;
      if (!configData || !configData.simulationParams)
        throw new Error("Invalide JSON-Struktur.");
      loadState(configData);
      alert(`Konfiguration '${file.name}' geladen.`);
    } catch (e) {
      alert(`Fehler beim Verarbeiten der Datei: ${e.message}`);
    }
  };
  reader.readAsText(file);
}
