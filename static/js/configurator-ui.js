// static/js/configurator-ui.js

const SQRT2 = Math.sqrt(2);

const directionOptions = [
  { value: "Keine Bewegung", text: "Keine Bewegung" },
  { value: "Norden", text: "⬆️ Norden" },
  { value: "Osten", text: "➡️ Osten" },
  { value: "Süden", text: "⬇️ Süden" },
  { value: "Westen", text: "⬅️ Westen" },
  { value: "Nordosten", text: "↗️ Nordosten" },
  { value: "Nordwesten", text: "↖️ Nordwesten" },
  { value: "Südosten", text: "↘️ Südosten" },
  { value: "Südwesten", text: "↙️ Südwesten" },
];

const directionVectors = {
  "Keine Bewegung": { x: 0, y: 0 },
  Norden: { x: 0, y: 1 },
  Osten: { x: 1, y: 0 },
  Süden: { x: 0, y: -1 },
  Westen: { x: -1, y: 0 },
  Nordosten: { x: 1, y: 1 },
  Südosten: { x: 1, y: -1 },
  Südwesten: { x: -1, y: -1 },
  Nordwesten: { x: -1, y: 1 },
};

/**
 * Initialisiert die vertikale Seitennavigation.
 */
function initializeVerticalNavigation(navId, sectionContainerId) {
  const links = document.querySelectorAll(`#${navId} .nav-link`);
  const sections = document.querySelectorAll(
    `#${sectionContainerId} .config-section`
  );

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      sections.forEach((s) => s.classList.remove("active"));
      links.forEach((l) => l.classList.remove("active"));
      const targetElement = document.getElementById(link.dataset.target);
      if (targetElement) targetElement.classList.add("active");
      link.classList.add("active");
    });
  });
}

/**
 * Aktualisiert die Formularparameter basierend auf dem gewählten Nennstrom aus den CSV-Daten.
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
 * Aktualisiert die (schreibgeschützten) Strom-Anzeigefelder für alle Phasen.
 */
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

/**
 * Aktualisiert die Phasen-Auswahl-Dropdowns in allen Baugruppen-Elementen.
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
 * Fügt eine neue Phase zur Benutzeroberfläche hinzu.
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

/**
 * Fügt eine neue Baugruppe zur Benutzeroberfläche hinzu.
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

  let transformerOptions = '<option value="">Kein Wandler</option>';
  transformerOptions += (library.components?.transformers || [])
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
 * Fügt ein neues eigenständiges Bauteil zur Benutzeroberfläche hinzu.
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

  item.innerHTML = `<h4>Eigenständiges Bauteil ${standaloneCounter}</h4>
    <label>Bauteil:</label><select class="standalone-name">${sheetOptions}</select>
    <label>Position X:</label><input type="number" step="0.1" class="pos-x" value="${
      data.position?.x || 0
    }">
    <label>Position Y:</label><input type="number" step="0.1" class="pos-y" value="${
      data.position?.y || 0
    }">
    <label>Rotation:</label><input type="number" step="0.1" class="rotation" value="${
      data.rotation || 0
    }">
    <button type="button" onclick="removeItem('standalone-${standaloneCounter}')">Entfernen</button>`;
  list.appendChild(item);
}

/**
 * Entfernt ein Element aus einer dynamischen Liste anhand seiner ID.
 */
function removeItem(id) {
  document.getElementById(id)?.remove();
}

/**
 * Aktualisiert die X/Y-Eingabefelder basierend auf einem Richtungs-Preset.
 */
function updateDirectionInputs(selectElement) {
  const selectedDirection = selectElement.value;
  const vector = directionVectors[selectedDirection];
  const targetXInput = document.getElementById(selectElement.dataset.targetX);
  const targetYInput = document.getElementById(selectElement.dataset.targetY);

  if (vector) {
    targetXInput.value = vector.x;
    targetYInput.value = vector.y;
  }
}

