document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("bauteile-nav")) {
    initializeBauteilEditor();
  }
});

let localLibrary = {};
let currentEditingTags = [];
// let allTagsData = {}; // DIESE ZEILE WURDE ENTFERNT, UM DEN FEHLER ZU BEHEBEN

async function initializeBauteilEditor() {
  await loadTags(); // Lade die Tags, bevor der Editor initialisiert wird

  const libraryDataElement = document.getElementById("library-data");
  localLibrary = libraryDataElement
    ? JSON.parse(libraryDataElement.textContent)
    : {};

  initializeCardNavigation("bauteile-nav", "bauteil-sections");

  const railForm = document.getElementById("rail-form");
  if (railForm) {
    railForm.addEventListener("submit", handleSaveComponent);
    document
      .getElementById("rail-clear-btn")
      .addEventListener("click", clearRailForm);

    railForm.addEventListener("input", () => {
      const geoData = gatherRailFormData().specificProductInformation.geometry;
      renderComponentPreview(geoData, "rail-preview-svg");
    });

    const addTagsBtn = railForm.querySelector(".add-tags-btn");
    if (addTagsBtn) {
      addTagsBtn.addEventListener("click", openTagModal);
    }
  }

  document.getElementById("zoom-preview-btn").addEventListener("click", () => {
    const geoData = gatherRailFormData().specificProductInformation.geometry;
    const modal = document.getElementById("preview-modal-overlay");
    const svg = document.getElementById("modal-preview-svg");
    modal.style.display = "flex";
    renderComponentPreview(geoData, "modal-preview-svg", true); // Mit Gitter rendern
    enablePanZoom(svg);
  });

  document
    .getElementById("preview-modal-close")
    .addEventListener("click", () => {
      document.getElementById("preview-modal-overlay").style.display = "none";
    });

  const modalCancelBtn = document.getElementById("modal-cancel-btn");
  if (modalCancelBtn) modalCancelBtn.addEventListener("click", closeTagModal);

  const modalSaveBtn = document.getElementById("modal-save-btn");
  if (modalSaveBtn) modalSaveBtn.addEventListener("click", saveTagsFromModal);

  const tagSearchInput = document.getElementById("tag-search-input");
  if (tagSearchInput)
    tagSearchInput.addEventListener("input", filterTagsInModal);

  renderComponentLists("copperRails", "rails-list");
  renderComponentPreview({ width: 40, height: 10 }, "rail-preview-svg", true);
}

function renderComponentLists(typeKey, listId) {
  const listContainer = document.getElementById(listId);
  if (!listContainer) return;

  const components = localLibrary.components[typeKey] || [];

  listContainer.innerHTML = "";

  if (components.length === 0) {
    listContainer.innerHTML =
      '<p class="empty-list-message">Keine Bauteile in der Bibliothek vorhanden.</p>';
    return;
  }

  components.forEach((comp, index) => {
    const info = comp.templateProductInformation;
    const spec = comp.specificProductInformation;
    const geo = spec.geometry;
    const previewId = `${typeKey}-accordion-preview-${index}`;

    const item = document.createElement("div");
    item.className = "accordion-item";
    item.innerHTML = `
            <button type="button" class="accordion-button component-accordion-btn">
                <div class="tags-display">${(info.tags || [])
                  .map((tag) => getTagBadge(tag))
                  .join("")}</div>
                <strong class="component-item-name">${info.name}</strong>
            </button>
            <div class="accordion-content">
                <div class="component-card-preview-container">
                    <svg id="${previewId}" class="component-card-preview"></svg>
                    <div class="button-group">
                        <button type="button" class="edit-btn" data-name="${
                          info.name
                        }" data-type="${typeKey}">Bearbeiten</button>
                        <button type="button" class="danger delete-btn" data-name="${
                          info.name
                        }" data-type="${typeKey}">Löschen</button>
                    </div>
                </div>
            </div>
        `;
    listContainer.appendChild(item);
    renderComponentPreview(geo, previewId);
  });

  listContainer.querySelectorAll(".component-accordion-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const content = btn.nextElementSibling;
      btn.classList.toggle("active");
      if (content.style.maxHeight) {
        content.style.maxHeight = null;
      } else {
        content.style.maxHeight = content.scrollHeight + "px";
      }
    });
  });
  listContainer
    .querySelectorAll(".edit-btn")
    .forEach((btn) => btn.addEventListener("click", populateEditForm));
  listContainer
    .querySelectorAll(".delete-btn")
    .forEach((btn) => btn.addEventListener("click", handleDeleteComponent));
}

