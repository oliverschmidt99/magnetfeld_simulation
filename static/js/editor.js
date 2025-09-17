// static/js/editor.js

let libraryData = {};
let tagsData = {};
let currentEditorComponent = null;
let currentEditorComponentType = null;
let currentComponentTags = [];

async function initializeEditor(library) {
  libraryData = library;
  await loadTagsForEditor();
  setupFilters();
  renderComponentList();
  document
    .getElementById("add-new-component-btn")
    .addEventListener("click", showComponentTypeSelectionModal);
}

async function loadTagsForEditor() {
  try {
    const response = await fetch("/api/tags");
    tagsData = await response.json();
  } catch (error) {
    console.error("Fehler beim Laden der Tags:", error);
  }
}

function setupFilters() {
  document
    .getElementById("component-type-filter")
    .addEventListener("change", renderComponentList);
  document
    .getElementById("search-filter")
    .addEventListener("input", renderComponentList);
}

function renderComponentList() {
  const accordion = document.getElementById("component-list-accordion");
  accordion.innerHTML = "";
  const typeFilter = document.getElementById("component-type-filter").value;
  const searchFilter = document
    .getElementById("search-filter")
    .value.toLowerCase();

  const getIconForType = (type) => {
    switch (type) {
      case "transformers":
        return `<svg width="24" height="24" viewBox="0 0 24 24" class="component-icon"><rect x="3" y="3" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2"/><rect x="7" y="7" width="10" height="10" stroke="currentColor" fill="none" stroke-width="2"/></svg>`;
      case "copperRails":
        return `<svg width="24" height="24" viewBox="0 0 24 24" class="component-icon"><rect x="2" y="9" width="20" height="6" fill="currentColor"/></svg>`;
      case "transformerSheets":
        return `<svg width="24" height="24" viewBox="0 0 24 24" class="component-icon"><rect x="2" y="11" width="20" height="2" fill="currentColor"/></svg>`;
      default:
        return '<svg width="24" height="24" class="component-icon"></svg>';
    }
  };

  for (const type in libraryData.components) {
    if (typeFilter !== "all" && type !== typeFilter) continue;

    libraryData.components[type].forEach((component) => {
      const name = component.templateProductInformation.name || "";
      if (!name.toLowerCase().includes(searchFilter)) return;

      const icon = getIconForType(type);
      const item = document.createElement("div");
      item.className = "accordion-item";
      item.innerHTML = `
                <button type="button" class="accordion-button">
                    <div class="accordion-button-title">
                        ${icon}
                        <span>${name} <small>(${type})</small></span>
                    </div>
                    <div class="tags-display">${(
                      component.templateProductInformation.tags || []
                    )
                      .map((t) => getTagBadge(t))
                      .join("")}</div>
                </button>
                <div class="accordion-content">
                    <p>Hersteller: ${
                      component.templateProductInformation.manufacturer || "N/A"
                    }</p>
                    <button type="button" class="button edit-btn">Bearbeiten</button>
                </div>
            `;
      accordion.appendChild(item);

      const button = item.querySelector(".accordion-button");
      const content = item.querySelector(".accordion-content");
      button.addEventListener("click", () => {
        button.classList.toggle("active");
        content.style.maxHeight = content.style.maxHeight
          ? null
          : content.scrollHeight + "px";
      });

      item
        .querySelector(".edit-btn")
        .addEventListener("click", () => openEditor(component, type));
    });
  }
}

function showComponentTypeSelectionModal() {
  const modal = document.getElementById("component-type-modal");
  modal.style.display = "flex";

  document.getElementById("select-transformer").onclick = () => {
    openEditor(null, "transformers");
    modal.style.display = "none";
  };
  document.getElementById("select-copperRail").onclick = () => {
    openEditor(null, "copperRails");
    modal.style.display = "none";
  };
  document.getElementById("select-transformerSheet").onclick = () => {
    openEditor(null, "transformerSheets");
    modal.style.display = "none";
  };
  document.getElementById("cancel-type-selection").onclick = () => {
    modal.style.display = "none";
  };
}

function openEditor(component = null, type = "transformers") {
  currentEditorComponent = component;
  currentEditorComponentType = type;
  currentComponentTags = component
    ? [...(component.templateProductInformation.tags || [])]
    : [];

  const modal = document.getElementById("component-editor-modal");
  const form = document.getElementById("component-editor-form");
  const title = document.getElementById("editor-title");

  title.textContent = component
    ? `Bauteil bearbeiten: ${component.templateProductInformation.name}`
    : `Neues Bauteil erstellen: ${type.replace(/([A-Z])/g, " $1").trim()}`;

  const data = component || {
    templateProductInformation: { name: "", manufacturer: "", tags: [] },
    specificProductInformation: {
      geometry: {
        type: "Rectangle",
        material: "M-36 Steel",
        coreMaterial: "M-36 Steel",
        insulationMaterial: "Kunststoff",
      },
      electrical: {},
    },
  };
  if (
    type === "copperRails" &&
    !data.specificProductInformation.geometry.material
  ) {
    data.specificProductInformation.geometry.material = "Copper";
  }

  if (type === "transformers") {
    form.innerHTML = getTransformerFormHtml(data);
  } else if (type === "transformerSheets") {
    form.innerHTML = getSheetPackageFormHtml(data);
  } else {
    form.innerHTML = getSimpleComponentFormHtml(data, type);
  }

  form
    .querySelector(".add-tags-btn")
    ?.addEventListener("click", openTagSelectionModal);
  renderCurrentTags();

  form.addEventListener("input", () => updateEditorPreview(type));
  updateEditorPreview(type);

  document.getElementById("save-component-btn").onclick = saveComponent;
  document.getElementById("delete-component-btn").onclick = deleteComponent;
  document.getElementById("cancel-edit-btn").onclick = () =>
    (modal.style.display = "none");

  modal.style.display = "flex";
}

function updateEditorPreview(type) {
  const componentData = gatherComponentDataFromForm(type);
  if (type === "transformers") {
    renderTransformerPreview(
      componentData.geometry,
      "editor-preview-svg",
      true
    );
  } else if (type === "transformerSheets") {
    renderSheetPackagePreview(
      componentData.geometry,
      "editor-preview-svg",
      true
    );
  } else {
    renderComponentPreview(componentData.geometry, "editor-preview-svg", true);
  }
}
