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
  const previewContainer = document.querySelector(".preview-section"); // Hauptcontainer der Vorschau

  // Ladeanzeige im SVG-Container anzeigen
  const svgContainer = previewContainer.querySelector(".component-preview");
  svgContainer.innerHTML = `<svg id="config-preview-svg"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">Vorschau wird geladen...</text></svg>`;

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

    // Parameter-Zusammenfassung aktualisieren
    const summaryContainer = document.getElementById(
      "parameter-summary-container"
    );
    if (summaryContainer) {
      updateParameterSummary(data, scenes.length, vizData.coordinate_summary);
    }

    // Die neue, interaktive Vorschau rendern
    renderInteractivePreview("config-preview", scenes, room);
  } catch (error) {
    console.error("Fehler bei der Visualisierung:", error);
    const svg = document.getElementById("config-preview-svg");
    if (svg) {
      svg.innerHTML = `<text x="50%" y="50%" fill="red" text-anchor="middle">Fehler: ${error.message}</text>`;
    }
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