function populateEditForm(event) {
  const name = event.target.dataset.name;
  const typeKey = event.target.dataset.type;

  if (typeKey === "copperRails") {
    const component = (localLibrary.components.copperRails || []).find(
      (c) => c.templateProductInformation.name === name
    );
    if (!component) return;

    const info = component.templateProductInformation || {};
    const spec = component.specificProductInformation || {};
    const electric = spec.electricInformation || {};
    const geo = spec.geometry || {};

    document.getElementById(
      "rail-form-title"
    ).textContent = `Stromschiene bearbeiten: ${name}`;
    document.getElementById("rail-original-name").value = name;
    document.getElementById("rail-form").dataset.uniqueNumber =
      info.uniqueNumber || "";

    // Allgemeine Produktinformationen
    document.getElementById("rail-name").value = info.name || "";
    document.getElementById("rail-productName").value = info.productName || "";
    document.getElementById("rail-manufacturer").value =
      info.manufacturer || "";
    document.getElementById("rail-manufacturerNumber").value =
      info.manufacturerNumber || "";
    document.getElementById("rail-companyNumber").value =
      info.companyNumber || "";
    document.getElementById("rail-eanNumber").value = info.eanNumber || "";
    document.getElementById("rail-additionalInfo").value =
      info.additionalInfo || "";
    document.getElementById("rail-sellingPrice").value =
      info.sellingPrice || "";
    document.getElementById("rail-purchasePrice").value =
      info.purchasePrice || "";
    document.getElementById("rail-condition").value = info.condition || "new";

    // Spezifische Produktinformationen
    document.getElementById("rail-voltage").value = electric.voltage || "";
    document.getElementById("rail-current").value = electric.current || "";
    document.getElementById("rail-power").value = electric.power || "";

    document.getElementById("rail-length").value = geo.length || "";
    document.getElementById("rail-width").value = geo.width || "";
    document.getElementById("rail-height").value = geo.height || "";

    currentEditingTags = [...(info.tags || [])];
    updateSelectedTagsDisplay("rail-tags-selection", currentEditingTags);
    renderComponentPreview(geo, "rail-preview-svg");
    window.scrollTo(0, 0);
  }
}

async function handleSaveComponent(event) {
  event.preventDefault();
  const form = event.target;
  const typeKey = "copperRails";

  const componentData = gatherRailFormData();
  const originalName =
    form.querySelector("#rail-original-name").value ||
    componentData.templateProductInformation.name;

  const response = await fetch("/library", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "save",
      type: typeKey,
      component: componentData,
      originalName: originalName,
    }),
  });

  const result = await response.json();
  alert(result.message || result.error);

  if (response.ok) {
    localLibrary = result.library;
    renderComponentLists(typeKey, "rails-list");
    clearRailForm();
  }
}

async function handleDeleteComponent(event) {
  const name = event.target.dataset.name;
  const typeKey = event.target.dataset.type;

  if (confirm(`Möchtest du das Bauteil '${name}' wirklich löschen?`)) {
    const response = await fetch("/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete",
        type: typeKey,
        originalName: name,
      }),
    });

    const result = await response.json();
    alert(result.message || result.error);

    if (response.ok) {
      localLibrary = result.library;
      renderComponentLists(typeKey, "rails-list");
    }
  }
}

