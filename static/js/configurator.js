// Diese Funktion muss definiert werden, um den ReferenceError zu beheben.
// Du kannst sie später mit der echten Logik füllen.
function updateAssemblyPhaseDropdowns() {
  console.log("Aktualisiere Assembly-Phase-Dropdowns...");
  // Beispiel-Logik:
  // const dropdowns = document.querySelectorAll('.assembly-phase-dropdown');
  // dropdowns.forEach(dropdown => { ... });
}

document.addEventListener("DOMContentLoaded", async () => {
  let libraryData = {};

  async function initializeConfigurator() {
    try {
      // KORREKTUR: Die URL wurde auf /api/library geändert
      const response = await fetch("/api/library");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      libraryData = await response.json();
      console.log("Bibliothek für Konfigurator geladen:", libraryData);

      // Beispiel: Lade einen gespeicherten Zustand (falls vorhanden)
      // loadState(); // Diese Funktion müsstest du implementieren
    } catch (error) {
      console.error("Fehler beim Initialisieren des Konfigurators:", error);
    }
  }

  function addAssembly() {
    // Beispiel-Funktion, um eine Baugruppe hinzuzufügen
    console.log("Füge Baugruppe hinzu...");
    // KORREKTUR: Rufe die jetzt definierte Funktion auf
    updateAssemblyPhaseDropdowns();
  }

  function loadState() {
    // Beispiel-Funktion, um einen Zustand zu laden
    const assemblies = [{}, {}]; // Beispiel-Daten
    assemblies.forEach(() => addAssembly());
  }

  initializeConfigurator();
});

let currentConfigData = {};
let library = {};
let phaseCounter = 0;
let assemblyCounter = 0;
let standaloneCounter = 0;
const SQRT2 = Math.sqrt(2);

async function initializeConfigurator() {
  const libraryDataElement = document.getElementById("library-data");
  library = libraryDataElement
    ? JSON.parse(libraryDataElement.textContent)
    : {};

  initializeCardNavigation("config-nav", "config-sections");
  loadState();

  const form = document.getElementById("simulation-form");
  form.addEventListener("input", saveState);
  form.addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON" && e.target.type === "button") {
      setTimeout(saveState, 50);
    }
  });

  document
    .getElementById("save-scenario-btn")
    ?.addEventListener("click", saveScenario);
  document
    .getElementById("load-scenario-btn")
    ?.addEventListener("click", loadScenario);
  document
    .getElementById("delete-scenario-btn")
    ?.addEventListener("click", deleteScenario);

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const data = gatherFormData();
    fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .then((result) => alert(result.message || result.error));
  });
}

function addAssembly(data = {}) {
  assemblyCounter++;
  const list = document.getElementById("assemblies-list");
  const item = document.createElement("div");
  item.className = "list-item";
  item.id = `assembly-${assemblyCounter}`;

  const transformerOptions = (library.components?.transformers || [])
    .map(
      (t) =>
        `<option value="${t.templateProductInformation.name}" ${
          data.transformerName === t.templateProductInformation.name
            ? "selected"
            : ""
        }>${t.templateProductInformation.name}</option>`
    )
    .join("");

  item.innerHTML = `
      <h4>Baugruppe ${assemblyCounter}</h4>
      <label>Name:</label><input type="text" class="assembly-name" value="${
        data.name || `Assembly_${assemblyCounter}`
      }">
      <label>Zugeordnete Phase:</label><select class="assembly-phase-select">${
        data.phaseName || ""
      }</select>
      <label>Position X:</label><input type="number" class="pos-x" value="${
        data.position?.x || 0
      }">
      <label>Position Y:</label><input type="number" class="pos-y" value="${
        data.position?.y || 0
      }">
      
      <label>Wandler:</label>
      <select class="transformer" onchange="updateConductorOptions(this)">${transformerOptions}</select>
      
      <div class="form-group">
          <label>Fensterkonfiguration:</label>
          <select class="primary-conductor-select"></select>
      </div>

      <button type="button" class="danger" onclick="removeItem('assembly-${assemblyCounter}')">Entfernen</button>`;
  list.appendChild(item);
  updateAssemblyPhaseDropdowns();
  updateConductorOptions(
    item.querySelector(".transformer"),
    data.primaryConductorName
  );
}

