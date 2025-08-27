document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("bauteile-nav")) {
    initializeBauteilEditor();
  }
});

let localLibrary = {};
let currentEditingTags = [];
const availableWindowSizes = [
  "1x40x10",
  "1x40x12",
  "1x50x10",
  "1x50x12",
  "1x60x10",
  "1x60x12",
  "1x60x30",
  "1x70x10",
  "1x70x12",
  "1x80x12",
  "1x80x15",
  "1x90x10",
  "1x90x15",
  "1x100x12",
  "1x100x15",
  "1x100x55",
  "1x150x10",
  "1x150x20",
  "2x40x10",
  "2x50x10",
  "2x60x10",
  "2x70x10",
  "2x80x10",
  "2x80x12",
  "2x90x10",
  "2x100x10",
  "2x120x10",
  "2x120x15",
  "2x150x10",
  "2x150x20",
  "3x50x10",
  "3x80x10",
  "3x100x10",
  "3x140x10",
  "3x150x10",
  "3x160x10",
  "3x200x10",
  "4x60x10",
  "4x80x10",
  "4x100x10",
  "4x120x10",
  "4x150x15",
  "4x200x10",
  "4x250x10",
  "5x120x10",
  "5x150x10",
];

async function initializeBauteilEditor() {
  await loadTags();
  const libraryDataElement = document.getElementById("library-data");
  localLibrary = libraryDataElement
    ? JSON.parse(libraryDataElement.textContent)
    : {};

  initializeCardNavigation("bauteile-nav", "bauteil-sections");

  setupComponentSection(
    "bauteil-rails",
    "rail",
    "Stromschiene",
    "copperRails",
    renderComponentPreview
  );
  setupComponentSection(
    "bauteil-transformers",
    "transformer",
    "Wandler",
    "transformers",
    renderTransformerPreview,
    true
  );
  setupComponentSection(
    "bauteil-sheets",
    "sheet",
    "Abschirmblech",
    "transformerSheets",
    renderComponentPreview
  );

  populateWindowSizes();

  document
    .getElementById("btn-add-window-config")
    ?.addEventListener("click", addWindowConfigToList);
  document
    .getElementById("transformer-coreType")
    ?.addEventListener("change", toggleCoreGeoFields);
  toggleCoreGeoFields();

  document
    .querySelectorAll(".zoom-preview-btn")
    .forEach((btn) =>
      btn.addEventListener("click", () => openZoomModal(btn.dataset.formId))
    );
  document
    .getElementById("preview-modal-close")
    .addEventListener(
      "click",
      () =>
        (document.getElementById("preview-modal-overlay").style.display =
          "none")
    );
  document
    .getElementById("modal-cancel-btn")
    ?.addEventListener("click", closeTagModal);
  document
    .getElementById("modal-save-btn")
    ?.addEventListener("click", saveTagsFromModal);
  document
    .getElementById("tag-search-input")
    ?.addEventListener("input", filterTagsInModal);

  document.querySelectorAll(".preview-bg-input").forEach((input) => {
    const svg = document.getElementById(input.dataset.targetSvg);
    if (svg) svg.style.backgroundColor = input.value;
    input.addEventListener("input", (event) => {
      if (svg) svg.style.backgroundColor = event.target.value;
    });
  });

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

function setupComponentSection(
  containerId,
  prefix,
  title,
  typeKey,
  previewFn,
  isTransformer = false
) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let formFieldsHtml;

  if (isTransformer) {
    formFieldsHtml = `
            <div class="form-grid">
                <div class="form-section">
                    <h4>Allgemeine Produktinformationen</h4>
                    <div class="form-group"><label for="transformer-name">Name (Eindeutige ID)</label><input type="text" id="transformer-name" required></div>
                    <div class="form-group"><label for="transformer-productName">Produktbezeichnung</label><input type="text" id="transformer-productName"></div>
                    <div class="form-group"><label for="transformer-manufacturer">Hersteller</label><input type="text" id="transformer-manufacturer"></div>
                    <div class="form-group"><label>Tags</label>
                        <div id="transformer-tags-selection" class="tags-input-container"><button type="button" class="add-tags-btn">+ Tags hinzufügen</button></div>
                    </div>
                </div>
                <div class="form-section">
                    <h4>Elektrische Eigenschaften</h4>
                    <div class="form-group"><label for="transformer-primaryRatedCurrentA">Primärstrom (A)</label><input type="number" step="any" id="transformer-primaryRatedCurrentA"></div>
                    <div class="form-group"><label for="transformer-secondaryRatedCurrentA">Sekundärstrom (A)</label><input type="number" step="any" id="transformer-secondaryRatedCurrentA"></div>
                    <div class="form-group"><label for="transformer-burdenVA">Bürde (VA)</label><input type="number" step="any" id="transformer-burdenVA"></div>
                </div>
                <div class="form-section">
                    <h4>Geometrie & Material</h4>
                    <div class="form-group"><label for="transformer-coreMaterial">Kern-Material</label><input type="text" id="transformer-coreMaterial" value="M-36 Steel"></div>
                    <div class="form-group"><label for="transformer-gapMaterial">Luftspalt-Material</label><input type="text" id="transformer-gapMaterial" value="Air"></div>
                    <div class="form-group"><label for="transformer-depth">Tiefe (mm)</label><input type="number" step="any" id="transformer-depth"></div>
                    <div class="form-group">
                        <label for="transformer-coreType">Kern-Typ</label>
                        <select id="transformer-coreType">
                            <option value="Rectangle">Rechteckig</option>
                            <option value="Circle">Rund</option>
                        </select>
                    </div>
                    <div id="geo-rectangle-fields">
                        <div class="form-group"><label for="transformer-coreOuterWidth">Kern Außenbreite (mm)</label><input type="number" step="any" id="transformer-coreOuterWidth"></div>
                        <div class="form-group"><label for="transformer-coreOuterHeight">Kern Außenhöhe (mm)</label><input type="number" step="any" id="transformer-coreOuterHeight"></div>
                        <div class="form-group"><label for="transformer-coreInnerWidth">Kern Innenbreite (mm)</label><input type="number" step="any" id="transformer-coreInnerWidth"></div>
                        <div class="form-group"><label for="transformer-coreInnerHeight">Kern Innenhöhe (mm)</label><input type="number" step="any" id="transformer-coreInnerHeight"></div>
                    </div>
                    <div id="geo-circle-fields" style="display: none;">
                        <div class="form-group"><label for="transformer-coreOuterRadius">Kern Außenradius (mm)</label><input type="number" step="any" id="transformer-coreOuterRadius"></div>
                        <div class="form-group"><label for="transformer-coreInnerRadius">Kern Innenradius (mm)</label><input type="number" step="any" id="transformer-coreInnerRadius"></div>
                    </div>
                </div>
                <div class="form-section">
                    <h4>Fensterkonfigurationen</h4>
                    <div class="form-group" style="display: flex; gap: 0.5rem; align-items: center;">
                        <select id="window-size-selector" style="flex-grow: 1;"></select>
                        <input type="number" id="window-air-gap" placeholder="Spalt (mm)" value="5" style="width: 100px;">
                        <button type="button" id="btn-add-window-config" class="button add" style="padding: 10px; margin-top: 0;">+</button>
                    </div>
                    <div id="window-configs-list" class="tags-input-container"></div>
                </div>
            </div>`;
  } else {
    formFieldsHtml = `
        <div class="form-grid">
            <div class="form-section">
                <h4>Allgemeine Produktinformationen</h4>
                <div class="form-group"><label for="${prefix}-name">Name (Eindeutige ID)</label><input type="text" id="${prefix}-name" required></div>
                <div class="form-group"><label for="${prefix}-productName">Produktbezeichnung</label><input type="text" id="${prefix}-productName"></div>
                <div class="form-group"><label for="${prefix}-manufacturer">Hersteller</label><input type="text" id="${prefix}-manufacturer"></div>
                <div class="form-group"><label>Tags</label>
                    <div id="${prefix}-tags-selection" class="tags-input-container"><button type="button" class="add-tags-btn">+ Tags hinzufügen</button></div>
                </div>
            </div>
            <div class="form-section">
                <h4>Geometrie & Material</h4>
                <div class="form-group"><label for="${prefix}-material">Material</label><input type="text" id="${prefix}-material" value="${
      typeKey === "transformerSheets" ? "M-36 Steel" : "Copper"
    }"></div>
                <div class="form-group"><label for="${prefix}-width">Breite (mm)</label><input type="number" step="any" id="${prefix}-width"></div>
                <div class="form-group"><label for="${prefix}-height">Höhe (mm)</label><input type="number" step="any" id="${prefix}-height"></div>
            </div>
        </div>`;
  }

  container.innerHTML = `
        <div class="component-editor">
             <div class="component-preview">
                <div class="preview-header">
                    <h3>Vorschau</h3>
                    <div class="preview-controls">
                        <label for="${prefix}-preview-bg">BG:</label>
                        <input type="color" id="${prefix}-preview-bg" class="preview-bg-input" data-target-svg="${prefix}-preview-svg" value="#f8f9fa">
                        <button type="button" class="zoom-preview-btn" data-form-id="${prefix}-form" title="Vollbild-Vorschau">🔍</button>
                    </div>
                </div>
                <svg id="${prefix}-preview-svg"></svg>
            </div>
            <div class="component-form">
                <h3 id="${prefix}-form-title">Neues Bauteil erstellen</h3>
                <form id="${prefix}-form" data-type="${typeKey}">
                    <input type="hidden" id="${prefix}-original-name">
                    ${formFieldsHtml}
                    <div class="button-group">
                        <button type="submit" class="button add">Speichern</button>
                        <button type="button" class="button secondary clear-btn">Formular leeren</button>
                    </div>
                </form>
            </div>
        </div>
        <hr>
        <h2>Vorhandene ${title}</h2>
        <div class="component-list-accordion" id="${prefix}-list"></div>`;

  setupEditor(prefix, typeKey, previewFn);
}

