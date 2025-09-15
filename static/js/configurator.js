// static/js/configurator.js

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("simulation-form")) {
    initializeConfigurator();
  }
});

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
const cardinalDirections = ["Norden", "Süden", "Osten", "Westen"];

const SQRT2 = Math.sqrt(2);
let phaseCounter = 0;
let assemblyCounter = 0;
let standaloneCounter = 0;

function updateDirectionInputs(selectElement) {
  const selectedDirection = selectElement.value;
  const vector = directionVectors[selectedDirection];
  const targetXInput = document.getElementById(selectElement.dataset.targetX);
  const targetYInput = document.getElementById(selectElement.dataset.targetY);

  if (vector) {
    targetXInput.value = vector.x;
    targetYInput.value = vector.y;
  }

  const isDisabled = cardinalDirections.includes(selectedDirection);
  targetXInput.disabled = isDisabled;
  targetYInput.disabled = isDisabled;
}

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
    updateParametersFromCsv();
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
    setupCoordinateDisplay(svg);
  }

  document.querySelectorAll(".direction-preset").forEach((select) => {
    select.addEventListener("change", () => updateDirectionInputs(select));
    updateDirectionInputs(select);
  });

  loadState();
}

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

// KORREKTUR: Die Funktion wird jetzt asynchron aufgerufen
async function updateVisualization() {
  const data = gatherFormData();
  const svg = document.getElementById("config-preview-svg");
  const controls = document.getElementById("preview-controls");

  svg.innerHTML = `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">Vorschau wird geladen...</text>`;
  controls.innerHTML = "";

  // NEU: Ruft die Funktion auf, um die Checkboxen zu rendern
  renderComponentToggles(data);

  try {
    const response = await fetch("/visualize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok)
      throw new Error("Visualisierungs-Daten konnten nicht geladen werden.");

    const { scenes, room, position_steps, coordinate_summary } =
      await response.json();

    updateParameterSummary(data, position_steps, coordinate_summary);

    svg.innerHTML = "";

    const roomWidth = parseFloat(room.Laenge || room.Länge);
    const roomHeight = parseFloat(room.Breite);

    if (!room || isNaN(roomWidth) || isNaN(roomHeight)) {
      svg.innerHTML = `<text x="50%" y="50%" fill="red" dominant-baseline="middle" text-anchor="middle">Simulationsraum-Daten unvollständig.</text>`;
      return;
    }

    const padding = 50;
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

    const mainGroup = createSvgElement("g", { transform: "scale(1, -1)" });
    svg.appendChild(mainGroup);

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
    mainGroup.appendChild(boundary);

    const roomRect = createSvgElement("rect", {
      x: -roomWidth / 2,
      y: -roomHeight / 2,
      width: roomWidth,
      height: roomHeight,
      class: "simulation-room-border",
    });
    mainGroup.appendChild(roomRect);

    const roomLabel = createSvgElement(
      "text",
      {
        x: 0,
        y: -(roomHeight / 2 + 15),
        class: "simulation-room-label",
        transform: "scale(1, -1)",
      },
      "Simulationsraum (Spielraum)"
    );
    mainGroup.appendChild(roomLabel);

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
            "stroke-width": 1,
            transform: elData.transform || "",
          });
        } else if (elData.type === "circle") {
          el = createSvgElement("circle", {
            cx: elData.cx,
            cy: elData.cy,
            r: elData.r,
            fill: elData.fill,
          });
          if (elData.material) {
            const title = createSvgElement("title", {}, elData.material);
            el.appendChild(title);
          }
        } else if (elData.type === "text") {
          el = createSvgElement(
            "text",
            {
              x: elData.x,
              y: -elData.y,
              class: elData.class || "assembly-label",
              "text-anchor": "middle",
              "dominant-baseline": "middle",
              transform: "scale(1, -1)",
            },
            elData.text
          );
        }
        if (el) group.appendChild(el);
      });
      mainGroup.appendChild(group);
    });

    scenes.forEach((scene, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button secondary";
      button.textContent = scene.name;
      button.onclick = () => {
        mainGroup
          .querySelectorAll("g[id^='scene-']")
          .forEach((g) => (g.style.visibility = "hidden"));
        mainGroup.querySelector(`#scene-${index}`).style.visibility = "visible";
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

// NEUE FUNKTION: Rendert die Checkboxen zum Aktivieren/Deaktivieren der Bauteile
function renderComponentToggles(data) {
  const container = document.getElementById("component-toggle-list");
  container.innerHTML = ""; // Leert den Container

  const createToggle = (item, type, index) => {
    const name = item.name || `${type}_${index + 1}`;
    const id = `toggle-${type}-${index}`;

    const wrapper = document.createElement("div");
    wrapper.className = "toggle-item";
    wrapper.innerHTML = `
      <input type="checkbox" id="${id}" data-type="${type}" data-index="${index}" ${
      item.enabled !== false ? "checked" : ""
    }>
      <label for="${id}">${name} (${type})</label>
    `;
    return wrapper;
  };

  data.assemblies.forEach((asm, index) => {
    container.appendChild(createToggle(asm, "assembly", index));
  });

  data.standAloneComponents.forEach((comp, index) => {
    container.appendChild(createToggle(comp, "standalone", index));
  });

  // Event Listener hinzufügen, um die Vorschau bei Klick zu aktualisieren
  container.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      saveState(); // Speichert den neuen Zustand der Checkboxen
      updateVisualization(); // Aktualisiert die Vorschau
    });
  });
}

