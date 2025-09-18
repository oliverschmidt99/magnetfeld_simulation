// static/js/simulation_preview.js

function renderInteractivePreview(
  targetContainerId,
  scenes,
  room,
  onStepClickCallback
) {
  const container = document.getElementById(targetContainerId);
  if (!container) return;

  // Erstelle die notwendige HTML-Struktur
  container.innerHTML = `
        <h3>Simulations-Vorschau</h3>
        <div id="${targetContainerId}-controls" class="button-group"></div>
        <div class="component-preview">
            <svg id="${targetContainerId}-svg"></svg>
        </div>
        <div id="${targetContainerId}-coords" class="coordinate-display">X: --, Y: --</div>
    `;

  const svgElement = document.getElementById(`${targetContainerId}-svg`);
  const controlsElement = document.getElementById(
    `${targetContainerId}-controls`
  );

  const roomWidth = parseFloat(room.Laenge || room.Länge);
  const roomHeight = parseFloat(room.Breite);
  if (isNaN(roomWidth) || isNaN(roomHeight)) {
    svgElement.innerHTML = `<text x="50%" y="50%" fill="red" dominant-baseline="middle" text-anchor="middle">Raumdaten ungültig.</text>`;
    return;
  }

  const padding = 50;
  const viewBox = `${-roomWidth / 2 - padding} ${-roomHeight / 2 - padding} ${
    roomWidth + 2 * padding
  } ${roomHeight + 2 * padding}`;
  svgElement.setAttribute("viewBox", viewBox);

  const createSvgElement = (tag, attrs, textContent = null) => {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const key in attrs) el.setAttribute(key, attrs[key]);
    if (textContent) el.textContent = textContent;
    return el;
  };

  const mainGroup = createSvgElement("g", { transform: "scale(1, -1)" });
  svgElement.appendChild(mainGroup);

  mainGroup.appendChild(
    createSvgElement("rect", {
      x: -roomWidth / 2,
      y: -roomHeight / 2,
      width: roomWidth,
      height: roomHeight,
      class: "simulation-room-border",
    })
  );

  scenes.forEach((scene, index) => {
    const group = createSvgElement("g", {
      id: `scene-${targetContainerId}-${index}`,
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
          stroke: "#343a40",
          "stroke-width": 1,
          transform: elData.transform || "",
        });
      } else if (elData.type === "text") {
        el = createSvgElement(
          "text",
          {
            x: elData.x,
            y: -elData.y,
            "text-anchor": "middle",
            "dominant-baseline": "middle",
            transform: "scale(1, -1)",
          },
          elData.text
        );
      }
      if (el) mainGroup.appendChild(group).appendChild(el);
    });
  });

  controlsElement.innerHTML = "";
  scenes.forEach((scene, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button";
    button.textContent = scene.name;
    button.onclick = () => {
      mainGroup
        .querySelectorAll(`[id^='scene-${targetContainerId}-']`)
        .forEach((g) => (g.style.visibility = "hidden"));
      mainGroup.querySelector(
        `#scene-${targetContainerId}-${index}`
      ).style.visibility = "visible";
      controlsElement
        .querySelectorAll("button")
        .forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
      if (onStepClickCallback) {
        onStepClickCallback(scene.pos_group);
      }
    };
    controlsElement.appendChild(button);
  });

  if (controlsElement.firstChild) {
    controlsElement.firstChild.click();
  }

  enablePanZoom(svgElement);
  setupCoordinateDisplay(svgElement, `${targetContainerId}-coords`);
}

function enablePanZoom(svg) {
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

function setupCoordinateDisplay(svg, displayId) {
  const coordDisplay = document.getElementById(displayId);
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