function populateWindowSizes() {
  const select = document.getElementById("window-size-selector");
  if (!select) return;
  select.innerHTML = "";
  availableWindowSizes.forEach((size) => {
    const option = document.createElement("option");
    option.value = size;
    option.textContent = size;
    select.appendChild(option);
  });
}

function setupEditor(prefix, typeKey, previewFn) {
  const form = document.getElementById(`${prefix}-form`);
  if (!form) return;

  form.addEventListener("submit", handleSaveComponent);
  form
    .querySelector(".clear-btn")
    ?.addEventListener("click", () => clearForm(prefix, typeKey));

  form.addEventListener("input", () => {
    const data = gatherFormData(prefix, typeKey);
    const geo = data.specificProductInformation.geometry;
    previewFn(geo, `${prefix}-preview-svg`, true);
  });

  form
    .querySelector(".add-tags-btn")
    ?.addEventListener("click", () => openTagModal(prefix));

  const initialGeo =
    typeKey === "transformers"
      ? { coreType: "Rectangle" }
      : { width: 40, height: 10 };
  previewFn(initialGeo, `${prefix}-preview-svg`, true);
}

function toggleCoreGeoFields() {
  const coreTypeSelect = document.getElementById("transformer-coreType");
  if (!coreTypeSelect) return;
  const selectedType = coreTypeSelect.value;
  const rectFields = document.getElementById("geo-rectangle-fields");
  const circleFields = document.getElementById("geo-circle-fields");
  if (rectFields && circleFields) {
    rectFields.style.display = selectedType === "Rectangle" ? "block" : "none";
    circleFields.style.display = selectedType === "Circle" ? "block" : "none";
  }
}

