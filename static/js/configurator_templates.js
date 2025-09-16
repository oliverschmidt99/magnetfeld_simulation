// static/js/configurator_templates.js

function getParamsHtml(direction_options) {
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
                    <div class="form-group"><label for="directionL1_preset">Leiter L1</label><select id="directionL1_preset" class="direction-preset" data-target-x="directionL1_x" data-target-y="directionL1_y">${direction_options
                      .map(
                        (d) => `<option value="${d.value}">${d.text}</option>`
                      )
                      .join("")}</select></div>
                    <div class="form-group"><label>Anteil X</label><input type="number" id="directionL1_x" value="0" step="1"></div>
                    <div class="form-group"><label>Anteil Y</label><input type="number" id="directionL1_y" value="0" step="1"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label for="directionL2_preset">Leiter L2</label><select id="directionL2_preset" class="direction-preset" data-target-x="directionL2_x" data-target-y="directionL2_y">${direction_options
                      .map(
                        (d) => `<option value="${d.value}">${d.text}</option>`
                      )
                      .join("")}</select></div>
                    <div class="form-group"><label>Anteil X</label><input type="number" id="directionL2_x" value="0" step="1"></div>
                    <div class="form-group"><label>Anteil Y</label><input type="number" id="directionL2_y" value="0" step="1"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label for="directionL3_preset">Leiter L3</label><select id="directionL3_preset" class="direction-preset" data-target-x="directionL3_x" data-target-y="directionL3_y">${direction_options
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
            <h3>Konfiguration Verwalten</h3>
            <div class="form-row">
                <div class="form-group"><label for="load-config-select">Gespeicherte Konfiguration laden</label><select id="load-config-select"><option value="">-- Bitte wählen --</option></select></div>
                <div class="form-group button-group"><button type="button" id="load-config-btn" class="button secondary">Laden</button></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label for="simulationName">Aktueller Konfigurations-Name</label><input type="text" id="simulationName" placeholder="z.B. Testaufbau_Standard"></div>
                <div class="form-group button-group"><button type="button" id="save-config-btn" class="button">Speichern</button></div>
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
