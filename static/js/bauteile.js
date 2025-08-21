document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("bauteile-nav")) {
    initializeBauteilEditor();
  }
});

let localLibrary = {};
let currentEditingTags = [];

function initializeBauteilEditor() {
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

    // Fehlerbehebung: Suche den Button innerhalb des Formulars
    const addTagsBtn = railForm.querySelector(".add-tags-btn");
    if (addTagsBtn) {
      addTagsBtn.addEventListener("click", openTagModal);
    }
  }

  const modalCancelBtn = document.getElementById("modal-cancel-btn");
  if (modalCancelBtn) modalCancelBtn.addEventListener("click", closeTagModal);

  const modalSaveBtn = document.getElementById("modal-save-btn");
  if (modalSaveBtn) modalSaveBtn.addEventListener("click", saveTagsFromModal);

  const tagSearchInput = document.getElementById("tag-search-input");
  if (tagSearchInput)
    tagSearchInput.addEventListener("input", filterTagsInModal);

  renderComponentLists("copperRails", "rails-list");
  renderComponentPreview({ width: 40, height: 10 }, "rail-preview-svg");
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

    // Allgemeine Produktinformationen
    document.getElementById("rail-name").value = info.name || "";
    document.getElementById("rail-productName").value = info.productName || "";
    document.getElementById("rail-manufacturer").value =
      info.manufacturer || "";
    document.getElementById("rail-eanNumber").value = info.eanNumber || "";
    document.getElementById("rail-sellingPrice").value =
      info.sellingPrice || "";
    document.getElementById("rail-purchasePrice").value =
      info.purchasePrice || "";

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

  let manufacturerHtml = '<div class="tag-group"><strong>Hersteller</strong>';
  for (const [name, color] of Object.entries(PREDEFINED_TAGS.manufacturer)) {
    manufacturerHtml += `<span class="tag-badge" style="background-color: ${color}; color: ${getTextColor(
      color
    )};">${name}</span>`;
  }
  manufacturerHtml += "</div>";
  container.innerHTML += manufacturerHtml;

  const currentColors = generateColorPalette(PREDEFINED_TAGS.current.length);
  let currentHtml = '<div class="tag-group"><strong>Strom</strong>';
  PREDEFINED_TAGS.current.forEach((current, index) => {
    currentHtml += `<span class="tag-badge" style="background-color: ${
      currentColors[index]
    }; color: ${getTextColor(currentColors[index])};">${current}</span>`;
  });
  currentHtml += "</div>";
  container.innerHTML += currentHtml;
}

function updateSelectedTagsDisplay(containerId, tags) {
  const displayContainer = document.getElementById(containerId);
  if (!displayContainer) return;
  displayContainer.innerHTML = "";

  if (tags.length > 0) {
    tags.forEach((tag) => {
      const badge = document.createElement("span");
      badge.innerHTML = getTagBadge(tag);
      const badgeElement = badge.firstElementChild;

      const removeBtn = document.createElement("span");
      removeBtn.className = "remove-tag";
      removeBtn.innerHTML = "&times;";
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        currentEditingTags = currentEditingTags.filter((t) => t !== tag);
        renderTagsInModal(currentEditingTags);
      };

      badgeElement.appendChild(removeBtn);
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

function renderComponentPreview(component, svgId) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  svg.innerHTML = "";

  const width = parseFloat(component.width) || 0;
  const height = parseFloat(component.height) || 0;

  if (width <= 0 || height <= 0) return;

  const padding = 20;
  const svgWidth = Math.max(width, height) + 2 * padding;
  const svgHeight = svgWidth;

  svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);

  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  const x = (svgWidth - width) / 2;
  const y = (svgHeight - height) / 2;

  rect.setAttribute("x", x);
  rect.setAttribute("y", y);
  rect.setAttribute("width", width);
  rect.setAttribute("height", height);
  rect.setAttribute("fill", "#b87333");
  rect.setAttribute("stroke", "#343a40");
  rect.setAttribute("stroke-width", "1");
  svg.appendChild(rect);
}

function gatherRailFormData() {
  const form = document.getElementById("rail-form");
  return {
    templateProductInformation: {
      name: form.querySelector("#rail-name").value,
      productName: form.querySelector("#rail-productName").value,
      manufacturer: form.querySelector("#rail-manufacturer").value,
      eanNumber: form.querySelector("#rail-eanNumber").value,
      sellingPrice: form.querySelector("#rail-sellingPrice").value,
      purchasePrice: form.querySelector("#rail-purchasePrice").value,
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
        length: parseFloat(form.querySelector("#rail-length").value),
        width: parseFloat(form.querySelector("#rail-width").value),
        height: parseFloat(form.querySelector("#rail-height").value),
      },
    },
  };
}

function clearRailForm() {
  const form = document.getElementById("rail-form");
  form.reset();
  document.getElementById("rail-original-name").value = "";
  document.getElementById("rail-form-title").textContent =
    "Neue Stromschiene erstellen";
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
  const container = document.getElementById("modal-tag-list");
  if (!container) return;

  renderTagSelectors();
  updateSelectedTagsDisplay("modal-selected-tags", selectedTags);

  container.querySelectorAll(".tag-badge").forEach((badge) => {
    const tagName = badge.textContent;
    if (selectedTags.includes(tagName)) {
      badge.classList.add("selected");
    }
    badge.addEventListener("click", () => {
      if (currentEditingTags.includes(tagName)) {
        currentEditingTags = currentEditingTags.filter((t) => t !== tagName);
        badge.classList.remove("selected");
      } else {
        currentEditingTags.push(tagName);
        badge.classList.add("selected");
      }
      updateSelectedTagsDisplay("modal-selected-tags", currentEditingTags);
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
