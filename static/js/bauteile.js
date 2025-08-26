document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("bauteile-nav")) {
    initializeBauteilEditor();
  }
});

let localLibrary = {};
let currentEditingTags = [];
let conductorFormsCount = 0;

async function initializeBauteilEditor() {
  await loadTags();
  const libraryDataElement = document.getElementById("library-data");
  localLibrary = libraryDataElement
    ? JSON.parse(libraryDataElement.textContent)
    : {};

  initializeCardNavigation("bauteile-nav", "bauteil-sections");
  setupEditor("rail", "copperRails", renderComponentPreview);
  setupEditor("sheet", "transformerSheets", renderComponentPreview);
  setupEditor("transformer", "transformers", renderTransformerPreview);

  document
    .getElementById("btn-add-conductor")
    ?.addEventListener("click", () => {
      addConductorForm();
    });

  document.querySelectorAll(".zoom-preview-btn").forEach((btn) => {
    btn.addEventListener("click", () => openZoomModal(btn.dataset.formId));
  });

  document
    .getElementById("preview-modal-close")
    .addEventListener("click", () => {
      document.getElementById("preview-modal-overlay").style.display = "none";
    });

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
    const svgId = input.dataset.targetSvg;
    const svg = document.getElementById(svgId);
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

  if (prefix === "transformer") {
    const conductorTypeSelect = form.querySelector(".conductor-type");
    if (conductorTypeSelect) {
      conductorTypeSelect.addEventListener("change", () =>
        toggleConductorFields(conductorTypeSelect)
      );
      toggleConductorFields(conductorTypeSelect); // Initial call
    }
  }

  const initialGeo =
    typeKey === "transformers"
      ? {
          outerAirWidth: 100,
          outerAirHeight: 120,
          coreOuterWidth: 80,
          coreOuterHeight: 100,
          coreInnerWidth: 50,
          coreInnerHeight: 70,
        }
      : { width: 40, height: 10 };
  previewFn(initialGeo, `${prefix}-preview-svg`, true);
}

function addConductorForm(data = {}) {
  conductorFormsCount++;
  const container = document.getElementById("conductors-list-container");
  const conductor = data || {};
  const div = document.createElement("div");
  div.className = "conductor-form-instance";
  div.innerHTML = `
        <div class="form-section" style="border: 1px dashed #0d6efd; margin-bottom: 1rem; padding: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <input type="text" class="conductor-name" value="${
                  conductor.name || `Fenster ${conductorFormsCount}`
                }" placeholder="Name der Konfiguration (z.B. 40x10 Schiene)" style="width: 70%;">
                <button type="button" class="danger" onclick="this.closest('.conductor-form-instance').remove()">Entfernen</button>
            </div>
            <select class="conductor-type">
                <option value="Rectangle" ${
                  conductor.type === "Rectangle" ? "selected" : ""
                }>Einzel-Rechteck</option>
                <option value="MultiRectangle" ${
                  conductor.type === "MultiRectangle" ? "selected" : ""
                }>Mehrfach-Rechteck</option>
                <option value="Circle" ${
                  conductor.type === "Circle" ? "selected" : ""
                }>Kreis</option>
            </select>
            <div class="conductor-fields form-group-wrapper" style="margin-top: 0.5rem;"></div>
        </div>`;
  container.appendChild(div);

  const select = div.querySelector(".conductor-type");
  toggleConductorFields(select, conductor);
  select.addEventListener("change", () => toggleConductorFields(select));
}