function getParamsHtml() {
  return `
        <div class="parameter-grid">
            <div class="param-card">
                <h4>Grundlagen</h4>
                <div class="form-group">
                    <label for="ratedCurrent">Nennstrom (A)</label>
                    <select id="ratedCurrent">
                        <option value="600">600 A</option>
                        <option value="800">800 A</option>
                        <option value="1000">1000 A</option>
                        <option value="1250">1250 A</option>
                        <option value="1600">1600 A</option>
                        <option value="2000">2000 A</option>
                        <option value="2500">2500 A</option>
                        <option value="3000">3000 A</option>
                        <option value="4000">4000 A</option>
                        <option value="5000">5000 A</option>
                    </select>
                </div>
            </div>
            <div class="param-card">
                <h4>Simulationsraum &amp; Physik</h4>
                <div class="form-group">
                    <label for="problemDepthM">Problem-Tiefe (mm)</label>
                    <input type="number" step="1" id="problemDepthM" value="10">
                </div>
                <div class="form-row">
                    <div class="form-group"><label for="spielraumLaenge">Spielraum-Länge</label><input type="number" step="0.1" id="spielraumLaenge" value="680.0"></div>
                    <div class="form-group"><label for="spielraumBreite">Spielraum-Breite</label><input type="number" step="0.1" id="spielraumBreite" value="232.5"></div>
                </div>
            </div>
            <div class="param-card full-width">
                <h4>Startpositionen (mm)</h4>
                <div class="form-row">
                    <div class="form-group"><label for="startX_L1">L1 - X</label><input type="number" step="0.1" id="startX_L1"></div>
                    <div class="form-group"><label for="startY_L1">L1 - Y</label><input type="number" step="0.1" id="startY_L1"></div>
                    <div class="form-group"><label for="startX_L2">L2 - X</label><input type="number" step="0.1" id="startX_L2"></div>
                    <div class="form-group"><label for="startY_L2">L2 - Y</label><input type="number" step="0.1" id="startY_L2"></div>
                    <div class="form-group"><label for="startX_L3">L3 - X</label><input type="number" step="0.1" id="startX_L3"></div>
                    <div class="form-group"><label for="startY_L3">L3 - Y</label><input type="number" step="0.1" id="startY_L3"></div>
                </div>
            </div>
            <div class="param-card full-width">
                <h4>Bewegungsrichtungen</h4>
                <div class="form-row">
                    <div class="form-group"><label for="directionL1_preset">Leiter L1</label><select id="directionL1_preset" class="direction-preset" data-target-x="directionL1_x" data-target-y="directionL1_y">${directionOptions
                      .map(
                        (d) => `<option value="${d.value}">${d.text}</option>`
                      )
                      .join("")}</select></div>
                    <div class="form-group"><label>Anteil X</label><input type="number" id="directionL1_x" value="0" step="1"></div>
                    <div class="form-group"><label>Anteil Y</label><input type="number" id="directionL1_y" value="0" step="1"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label for="directionL2_preset">Leiter L2</label><select id="directionL2_preset" class="direction-preset" data-target-x="directionL2_x" data-target-y="directionL2_y">${directionOptions
                      .map(
                        (d) => `<option value="${d.value}">${d.text}</option>`
                      )
                      .join("")}</select></div>
                    <div class="form-group"><label>Anteil X</label><input type="number" id="directionL2_x" value="0" step="1"></div>
                    <div class="form-group"><label>Anteil Y</label><input type="number" id="directionL2_y" value="0" step="1"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label for="directionL3_preset">Leiter L3</label><select id="directionL3_preset" class="direction-preset" data-target-x="directionL3_x" data-target-y="directionL3_y">${directionOptions
                      .map(
                        (d) => `<option value="${d.value}">${d.text}</option>`
                      )
                      .join("")}</select></div>
                    <div class="form-group"><label>Anteil X</label><input type="number" id="directionL3_x" value="0" step="1"></div>
                    <div class="form-group"><label>Anteil Y</label><input type="number" id="directionL3_y" value="0" step="1"></div>
                </div>
            </div>
            <div class="param-card full-width">
                <h4>Schrittweiten (mm)</h4>
                <div class="form-row">
                    <div class="form-group"><label for="schrittweitePos1">Pos 1</label><input type="number" step="1" id="schrittweitePos1" value="0"></div>
                    <div class="form-group"><label for="schrittweitePos2">Pos 2</label><input type="number" step="1" id="schrittweitePos2" value="0"></div>
                    <div class="form-group"><label for="schrittweitePos3">Pos 3</label><input type="number" step="1" id="schrittweitePos3" value="0"></div>
                    <div class="form-group"><label for="schrittweitePos4">Pos 4</label><input type="number" step="1" id="schrittweitePos4" value="0"></div>
                </div>
            </div>
            <div class="param-card full-width">
                <h4>Analyse-Parameter</h4>
                <div class="form-row">
                    <div class="form-group"><label for="I_1_mes">Vorgegebener Primärstrom 1 (A)</label><input type="number" step="0.01" id="I_1_mes" value="0"></div>
                    <div class="form-group"><label for="I_2_mes">Vorgegebener Primärstrom 2 (A)</label><input type="number" step="0.01" id="I_2_mes" value="0"></div>
                    <div class="form-group"><label for="I_3_mes">Vorgegebener Primärstrom 3 (A)</label><input type="number" step="0.01" id="I_3_mes" value="0"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label for="phaseStart">Phasenwinkel Start (°)</label><input type="number" id="phaseStart" value="0"></div>
                    <div class="form-group"><label for="phaseEnd">Phasenwinkel Ende (°)</label><input type="number" id="phaseEnd" value="180"></div>
                    <div class="form-group"><label for="phaseStep">Phasenwinkel Schritt (°)</label><input type="number" id="phaseStep" value="5"></div>
                </div>
            </div>
        </div>
    `;
}