function updateConductorOptions(transformerSelect, selectedConductorName) {
  const transformerName = transformerSelect.value;
  const assemblyItem = transformerSelect.closest(".list-item");
  const conductorSelect = assemblyItem.querySelector(
    ".primary-conductor-select"
  );
  conductorSelect.innerHTML = "";

  const transformer = (library.components?.transformers || []).find(
    (t) => t.templateProductInformation.name === transformerName
  );

  if (
    transformer &&
    transformer.specificProductInformation.availableWindowSizes
  ) {
    transformer.specificProductInformation.availableWindowSizes.forEach(
      (size) => {
        const option = document.createElement("option");
        option.value = size;
        option.textContent = size;
        if (size === selectedConductorName) {
          option.selected = true;
        }
        conductorSelect.appendChild(option);
      }
    );
  }
}

function gatherFormData() {
  const form = document.getElementById("simulation-form");
  const data = {
    simulationParams: {
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
      position: {
        x: parseInt(item.querySelector(".pos-x").value),
        y: parseInt(item.querySelector(".pos-y").value),
      },
      transformerName: item.querySelector(".transformer").value,
      primaryConductorName: item.querySelector(".primary-conductor-select")
        .value,
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
  }"><div class="form-row"><div><label>Spitzenstrom (A):</label><input type="number" step="any" id="phase-${phaseCounter}-peak" class="phase-peak" value="${peak}" oninput="updateRms(${phaseCounter}, 'phase')"></div><div><label>Effektivstrom (A):</label><input type="number" step="any" id="phase-${phaseCounter}-rms" class="phase-rms" value="${rms}" oninput="updatePeak(${phaseCounter}, 'phase')"></div></div><button type="button" class="danger" onclick="removeItem('phase-${phaseCounter}'); updateAssemblyPhaseDropdowns();">Entfernen</button>`;
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
  }"><button type="button" class="danger" onclick="removeItem('standalone-${standaloneCounter}')">Entfernen</button>`;
  list.appendChild(item);
}

function removeItem(id) {
  const item = document.getElementById(id);
  if (item) item.remove();
}

function saveState() {
  if (!document.getElementById("simulation-form")) return;
  const data = gatherFormData();
  localStorage.setItem("latestSimConfig", JSON.stringify(data));
  updateSummary();
}

function loadState(data = null) {
  const configData =
    data || JSON.parse(localStorage.getItem("latestSimConfig"));
  const elsList = document.getElementById("electrical-system-list");
  const asmList = document.getElementById("assemblies-list");
  const stdList = document.getElementById("standalone-list");

  if (!elsList || !asmList || !stdList) return;

  elsList.innerHTML = "";
  asmList.innerHTML = "";
  stdList.innerHTML = "";
  phaseCounter = 0;
  assemblyCounter = 0;
  standaloneCounter = 0;

  if (!configData) {
    initializeDefaultSetup();
    return;
  }

  const params = configData.simulationParams;
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

  updateScenarioList();
  updateSummary();
}

function initializeDefaultSetup() {
  addPhase({ name: "L1", phaseShiftDeg: 0 });
  addPhase({ name: "L2", phaseShiftDeg: -120 });
  addPhase({ name: "L3", phaseShiftDeg: 120 });
  addAssembly({
    name: "Assembly_1",
    phaseName: "L1",
    position: { x: 0, y: 0 },
  });
  updateAssemblyPhaseDropdowns();
  updateScenarioList();
  saveState();
}

