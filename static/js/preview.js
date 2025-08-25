// static/js/preview.js

/**
 * Zeichnet eine Vorschau für einfache rechteckige Bauteile (Stromschienen, Bleche).
 * @param {object} component - Das Geometrie-Objekt des Bauteils.
 * @param {string} svgId - Die ID des SVG-Elements, in das gezeichnet werden soll.
 * @param {boolean} withGrid - Ob ein Gitter gezeichnet werden soll.
 */
function renderComponentPreview(component, svgId, withGrid = false) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  svg.innerHTML = "";

  const width = parseFloat(component.width) || 0;
  const height = parseFloat(component.height) || 0;
  const fillColor = component.material === "Copper" ? "#b87333" : "#a9a9a9";

  const padding = 50;
  const viewWidth = (width > 0 ? width : 100) + 2 * padding;
  const viewHeight = (height > 0 ? height : 100) + 2 * padding;

  svg.setAttribute("viewBox", `0 0 ${viewWidth} ${viewHeight}`);
  _addDefsAndGrid(svg, withGrid);

  if (width <= 0 || height <= 0) return;

  const rectX = (viewWidth - width) / 2;
  const rectY = (viewHeight - height) / 2;

  _drawRectangle(svg, rectX, rectY, width, height, fillColor);
  _createDimension(
    svg,
    { x: rectX, y: rectY + height },
    { x: rectX + width, y: rectY + height },
    25,
    `${width} mm`
  );
  _createDimension(
    svg,
    { x: rectX + width, y: rectY },
    { x: rectX + width, y: rectY + height },
    25,
    `${height} mm`
  );
}

/**
 * Zeichnet eine Vorschau für einen Wandler (Rechteckig oder Rund).
 * @param {object} component - Das Geometrie-Objekt des Wandlers.
 * @param {string} svgId - Die ID des SVG-Elements.
 * @param {boolean} withGrid - Ob ein Gitter gezeichnet werden soll.
 */
function renderTransformerPreview(component, svgId, withGrid = false) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  svg.innerHTML = "";

  const isRing = component.type === "Ring";
  // KORRIGIERT: Fallbacks hinzugefügt, um NaN-Werte zu vermeiden
  const outerDim = isRing
    ? (parseFloat(component.outerAirRadius) || 50) * 2
    : parseFloat(component.outerAirWidth) || 100;

  const padding = 20;
  const viewBoxSize = outerDim + 2 * padding;
  svg.setAttribute("viewBox", `0 0 ${viewBoxSize} ${viewBoxSize}`);
  _addDefsAndGrid(svg, withGrid);

  const centerX = viewBoxSize / 2;
  const centerY = viewBoxSize / 2;

  if (isRing) {
    // Kreisförmigen Wandler zeichnen
    const layers = [
      { r: component.outerAirRadius, fill: "#f0f8ff" },
      { r: component.coreOuterRadius, fill: "#d3d3d3" },
      { r: component.coreInnerRadius, fill: "#f0f8ff" },
      { r: component.gapRadius, fill: "#ffffff" },
    ];
    layers.forEach((layer) => {
      if (layer.r) {
        _drawCircle(svg, centerX, centerY, layer.r, layer.fill);
      }
    });
  } else {
    // Rechteckigen Wandler zeichnen
    const layers = [
      {
        w: component.outerAirWidth || 0,
        h: component.outerAirHeight || 0,
        fill: "#f0f8ff",
      },
      {
        w: component.coreOuterWidth || 0,
        h: component.coreOuterHeight || 0,
        fill: "#d3d3d3",
      },
      {
        w: component.coreInnerWidth || 0,
        h: component.coreInnerHeight || 0,
        fill: "#f0f8ff",
      },
      {
        w: component.innerWidth || 0,
        h: component.innerHeight || 0,
        fill: "#ffffff",
      },
    ];
    layers.forEach((layer) => {
      if (layer.w && layer.h) {
        _drawRectangle(
          svg,
          centerX - layer.w / 2,
          centerY - layer.h / 2,
          layer.w,
          layer.h,
          layer.fill
        );
      }
    });
  }
}

/**
 * Aktiviert Pan- und Zoom-Funktionalität für ein SVG-Element.
 * @param {SVGElement} svg - Das SVG-Element.
 */