function addWindowConfigToList(config) {
  const container = document.getElementById("window-configs-list");
  if (!container) return;
  let size, airGap;

  if (config && typeof config === "object") {
    size = config.size;
    airGap = config.airGap;
  } else {
    const selector = document.getElementById("window-size-selector");
    size = selector.value;
    airGap = document.getElementById("window-air-gap").value;
    if (
      Array.from(container.querySelectorAll(".tag-badge")).some(
        (el) => el.dataset.size === size
      )
    ) {
      alert("Diese Fenstergröße wurde bereits hinzugefügt.");
      return;
    }
  }
  if (!size) return;

  const tag = document.createElement("span");
  tag.className = "tag-badge";
  tag.style.backgroundColor = getTagColor(size);
  tag.dataset.size = size;
  tag.dataset.airGap = airGap;
  tag.innerHTML = `${size} (Spalt: ${airGap}mm) <span class="remove-tag">&times;</span>`;
  tag
    .querySelector(".remove-tag")
    .addEventListener("click", () => tag.remove());
  container.appendChild(tag);
}

function gatherFormData(prefix, typeKey) {
  const form = document.getElementById(`${prefix}-form`);
  let data = { templateProductInformation: {}, specificProductInformation: {} };
  const tpiKeys = ["name", "productName", "manufacturer"];
  tpiKeys.forEach((key) => {
    const input = form.querySelector(`#${prefix}-${key}`);
    if (input) data.templateProductInformation[key] = input.value;
  });
  data.templateProductInformation.tags = currentEditingTags;
  data.templateProductInformation.uniqueNumber =
    form.dataset.uniqueNumber || null;

  if (typeKey === "transformers") {
    const coreType = form.querySelector(`#${prefix}-coreType`).value;
    const geometry = {
      coreType: coreType,
      depth: parseFloat(form.querySelector(`#${prefix}-depth`).value),
    };
    if (coreType === "Rectangle") {
      geometry.coreOuterWidth = parseFloat(
        form.querySelector(`#${prefix}-coreOuterWidth`).value
      );
      geometry.coreOuterHeight = parseFloat(
        form.querySelector(`#${prefix}-coreOuterHeight`).value
      );
      geometry.coreInnerWidth = parseFloat(
        form.querySelector(`#${prefix}-coreInnerWidth`).value
      );
      geometry.coreInnerHeight = parseFloat(
        form.querySelector(`#${prefix}-coreInnerHeight`).value
      );
    } else {
      geometry.coreOuterRadius = parseFloat(
        form.querySelector(`#${prefix}-coreOuterRadius`).value
      );
      geometry.coreInnerRadius = parseFloat(
        form.querySelector(`#${prefix}-coreInnerRadius`).value
      );
    }
    const windowConfigs = [];
    form.querySelectorAll("#window-configs-list .tag-badge").forEach((tag) => {
      windowConfigs.push({
        size: tag.dataset.size,
        airGap: parseFloat(tag.dataset.airGap),
      });
    });
    data.specificProductInformation = {
      coreMaterial: form.querySelector(`#${prefix}-coreMaterial`).value,
      gapMaterial: form.querySelector(`#${prefix}-gapMaterial`).value,
      electrical: {
        primaryRatedCurrentA: parseFloat(
          form.querySelector(`#${prefix}-primaryRatedCurrentA`).value
        ),
        secondaryRatedCurrentA: parseFloat(
          form.querySelector(`#${prefix}-secondaryRatedCurrentA`).value
        ),
        burdenVA: parseFloat(form.querySelector(`#${prefix}-burdenVA`).value),
      },
      geometry: geometry,
      windowConfigurations: windowConfigs,
    };
  } else {
    data.specificProductInformation = {
      geometry: {
        type: "Rectangle",
        material: form.querySelector(`#${prefix}-material`)?.value,
        width: parseFloat(form.querySelector(`#${prefix}-width`)?.value),
        height: parseFloat(form.querySelector(`#${prefix}-height`)?.value),
      },
    };
  }
  return data;
}

