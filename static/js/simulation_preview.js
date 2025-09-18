// static/js/simulation_preview.js

function renderInteractivePreview(
  targetPrefix,
  scenes,
  room,
  onStepClickCallback
) {
  const svgElement = document.getElementById(`${targetPrefix}-svg`);
  const controlsElement = document.getElementById(`${targetPrefix}-controls`);
  const coordsElement = document.getElementById(`${targetPrefix}-coords`);

  if (!svgElement || !controlsElement) {
    console.error("Vorschau-Elemente nicht gefunden für Prefix:", targetPrefix);
    return;
  }

  // SVG leeren
  svgElement.innerHTML = "";

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

  // Haupt-Gruppe mit korrekter Y-Achsen-Spiegelung
  const mainGroup = createSvgElement("g", { transform: "scale(1, -1)" });
  svgElement.appendChild(mainGroup);

  // Raum-Rechteck zeichnen
  mainGroup.appendChild(
    createSvgElement("rect", {
      x: -roomWidth / 2,
      y: -roomHeight / 2,
      width: roomWidth,
      height: roomHeight,
      class: "simulation-room-border",
    })
  );

  // Alle Szenen (Positionsschritte) erstellen
  scenes.forEach((scene, index) => {
    const group = createSvgElement("g", {
      id: `scene-${targetPrefix}-${index}`,
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
            y: -elData.y, // Y-Position für Text korrigieren
            "text-anchor": "middle",
            "dominant-baseline": "middle",
            transform: "scale(1, -1)", // Text wieder richtig herum drehen
            class: "assembly-label",
          },
          elData.text
        );
      }
      if (el) group.appendChild(el);
    });
    mainGroup.appendChild(group);
  });

  // Steuerungs-Buttons erstellen
  controlsElement.innerHTML = "";
  scenes.forEach((scene, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button";
    button.textContent = scene.name;
    button.onclick = () => {
      mainGroup
        .querySelectorAll(`[id^='scene-${targetPrefix}-']`)
        .forEach((g) => (g.style.visibility = "hidden"));
      mainGroup.querySelector(
        `#scene-${targetPrefix}-${index}`
      ).style.visibility = "visible";
      controlsElement
        .querySelectorAll("button")
        .forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
      if (onStepClickCallback && scene.pos_group) {
        onStepClickCallback(scene.pos_group);
      }
    };
    controlsElement.appendChild(button);
  });

  // Ersten Button standardmäßig aktivieren
  if (controlsElement.firstChild) {
    controlsElement.firstChild.click();
  }

  // Pan & Zoom und Koordinatenanzeige aktivieren
  enablePanZoom(svgElement);
  setupCoordinateDisplay(svgElement, coordsElement);
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
    svg.style.cursor = "grabbing";
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
    svg.style.cursor = "grab";
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

function setupCoordinateDisplay(svg, displayElement) {
  if (!displayElement) return;
  svg.addEventListener("mousemove", (e) => {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    // Y-Koordinate aufgrund der `scale(1, -1)` Transformation negieren
    displayElement.textContent = `X: ${svgP.x.toFixed(
      1
    )}, Y: ${(-svgP.y).toFixed(1)}`;
  });
  svg.addEventListener("mouseleave", () => {
    displayElement.textContent = "X: --, Y: --";
  });
}
