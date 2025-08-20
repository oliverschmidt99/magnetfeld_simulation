document.addEventListener("DOMContentLoaded", () => {
  // Initialisiert die Navigation auf jeder Seite
  handleNavSlider();

  if (document.getElementById("simulation-form")) {
    initializeConfigurator();
  }
});

function handleNavSlider() {
  const nav = document.getElementById("main-nav");
  if (!nav) return;

  const slider = nav.querySelector(".nav-slider");
  const activeLink = nav.querySelector("a.active");

  // Positioniert den Slider direkt unter dem aktiven Link beim Laden der Seite
  if (activeLink) {
    // Kurze Verzögerung, um sicherzustellen, dass der Browser das Layout berechnet hat
    // und die CSS-Transition ausgelöst wird.
    setTimeout(() => {
      slider.style.width = `${activeLink.offsetWidth}px`;
      slider.style.left = `${activeLink.offsetLeft}px`;
    }, 10);
  }
}

function initializeConfiguratorTabs() {
  const cards = document.querySelectorAll("#config-nav .card");
  const sections = document.querySelectorAll(
    "#config-sections .config-section"
  );

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      sections.forEach((s) => s.classList.remove("active"));
      cards.forEach((c) => c.classList.remove("active"));

      const targetId = card.dataset.target;
      document.getElementById(targetId).classList.add("active");
      card.classList.add("active");

      if (targetId === "config-summary") {
        updateSummary();
      }
    });
  });
}

function initializeConfigurator() {
  initializeConfiguratorTabs();

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
    .addEventListener("click", saveScenario);
  document
    .getElementById("load-scenario-btn")
    .addEventListener("click", loadScenario);
  document
    .getElementById("delete-scenario-btn")
    .addEventListener("click", deleteScenario);

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const data = gatherFormData();
    fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .then((result) => alert(result.message));
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

function updatePeak(id, type) {
  const rmsInput = document.getElementById(`${type}-${id}-rms`);
  const peakInput = document.getElementById(`${type}-${id}-peak`);
  peakInput.value = (parseFloat(rmsInput.value) * SQRT2).toFixed(2);
}

function updateRms(id, type) {
  const peakInput = document.getElementById(`${type}-${id}-peak`);
  const rmsInput = document.getElementById(`${type}-${id}-rms`);
  rmsInput.value = (parseFloat(peakInput.value) / SQRT2).toFixed(2);
}

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
  const railOptions = library.copperRails
    .map(
      (r) =>
        `<option value="${r.name}" ${
          data.copperRailName === r.name ? "selected" : ""
        }>${r.name}</option>`
    )
    .join("");
  const transformerOptions = library.transformers
    .map(
      (t) =>
        `<option value="${t.name}" ${
          data.transformerName === t.name ? "selected" : ""
        }>${t.name}</option>`
    )
    .join("");
  item.innerHTML = `<h4>Baugruppe ${assemblyCounter}</h4><label>Name:</label><input type="text" class="assembly-name" value="${
    data.name || `Assembly_${assemblyCounter}`
  }"><label>Zugeordnete Phase:</label><select class="assembly-phase-select">${
    data.phaseName || ""
  }</select><label>Position X:</label><input type="number" class="pos-x" value="${
    data.position?.x || 0
  }"><label>Position Y:</label><input type="number" class="pos-y" value="${
    data.position?.y || 0
  }"><label>Kupferschiene:</label><select class="copper-rail">${railOptions}</select><label>Wandler:</label><select class="transformer">${transformerOptions}</select><button type="button" onclick="removeItem('assembly-${assemblyCounter}')">Entfernen</button>`;
  list.appendChild(item);
}