function updateParameterSummary(data, positionSteps, coordinateSummary) {
  const container = document.getElementById("parameter-summary-container");
  if (!container) return;
  const { simulationParams } = data;

  let html = `
    <div class="summary-general">
        <div><span class="summary-label">Nennstrom:</span> <span class="summary-value">${simulationParams.ratedCurrent} A</span></div>
        <div><span class="summary-label">Problem-Tiefe:</span> <span class="summary-value">${simulationParams.problemDepthM} mm</span></div>
        <div><span class="summary-label">Spielraum:</span> <span class="summary-value">${simulationParams.spielraum.Laenge} x ${simulationParams.spielraum.Breite} mm</span></div>
        <div><span class="summary-label">Phasenwinkel:</span> <span class="summary-value">${simulationParams.phaseSweep.start}° bis ${simulationParams.phaseSweep.end}° (${simulationParams.phaseSweep.step}° Schritte)</span></div>
    </div>`;

  html += `<h4>Koordinaten der Positionsschritte (mm)</h4><div class="summary-accordion">`;

  if (coordinateSummary && coordinateSummary.length > 0) {
    coordinateSummary.forEach((step, index) => {
      html += `<details ${index === 0 ? "open" : ""}>`;
      html += `<summary>${step.step_name}</summary>`;

      html += `<table class="summary-table">
                <thead>
                    <tr>
                        <th>Bauteil</th>
                        <th>Typ</th>
                        <th>X-Position</th>
                        <th>Y-Position</th>
                        <th>Rotation</th>
                    </tr>
                </thead>
                <tbody>`;

      step.components.forEach((comp) => {
        html += `<tr>
                    <td>${comp.name}</td>
                    <td>${comp.type}</td>
                    <td>${comp.x.toFixed(2)}</td>
                    <td>${comp.y.toFixed(2)}</td>
                    <td>${
                      comp.rotation !== undefined ? comp.rotation + "°" : "–"
                    }</td>
                </tr>`;
      });

      html += `</tbody></table></details>`;
    });
  } else {
    html += `<p>Keine Koordinaten-Daten berechnet.</p>`;
  }

  html += `</div>`;
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

function setupCoordinateDisplay(svg) {
  const coordDisplay = document.getElementById("coordinate-display");
  if (!coordDisplay) return;

  svg.addEventListener("mousemove", (e) => {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;

    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

    coordDisplay.textContent = `X: ${svgP.x.toFixed(1)}, Y: ${(-svgP.y).toFixed(
      1
    )}`;
  });

  svg.addEventListener("mouseleave", () => {
    coordDisplay.textContent = "X: --, Y: --";
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
    // KORREKTUR: Liest jetzt den 'enabled'-Status aus den Checkboxen aus
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

function saveState() {
  const data = gatherFormData();
  localStorage.setItem("latestSimConfig", JSON.stringify(data));
}

function loadState(data = null) {
  const configData =
    data || JSON.parse(localStorage.getItem("latestSimConfig"));

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
    document.getElementById("directionL1_x").value =
      simulationParams.bewegungsRichtungen.L1?.x || 0;
    document.getElementById("directionL1_y").value =
      simulationParams.bewegungsRichtungen.L1?.y || 0;
    document.getElementById("directionL2_x").value =
      simulationParams.bewegungsRichtungen.L2?.x || 0;
    document.getElementById("directionL2_y").value =
      simulationParams.bewegungsRichtungen.L2?.y || 0;
    document.getElementById("directionL3_x").value =
      simulationParams.bewegungsRichtungen.L3?.x || 0;
    document.getElementById("directionL3_y").value =
      simulationParams.bewegungsRichtungen.L3?.y || 0;
  }

  document.getElementById("problemDepthM").value =
    simulationParams.problemDepthM;

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
