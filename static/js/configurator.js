// static/js/configurator.js

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("simulation-form")) {
    initializeConfigurator();
  }
});

function initializeConfigurator() {
  initializeCardNavigation("config-nav", "config-sections");
  loadState();

  const form = document.getElementById("simulation-form");
  form.addEventListener("input", saveState);
  form.addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON" && e.target.type === "button") {
      setTimeout(saveState, 50);
    }
  });

  document.getElementById("ratedCurrent").addEventListener("change", () => {
    const data = gatherFormData();
    const asmList = document.getElementById("assemblies-list");
    asmList.innerHTML = "";
    assemblyCounter = 0;
    data.assemblies.forEach((asm) => addAssembly(asm));
    updateAssemblyPhaseDropdowns();
    updatePhaseCurrents();
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const data = gatherFormData();
    if (!data.simulationParams.movementGroup) {
      alert("Bitte eine Bewegungsgruppe wählen.");
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
          const runner = document.getElementById("simulation-runner");
          runner.style.display = "block";
        }
      });
  });

  const startBtn = document.getElementById("start-simulation-btn");
  if (startBtn) {
    startBtn.addEventListener("click", startSimulation);
  }

  const summaryCard = document.querySelector('[data-target="config-summary"]');
  if (summaryCard) {
    summaryCard.addEventListener("click", updateVisualization);
  }
}

function startSimulation() {
  const outputElement = document.getElementById("simulation-output");
  outputElement.textContent = "Starte Simulation... Bitte warten.";

  fetch("/start_simulation", {
    method: "POST",
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.status === "success") {
        outputElement.textContent = `Simulation erfolgreich gestartet!\nNachricht vom Server: ${data.message}`;
      } else {
        outputElement.textContent = `Fehler beim Starten der Simulation:\n${data.error}`;
      }
    })
    .catch((error) => {
      console.error("Fehler beim Senden der Anfrage:", error);
      outputElement.textContent =
        "Ein schwerwiegender Fehler ist aufgetreten. Überprüfe die Browser-Konsole.";
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

async function updateVisualization() {
  const data = gatherFormData();
  const svg = document.getElementById("config-preview-svg");
  svg.innerHTML = `<text x="10" y="20">Vorschau wird geladen...</text>`;

  try {
    const response = await fetch("/visualize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok)
      throw new Error("Visualisierungs-Daten konnten nicht geladen werden.");
    const svgElements = await response.json();

    svg.innerHTML = "";

    const textElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    textElement.setAttribute("x", "10");
    textElement.setAttribute("y", "20");
    textElement.textContent = `${
      svgElements.length || 0
    } Bauteile konfiguriert. (Visuelle Logik hier implementieren)`;
    svg.appendChild(textElement);
  } catch (error) {
    console.error("Fehler bei der Visualisierung:", error);
    svg.innerHTML = `<text x="10" y="20" fill="red">Fehler beim Laden der Vorschau.</text>`;
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
    select.value = selectedValue;
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
    .filter((t) => t.templateProductInformation.tags?.includes(searchTag))
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
  item.innerHTML = `<h4>Eigenständiges Bauteil ${standaloneCounter}</h4>
    <label>Bauteil:</label><select class="standalone-name">${sheetOptions}</select>
    <label>Position X:</label><input type="number" class="pos-x" value="${
      data.position?.x || 0
    }">
    <label>Position Y:</label><input type="number" class="pos-y" value="${
      data.position?.y || 0
    }">
    <button type="button" onclick="removeItem('standalone-${standaloneCounter}')">Entfernen</button>`;
  list.appendChild(item);
}

function removeItem(id) {
  document.getElementById(id)?.remove();
}

function gatherFormData() {
  const form = document.getElementById("simulation-form");
  const data = {
    simulationParams: {
      ratedCurrent: form.querySelector("#ratedCurrent").value,
      movementGroup: form.querySelector("#movementGroup").value,
      problemDepthM: form.querySelector("#problemDepthM").value,
      I_1_mes: form.querySelector("#I_1_mes").value,
      I_2_mes: form.querySelector("#I_2_mes").value,
      I_3_mes: form.querySelector("#I_3_mes").value,
      phaseSweep: {
        start: form.querySelector("#phaseStart").value,
        end: form.querySelector("#phaseEnd").value,
        step: form.querySelector("#phaseStep").value,
      },
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
        peakCurrentA: parseFloat(item.dataset.peakCurrent),
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

function saveState() {
  const data = gatherFormData();
  localStorage.setItem("latestSimConfig", JSON.stringify(data));
}

function loadState(data = null) {
  const configData =
    data || JSON.parse(localStorage.getItem("latestSimConfig"));
  if (!configData) return;

  const {
    simulationParams,
    electricalSystem,
    assemblies,
    standAloneComponents,
  } = configData;
  document.getElementById("ratedCurrent").value =
    simulationParams.ratedCurrent || "600";
  document.getElementById("movementGroup").value =
    simulationParams.movementGroup || "";
  document.getElementById("problemDepthM").value =
    simulationParams.problemDepthM;

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

  electricalSystem.forEach(addPhase);
  assemblies.forEach(addAssembly);
  standAloneComponents.forEach(addStandalone);

  updateAssemblyPhaseDropdowns();
  assemblies.forEach((assembly, index) => {
    const select = document.querySelector(
      `#assembly-${index + 1} .assembly-phase-select`
    );
    if (select) select.value = assembly.phaseName;
  });
}