function populateEditForm(event) {
  const { prefix, name, type } = event.target.dataset;
  const component = (localLibrary.components[type] || []).find(
    (c) => c.templateProductInformation.name === name
  );
  if (!component) return;

  const form = document.getElementById(`${prefix}-form`);
  form.querySelector(
    `#${prefix}-form-title`
  ).textContent = `Bauteil bearbeiten: ${name}`;
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
        if (
          key !== "windowConfigurations" &&
          typeof value === "object" &&
          value !== null
        ) {
          Object.entries(value).forEach(([subKey, subValue]) => {
            const input = form.querySelector(`#${prefix}-${subKey}`);
            if (input) input.value = subValue;
          });
        } else if (key !== "windowConfigurations") {
          const input = form.querySelector(`#${prefix}-${key}`);
          if (input) input.value = value;
        }
      }
    );
  }

  if (prefix === "transformer") {
    const spec = component.specificProductInformation;
    const geo = spec.geometry;
    document.getElementById(`${prefix}-coreType`).value =
      geo.coreType || "Rectangle";
    toggleCoreGeoFields();
    if (geo.coreType === "Circle") {
      document.getElementById(`${prefix}-coreOuterRadius`).value =
        geo.coreOuterRadius;
      document.getElementById(`${prefix}-coreInnerRadius`).value =
        geo.coreInnerRadius;
    } else {
      document.getElementById(`${prefix}-coreOuterWidth`).value =
        geo.coreOuterWidth;
      document.getElementById(`${prefix}-coreOuterHeight`).value =
        geo.coreOuterHeight;
      document.getElementById(`${prefix}-coreInnerWidth`).value =
        geo.coreInnerWidth;
      document.getElementById(`${prefix}-coreInnerHeight`).value =
        geo.coreInnerHeight;
    }
    document.getElementById(`${prefix}-depth`).value = geo.depth || 30;

    const container = document.getElementById("window-configs-list");
    container.innerHTML = "";
    (spec.windowConfigurations || []).forEach((config) =>
      addWindowConfigToList(config)
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
  if (prefix === "transformer") {
    document.getElementById("window-configs-list").innerHTML = "";
  }
  const previewFn =
    typeKey === "transformers"
      ? renderTransformerPreview
      : renderComponentPreview;
  const initialGeo =
    typeKey === "transformers"
      ? { coreType: "Rectangle" }
      : { width: 40, height: 10 };
  previewFn(initialGeo, `${prefix}-preview-svg`, true);
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
    renderComponentLists(
      typeKey,
      `${prefix}-list`,
      typeKey === "transformers"
        ? renderTransformerPreview
        : renderComponentPreview
    );
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
      const prefix = type.replace(/s$/, "").toLowerCase();
      renderComponentLists(
        type,
        `${prefix}-list`,
        type === "transformers"
          ? renderTransformerPreview
          : renderComponentPreview
      );
    }
  }
}

