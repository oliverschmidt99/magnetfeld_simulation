document.addEventListener("DOMContentLoaded", () => {
  // Nur auf der Konfigurator-Seite ausführen
  if (document.getElementById("simulation-form")) {
    initializeConfigurator();
  }

  // Nur auf der Visualisierungs-Seite ausführen
  if (document.getElementById("svg-canvas")) {
    updateVisualization();
  }

  // Accordion-Logik für alle Seiten initialisieren, falls vorhanden
  initializeAccordion();
});

function initializeAccordion() {
  const accordionButtons = document.getElementsByClassName("accordion-button");
  for (let i = 0; i < accordionButtons.length; i++) {
    accordionButtons[i].addEventListener("click", function () {
      this.classList.toggle("active");
      const content = this.nextElementSibling;
      if (content.style.maxHeight) {
        content.style.maxHeight = null;
      } else {
        // Hinzugefügt, um den Inhaltspadding korrekt anzuzeigen
        content.classList.add("open");
        content.style.maxHeight = content.scrollHeight + "px";
      }
    });
  }
}

function initializeConfigurator() {
  // Standardmäßig 3 Phasen und 3 Baugruppen erstellen
  addPhase(); // L1
  addPhase(); // L2
  addPhase(); // L3

  // Phasenwerte anpassen
  document.querySelector("#phase-2 .phase-shift").value = -120;
  document.querySelector("#phase-3 .phase-shift").value = 120;

  // Baugruppen erstellen
  addAssembly(); // Assembly 1
  addAssembly(); // Assembly 2
  addAssembly(); // Assembly 3

  // Positionen und Phasenzuordnung für Baugruppen anpassen
  document.querySelector("#assembly-1 .pos-x").value = -500;
  document.querySelector("#assembly-1 .assembly-phase-select").value = "L1";

  document.querySelector("#assembly-2 .pos-x").value = 0;
  document.querySelector("#assembly-2 .assembly-phase-select").value = "L2";

  document.querySelector("#assembly-3 .pos-x").value = 500;
  document.querySelector("#assembly-3 .assembly-phase-select").value = "L3";

  document
    .getElementById("simulation-form")
    .addEventListener("submit", function (event) {
      event.preventDefault();
      const data = gatherFormData();

      localStorage.setItem("simulationConfig", JSON.stringify(data));

      fetch("/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
        .then((response) => response.json())
        .then((result) => alert(result.message));
    });
}

const library = JSON.parse(
  document.getElementById("library-data")?.dataset.library || "{}"
);
const SQRT2 = Math.sqrt(2);
let phaseCounter = 0;
let assemblyCounter = 0;
let standaloneCounter = 0;

function updatePeak(id) {
  const rmsInput = document.getElementById(`phase-${id}-rms`);
  const peakInput = document.getElementById(`phase-${id}-peak`);
  peakInput.value = (parseFloat(rmsInput.value) * SQRT2).toFixed(2);
}

function updateRms(id) {
  const peakInput = document.getElementById(`phase-${id}-peak`);
  const rmsInput = document.getElementById(`phase-${id}-rms`);
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
    select.innerHTML = ""; // Dropdown leeren
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

function addPhase() {
  phaseCounter++;
  const list = document.getElementById("electrical-system-list");
  const item = document.createElement("div");
  item.className = "list-item";
  item.id = `phase-${phaseCounter}`;

  const defaultRms = 4000;
  const defaultPeak = (defaultRms * SQRT2).toFixed(2);

  item.innerHTML = `
        <h4>Phase ${phaseCounter}</h4>
        <label>Name:</label>
        <input type="text" class="phase-name" value="L${phaseCounter}" onkeyup="updateAssemblyPhaseDropdowns()">
        <label>Phasenverschiebung (°):</label>
        <input type="number" class="phase-shift" value="0">
        <div class="form-row">
            <div>
                <label>Spitzenstrom (A):</label>
                <input type="number" step="any" id="phase-${phaseCounter}-peak" class="phase-peak" value="${defaultPeak}" oninput="updateRms(${phaseCounter})">
            </div>
            <div>
                <label>Effektivstrom (A):</label>
                <input type="number" step="any" id="phase-${phaseCounter}-rms" class="phase-rms" value="${defaultRms.toFixed(
    2
  )}" oninput="updatePeak(${phaseCounter})">
            </div>
        </div>
        <button type="button" onclick="removeItem('phase-${phaseCounter}'); updateAssemblyPhaseDropdowns();">Entfernen</button>
    `;
  list.appendChild(item);
  updateAssemblyPhaseDropdowns();
}

function addAssembly() {
  assemblyCounter++;
  const list = document.getElementById("assemblies-list");
  const item = document.createElement("div");
  item.className = "list-item";
  item.id = `assembly-${assemblyCounter}`;

  const railOptions = library.copperRails
    .map((r) => `<option value="${r.name}">${r.name}</option>`)
    .join("");
  const transformerOptions = library.transformers
    .map((t) => `<option value="${t.name}">${t.name}</option>`)
    .join("");

  item.innerHTML = `
        <h4>Baugruppe ${assemblyCounter}</h4>
        <label>Name:</label>
        <input type="text" class="assembly-name" value="Assembly_${assemblyCounter}">
        
        <label>Zugeordnete Phase:</label>
        <select class="assembly-phase-select"></select>

        <label>Position X:</label>
        <input type="number" class="pos-x" value="0">
        <label>Position Y:</label>
        <input type="number" class="pos-y" value="0">
        <label>Kupferschiene:</label>
        <select class="copper-rail">${railOptions}</select>
        <label>Wandler:</label>
        <select class="transformer">${transformerOptions}</select>
        <button type="button" onclick="removeItem('assembly-${assemblyCounter}')">Entfernen</button>
    `;
  list.appendChild(item);
  updateAssemblyPhaseDropdowns();
}

function addStandalone() {
  standaloneCounter++;
  const list = document.getElementById("standalone-list");
  const item = document.createElement("div");
  item.className = "list-item";
  item.id = `standalone-${standaloneCounter}`;

  let sheetOptions = library.transformerSheets
    .map((s) => `<option value="${s.name}">${s.name}</option>`)
    .join("");

  item.innerHTML = `
        <h4>Eigenständiges Bauteil ${standaloneCounter}</h4>
        <label>Bauteil:</label>
        <select class="standalone-name">${sheetOptions}</select>
        <label>Position X:</label>
        <input type="number" class="pos-x" value="0">
        <label>Position Y:</label>
        <input type="number" class="pos-y" value="0">
        <button type="button" onclick="removeItem('standalone-${standaloneCounter}')">Entfernen</button>
    `;
  list.appendChild(item);
}

function removeItem(id) {
  document.getElementById(id).remove();
}

function gatherFormData() {
  const form = document.getElementById("simulation-form");
  const data = {
    frequencyHz: form.querySelector("#frequencyHz").value,
    problemDepthM: form.querySelector("#problemDepthM").value,
    coreRelPermeability: form.querySelector("#coreRelPermeability").value,
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

function updateVisualization() {
  const storedConfig = localStorage.getItem("simulationConfig");
  if (!storedConfig) {
    alert(
      "Bitte erstelle zuerst eine Konfiguration auf der 'Konfigurator'-Seite."
    );
    return;
  }
  const data = JSON.parse(storedConfig);

  const svg = document.getElementById("svg-canvas");
  svg.innerHTML = "";

  fetch("/visualize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .then((elements) => {
      if (elements.length === 0) return;

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
        rect.setAttribute("y", -el.y - el.height); // Y-Achse spiegeln
        rect.setAttribute("width", el.width);
        rect.setAttribute("height", el.height);
        rect.setAttribute("fill", el.fill);
        rect.setAttribute("stroke", "black");
        rect.setAttribute("stroke-width", "1");
        svg.appendChild(rect);
      });
    });
}
