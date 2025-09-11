// static/js/configurator.js

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("simulation-form")) {
    initializeConfigurator();
  }
});

// Globale Daten aus dem HTML laden
const libraryDataElement = document.getElementById("library-data");
const library = libraryDataElement
  ? JSON.parse(libraryDataElement.textContent)
  : {};
const spielraumData = JSON.parse(
  document.getElementById("spielraum-data").textContent
);
const schrittweitenData = JSON.parse(
  document.getElementById("schrittweiten-data").textContent
);
const startposData = JSON.parse(
  document.getElementById("startpos-data").textContent
);

const SQRT2 = Math.sqrt(2);
let phaseCounter = 0;
let assemblyCounter = 0;
let standaloneCounter = 0;

function initializeConfigurator() {
  initializeCardNavigation("config-nav", "config-sections");

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
    (data.assemblies || []).forEach((asm) => addAssembly(asm));
    updateAssemblyPhaseDropdowns();
    updatePhaseCurrents();
    updateParametersFromCsv(); // CSV-Werte für alle Parameter laden
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const data = gatherFormData();
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
          runner.classList.remove("initially-hidden");
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

  const svg = document.getElementById("config-preview-svg");
  if (svg) {
    enableSvgZoom(svg);
  }

  // Initialen Zustand laden und Felder füllen
  loadState();
}

