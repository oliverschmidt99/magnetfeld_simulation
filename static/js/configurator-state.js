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
  const state = gatherFormData();
  localStorage.setItem("configuratorState", JSON.stringify(state));
  console.log("State saved to localStorage."); // Hilfreich für die Fehlersuche
}

/**
 * Lädt den Zustand aus dem localStorage und wendet ihn an.
 * Wenn kein Zustand gefunden wird, wird mit Standardwerten initialisiert.
 */
function loadState() {
  const stateString = localStorage.getItem("configuratorState");
  if (stateString) {
    console.log("Found state in localStorage. Applying it now.");
    const state = JSON.parse(stateString);
    applyState(state);
  } else {
    console.log("No state found. Initializing with default values.");
    // Standard-Initialisierung, wenn kein Zustand gespeichert ist
    updateParametersFromCsv();
    addPhase({ name: "L1", phaseShiftDeg: 0 });
    addPhase({ name: "L2", phaseShiftDeg: 120 });
    addPhase({ name: "L3", phaseShiftDeg: -120 });
    updateVisualization();
  }
}

/**
 * Wendet ein gegebenes Zustandsobjekt auf das Formular an.
 * @param {object} state Das anzuwendende Zustandsobjekt.
 */
function applyState(state) {
  const form = document.getElementById("simulation-form");
  if (!form || !state || !state.simulationParams) return;

  const params = state.simulationParams;

  // Allgemeine Parameter
  form.querySelector("#ratedCurrent").value = params.ratedCurrent;
  form.querySelector("#problemDepthM").value = params.problemDepthM;

  // Spielraum
  form.querySelector("#spielraumLaenge").value = params.spielraum.Laenge;
  form.querySelector("#spielraumBreite").value = params.spielraum.Breite;

  // Startpositionen
  form.querySelector("#startX_L1").value = params.startpositionen.x_L1;
  form.querySelector("#startY_L1").value = params.startpositionen.y_L1;
  form.querySelector("#startX_L2").value = params.startpositionen.x_L2;
  form.querySelector("#startY_L2").value = params.startpositionen.y_L2;
  form.querySelector("#startX_L3").value = params.startpositionen.x_L3;
  form.querySelector("#startY_L3").value = params.startpositionen.y_L3;

  // Bewegungsrichtungen
  form.querySelector("#directionL1_x").value = params.bewegungsRichtungen.L1.x;
  form.querySelector("#directionL1_y").value = params.bewegungsRichtungen.L1.y;
  form.querySelector("#directionL2_x").value = params.bewegungsRichtungen.L2.x;
  form.querySelector("#directionL2_y").value = params.bewegungsRichtungen.L2.y;
  form.querySelector("#directionL3_x").value = params.bewegungsRichtungen.L3.x;
  form.querySelector("#directionL3_y").value = params.bewegungsRichtungen.L3.y;

  // Schrittweiten
  form.querySelector("#schrittweitePos1").value = params.schrittweiten.Pos1;
  form.querySelector("#schrittweitePos2").value = params.schrittweiten.Pos2;
  form.querySelector("#schrittweitePos3").value = params.schrittweiten.Pos3;
  form.querySelector("#schrittweitePos4").value = params.schrittweiten.Pos4;

  // Analyse-Parameter
  form.querySelector("#I_1_mes").value = params.I_1_mes;
  form.querySelector("#I_2_mes").value = params.I_2_mes;
  form.querySelector("#I_3_mes").value = params.I_3_mes;
  form.querySelector("#phaseStart").value = params.phaseSweep.start;
  form.querySelector("#phaseEnd").value = params.phaseSweep.end;
  form.querySelector("#phaseStep").value = params.phaseSweep.step;

  // Dynamische Listen leeren
  document.getElementById("electrical-system-list").innerHTML = "";
  document.getElementById("assemblies-list").innerHTML = "";
  document.getElementById("standalone-list").innerHTML = "";
  phaseCounter = 0;
  assemblyCounter = 0;
  standaloneCounter = 0;

  // Listen aus dem Zustand neu aufbauen
  (state.electricalSystem || []).forEach((phase) => addPhase(phase));
  (state.assemblies || []).forEach((assembly) => addAssembly(assembly));
  (state.standAloneComponents || []).forEach((comp) => addStandalone(comp));

  // Dropdowns aktualisieren und die richtigen Werte auswählen
  updateAssemblyPhaseDropdowns();
  Array.from(document.querySelectorAll("#assemblies-list .list-item")).forEach(
    (item, index) => {
      const phaseSelect = item.querySelector(".assembly-phase-select");
      if (state.assemblies[index] && phaseSelect) {
        phaseSelect.value = state.assemblies[index].phaseName;
      }
    }
  );

  // Zum Schluss die Visualisierung aktualisieren
  updateVisualization();
}