function renderTagSelectors() {
  const container = document.getElementById("modal-tag-list");
  if (!container) return;
  container.innerHTML = "";

  (allTagsData.categories || []).forEach((category) => {
    let categoryHtml = `<div class="tag-group"><strong>${category.name}</strong>`;
    (category.tags || []).forEach((tag) => {
      categoryHtml += getTagBadge(tag.name);
    });
    categoryHtml += "</div>";
    container.innerHTML += categoryHtml;
  });
}

function updateSelectedTagsDisplay(containerId, tags) {
  const displayContainer = document.getElementById(containerId);
  if (!displayContainer) return;
  displayContainer.innerHTML = "";

  if (tags.length > 0) {
    tags.forEach((tag) => {
      const badgeHTML = getTagBadge(tag);
      const badgeWrapper = document.createElement("span");
      badgeWrapper.innerHTML = badgeHTML;
      const badgeElement = badgeWrapper.firstElementChild;

      if (containerId === "modal-selected-tags") {
        const removeBtn = document.createElement("span");
        removeBtn.className = "remove-tag";
        removeBtn.innerHTML = "&times;";
        removeBtn.onclick = (e) => {
          e.stopPropagation();
          currentEditingTags = currentEditingTags.filter((t) => t !== tag);
          renderTagsInModal(currentEditingTags);
        };
        badgeElement.appendChild(removeBtn);
      }

      displayContainer.appendChild(badgeElement);
    });
  }

  if (containerId === "rail-tags-selection") {
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "add-tags-btn";
    addButton.textContent = "+ Tags hinzufügen";
    addButton.onclick = openTagModal;
    displayContainer.appendChild(addButton);
  }
}

function renderComponentPreview(component, svgId, withGrid = false) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  svg.innerHTML = "";

  const width = parseFloat(component.width) || 0;
  const height = parseFloat(component.height) || 0;

  const padding = 50;
  const viewWidth = (width > 0 ? width : 100) + 2 * padding;
  const viewHeight = (height > 0 ? height : 100) + 2 * padding;

  svg.setAttribute("viewBox", `0 0 ${viewWidth} ${viewHeight}`);

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

  if (width <= 0 || height <= 0) return;

  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  const rectX = (viewWidth - width) / 2;
  const rectY = (viewHeight - height) / 2;
  rect.setAttribute("x", rectX);
  rect.setAttribute("y", rectY);
  rect.setAttribute("width", width);
  rect.setAttribute("height", height);
  rect.setAttribute("fill", "#b87333");
  rect.setAttribute("stroke", "#343a40");
  rect.setAttribute("stroke-width", "0.5");
  svg.appendChild(rect);

  const createDimension = (p1, p2, p3, p4, text) => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "dimension");

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

    if (p3.x === p4.x) {
      textElem.setAttribute("x", textX - 5);
      textElem.setAttribute("y", textY);
      textElem.setAttribute("text-anchor", "end");
      textElem.setAttribute("dominant-baseline", "middle");
    } else {
      textElem.setAttribute("x", textX);
      textElem.setAttribute("y", textY - 5);
      textElem.setAttribute("text-anchor", "middle");
    }
    group.appendChild(textElem);
    svg.appendChild(group);
  };

  const offset = 25;
  createDimension(
    { x: rectX, y: rectY + height },
    { x: rectX + width, y: rectY + height },
    { x: rectX, y: rectY + height + offset },
    { x: rectX + width, y: rectY + height + offset },
    `${width} mm`
  );

  createDimension(
    { x: rectX + width, y: rectY },
    { x: rectX + width, y: rectY + height },
    { x: rectX + width + offset, y: rectY },
    { x: rectX + width + offset, y: rectY + height },
    `${height} mm`
  );
}

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

