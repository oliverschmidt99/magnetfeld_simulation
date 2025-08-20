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

    document
      .getElementById("rail-width")
      .addEventListener("input", () =>
        renderComponentPreview(gatherRailFormData(), "rail-preview-svg")
      );
    document
      .getElementById("rail-height")
      .addEventListener("input", () =>
        renderComponentPreview(gatherRailFormData(), "rail-preview-svg")
      );

    document
      .querySelector(".add-tags-btn")
      .addEventListener("click", openTagModal);
  }

  document
    .getElementById("modal-cancel-btn")
    .addEventListener("click", closeTagModal);
  document
    .getElementById("modal-save-btn")
    .addEventListener("click", saveTagsFromModal);
  document
    .getElementById("tag-search-input")
    .addEventListener("input", filterTagsInModal);

  populateFilterDropdowns();
  renderComponentLists();
  renderComponentPreview({ width: 40, height: 10 }, "rail-preview-svg");
}

function renderComponentLists() {
  const railsList = document.getElementById("rails-list");
  if (!railsList) return;

  const searchTerm = document.getElementById("rail-search").value.toLowerCase();
  const selectedTag = document.getElementById("rail-filter-tag").value;
  const selectedManufacturer = document.getElementById(
    "rail-filter-manufacturer"
  ).value;

  const filteredRails = (localLibrary.copperRails || []).filter((rail) => {
    const nameMatch = rail.name.toLowerCase().includes(searchTerm);
    const tagMatch =
      !selectedTag || (rail.tags && rail.tags.includes(selectedTag));
    const manufacturerMatch =
      !selectedManufacturer || rail.manufacturer === selectedManufacturer;
    return nameMatch && tagMatch && manufacturerMatch;
  });

  railsList.innerHTML = "";

  if (filteredRails.length === 0) {
    railsList.innerHTML =
      '<p style="text-align: center; color: #6c757d;">Keine Bauteile entsprechen den Filterkriterien.</p>';
    return;
  }

  filteredRails.forEach((rail, index) => {
    const item = document.createElement("div");
    item.className = "accordion-item";
    const previewId = `rail-accordion-preview-${index}`;

    item.innerHTML = `
            <button type="button" class="accordion-button component-accordion-btn">
                <div class="tags-display">
                    ${(rail.tags || []).map((tag) => getTagBadge(tag)).join("")}
                </div>
                <strong class="component-item-name">${rail.name}</strong>
                <span class="component-item-manufacturer">${
                  rail.manufacturer || ""
                }</span>
                <span class="component-item-dims">${rail.width} x ${
      rail.height
    } mm</span>
            </button>
            <div class="accordion-content">
                <div class="component-card-preview-container">
                    <svg id="${previewId}" class="component-card-preview"></svg>
                    <div class="button-group">
                        <button type="button" class="edit-btn" data-name="${
                          rail.name
                        }" data-type="copperRails">Bearbeiten</button>
                        <button type="button" class="danger delete-btn" data-name="${
                          rail.name
                        }" data-type="copperRails">Löschen</button>
                    </div>
                </div>
            </div>
        `;
    railsList.appendChild(item);
    renderComponentPreview(rail, previewId);
  });

  document.querySelectorAll(".component-accordion-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      this.classList.toggle("active");
      const content = this.nextElementSibling;
      if (content.style.maxHeight) {
        content.style.maxHeight = null;
      } else {
        content.style.maxHeight = content.scrollHeight + "px";
      }
    });
  });

  document
    .querySelectorAll(".edit-btn")
    .forEach((btn) => btn.addEventListener("click", populateEditForm));
  document
    .querySelectorAll(".delete-btn")
    .forEach((btn) => btn.addEventListener("click", handleDeleteComponent));
}

function populateFilterDropdowns() {
  const allTags = new Set();
  const allManufacturers = new Set();

  (localLibrary.copperRails || []).forEach((rail) => {
    (rail.tags || []).forEach((tag) => allTags.add(tag));
    if (rail.manufacturer) allManufacturers.add(rail.manufacturer);
  });

  const tagFilter = document.getElementById("rail-filter-tag");
  tagFilter.innerHTML = '<option value="">Nach Tag filtern...</option>';
  Array.from(allTags)
    .sort()
    .forEach((tag) => {
      tagFilter.innerHTML += `<option value="${tag}">${tag}</option>`;
    });

  const manufacturerFilter = document.getElementById(
    "rail-filter-manufacturer"
  );
  manufacturerFilter.innerHTML =
    '<option value="">Nach Hersteller filtern...</option>';
  Array.from(allManufacturers)
    .sort()
    .forEach((manufacturer) => {
      manufacturerFilter.innerHTML += `<option value="${manufacturer}">${manufacturer}</option>`;
    });
}

function populateEditForm(event) {
  const name = event.target.dataset.name;
  const type = event.target.dataset.type;

  if (type === "copperRails") {
    const component = localLibrary.copperRails.find((c) => c.name === name);
    if (!component) return;

    document.getElementById(
      "rail-form-title"
    ).textContent = `Stromschiene bearbeiten: ${name}`;
    document.getElementById("rail-original-name").value = name;
    document.getElementById("rail-name").value = component.name;
    document.getElementById("rail-manufacturer").value = component.manufacturer;
    document.getElementById("rail-width").value = component.width;
    document.getElementById("rail-height").value = component.height;

    currentEditingTags = [...(component.tags || [])];
    updateSelectedTagsDisplay("rail-tags-selection", currentEditingTags);
    renderComponentPreview(component, "rail-preview-svg");
    window.scrollTo(0, 0);
  }
}

async function handleSaveComponent(event) {
  event.preventDefault();
  const form = event.target;
  const type = "copperRails";

  const component = {
    name: form.querySelector("#rail-name").value,
    manufacturer: form.querySelector("#rail-manufacturer").value,
    width: parseFloat(form.querySelector("#rail-width").value),
    height: parseFloat(form.querySelector("#rail-height").value),
    material: "Copper",
    tags: currentEditingTags,
  };

  const originalName =
    form.querySelector("#rail-original-name").value || component.name;

  const response = await fetch("/library", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "save", type, component, originalName }),
  });

  const result = await response.json();
  alert(result.message || result.error);

  if (response.ok) {
    localLibrary = result.library;
    renderComponentLists();
    populateFilterDropdowns();
    clearRailForm();
  }
}

async function handleDeleteComponent(event) {
  const name = event.target.dataset.name;
  const type = event.target.dataset.type;

  if (confirm(`Möchtest du das Bauteil '${name}' wirklich löschen?`)) {
    const response = await fetch("/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", type, originalName: name }),
    });

    const result = await response.json();
    alert(result.message || result.error);

    if (response.ok) {
      localLibrary = result.library;
      renderComponentLists();
      populateFilterDropdowns();
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
  return {
    width: document.getElementById("rail-width").value,
    height: document.getElementById("rail-height").value,
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