/**
 * Füllt die Felder für Spielraum, Schrittweite und Startpositionen basierend auf dem Nennstrom.
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

async function updateVisualization() {
  const data = gatherFormData();
  const svg = document.getElementById("config-preview-svg");
  const controls = document.getElementById("preview-controls");

  svg.innerHTML = `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">Vorschau wird geladen...</text>`;
  controls.innerHTML = "";

  try {
    const response = await fetch("/visualize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok)
      throw new Error("Visualisierungs-Daten konnten nicht geladen werden.");

    const { scenes, room, position_steps } = await response.json();

    updateParameterSummary(data, position_steps);

    svg.innerHTML = "";

    const roomWidth = parseFloat(room.Laenge || room.Länge);
    const roomHeight = parseFloat(room.Breite);

    if (!room || isNaN(roomWidth) || isNaN(roomHeight)) {
      svg.innerHTML = `<text x="50%" y="50%" fill="red" dominant-baseline="middle" text-anchor="middle">Simulationsraum-Daten unvollständig.</text>`;
      return;
    }

    const padding = 150;
    const viewBox = `${-roomWidth / 2 - padding} ${-roomHeight / 2 - padding} ${
      roomWidth + 2 * padding
    } ${roomHeight + 2 * padding}`;
    svg.setAttribute("viewBox", viewBox);

    const createSvgElement = (tag, attrs, textContent = null) => {
      const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
      for (const key in attrs) el.setAttribute(key, attrs[key]);
      if (textContent) el.textContent = textContent;
      return el;
    };

    const boundaryRadius = Math.max(roomWidth, roomHeight) * 0.85;
    const boundary = createSvgElement("circle", {
      cx: 0,
      cy: 0,
      r: boundaryRadius,
      fill: "none",
      stroke: "#0d6efd",
      "stroke-width": 2,
      "stroke-dasharray": "10,10",
    });
    svg.appendChild(boundary);

    const roomRect = createSvgElement("rect", {
      x: -roomWidth / 2,
      y: -roomHeight / 2,
      width: roomWidth,
      height: roomHeight,
      class: "simulation-room-border",
    });
    const roomLabel = createSvgElement(
      "text",
      {
        x: 0,
        y: -roomHeight / 2 - 15,
        class: "simulation-room-label",
      },
      "Simulationsraum (Spielraum)"
    );
    svg.appendChild(roomRect);
    svg.appendChild(roomLabel);

    scenes.forEach((scene, index) => {
      const group = createSvgElement("g", {
        id: `scene-${index}`,
        style: "visibility: hidden;",
      });
      (scene.elements || []).forEach((elData) => {
        let el;
        if (elData.type === "rect") {
          el = createSvgElement("rect", {
            x: elData.x,
            y: elData.y,
            width: elData.width,
            height: elData.height,
            fill: elData.fill,
            stroke: elData.stroke || "#343a40",
            "stroke-width": 0.5,
          });
        } else if (elData.type === "circle") {
          el = createSvgElement("circle", {
            cx: elData.cx,
            cy: elData.cy,
            r: elData.r,
            fill: elData.fill,
          });
        } else if (elData.type === "text") {
          el = createSvgElement(
            "text",
            {
              x: elData.x,
              y: elData.y,
              class: elData.class || "material-label",
            },
            elData.text
          );
        }
        if (el) group.appendChild(el);
      });
      svg.appendChild(group);
    });

    scenes.forEach((scene, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button secondary";
      button.textContent = scene.name;
      button.onclick = () => {
        svg
          .querySelectorAll("g")
          .forEach((g) => (g.style.visibility = "hidden"));
        svg.querySelector(`#scene-${index}`).style.visibility = "visible";
        controls
          .querySelectorAll("button")
          .forEach((b) => b.classList.remove("active"));
        button.classList.add("active");
      };
      controls.appendChild(button);
    });

    if (controls.firstChild) {
      controls.firstChild.click();
    }
  } catch (error) {
    console.error("Fehler bei der Visualisierung:", error);
    svg.innerHTML = `<text x="50%" y="50%" fill="red" dominant-baseline="middle" text-anchor="middle">Fehler: ${error.message}</text>`;
  }
}

function updateParameterSummary(data, positionSteps) {
  const container = document.getElementById("parameter-summary-container");
  if (!container) return;
  const { simulationParams } = data;

  let html = `<h4>Allgemeine Parameter</h4>
    <div class="summary-grid">
        <span class="summary-label">Nennstrom:</span> <span class="summary-value">${simulationParams.ratedCurrent} A</span>
        <span class="summary-label">Problem-Tiefe:</span> <span class="summary-value">${simulationParams.problemDepthM} mm</span>
        <span class="summary-label">Spielraum:</span> <span class="summary-value">${simulationParams.spielraum.Laenge} x ${simulationParams.spielraum.Breite} mm</span>
        <span class="summary-label">Phasenwinkel:</span> <span class="summary-value">${simulationParams.phaseSweep.start}° bis ${simulationParams.phaseSweep.end}° in ${simulationParams.phaseSweep.step}° Schritten</span>
    </div>`;

  html += `<h4>Bewegungspfade & Positionen (mm)</h4>`;
  if (positionSteps && positionSteps.length > 0) {
    html += `<table class="summary-table">
                <thead>
                    <tr>
                        <th>Position</th>
                        <th>L1 (X / Y)</th>
                        <th>L2 (X / Y)</th>
                        <th>L3 (X / Y)</th>
                    </tr>
                </thead>
                <tbody>`;
    positionSteps.forEach((step, index) => {
      const stepName = index === 0 ? "Start" : `Pos ${index}`;
      html += `<tr>
                        <td>${stepName}</td>
                        <td>${step.L1.x.toFixed(1)} / ${step.L1.y.toFixed(
        1
      )}</td>
                        <td>${step.L2.x.toFixed(1)} / ${step.L2.y.toFixed(
        1
      )}</td>
                        <td>${step.L3.x.toFixed(1)} / ${step.L3.y.toFixed(
        1
      )}</td>
                   </tr>`;
    });
    html += `</tbody></table>`;
  } else {
    html += `<p>Keine Positionsdaten berechnet.</p>`;
  }
  container.innerHTML = html;
}

function enableSvgZoom(svg) {
  let pan = false;
  let point = { x: 0, y: 0 };
  let viewbox = { x: 0, y: 0, w: 0, h: 0 };
  const updateViewBox = () => {
    const parts = (svg.getAttribute("viewBox") || "0 0 1 1")
      .split(" ")
      .map(Number);
    [viewbox.x, viewbox.y, viewbox.w, viewbox.h] = parts;
  };
  svg.addEventListener("mousedown", (e) => {
    pan = true;
    point.x = e.clientX;
    point.y = e.clientY;
    updateViewBox();
  });
  svg.addEventListener("mousemove", (e) => {
    if (!pan) return;
    const dx = e.clientX - point.x;
    const dy = e.clientY - point.y;
    viewbox.x -= dx * (viewbox.w / svg.clientWidth);
    viewbox.y -= dy * (viewbox.h / svg.clientHeight);
    svg.setAttribute(
      "viewBox",
      `${viewbox.x} ${viewbox.y} ${viewbox.w} ${viewbox.h}`
    );
    point.x = e.clientX;
    point.y = e.clientY;
  });
  const stopPan = () => {
    pan = false;
  };
  svg.addEventListener("mouseup", stopPan);
  svg.addEventListener("mouseleave", stopPan);
  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    updateViewBox();
    const w = viewbox.w;
    const h = viewbox.h;
    const mx = e.offsetX;
    const my = e.offsetY;
    const dw = w * Math.sign(e.deltaY) * 0.1;
    const dh = h * Math.sign(e.deltaY) * 0.1;
    const dx = (dw * mx) / svg.clientWidth;
    const dy = (dh * my) / svg.clientHeight;
    viewbox = { x: viewbox.x + dx, y: viewbox.y + dy, w: w - dw, h: h - dh };
    svg.setAttribute(
      "viewBox",
      `${viewbox.x} ${viewbox.y} ${viewbox.w} ${viewbox.h}`
    );
  });
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
        L1: form.querySelector("#directionL1").value,
        L2: form.querySelector("#directionL2").value,
        L3: form.querySelector("#directionL3").value,
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
      phaseShiftDeg: parseInt(item.querySelector(".phase-shift").value),
      peakCurrentA: parseFloat(item.dataset.peakCurrent),
    })),
    assemblies: Array.from(
      form.querySelectorAll("#assemblies-list .list-item")
    ).map((item) => ({
      name: item.querySelector(".assembly-name").value,
      phaseName: item.querySelector(".assembly-phase-select").value,
      copperRailName: item.querySelector(".copper-rail").value,
      transformerName: item.querySelector(".transformer").value,
    })),
    standAloneComponents: Array.from(
      form.querySelectorAll("#standalone-list .list-item")
    ).map((item) => ({
      name: item.querySelector(".standalone-name").value,
      position: {
        x: parseInt(item.querySelector(".pos-x").value),
        y: parseInt(item.querySelector(".pos-y").value),
      },
    })),
  };
}

function saveState() {
  const data = gatherFormData();
  localStorage.setItem("latestSimConfig", JSON.stringify(data));
}

function loadState(data = null) {
  const configData =
    data || JSON.parse(localStorage.getItem("latestSimConfig"));

  // Start with default CSV values
  updateParametersFromCsv();

  if (!configData) return;

  const {
    simulationParams,
    electricalSystem,
    assemblies,
    standAloneComponents,
  } = configData;
  document.getElementById("ratedCurrent").value =
    simulationParams.ratedCurrent || "600";

  if (simulationParams.startpositionen) {
    document.getElementById("startX_L1").value =
      simulationParams.startpositionen.x_L1;
    document.getElementById("startY_L1").value =
      simulationParams.startpositionen.y_L1;
    document.getElementById("startX_L2").value =
      simulationParams.startpositionen.x_L2;
    document.getElementById("startY_L2").value =
      simulationParams.startpositionen.y_L2;
    document.getElementById("startX_L3").value =
      simulationParams.startpositionen.x_L3;
    document.getElementById("startY_L3").value =
      simulationParams.startpositionen.y_L3;
  }

  if (simulationParams.bewegungsRichtungen) {
    document.getElementById("directionL1").value =
      simulationParams.bewegungsRichtungen.L1 || "Keine Bewegung";
    document.getElementById("directionL2").value =
      simulationParams.bewegungsRichtungen.L2 || "Keine Bewegung";
    document.getElementById("directionL3").value =
      simulationParams.bewegungsRichtungen.L3 || "Keine Bewegung";
  }

  document.getElementById("problemDepthM").value =
    simulationParams.problemDepthM;

  // Overwrite with saved values if they exist
  if (simulationParams.spielraum) {
    document.getElementById("spielraumLaenge").value =
      simulationParams.spielraum.Laenge;
    document.getElementById("spielraumBreite").value =
      simulationParams.spielraum.Breite;
  }
  if (simulationParams.schrittweiten) {
    document.getElementById("schrittweitePos1").value =
      simulationParams.schrittweiten.Pos1;
    document.getElementById("schrittweitePos2").value =
      simulationParams.schrittweiten.Pos2;
    document.getElementById("schrittweitePos3").value =
      simulationParams.schrittweiten.Pos3;
    document.getElementById("schrittweitePos4").value =
      simulationParams.schrittweiten.Pos4;
  }

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

  (electricalSystem || []).forEach(addPhase);
  (assemblies || []).forEach(addAssembly);
  (standAloneComponents || []).forEach(addStandalone);

  updateAssemblyPhaseDropdowns();
  (assemblies || []).forEach((assembly, index) => {
    const select = document.querySelector(
      `#assembly-${index + 1} .assembly-phase-select`
    );
    if (select) select.value = assembly.phaseName;
  });
}
