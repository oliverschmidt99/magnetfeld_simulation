// static/js/configurator-dom.js

/**
 * Updates form parameters based on the selected rated current by reading from pre-loaded CSV data.
 */
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

/**
 * Updates the read-only current fields for all existing phases.
 */
function updatePhaseCurrents() {
  const ratedCurrent = parseFloat(
    document.getElementById("ratedCurrent").value
  );
  const peakCurrent = (ratedCurrent * Math.sqrt(2)).toFixed(2);
  document
    .querySelectorAll("#electrical-system-list .list-item")
    .forEach((item) => {
      item.dataset.peakCurrent = peakCurrent;
      item.querySelector(".phase-rms").value = ratedCurrent.toFixed(2);
    });
}

/**
 * Updates the phase selection dropdowns in all assembly items.
 */
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

/**
 * Adds a new phase item to the electrical system list.
 * @param {object} [data={}] - Optional data to pre-fill the phase fields.
 */
function addPhase(data = {}) {
  phaseCounter++;
  const list = document.getElementById("electrical-system-list");
  const item = document.createElement("div");
  item.className = "list-item";
  item.id = `phase-${phaseCounter}`;

  const ratedCurrent = parseFloat(
    document.getElementById("ratedCurrent").value
  );
  const peakCurrent = (
    data.peakCurrentA || ratedCurrent * Math.sqrt(2)
  ).toFixed(2);
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

/**
 * Adds a new assembly item to the assemblies list.
 * @param {object} [data={}] - Optional data to pre-fill the assembly fields.
 */
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

/**
 * Adds a new standalone component item to its list.
 * @param {object} [data={}] - Optional data to pre-fill the component fields.
 */
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

/**
 * Removes an item from a dynamic list by its ID.
 * @param {string} id The ID of the element to remove.
 */
function removeItem(id) {
  document.getElementById(id)?.remove();
}
