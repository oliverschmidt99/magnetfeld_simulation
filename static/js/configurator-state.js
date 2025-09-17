// static/js/configurator-ui.js

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

async function updateVisualization() {
  const data = gatherFormData();
  const svg = document.getElementById("config-preview-svg");
  const controls = document.getElementById("preview-controls");

  svg.innerHTML = `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">Vorschau wird geladen...</text>`;
  controls.innerHTML = "";

  const toggleContainer = document.getElementById("component-toggle-list");
  if (toggleContainer) renderComponentToggles(data);

  try {
    const response = await fetch("/visualize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok)
      throw new Error("Visualisierungs-Daten konnten nicht geladen werden.");

    const vizData = await response.json();
    const { scenes, room } = vizData;

    const summaryContainer = document.getElementById(
      "parameter-summary-container"
    );
    if (summaryContainer) {
      updateParameterSummary(data, scenes.length, vizData.coordinate_summary);
    }

    svg.innerHTML = "";
    const roomWidth = parseFloat(room.Laenge || room.Länge);
    const roomHeight = parseFloat(room.Breite);

    if (isNaN(roomWidth) || isNaN(roomHeight)) {
      svg.innerHTML = `<text x="50%" y="50%" fill="red" text-anchor="middle">Raumdaten unvollständig.</text>`;
      return;
    }

    const createSvgElement = (tag, attrs, textContent = null) => {
      const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
      for (const key in attrs) el.setAttribute(key, attrs[key]);
      if (textContent) el.textContent = textContent;
      return el;
    };

    const padding = 50;
    const viewBox = `${-roomWidth / 2 - padding} ${-roomHeight / 2 - padding} ${
      roomWidth + 2 * padding
    } ${roomHeight + 2 * padding}`;
    svg.setAttribute("viewBox", viewBox);

    const mainGroup = createSvgElement("g", { transform: "scale(1, -1)" });
    svg.appendChild(mainGroup);

    // KORREKTUR: Spielraum-Rahmen und ABC-Grenze werden hier gezeichnet
    const boundaryRadius = Math.max(roomWidth, roomHeight) * 0.85;
    mainGroup.appendChild(
      createSvgElement("circle", {
        cx: 0,
        cy: 0,
        r: boundaryRadius,
        fill: "none",
        stroke: "#0d6efd",
        "stroke-width": 2,
        "stroke-dasharray": "10,10",
      })
    );
    mainGroup.appendChild(
      createSvgElement("rect", {
        x: -roomWidth / 2,
        y: -roomHeight / 2,
        width: roomWidth,
        height: roomHeight,
        class: "simulation-room-border",
      })
    );
    mainGroup.appendChild(
      createSvgElement(
        "text",
        {
          x: 0,
          y: -(roomHeight / 2 + 15),
          class: "simulation-room-label",
          transform: "scale(1, -1)", // Nur dieses Label muss zurückgespiegelt werden
        },
        "Simulationsraum (Spielraum)"
      )
    );

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
        } else if (elData.type === "text") {
          // KORREKTUR: Doppelte Spiegelung und Y-Negierung entfernt
          el = createSvgElement(
            "text",
            {
              x: elData.x,
              y: elData.y,
              class: elData.class || "assembly-label",
              "text-anchor": "middle",
              "dominant-baseline": "middle",
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
      button.className = "button";
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

    if (controls.firstChild) controls.firstChild.click();
  } catch (error) {
    console.error("Fehler bei der Visualisierung:", error);
    svg.innerHTML = `<text x="50%" y="50%" fill="red" text-anchor="middle">Fehler: ${error.message}</text>`;
  }
}

function renderComponentToggles(data) {
  const container = document.getElementById("component-toggle-list");
  if (!container) return;
  container.innerHTML = "";

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

  (data.assemblies || []).forEach((asm, index) => {
    container.appendChild(createToggle(asm, "assembly", index));
  });

  (data.standAloneComponents || []).forEach((comp, index) => {
    container.appendChild(createToggle(comp, "standalone", index));
  });

  container.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      saveState();
      updateVisualization();
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
  let viewbox = { x: 0, y: 0, w: svg.clientWidth, h: svg.clientHeight };

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
  const stopPan = () => (pan = false);
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