function gatherRailFormData() {
  const form = document.getElementById("rail-form");
  const uniqueNumber = form.dataset.uniqueNumber || null;

  const data = {
    templateProductInformation: {
      name: form.querySelector("#rail-name").value,
      productName: form.querySelector("#rail-productName").value,
      manufacturer: form.querySelector("#rail-manufacturer").value,
      manufacturerNumber: form.querySelector("#rail-manufacturerNumber").value,
      companyNumber: form.querySelector("#rail-companyNumber").value,
      eanNumber: form.querySelector("#rail-eanNumber").value,
      additionalInfo: form.querySelector("#rail-additionalInfo").value,
      sellingPrice: form.querySelector("#rail-sellingPrice").value,
      purchasePrice: form.querySelector("#rail-purchasePrice").value,
      condition: form.querySelector("#rail-condition").value,
      tags: currentEditingTags,
    },
    specificProductInformation: {
      electricInformation: {
        voltage: form.querySelector("#rail-voltage").value,
        current: form.querySelector("#rail-current").value,
        power: form.querySelector("#rail-power").value,
      },
      geometry: {
        type: "Rectangle",
        material: "Copper",
        length: parseFloat(form.querySelector("#rail-length").value),
        width: parseFloat(form.querySelector("#rail-width").value),
        height: parseFloat(form.querySelector("#rail-height").value),
      },
    },
  };

  if (uniqueNumber) {
    data.templateProductInformation.uniqueNumber = uniqueNumber;
  }

  return data;
}

function clearRailForm() {
  const form = document.getElementById("rail-form");
  form.reset();
  document.getElementById("rail-original-name").value = "";
  document.getElementById("rail-form-title").textContent =
    "Neue Stromschiene erstellen";
  form.dataset.uniqueNumber = "";
  currentEditingTags = [];
  updateSelectedTagsDisplay("rail-tags-selection", currentEditingTags);
  renderComponentPreview({ width: 40, height: 10 }, "rail-preview-svg");
}

function openTagModal() {
  renderTagsInModal(currentEditingTags);
  document.getElementById("tag-modal").style.display = "flex";
}

function closeTagModal() {
  document.getElementById("tag-modal").style.display = "none";
  document.getElementById("tag-search-input").value = "";
}

function saveTagsFromModal() {
  updateSelectedTagsDisplay("rail-tags-selection", currentEditingTags);
  closeTagModal();
}

function renderTagsInModal(selectedTags = []) {
  const mainListContainer = document.getElementById("modal-tag-list");
  if (!mainListContainer) return;
  mainListContainer.innerHTML = "";

  (allTagsData.categories || []).forEach((category) => {
    let categoryHtml = `<div class="tag-group"><strong>${category.name}</strong>`;
    (category.tags || []).forEach((tag) => {
      categoryHtml += getTagBadge(tag.name);
    });
    categoryHtml += "</div>";
    mainListContainer.innerHTML += categoryHtml;
  });

  updateSelectedTagsDisplay("modal-selected-tags", selectedTags);

  mainListContainer.querySelectorAll(".tag-badge").forEach((badge) => {
    const tagName = badge.textContent.trim();
    if (selectedTags.includes(tagName)) {
      badge.classList.add("selected");
    }

    badge.addEventListener("click", () => {
      if (currentEditingTags.includes(tagName)) {
        currentEditingTags = currentEditingTags.filter((t) => t !== tagName);
      } else {
        currentEditingTags.push(tagName);
      }
      renderTagsInModal(currentEditingTags);
    });
  });
}

function filterTagsInModal() {
  const filter = document
    .getElementById("tag-search-input")
    .value.toLowerCase();
  document.querySelectorAll("#modal-tag-list .tag-badge").forEach((badge) => {
    if (badge.textContent.toLowerCase().includes(filter)) {
      badge.style.display = "inline-flex";
    } else {
      badge.style.display = "none";
    }
  });
}
