document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("bauteile-nav")) {
    initializeBauteilEditor();
  }
});

let localLibrary = {};
let currentEditingTags = [];
// Die globale Variable 'allTagsData' wird in tags.js deklariert

async function initializeBauteilEditor() {
  await loadTags();

  const libraryDataElement = document.getElementById("library-data");
  localLibrary = libraryDataElement
    ? JSON.parse(libraryDataElement.textContent)
    : {};

  initializeCardNavigation("bauteile-nav", "bauteil-sections");

  // Initialisierung für jeden Bauteiltyp
  setupEditor("rail", "copperRails", renderComponentPreview);
  setupEditor("sheet", "transformerSheets", renderComponentPreview);
  setupEditor("transformer", "transformers", renderTransformerPreview);

  // Modals
  document.querySelectorAll(".zoom-preview-btn").forEach((btn) => {
    btn.addEventListener("click", () => openZoomModal(btn.dataset.formId));
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

  // Listen rendern
  renderComponentLists("copperRails", "rails-list", renderComponentPreview);
  renderComponentLists(
    "transformers",
    "transformers-list",
    renderTransformerPreview
  );
  renderComponentLists(
    "transformerSheets",
    "sheets-list",
    renderComponentPreview
  );
}

function setupEditor(prefix, typeKey, previewFn) {
  const form = document.getElementById(`${prefix}-form`);
  if (form) {
    form.addEventListener("submit", handleSaveComponent);
    const clearBtn = form.querySelector(".clear-btn");
    if (clearBtn)
      clearBtn.addEventListener("click", () => clearForm(prefix, typeKey));

    form.addEventListener("input", () => {
      const data = gatherFormData(prefix, typeKey);
      const geo = data.specificProductInformation.geometry;
      previewFn(geo, `${prefix}-preview-svg`, true);
    });

    const addTagsBtn = form.querySelector(".add-tags-btn");
    if (addTagsBtn) {
      addTagsBtn.addEventListener("click", () => openTagModal(prefix));
    }
  }
  const initialGeo = prefix === "transformer" ? {} : { width: 40, height: 10 };
  previewFn(initialGeo, `${prefix}-preview-svg`, true);
}

function openZoomModal(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  const prefix = form.id.replace("-form", "");
  const typeKey = form.dataset.type;
  const data = gatherFormData(prefix, typeKey);
  const geo = data.specificProductInformation.geometry;

  const modal = document.getElementById("preview-modal-overlay");
  const svg = document.getElementById("modal-preview-svg");

  const previewFn =
    typeKey === "transformers"
      ? renderTransformerPreview
      : renderComponentPreview;

  modal.style.display = "flex";
  previewFn(geo, "modal-preview-svg", true);
  enablePanZoom(svg);
}

function renderComponentLists(typeKey, listId, previewFn) {
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

    const prefix =
      typeKey === "copperRails"
        ? "rail"
        : typeKey === "transformerSheets"
        ? "sheet"
        : "transformer";

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
                        <button type="button" class="edit-btn" data-prefix="${prefix}" data-name="${
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
    previewFn(geo, previewId);
  });

  listContainer.querySelectorAll(".component-accordion-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const content = btn.nextElementSibling;
      btn.classList.toggle("active");
      content.style.maxHeight = content.style.maxHeight
        ? null
        : content.scrollHeight + "px";
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
  const { prefix, name, type } = event.target.dataset;
  const component = (localLibrary.components[type] || []).find(
    (c) => c.templateProductInformation.name === name
  );
  if (!component) return;

  const form = document.getElementById(`${prefix}-form`);
  if (!form) return;

  // KORREKTUR: Suche nach der ID im gesamten Dokument
  const formTitle = document.getElementById(`${prefix}-form-title`);
  if (formTitle) {
    formTitle.textContent = `Bauteil bearbeiten: ${name}`;
  }

  form.querySelector(`#${prefix}-original-name`).value = name;
  form.dataset.uniqueNumber =
    component.templateProductInformation.uniqueNumber || "";

  Object.entries(component.templateProductInformation).forEach(
    ([key, value]) => {
      const input = form.querySelector(`#${prefix}-${key}`);
      if (input) input.value = value;
    }
  );

  if (component.specificProductInformation) {
    Object.entries(component.specificProductInformation).forEach(
      ([key, value]) => {
        if (typeof value === "object" && value !== null) {
          Object.entries(value).forEach(([subKey, subValue]) => {
            const input = form.querySelector(`#${prefix}-${subKey}`);
            if (input) input.value = subValue;
          });
        } else {
          const input = form.querySelector(`#${prefix}-${key}`);
          if (input) input.value = value;
        }
      }
    );
  }

  currentEditingTags = [...(component.templateProductInformation.tags || [])];
  updateSelectedTagsDisplay(`${prefix}-tags-selection`, currentEditingTags);

  const previewFn =
    type === "transformers" ? renderTransformerPreview : renderComponentPreview;
  previewFn(
    component.specificProductInformation.geometry,
    `${prefix}-preview-svg`,
    true
  );

  window.scrollTo(0, 0);
}

async function handleSaveComponent(event) {
  event.preventDefault();
  const form = event.target;
  const typeKey = form.dataset.type;
  const prefix = form.id.replace("-form", "");

  const componentData = gatherFormData(prefix, typeKey);
  const originalName =
    form.querySelector(`#${prefix}-original-name`).value ||
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
    const listId = `${typeKey
      .toLowerCase()
      .replace("copperrails", "rails")
      .replace("transformersheets", "sheets")}-list`;
    const previewFn =
      typeKey === "transformers"
        ? renderTransformerPreview
        : renderComponentPreview;
    renderComponentLists(typeKey, listId, previewFn);
    clearForm(prefix, typeKey);
  }
}