function renderComponentLists(typeKey, listId, previewFn) {
  const listContainer = document.getElementById(listId);
  if (!listContainer) return;
  const components = localLibrary.components[typeKey] || [];
  listContainer.innerHTML =
    components.length === 0
      ? '<p class="empty-list-message">Keine Bauteile in der Bibliothek vorhanden.</p>'
      : "";

  components.forEach((comp, index) => {
    const info = comp.templateProductInformation;
    const spec = comp.specificProductInformation;
    const geo = spec.geometry;
    const previewId = `${typeKey}-accordion-preview-${index}`;
    const prefix = listId.replace("-list", "");
    const item = document.createElement("div");
    item.className = "accordion-item";
    item.innerHTML = `
            <button type="button" class="component-accordion-btn">
                <div class="tags-display">${(info.tags || [])
                  .map((tag) => getTagBadge(tag))
                  .join("")}</div>
                <strong class="component-item-name">${info.name}</strong>
            </button>
            <div class="accordion-content">
                <div class="component-card-preview-container">
                    <svg id="${previewId}" class="component-card-preview"></svg>
                    <div class="button-group">
                        <button type="button" class="button edit edit-btn" data-prefix="${prefix}" data-name="${
      info.name
    }" data-type="${typeKey}">Bearbeiten</button>
                        <button type="button" class="button danger delete-btn" data-name="${
                          info.name
                        }" data-type="${typeKey}">Löschen</button>
                    </div>
                </div>
            </div>`;
    listContainer.appendChild(item);
    previewFn(geo, previewId);
  });

  listContainer.querySelectorAll(".component-accordion-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      const content = btn.nextElementSibling;
      btn.classList.toggle("active");
      content.style.maxHeight = content.style.maxHeight
        ? null
        : `${content.scrollHeight}px`;
    })
  );

  listContainer
    .querySelectorAll(".edit-btn")
    .forEach((btn) => btn.addEventListener("click", populateEditForm));
  listContainer
    .querySelectorAll(".delete-btn")
    .forEach((btn) => btn.addEventListener("click", handleDeleteComponent));
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
  const bgColor = document.getElementById(`${prefix}-preview-bg`).value;
  const previewFn =
    typeKey === "transformers"
      ? renderTransformerPreview
      : renderComponentPreview;

  modal.style.display = "flex";
  svg.style.backgroundColor = bgColor;
  previewFn(geo, "modal-preview-svg", true);
  enablePanZoom(svg);
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
      currentEditingTags = currentEditingTags.includes(tagName)
        ? currentEditingTags.filter((t) => t !== tagName)
        : [...currentEditingTags, tagName];
      renderTagsInModal(currentEditingTags, prefix);
    });
  });
}

function filterTagsInModal() {
  const filter = document
    .getElementById("tag-search-input")
    .value.toLowerCase();
  document.querySelectorAll("#modal-tag-list .tag-badge").forEach((badge) => {
    badge.style.display = badge.textContent.toLowerCase().includes(filter)
      ? "inline-flex"
      : "none";
  });
}