function gatherFormData(prefix, typeKey) {
  const form = document.getElementById(`${prefix}-form`);
  const uniqueNumber = form.dataset.uniqueNumber || null;
  let data = { templateProductInformation: {}, specificProductInformation: {} };

  const tpiKeys = ["name", "productName", "manufacturer"];
  tpiKeys.forEach((key) => {
    const input = form.querySelector(`#${prefix}-${key}`);
    if (input) data.templateProductInformation[key] = input.value;
  });
  data.templateProductInformation.tags = currentEditingTags;
  if (uniqueNumber) data.templateProductInformation.uniqueNumber = uniqueNumber;

  if (typeKey === "transformers") {
    const conductors = [];
    document
      .querySelectorAll("#conductors-list-container .conductor-form-instance")
      .forEach((formInstance) => {
        const conductorType =
          formInstance.querySelector(".conductor-type").value;
        const conductorData = {
          name: formInstance.querySelector(".conductor-name").value,
          type: conductorType,
          material:
            formInstance.querySelector(".conductor-material")?.value ||
            "Copper",
        };

        if (conductorType === "Rectangle") {
          conductorData.width = parseFloat(
            formInstance.querySelector(".conductor-width")?.value || 0
          );
          conductorData.height = parseFloat(
            formInstance.querySelector(".conductor-height")?.value || 0
          );
        } else if (conductorType === "MultiRectangle") {
          conductorData.count = parseInt(
            formInstance.querySelector(".conductor-count")?.value || 1
          );
          conductorData.width = parseFloat(
            formInstance.querySelector(".conductor-width")?.value || 0
          );
          conductorData.height = parseFloat(
            formInstance.querySelector(".conductor-height")?.value || 0
          );
          conductorData.spacing = parseFloat(
            formInstance.querySelector(".conductor-spacing")?.value || 0
          );
        } else if (conductorType === "Circle") {
          conductorData.diameter = parseFloat(
            formInstance.querySelector(".conductor-diameter")?.value || 0
          );
        }
        conductors.push(conductorData);
      });

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
      },
      primaryConductors: conductors,
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

function toggleConductorFields(selectElement, data = {}) {
  const fieldsContainer = selectElement
    .closest(".conductor-form-instance")
    .querySelector(".conductor-fields");
  const type = selectElement.value;
  let html = "";

  html += `<div class="form-group"><label>Material:</label><input type="text" class="conductor-material" value="${
    data.material || "Copper"
  }"></div>`;

  if (type === "Rectangle") {
    html += `
            <div class="form-row">
                <div class="form-group"><label>Breite (mm):</label><input type="number" class="conductor-width" value="${
                  data.width || 40
                }"></div>
                <div class="form-group"><label>Höhe (mm):</label><input type="number" class="conductor-height" value="${
                  data.height || 10
                }"></div>
            </div>`;
  } else if (type === "MultiRectangle") {
    html += `
            <div class="form-row">
                <div class="form-group"><label>Anzahl:</label><input type="number" class="conductor-count" value="${
                  data.count || 2
                }" min="1"></div>
                <div class="form-group"><label>Breite (mm):</label><input type="number" class="conductor-width" value="${
                  data.width || 40
                }"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Höhe (mm):</label><input type="number" class="conductor-height" value="${
                  data.height || 10
                }"></div>
                <div class="form-group"><label>Abstand (mm):</label><input type="number" class="conductor-spacing" value="${
                  data.spacing || 2
                }"></div>
            </div>`;
  } else if (type === "Circle") {
    html += `<div class="form-group"><label>Durchmesser (mm):</label><input type="number" class="conductor-diameter" value="${
      data.diameter || 20
    }"></div>`;
  }
  fieldsContainer.innerHTML = html;
}

function populateEditForm(event) {
  const { prefix, name, type } = event.target.dataset;
  const component = (localLibrary.components[type] || []).find(
    (c) => c.templateProductInformation.name === name
  );
  if (!component) return;

  const form = document.getElementById(`${prefix}-form`);
  if (!form) return;

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
          key !== "primaryConductors" &&
          typeof value === "object" &&
          value !== null
        ) {
          Object.entries(value).forEach(([subKey, subValue]) => {
            const input = form.querySelector(`#${prefix}-${subKey}`);
            if (input) input.value = subValue;
          });
        } else if (key !== "primaryConductors") {
          const input = form.querySelector(`#${prefix}-${key}`);
          if (input) input.value = value;
        }
      }
    );
  }

  if (prefix === "transformer") {
    const container = document.getElementById("conductors-list-container");
    container.innerHTML = "";
    conductorFormsCount = 0;
    const conductors =
      component.specificProductInformation.primaryConductors || [];
    if (conductors.length > 0) {
      conductors.forEach((conductorConf) => addConductorForm(conductorConf));
    } else {
      addConductorForm();
    }
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
    document.getElementById("conductors-list-container").innerHTML = "";
    conductorFormsCount = 0;
    addConductorForm();
  }

  const previewFn =
    typeKey === "transformers"
      ? renderTransformerPreview
      : renderComponentPreview;
  const initialGeo =
    typeKey === "transformers"
      ? {
          outerAirWidth: 100,
          outerAirHeight: 120,
          coreOuterWidth: 80,
          coreOuterHeight: 100,
          coreInnerWidth: 50,
          coreInnerHeight: 70,
        }
      : { width: 40, height: 10 };
  previewFn(initialGeo, `${prefix}-preview-svg`, true);
}

// ... (Restliche Hilfsfunktionen bleiben unverändert)
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