async function handleDeleteComponent(event) {
  const { name, type } = event.target.dataset;
  if (confirm(`Möchtest du das Bauteil '${name}' wirklich löschen?`)) {
    const response = await fetch("/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete",
        type: type,
        originalName: name,
      }),
    });

    const result = await response.json();
    alert(result.message || result.error);

    if (response.ok) {
      localLibrary = result.library;
      const listId = `${type
        .toLowerCase()
        .replace("copperrails", "rails")
        .replace("transformersheets", "sheets")}-list`;
      const previewFn =
        type === "transformers"
          ? renderTransformerPreview
          : renderComponentPreview;
      renderComponentLists(type, listId, previewFn);
    }
  }
}

function gatherFormData(prefix, typeKey) {
  const form = document.getElementById(`${prefix}-form`);
  const uniqueNumber = form.dataset.uniqueNumber || null;
  let data = { templateProductInformation: {}, specificProductInformation: {} };

  // Standard-Felder sammeln
  const tpiKeys = [
    "name",
    "productName",
    "manufacturer",
    "manufacturerNumber",
    "companyNumber",
    "eanNumber",
    "additionalInfo",
    "sellingPrice",
    "purchasePrice",
    "condition",
  ];
  tpiKeys.forEach((key) => {
    const input = form.querySelector(`#${prefix}-${key}`);
    if (input) data.templateProductInformation[key] = input.value;
  });

  data.templateProductInformation.tags = currentEditingTags;
  if (uniqueNumber) data.templateProductInformation.uniqueNumber = uniqueNumber;

  if (typeKey === "copperRails" || typeKey === "transformerSheets") {
    data.specificProductInformation = {
      material: form.querySelector(`#${prefix}-material`).value,
      geometry: {
        type: "Rectangle",
        width: parseFloat(form.querySelector(`#${prefix}-width`).value),
        height: parseFloat(form.querySelector(`#${prefix}-height`).value),
      },
    };
  } else if (typeKey === "transformers") {
    data.specificProductInformation = {
      coreMaterial: form.querySelector(`#${prefix}-coreMaterial`).value,
      gapMaterial: form.querySelector(`#${prefix}-gapMaterial`).value,
      depth: parseFloat(form.querySelector(`#${prefix}-depth`).value),
      electrical: {
        primaryRatedCurrentA: parseFloat(
          form.querySelector(`#${prefix}-primaryRatedCurrentA`).value
        ),
        secondaryRatedCurrentA: parseFloat(
          form.querySelector(`#${prefix}-secondaryRatedCurrentA`).value
        ),
        burdenVA: parseFloat(form.querySelector(`#${prefix}-burdenVA`).value),
      },
      geometry: {
        type: "Rectangle",
        outerAirWidth: parseFloat(
          form.querySelector(`#${prefix}-outerAirWidth`).value
        ),
        outerAirHeight: parseFloat(
          form.querySelector(`#${prefix}-outerAirHeight`).value
        ),
        coreOuterWidth: parseFloat(
          form.querySelector(`#${prefix}-coreOuterWidth`).value
        ),
        coreOuterHeight: parseFloat(
          form.querySelector(`#${prefix}-coreOuterHeight`).value
        ),
        coreInnerWidth: parseFloat(
          form.querySelector(`#${prefix}-coreInnerWidth`).value
        ),
        coreInnerHeight: parseFloat(
          form.querySelector(`#${prefix}-coreInnerHeight`).value
        ),
        innerWidth: parseFloat(
          form.querySelector(`#${prefix}-innerWidth`).value
        ),
        innerHeight: parseFloat(
          form.querySelector(`#${prefix}-innerHeight`).value
        ),
      },
    };
  }
  return data;
}

function clearForm(prefix, typeKey) {
  const form = document.getElementById(`${prefix}-form`);
  form.reset();
  form.querySelector(`#${prefix}-original-name`).value = "";
  document.getElementById(
    `${prefix}-form-title`
  ).textContent = `Neues Bauteil erstellen`;
  form.dataset.uniqueNumber = "";
  currentEditingTags = [];
  updateSelectedTagsDisplay(`${prefix}-tags-selection`, []);

  const previewFn =
    typeKey === "transformers"
      ? renderTransformerPreview
      : renderComponentPreview;
  const initialGeo =
    typeKey === "transformers" ? {} : { width: 40, height: 10 };
  previewFn(initialGeo, `${prefix}-preview-svg`, true);
}

function openTagModal(prefix) {
  const form = document.getElementById(`${prefix}-form`);
  currentEditingTags = gatherFormData(prefix, form.dataset.type)
    .templateProductInformation.tags;
  renderTagsInModal(currentEditingTags, prefix);
  document.getElementById("tag-modal").style.display = "flex";
}

function closeTagModal() {
  document.getElementById("tag-modal").style.display = "none";
  document.getElementById("tag-search-input").value = "";
}

function saveTagsFromModal() {
  const prefix = document.getElementById("tag-modal").dataset.prefix;
  updateSelectedTagsDisplay(`${prefix}-tags-selection`, currentEditingTags);
  closeTagModal();
}

function renderTagsInModal(selectedTags = [], prefix) {
  document.getElementById("tag-modal").dataset.prefix = prefix;
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
      renderTagsInModal(currentEditingTags, prefix);
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
