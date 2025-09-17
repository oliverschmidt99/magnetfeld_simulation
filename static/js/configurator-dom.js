// static/js/configurator-dom.js

function updateParametersFromCsv() {
  const ratedCurrent = document.getElementById("ratedCurrent").value;
  const currentSpielraum = spielraumData[ratedCurrent];
  const currentSchrittweiten = schrittweitenData[ratedCurrent];
  const currentStartpos = startposData[ratedCurrent];

  if (currentSpielraum) {
    document.getElementById("spielraumLaenge").value =
      currentSpielraum.Laenge || currentSpielraum.Länge || 0;
    document.getElementById("spielraumBreite").value =
      currentSpielraum.Breite || 0;
  }
  if (currentSchrittweiten) {
    document.getElementById("schrittweitePos1").value =
      currentSchrittweiten.Pos1 || 0;
    document.getElementById("schrittweitePos2").value =
      currentSchrittweiten.Pos2 || 0;
    document.getElementById("schrittweitePos3").value =
      currentSchrittweiten.Pos3 || 0;
    document.getElementById("schrittweitePos4").value =
      currentSchrittweiten.Pos4 || 0;
  }
  if (currentStartpos) {
    document.getElementById("startX_L1").value = currentStartpos.x_L1 || 0;
    document.getElementById("startY_L1").value = currentStartpos.y_L1 || 0;
    document.getElementById("startX_L2").value = currentStartpos.x_L2 || 0;
    document.getElementById("startY_L2").value = currentStartpos.y_L2 || 0;
    document.getElementById("startX_L3").value = currentStartpos.x_L3 || 0;
    document.getElementById("startY_L3").value = currentStartpos.y_L3 || 0;
  }
}

function updatePhaseCurrents() {
  const ratedCurrent = parseFloat(
    document.getElementById("ratedCurrent").value
  );
  const peakCurrent = (ratedCurrent * SQRT2).toFixed(2);
  document
    .querySelectorAll("#electrical-system-list .list-item")
    .forEach((item) => {
      item.dataset.peakCurrent = peakCurrent;
      item.querySelector(".phase-rms").value = ratedCurrent.toFixed(2);
    });
}

function updateAssemblyPhaseDropdowns() {
  const phases = Array.from(
    document.querySelectorAll("#electrical-system-list .phase-name")
  ).map((input) => input.value);
  document.querySelectorAll(".assembly-phase-select").forEach((select) => {
    const selectedValue = select.value;
    select.innerHTML = "";
    phases.forEach((p) => {
      const option = new Option(p, p);
      select.add(option);
    });
    if (phases.includes(selectedValue)) {
      select.value = selectedValue;
    }
  });
}

function addPhase(data = {}) {
  phaseCounter++;
  const list = document.getElementById("electrical-system-list");
  const item = document.createElement("div");
  item.className = "list-item";
  item.id = `phase-${phaseCounter}`;

  const ratedCurrent = parseFloat(
    document.getElementById("ratedCurrent").value
  );
  const peakCurrent = (data.peakCurrentA || ratedCurrent * SQRT2).toFixed(2);
  const rmsCurrent = (data.rmsCurrent || ratedCurrent).toFixed(2);
  item.dataset.peakCurrent = peakCurrent;

  item.innerHTML = `<h4>Phase ${phaseCounter}</h4>
        <label>Name:</label><input type="text" class="phase-name" value="${
          data.name || `L${phaseCounter}`
        }" onkeyup="updateAssemblyPhaseDropdowns()">
        <label>Phasenverschiebung (°):</label><input type="number" class="phase-shift" value="${
          data.phaseShiftDeg ?? 0
        }">
        <div class="form-row">
            <div><label>Effektivstrom (A):</label><input type="number" class="phase-rms" value="${rmsCurrent}" readonly></div>
        </div>
        <button type="button" onclick="removeItem('phase-${phaseCounter}'); updateAssemblyPhaseDropdowns();">Entfernen</button>`;
  list.appendChild(item);
  updateAssemblyPhaseDropdowns();
}

function addAssembly(data = {}) {
  assemblyCounter++;
  const list = document.getElementById("assemblies-list");
  const item = document.createElement("div");
  item.className = "list-item";
  item.id = `assembly-${assemblyCounter}`;

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
    .filter((t) =>
      (t.templateProductInformation.tags || []).includes(searchTag)
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

  item.innerHTML = `<h4>Baugruppe ${assemblyCounter}</h4>
        <label>Name:</label><input type="text" class="assembly-name" value="${
          data.name || `Assembly_${assemblyCounter}`
        }">
        <label>Zugeordnete Phase:</label><select class="assembly-phase-select"></select>
        <label>Kupferschiene:</label><select class="copper-rail">${railOptions}</select>
        <label>Wandler (für ${nennstrom}A):</label><select class="transformer">${transformerOptions}</select>
        <button type="button" onclick="removeItem('assembly-${assemblyCounter}')">Entfernen</button>`;
  list.appendChild(item);
}

function addStandalone(data = {}) {
  standaloneCounter++;
  const list = document.getElementById("standalone-list");
  const item = document.createElement("div");
  item.className = "list-item";
  item.id = `standalone-${standaloneCounter}`;
  const sheetOptions = (library.components?.transformerSheets || [])
    .map(
      (s) =>
        `<option value="${s.templateProductInformation.name}" ${
          data.name === s.templateProductInformation.name ? "selected" : ""
        }>${s.templateProductInformation.name}</option>`
    )
    .join("");
  const rotationOptions = [0, 90, 180, 270]
    .map(
      (angle) =>
        `<option value="${angle}" ${
          data.rotation === angle ? "selected" : ""
        }>${angle}°</option>`
    )
    .join("");
  item.innerHTML = `<h4>Eigenständiges Bauteil ${standaloneCounter}</h4>
    <label>Bauteil:</label><select class="standalone-name">${sheetOptions}</select>
    <label>Position X:</label><input type="number" step="0.1" class="pos-x" value="${
      data.position?.x || 0
    }">
    <label>Position Y:</label><input type="number" step="0.1" class="pos-y" value="${
      data.position?.y || 0
    }">
    <label>Rotation:</label><select class="rotation">${rotationOptions}</select>
    <button type="button" onclick="removeItem('standalone-${standaloneCounter}')">Entfernen</button>`;
  list.appendChild(item);
}

function removeItem(id) {
  document.getElementById(id)?.remove();
}

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

function applyState(state) {
  const form = document.getElementById("simulation-form");
  const params = state.simulationParams;

  // Parameter
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
  state.electricalSystem.forEach((phase) => addPhase(phase));
  state.assemblies.forEach((assembly) => addAssembly(assembly));
  state.standAloneComponents.forEach((comp) => addStandalone(comp));

  // Dropdowns aktualisieren und Visualisierung neu zeichnen
  updateAssemblyPhaseDropdowns();
  updateVisualization();
}