function enablePanZoom(svg) {
  let pan = false;
  let point = { x: 0, y: 0 };
  let viewbox = { x: 0, y: 0, w: svg.clientWidth, h: svg.clientHeight };
  const viewBoxAttr = svg.getAttribute("viewBox").split(" ").map(Number);
  viewbox.x = viewBoxAttr[0];
  viewbox.y = viewBoxAttr[1];
  viewbox.w = viewBoxAttr[2];
  viewbox.h = viewBoxAttr[3];

  svg.addEventListener("mousedown", (e) => {
    pan = true;
    point.x = e.clientX;
    point.y = e.clientY;
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

  svg.addEventListener("mouseup", () => {
    pan = false;
  });
  svg.addEventListener("mouseleave", () => {
    pan = false;
  });

  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    const w = viewbox.w;
    const h = viewbox.h;
    const mx = e.offsetX;
    const my = e.offsetY;
    const dw = w * Math.sign(e.deltaY) * 0.1;
    const dh = h * Math.sign(e.deltaY) * 0.1;
    const dx = (dw * mx) / svg.clientWidth;
    const dy = (dh * my) / svg.clientHeight;
    viewbox = {
      x: viewbox.x + dx,
      y: viewbox.y + dy,
      w: viewbox.w - dw,
      h: viewbox.h - dh,
    };
    svg.setAttribute(
      "viewBox",
      `${viewbox.x} ${viewbox.y} ${viewbox.w} ${viewbox.h}`
    );
  });
}

// --- Interne Hilfsfunktionen ---

function _addDefsAndGrid(svg, withGrid) {
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML = `
        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" class="grid-line" />
        </pattern>
        <pattern id="grid-major" width="50" height="50" patternUnits="userSpaceOnUse">
            <rect width="50" height="50" fill="url(#grid)" />
            <path d="M 50 0 L 0 0 0 50" fill="none" class="grid-line-major" />
        </pattern>
    `;
  svg.appendChild(defs);

  if (withGrid) {
    const gridRect = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    gridRect.setAttribute("width", "100%");
    gridRect.setAttribute("height", "100%");
    gridRect.setAttribute("fill", "url(#grid-major)");
    svg.appendChild(gridRect);
  }
}

function _drawRectangle(svg, x, y, width, height, fill) {
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", x);
  rect.setAttribute("y", y);
  rect.setAttribute("width", width);
  rect.setAttribute("height", height);
  rect.setAttribute("fill", fill);
  rect.setAttribute("stroke", "#343a40");
  rect.setAttribute("stroke-width", "0.5");
  svg.appendChild(rect);
}

function _drawCircle(svg, cx, cy, r, fill) {
  const circle = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle"
  );
  circle.setAttribute("cx", cx);
  circle.setAttribute("cy", cy);
  circle.setAttribute("r", r);
  circle.setAttribute("fill", fill);
  circle.setAttribute("stroke", "#343a40");
  circle.setAttribute("stroke-width", "0.5");
  svg.appendChild(circle);
}

function _createDimension(svg, p1, p2, offset, text) {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dimension");

  const isVertical = p1.x === p2.x;
  const p3 = isVertical
    ? { x: p1.x + offset, y: p1.y }
    : { x: p1.x, y: p1.y + offset };
  const p4 = isVertical
    ? { x: p2.x + offset, y: p2.y }
    : { x: p2.x, y: p2.y + offset };

  const extLine1 = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "line"
  );
  extLine1.setAttribute("x1", p1.x);
  extLine1.setAttribute("y1", p1.y);
  extLine1.setAttribute("x2", p3.x);
  extLine1.setAttribute("y2", p3.y);
  group.appendChild(extLine1);

  const extLine2 = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "line"
  );
  extLine2.setAttribute("x1", p2.x);
  extLine2.setAttribute("y1", p2.y);
  extLine2.setAttribute("x2", p4.x);
  extLine2.setAttribute("y2", p4.y);
  group.appendChild(extLine2);

  const dimLine = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "line"
  );
  dimLine.setAttribute("x1", p3.x);
  dimLine.setAttribute("y1", p3.y);
  dimLine.setAttribute("x2", p4.x);
  dimLine.setAttribute("y2", p4.y);
  dimLine.setAttribute("marker-start", "url(#arrow)");
  dimLine.setAttribute("marker-end", "url(#arrow)");
  group.appendChild(dimLine);

  const textElem = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text"
  );
  textElem.textContent = text;
  const textX = p3.x + (p4.x - p3.x) / 2;
  const textY = p3.y + (p4.y - p3.y) / 2;

  if (isVertical) {
    textElem.setAttribute("x", textX + 5);
    textElem.setAttribute("y", textY);
    textElem.setAttribute("text-anchor", "start");
    textElem.setAttribute("dominant-baseline", "middle");
  } else {
    textElem.setAttribute("x", textX);
    textElem.setAttribute("y", textY + 5);
    textElem.setAttribute("text-anchor", "middle");
    textElem.setAttribute("dominant-baseline", "hanging");
  }
  group.appendChild(textElem);
  svg.appendChild(group);
}
