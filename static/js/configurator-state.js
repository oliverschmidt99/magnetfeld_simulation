// static/js/configurator-state.js

function saveState() {
  const state = gatherFormData();
  localStorage.setItem("configuratorState", JSON.stringify(state));
}

function loadState() {
  const stateString = localStorage.getItem("configuratorState");
  if (stateString) {
    const state = JSON.parse(stateString);
    applyState(state);
  } else {
    // Default-Initialisierung, falls kein Zustand gespeichert ist
    updateParametersFromCsv();
    addPhase({ name: "L1", phaseShiftDeg: 0 });
    addPhase({ name: "L2", phaseShiftDeg: 120 });
    addPhase({ name: "L3", phaseShiftDeg: -120 });
    updateVisualization();
  }
}

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

  // Listen neu aufbauen
  (state.electricalSystem || []).forEach((phase) => addPhase(phase));
  (state.assemblies || []).forEach((assembly) => addAssembly(assembly));
  (state.standAloneComponents || []).forEach((comp) => addStandalone(comp));

  // Dropdowns füllen und selektieren
  updateAssemblyPhaseDropdowns();
  Array.from(document.querySelectorAll("#assemblies-list .list-item")).forEach(
    (item, index) => {
      const phaseSelect = item.querySelector(".assembly-phase-select");
      if (state.assemblies[index] && phaseSelect) {
        phaseSelect.value = state.assemblies[index].phaseName;
      }
    }
  );

  // Visualisierung aktualisieren
  updateVisualization();
}