function getPhasesHtml() {
  return `
        <h2>Elektrisches System (Phasen)</h2>
        <div id="electrical-system-list" class="dynamic-list"></div>
        <button type="button" onclick="addPhase()">+ Phase hinzufügen</button>
    `;
}

function getAssembliesHtml() {
  return `
        <h2>Baugruppen (Assemblies)</h2>
        <div id="assemblies-list" class="dynamic-list"></div>
        <button type="button" onclick="addAssembly()">+ Baugruppe hinzufügen</button>
    `;
}

function getStandaloneHtml() {
  return `
        <h2>Eigenständige Bauteile</h2>
        <div id="standalone-list" class="dynamic-list"></div>
        <button type="button" onclick="addStandalone()">+ Bauteil hinzufügen</button>
    `;
}

function getSummaryHtml() {
  return `
        <div class="config-management-section">
            <h3>Konfiguration Speichern</h3>
            <div class="form-row">
                <div class="form-group">
                    <label for="simulationName">Aktueller Konfigurations-Name</label>
                    <input type="text" id="simulationName" placeholder="z.B. Testaufbau_Standard">
                </div>
                <div class="form-group button-group">
                    <button type="button" id="save-config-btn" class="button">Speichern</button>
                </div>
            </div>
        </div>
        <hr>
        <div class="config-management-section">
            <h3>Konfiguration Laden</h3>
            
            <h4>Gespeicherte Konfigurationen</h4>
            <div class="form-row">
                <div class="form-group">
                    <label for="load-config-select">Gespeicherte Konfigurationen</label>
                    <select id="load-config-select"><option value="">-- Bitte wählen --</option></select>
                </div>
                <div class="form-group button-group">
                    <button type="button" id="load-config-btn" class="button secondary">Laden</button>
                </div>
            </div>

            <h4>Abgeschlossene Simulationsläufe</h4>
             <div class="form-row">
                <div class="form-group">
                    <label for="load-sim-run-select">Aus 'simulations'-Ordner laden</label>
                    <select id="load-sim-run-select"><option value="">-- Bitte wählen --</option></select>
                </div>
                <div class="form-group button-group">
                    <button type="button" id="load-sim-run-btn" class="button secondary">Laden</button>
                </div>
            </div>

            <h4>Manuell hochladen</h4>
            <div id="drop-zone" class="drop-zone">
                <span class="drop-zone__prompt">JSON-Datei hierher ziehen oder klicken zum Auswählen</span>
                <input type="file" id="file-input" class="drop-zone__input" accept=".json">
            </div>
        </div>
        <hr>
        <div class="component-toggle-section">
             <h4>Bauteile für Vorschau &amp; Simulation aktivieren/deaktivieren</h4>
             <div id="component-toggle-list" class="summary-accordion"></div>
        </div>
        <hr>
        <h3>Parameter-Zusammenfassung</h3>
        <div id="parameter-summary-container"></div>
    `;
}