function addStandalone(data = {}) {
  standaloneCounter++;
  const list = document.getElementById("standalone-list");
  const item = document.createElement("div");
  item.className = "list-item";
  item.id = `standalone-${standaloneCounter}`;
  let sheetOptions = library.transformerSheets
    .map(
      (s) =>
        `<option value="${s.name}" ${data.name === s.name ? "selected" : ""}>${
          s.name
        }</option>`
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
  document.getElementById(id).remove();
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

function updateSummary() {
  const data = gatherFormData();
  const output = document.getElementById("summary-output");
  output.innerHTML = "";

  const params = data.simulationParams;
  let paramsHtml = "<h3>Allgemeine Parameter</h3>";
  paramsHtml += `<div class="summary-box-item"><strong>Frequenz:</strong> <span>${params.frequencyHz} Hz</span></div>`;
  paramsHtml += `<div class="summary-box-item"><strong>Problem-Tiefe:</strong> <span>${params.problemDepthM} mm</span></div>`;
  paramsHtml += `<div class="summary-box-item"><strong>Permeabilität:</strong> <span>${params.coreRelPermeability}</span></div>`;
  output.innerHTML += paramsHtml;

  let electricalHtml = "<h3>Elektrisches System</h3>";
  if (data.electricalSystem.length > 0) {
    data.electricalSystem.forEach((p) => {
      electricalHtml += `<div class="summary-box-item"><strong>${
        p.name
      }:</strong> <span>${parseFloat(p.peakCurrentA).toFixed(2)} A (Peak), ${
        p.phaseShiftDeg
      }°</span></div>`;
    });
  } else {
    electricalHtml += "<span>Keine Phasen definiert.</span>";
  }
  output.innerHTML += electricalHtml;

  let assembliesHtml = "<h3>Baugruppen</h3>";
  if (data.assemblies.length > 0) {
    data.assemblies.forEach((a) => {
      assembliesHtml += `<div class="summary-box-item"><strong>${a.name} (Phase: ${a.phaseName})</strong><div class="summary-box-sub-item"><span>Schiene: ${a.copperRailName}</span><br><span>Wandler: ${a.transformerName}</span><br><span>Position: (${a.position.x}, ${a.position.y})</span></div></div>`;
    });
  } else {
    assembliesHtml += "<span>Keine Baugruppen definiert.</span>";
  }
  output.innerHTML += assembliesHtml;

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
        maxX = Math.max(maxX, el.x + el.width);
        maxY = Math.max(maxY, el.y + el.height);
      });
      const padding = 100;
      const viewBoxWidth = maxX - minX + 2 * padding;
      const viewBoxHeight = maxY - minY + 2 * padding;
      svg.setAttribute(
        "viewBox",
        `${minX - padding} ${-maxY - padding} ${viewBoxWidth} ${viewBoxHeight}`
      );
      elements.forEach((el) => {
        const rect = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect"
        );
        rect.setAttribute("x", el.x);
        rect.setAttribute("y", -el.y - el.height);
        rect.setAttribute("width", el.width);
        rect.setAttribute("height", el.height);
        rect.setAttribute("fill", el.fill);
        rect.setAttribute("stroke", "black");
        rect.setAttribute("stroke-width", "1");
        svg.appendChild(rect);
      });
    });
}

function saveState() {
  const data = gatherFormData();
  localStorage.setItem("latestSimConfig", JSON.stringify(data));
}

function loadState(data = null) {
  const configData =
    data || JSON.parse(localStorage.getItem("latestSimConfig"));
  document.getElementById("electrical-system-list").innerHTML = "";
  document.getElementById("assemblies-list").innerHTML = "";
  document.getElementById("standalone-list").innerHTML = "";
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
    position: { x: -500, y: 0 },
  });
  addAssembly({
    name: "Assembly_2",
    phaseName: "L2",
    position: { x: 0, y: 0 },
  });
  addAssembly({
    name: "Assembly_3",
    phaseName: "L3",
    position: { x: 500, y: 0 },
  });

  updateAssemblyPhaseDropdowns();
  updateScenarioList();
  saveState();
}

function getScenarios() {
  return JSON.parse(localStorage.getItem("simulationScenarios")) || {};
}

function saveScenario() {
  const name = document.getElementById("scenario-name").value;
  if (!name) {
    alert("Bitte gib einen Namen für das Szenario ein.");
    return;
  }
  const scenarios = getScenarios();
  scenarios[name] = gatherFormData();
  localStorage.setItem("simulationScenarios", JSON.stringify(scenarios));
  updateScenarioList();
  alert(`Szenario '${name}' gespeichert!`);
}

function loadScenario() {
  const select = document.getElementById("saved-scenarios");
  const name = select.value;
  if (!name) {
    alert("Bitte wähle ein Szenario zum Laden aus.");
    return;
  }
  const scenarios = getScenarios();
  if (scenarios[name]) {
    loadState(scenarios[name]);
    document.getElementById("scenario-name").value = name;
    alert(`Szenario '${name}' geladen!`);
  }
}

function deleteScenario() {
  const select = document.getElementById("saved-scenarios");
  const name = select.value;
  if (!name) {
    alert("Bitte wähle ein Szenario zum Löschen aus.");
    return;
  }
  const scenarios = getScenarios();
  if (scenarios[name]) {
    if (confirm(`Möchtest du das Szenario '${name}' wirklich löschen?`)) {
      delete scenarios[name];
      localStorage.setItem("simulationScenarios", JSON.stringify(scenarios));
      updateScenarioList();
      alert(`Szenario '${name}' gelöscht!`);
    }
  }
}

function updateScenarioList() {
  const scenarios = getScenarios();
  const select = document.getElementById("saved-scenarios");
  select.innerHTML = '<option value="">-- Szenario auswählen --</option>';
  for (const name in scenarios) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  }
}