async function saveScenario() {
  const name = document.getElementById("scenario-name").value;
  if (!name) {
    alert("Bitte gib einen Namen für das Szenario ein.");
    return;
  }
  const data = gatherFormData();
  const response = await fetch(`/scenarios/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  alert(result.message || result.error);
  if (response.ok) updateScenarioList();
}

async function loadScenario() {
  const select = document.getElementById("saved-scenarios");
  const name = select.value;
  if (!name) {
    alert("Bitte wähle ein Szenario zum Laden aus.");
    return;
  }
  const response = await fetch(`/scenarios/${name}`);
  const data = await response.json();
  if (response.ok) {
    loadState(data);
    document.getElementById("scenario-name").value = name;
    alert(`Szenario '${name}' geladen!`);
  } else {
    alert(`Fehler beim Laden: ${data.error}`);
  }
}

async function deleteScenario() {
  const select = document.getElementById("saved-scenarios");
  const name = select.value;
  if (!name) {
    alert("Bitte wähle ein Szenario zum Löschen aus.");
    return;
  }
  if (confirm(`Möchtest du das Szenario '${name}' wirklich löschen?`)) {
    const response = await fetch(`/scenarios/${name}`, { method: "DELETE" });
    const result = await response.json();
    alert(result.message || result.error);
    if (response.ok) updateScenarioList();
  }
}

async function updateScenarioList() {
  const select = document.getElementById("saved-scenarios");
  if (!select) return;
  try {
    const response = await fetch("/scenarios");
    const scenarios = await response.json();
    select.innerHTML = '<option value="">-- Szenario auswählen --</option>';
    scenarios.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });
  } catch (e) {
    console.error("Szenarien konnten nicht geladen werden:", e);
  }
}

function updateSummary() {
  const data = gatherFormData();
  const output = document.getElementById("summary-output");
  if (!output) return;
  output.innerHTML = "";

  let html = "<h3>Allgemeine Parameter</h3>";
  html += `<div class="summary-box-item"><strong>Frequenz:</strong> <span>${data.simulationParams.frequencyHz} Hz</span></div>`;
  html += `<div class="summary-box-item"><strong>Problem-Tiefe:</strong> <span>${data.simulationParams.problemDepthM} mm</span></div>`;
  html += `<div class="summary-box-item"><strong>Permeabilität:</strong> <span>${data.simulationParams.coreRelPermeability}</span></div>`;

  html += "<h3>Elektrisches System</h3>";
  if (data.electricalSystem.length > 0) {
    data.electricalSystem.forEach((p) => {
      html += `<div class="summary-box-item"><strong>${
        p.name
      }:</strong> <span>${parseFloat(p.peakCurrentA).toFixed(2)} A (Peak), ${
        p.phaseShiftDeg
      }°</span></div>`;
    });
  } else {
    html += "<span>Keine Phasen definiert.</span>";
  }

  html += "<h3>Baugruppen</h3>";
  if (data.assemblies.length > 0) {
    data.assemblies.forEach((a) => {
      let conductorDesc = a.primaryConductorName || "Nicht gewählt";
      html += `<div class="summary-box-item"><strong>${a.name} (Phase: ${a.phaseName})</strong><div class="summary-box-sub-item"><span>Wandler: ${a.transformerName}</span><br><span>Fenster: ${conductorDesc}</span><br><span>Position: (${a.position.x}, ${a.position.y})</span></div></div>`;
    });
  } else {
    html += "<span>Keine Baugruppen definiert.</span>";
  }

  output.innerHTML = html;
  updateVisualization(data);
}

function updateVisualization(data) {
  const svg = document.getElementById("svg-canvas");
  if (!svg) return;
  svg.innerHTML = "";

  fetch("/visualize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .then((elements) => {
      if (!elements || elements.length === 0) return;
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      elements.forEach((el) => {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + (el.width || 0));
        maxY = Math.max(maxY, el.y + (el.height || 0));
      });

      const padding = 100;
      const viewBoxWidth = maxX - minX + 2 * padding;
      const viewBoxHeight = maxY - minY + 2 * padding;
      svg.setAttribute(
        "viewBox",
        `${minX - padding} ${-maxY - padding} ${viewBoxWidth} ${viewBoxHeight}`
      );

      elements.forEach((el) => {
        let shape = document.createElementNS(
          "http://www.w3.org/2000/svg",
          el.type
        );
        if (el.type === "rect") {
          shape.setAttribute("x", el.x);
          shape.setAttribute("y", -el.y - el.height);
          shape.setAttribute("width", el.width);
          shape.setAttribute("height", el.height);
        }
        shape.setAttribute("fill", el.fill);
        shape.setAttribute("stroke", "black");
        shape.setAttribute("stroke-width", "1");
        svg.appendChild(shape);
      });
    });
}

function initializeCardNavigation(navId, sectionsId) {
  const navCards = document.querySelectorAll(`#${navId} .card`);
  const sections = document.querySelectorAll(`#${sectionsId} .config-section`);
  navCards.forEach((card) => {
    card.addEventListener("click", () => {
      const targetId = card.dataset.target;
      navCards.forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
      sections.forEach((s) => {
        s.style.display = s.id === targetId ? "block" : "none";
        if (s.id === "config-summary") updateSummary();
      });
    });
  });
}
