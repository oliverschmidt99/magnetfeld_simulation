// static/js/preview.js
// Dieses Skript ist eine Hilfsfunktion für die SVG-Visualisierung.
// Es wird sowohl vom Konfigurator als auch von anderen Seiten verwendet.

document.addEventListener("DOMContentLoaded", () => {
  const previewModalOverlay = document.getElementById("preview-modal-overlay");
  const previewModalClose = document.getElementById("preview-modal-close");
  const modalPreviewSvg = document.getElementById("modal-preview-svg");

  if (previewModalClose) {
    previewModalClose.addEventListener("click", () => {
      previewModalOverlay.style.display = "none";
    });
  }

  // Öffnet das Modal und rendert das SVG
  window.openPreviewModal = (svgElements) => {
    modalPreviewSvg.innerHTML = "";
    if (!svgElements || svgElements.length === 0) {
      modalPreviewSvg.innerHTML =
        '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="20">Keine Bauteile zur Vorschau.</text>';
      previewModalOverlay.style.display = "flex";
      return;
    }

    const margin = 20;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    svgElements.forEach((el) => {
      if (el.type === "rect") {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + el.width);
        maxY = Math.max(maxY, el.y + el.height);
      }
    });

    const width = maxX - minX + 2 * margin;
    const height = maxY - minY + 2 * margin;

    modalPreviewSvg.setAttribute(
      "viewBox",
      `${minX - margin} ${minY - margin} ${width} ${height}`
    );
    modalPreviewSvg.setAttribute("width", "100%");
    modalPreviewSvg.setAttribute("height", "100%");

    // Zeichne die Elemente auf das SVG
    svgElements.forEach((el) => {
      if (el.type === "rect") {
        const rect = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect"
        );
        rect.setAttribute("x", el.x);
        rect.setAttribute("y", el.y);
        rect.setAttribute("width", el.width);
        rect.setAttribute("height", el.height);
        rect.setAttribute("fill", el.fill);
        rect.setAttribute("stroke", "#333");
        rect.setAttribute("stroke-width", "1");
        modalPreviewSvg.appendChild(rect);

        // Füge ein Label hinzu
        const text = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text"
        );
        text.setAttribute("x", el.x + el.width / 2);
        text.setAttribute("y", el.y + el.height / 2);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "middle");
        text.setAttribute("font-size", "10");
        text.textContent = el.label;
        modalPreviewSvg.appendChild(text);
      }
    });

    previewModalOverlay.style.display = "flex";
  };
});
