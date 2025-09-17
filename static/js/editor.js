// static/js/editor.js

document.addEventListener("DOMContentLoaded", () => {});

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
      geometry: { type: "Rectangle", material: "M-36 Steel" },
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

function getTransformerFormHtml(data) {
  const tpi = data.templateProductInformation;
  const spi = data.specificProductInformation;
  const geo = spi.geometry || {};
  const ele = spi.electrical || {};

  const stromOptions = [
    600, 800, 1000, 1250, 1600, 2000, 2500, 3000, 4000, 5000,
  ]
    .map(
      (strom) =>
        `<option value="${strom}" ${
          ele.primaryRatedCurrentA === strom ? "selected" : ""
        }>${strom} A</option>`
    )
    .join("");

  const burdenOptions = [1.0, 2.5, 5.0, 10.0, 15.0, 20.0, 25.0, 30.0]
    .map(
      (val) =>
        `<option value="${val}" ${ele.burdenVA === val ? "selected" : ""}>${val
          .toFixed(1)
          .replace(".", ",")} VA</option>`
    )
    .join("");

  const railDimensions = [
    "1x100x12",
    "1x50x10",
    "1x100x15",
    "1x100x55",
    "1x150x10",
    "1x150x20",
    "1x40x10",
    "1x40x12",
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
    "2x100x10",
    "2x120x10",
    "2x120x15",
    "2x150x10",
    "2x150x20",
    "2x40x10",
    "2x50x10",
    "2x60x10",
    "2x70x10",
    "2x80x10",
    "2x80x12",
    "2x90x10",
    "3x100x10",
    "3x150x10",
    "3x160x10",
    "3x200x10",
    "3x50x10",
    "3x80x10",
    "3x140x10",
    "4x100x10",
    "4x120x10",
    "4x150x15",
    "4x200x10",
    "4x250x10",
    "4x60x10",
    "4x80x10",
    "5x120x10",
    "5x150x10",
  ];

  const railCheckboxes = railDimensions
    .map((d) => {
      const checked = (spi.copperRailDimensions || []).includes(d)
        ? "checked"
        : "";
      return `<div><input type="checkbox" id="rail-${d}" name="copperRail" value="${d}" ${checked}><label for="rail-${d}">${d}</label></div>`;
    })
    .join("");

  const [ratioPrimary, ratioSecondary] = (ele.ratio || "/").split("/");

  return `
        <div class="form-section">
            <h3>Allgemeine Informationen</h3>
            <div class="form-group"><label>Name</label><input type="text" id="edit-name" value="${
              tpi.name || ""
            }" required></div>
            <div class="form-group"><label>Produktname</label><input type="text" id="edit-productName" value="${
              tpi.productName || ""
            }"></div>
            <div class="form-group"><label>Hersteller</label><input type="text" id="edit-manufacturer" value="${
              tpi.manufacturer || ""
            }"></div>
            <div class="form-group"><label>Art.-Nr. (Herst.)</label><input type="text" id="edit-manufacturerNumber" value="${
              tpi.manufacturerNumber || ""
            }"></div>
            <div class="form-group"><label>Art.-Nr. (RJ)</label><input type="text" id="edit-companyNumber" value="${
              tpi.companyNumber || ""
            }"></div>
            <div class="form-group"><label>Eindeutige Nr. / Wandler Nr.</label><input type="text" id="edit-uniqueNumber" value="${
              tpi.uniqueNumber || ""
            }"></div>
            <div class="form-group">
                <label>Tags</label>
                <div id="tags-input-container" class="tags-input-container">
                    <button type="button" class="add-tags-btn">+ Tags hinzufügen</button>
                </div>
            </div>
        </div>
        <div class="form-section">
            <h3>Elektrische Daten</h3>
            <div class="form-group"><label>Nennstrom</label><select id="edit-primaryRatedCurrentA">${stromOptions}</select></div>
            <div class="form-group"><label>Bürde (VA)</label><select id="edit-burdenVA">${burdenOptions}</select></div>
            <div class="form-group">
                <label>Übersetzung</label>
                <div class="form-row">
                    <input type="number" id="edit-ratio-primary" placeholder="Primär" value="${
                      ratioPrimary || ""
                    }">
                    <input type="number" id="edit-ratio-secondary" placeholder="Sekundär" value="${
                      ratioSecondary || ""
                    }">
                </div>
            </div>
            <div class="form-group"><label>Klasse</label><input type="text" id="edit-accuracyClass" placeholder="z.B. 0.5" value="${
              ele.accuracyClass || ""
            }"></div>
            <div class="form-group">
                <label>Passende Kupferschiene(n)</label>
                <div class="checkbox-container" id="edit-copperRail">${railCheckboxes}</div>
            </div>
        </div>
        <div class="form-section">
            <h3>Geometrie (Rechteck-Wandler)</h3>
            <h4>Stahlkern</h4>
            <div class="form-group"><label>Außen-Breite (coreOuterWidth)</label><input type="number" step="0.1" class="geo-input" id="edit-coreOuterWidth" value="${
              geo.coreOuterWidth || 0
            }"></div>
            <div class="form-group"><label>Außen-Höhe (coreOuterHeight)</label><input type="number" step="0.1" class="geo-input" id="edit-coreOuterHeight" value="${
              geo.coreOuterHeight || 0
            }"></div>
            <div class="form-group"><label>Innen-Breite (coreInnerWidth)</label><input type="number" step="0.1" class="geo-input" id="edit-coreInnerWidth" value="${
              geo.coreInnerWidth || 0
            }"></div>
            <div class="form-group"><label>Innen-Höhe (coreInnerHeight)</label><input type="number" step="0.1" class="geo-input" id="edit-coreInnerHeight" value="${
              geo.coreInnerHeight || 0
            }"></div>
        </div>
    `;
}

function getSimpleComponentFormHtml(data, type) {
  const tpi = data.templateProductInformation;
  const spi = data.specificProductInformation;
  const geo = spi.geometry || {};
  const ele = spi.electrical || {};

  const stromOptions = [
    600, 800, 1000, 1250, 1600, 2000, 2500, 3000, 4000, 5000,
  ]
    .map(
      (strom) =>
        `<option value="${strom}" ${
          ele.ratedCurrentA === strom ? "selected" : ""
        }>${strom} A</option>`
    )
    .join("");

  const materialOptions = (libraryData.materials || [])
    .map(
      (mat) =>
        `<option value="${mat.name}" ${
          geo.material === mat.name ? "selected" : ""
        }>${mat.name}</option>`
    )
    .join("");

  return `
        <div class="form-section">
            <h3>Allgemeine Informationen</h3>
            <div class="form-group"><label>Name</label><input type="text" id="edit-name" value="${
              tpi.name || ""
            }" required></div>
            <div class="form-group"><label>Produktname</label><input type="text" id="edit-productName" value="${
              tpi.productName || ""
            }"></div>
            <div class="form-group"><label>Hersteller</label><input type="text" id="edit-manufacturer" value="${
              tpi.manufacturer || ""
            }"></div>
             <div class="form-group">
                <label>Tags</label>
                <div id="tags-input-container" class="tags-input-container">
                    <button type="button" class="add-tags-btn">+ Tags hinzufügen</button>
                </div>
            </div>
        </div>
        ${
          type === "copperRails"
            ? `
        <div class="form-section">
            <h3>Elektrische Daten</h3>
            <div class="form-group"><label>Nennstrom</label><select id="edit-ratedCurrentA">${stromOptions}</select></div>
        </div>`
            : ""
        }
        <div class="form-section">
            <h3>Geometrie (Rechteck)</h3>
             <div class="form-group"><label>Material</label><select id="edit-material">${materialOptions}</select></div>
            <div class="form-group"><label>Breite (width)</label><input type="number" step="0.1" class="geo-input" id="edit-width" value="${
              geo.width || 0
            }"></div>
            <div class="form-group"><label>Höhe (height)</label><input type="number" step="0.1" class="geo-input" id="edit-height" value="${
              geo.height || 0
            }"></div>
        </div>
     `;
}

function getSheetPackageFormHtml(data) {
  const tpi = data.templateProductInformation;
  const geo = data.specificProductInformation.geometry || {};

  const materialOptions = (libraryData.materials || [])
    .map(
      (mat) =>
        `<option value="${mat.name}" ${
          geo.material === mat.name ? "selected" : ""
        }>${mat.name}</option>`
    )
    .join("");

  return `
        <div class="form-section">
            <h3>Allgemeine Informationen</h3>
            <div class="form-group"><label>Name</label><input type="text" id="edit-name" value="${
              tpi.name || ""
            }" required></div>
            <div class="form-group"><label>Produktname</label><input type="text" id="edit-productName" value="${
              tpi.productName || ""
            }"></div>
            <div class="form-group"><label>Hersteller</label><input type="text" id="edit-manufacturer" value="${
              tpi.manufacturer || ""
            }"></div>
            <div class="form-group">
                <label>Tags</label>
                <div id="tags-input-container" class="tags-input-container">
                    <button type="button" class="add-tags-btn">+ Tags hinzufügen</button>
                </div>
            </div>
        </div>
        <div class="form-section">
            <h3>Geometrie (Abschirmblech-Paket)</h3>
            <div class="form-group"><label>Material der Bleche</label><select id="edit-material">${materialOptions}</select></div>
            <div class="form-group">
                <label for="edit-sheetCount">Anzahl der Bleche</label>
                <input type="number" id="edit-sheetCount" class="geo-input" min="1" step="1" value="${
                  geo.sheetCount || 1
                }">
            </div>
            <div class="form-group">
                <label for="edit-sheetThickness">Dicke pro Blech (mm)</label>
                <input type="number" id="edit-sheetThickness" class="geo-input" step="0.1" value="${
                  geo.sheetThickness || 1.0
                }">
            </div>
             <div class="form-group">
                <label for="edit-height">Gesamthöhe (mm)</label>
                <input type="number" id="edit-height" class="geo-input" step="0.1" value="${
                  geo.height || 100
                }">
            </div>
            <hr>
            <h4>Isolierung</h4>
            <div class="form-group checkbox-group">
                <input type="checkbox" id="edit-withInsulation" class="geo-input" ${
                  geo.withInsulation ? "checked" : ""
                }>
                <label for="edit-withInsulation">Mit Außenisolierung (Kunststoff)</label>
            </div>
            <div class="form-group">
                <label for="edit-insulationThickness">Dicke der Isolierung (mm)</label>
                <input type="number" id="edit-insulationThickness" class="geo-input" step="0.1" value="${
                  geo.insulationThickness || 0.5
                }">
            </div>
        </div>
    `;
}

function gatherComponentDataFromForm(type) {
  const form = document.getElementById("component-editor-form");
  const data = {};

  if (type === "transformers") {
    const ratioPrimary = form.querySelector("#edit-ratio-primary")?.value || "";
    const ratioSecondary =
      form.querySelector("#edit-ratio-secondary")?.value || "";

    data.geometry = {
      type: "Rectangle",
      coreOuterWidth:
        parseFloat(form.querySelector("#edit-coreOuterWidth")?.value) || 0,
      coreOuterHeight:
        parseFloat(form.querySelector("#edit-coreOuterHeight")?.value) || 0,
      coreInnerWidth:
        parseFloat(form.querySelector("#edit-coreInnerWidth")?.value) || 0,
      coreInnerHeight:
        parseFloat(form.querySelector("#edit-coreInnerHeight")?.value) || 0,
    };
    data.electrical = {
      primaryRatedCurrentA:
        parseInt(form.querySelector("#edit-primaryRatedCurrentA")?.value) || 0,
      burdenVA: parseFloat(form.querySelector("#edit-burdenVA")?.value) || 0,
      ratio: `${ratioPrimary}/${ratioSecondary}`,
      accuracyClass: form.querySelector("#edit-accuracyClass")?.value || "",
    };
    data.copperRailDimensions = Array.from(
      form.querySelectorAll("#edit-copperRail input[type=checkbox]:checked")
    ).map((cb) => cb.value);
  } else if (type === "transformerSheets") {
    data.geometry = {
      type: "SheetPackage",
      material: form.querySelector("#edit-material")?.value || "M-36 Steel",
      sheetCount: parseInt(form.querySelector("#edit-sheetCount")?.value) || 1,
      sheetThickness:
        parseFloat(form.querySelector("#edit-sheetThickness")?.value) || 0,
      height: parseFloat(form.querySelector("#edit-height")?.value) || 0,
      withInsulation:
        form.querySelector("#edit-withInsulation")?.checked || false,
      insulationThickness:
        parseFloat(form.querySelector("#edit-insulationThickness")?.value) || 0,
    };
  } else {
    data.geometry = {
      type: "Rectangle",
      width: parseFloat(form.querySelector("#edit-width")?.value) || 0,
      height: parseFloat(form.querySelector("#edit-height")?.value) || 0,
      material:
        form.querySelector("#edit-material")?.value ||
        (type === "copperRails" ? "Copper" : "M-36 Steel"),
    };
    if (type === "copperRails") {
      data.electrical = {
        ratedCurrentA:
          parseInt(form.querySelector("#edit-ratedCurrentA")?.value) || 0,
      };
    }
  }
  return data;
}

function updateEditorPreview(type) {
  const componentData = gatherComponentDataFromForm(type);
  if (componentData) {
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
      renderComponentPreview(
        componentData.geometry,
        "editor-preview-svg",
        true
      );
    }
  }
}

function saveComponent() {
  const form = document.getElementById("component-editor-form");
  const newName = form.querySelector("#edit-name").value;
  if (!newName) {
    alert("Der Name des Bauteils darf nicht leer sein.");
    return;
  }

  const isNew = !currentEditorComponent;
  const componentToSave = isNew
    ? {
        templateProductInformation: { tags: [] },
        specificProductInformation: { geometry: {}, electrical: {} },
      }
    : JSON.parse(JSON.stringify(currentEditorComponent));

  if (!componentToSave.specificProductInformation) {
    componentToSave.specificProductInformation = {};
  }
  if (!componentToSave.specificProductInformation.electrical) {
    componentToSave.specificProductInformation.electrical = {};
  }
  if (!componentToSave.specificProductInformation.geometry) {
    componentToSave.specificProductInformation.geometry = {};
  }

  componentToSave.templateProductInformation.tags = [...currentComponentTags];

  componentToSave.templateProductInformation.name = newName;
  componentToSave.templateProductInformation.productName =
    form.querySelector("#edit-productName")?.value || "";
  componentToSave.templateProductInformation.manufacturer =
    form.querySelector("#edit-manufacturer")?.value || "";
  componentToSave.templateProductInformation.manufacturerNumber =
    form.querySelector("#edit-manufacturerNumber")?.value || "";
  componentToSave.templateProductInformation.companyNumber =
    form.querySelector("#edit-companyNumber")?.value || "";
  componentToSave.templateProductInformation.uniqueNumber =
    form.querySelector("#edit-uniqueNumber")?.value || "";

  const updatedData = gatherComponentDataFromForm(currentEditorComponentType);
  componentToSave.specificProductInformation.geometry = {
    ...componentToSave.specificProductInformation.geometry,
    ...updatedData.geometry,
  };
  componentToSave.specificProductInformation.electrical = {
    ...componentToSave.specificProductInformation.electrical,
    ...updatedData.electrical,
  };

  if (
    currentEditorComponentType === "transformers" ||
    currentEditorComponentType === "copperRails"
  ) {
    componentToSave.specificProductInformation.copperRailDimensions =
      updatedData.copperRailDimensions;
  }

  const stromTag = `${
    updatedData.electrical?.primaryRatedCurrentA ||
    updatedData.electrical?.ratedCurrentA
  } A`;

  if (
    stromTag &&
    stromTag !== "undefined A" &&
    !componentToSave.templateProductInformation.tags.includes(stromTag)
  ) {
    componentToSave.templateProductInformation.tags.push(stromTag);
  }

  fetch("/api/library", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "save",
      type: currentEditorComponentType,
      component: componentToSave,
      originalName: isNew
        ? null
        : currentEditorComponent.templateProductInformation.name,
    }),
  })
    .then((res) => res.json())
    .then(async (result) => {
      alert(result.message);
      if (result.message.includes("erfolgreich")) {
        document.getElementById("component-editor-modal").style.display =
          "none";
        const libResponse = await fetch("/api/library");
        libraryData = await libResponse.json();
        renderComponentList();
      }
    });
}

function deleteComponent() {
  if (
    !currentEditorComponent ||
    !confirm(
      `Soll das Bauteil "${currentEditorComponent.templateProductInformation.name}" wirklich gelöscht werden?`
    )
  ) {
    return;
  }

  fetch("/api/library", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "delete",
      type: currentEditorComponentType,
      originalName: currentEditorComponent.templateProductInformation.name,
    }),
  })
    .then((res) => res.json())
    .then(async (result) => {
      alert(result.message);
      if (result.message.includes("gelöscht")) {
        document.getElementById("component-editor-modal").style.display =
          "none";
        const libResponse = await fetch("/api/library");
        libraryData = await libResponse.json();
        renderComponentList();
      }
    });
}

// --- TAG MANAGEMENT ---

function renderCurrentTags() {
  const container = document.getElementById("tags-input-container");
  if (!container) return;
  container.innerHTML = "";
  currentComponentTags.forEach((tagName) => {
    const tagBadge = document.createElement("span");
    tagBadge.innerHTML = getTagBadge(tagName);
    const removeBtn = document.createElement("span");
    removeBtn.className = "remove-tag";
    removeBtn.innerHTML = "&times;";
    removeBtn.onclick = () => {
      currentComponentTags = currentComponentTags.filter((t) => t !== tagName);
      renderCurrentTags();
    };
    tagBadge.querySelector(".tag-badge").appendChild(removeBtn);
    container.appendChild(tagBadge);
  });
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "add-tags-btn";
  addButton.textContent = "+ Tags hinzufügen";
  addButton.onclick = openTagSelectionModal;
  container.appendChild(addButton);
}

function openTagSelectionModal() {
  const modal = document.getElementById("tag-selection-modal");
  const tagBackup = [...currentComponentTags];
  renderTagSelectionModal();
  modal.style.display = "flex";

  document.getElementById("save-tags-btn").onclick = () => {
    modal.style.display = "none";
  };

  document.getElementById("cancel-tags-btn").onclick = () => {
    currentComponentTags = tagBackup;
    renderCurrentTags();
    modal.style.display = "none";
  };
}

function renderTagSelectionModal() {
  const list = document.getElementById("modal-tag-list");
  list.innerHTML = "";
  (tagsData.categories || []).forEach((category) => {
    const group = document.createElement("div");
    group.className = "tag-group";
    let tagsHtml = `<h4>${category.name}</h4>`;
    tagsHtml += (category.tags || [])
      .map((tag) => {
        const isSelected = currentComponentTags.includes(tag.name)
          ? "selected"
          : "";
        return `<span class="tag-badge ${isSelected}" data-tag-name="${
          tag.name
        }" style="background-color: ${tag.color}; color: ${getTextColor(
          tag.color
        )};">${tag.name}</span>`;
      })
      .join("");
    group.innerHTML = tagsHtml;
    list.appendChild(group);
  });

  list.querySelectorAll(".tag-badge").forEach((badge) => {
    badge.addEventListener("click", () => {
      badge.classList.toggle("selected");
      const tagName = badge.dataset.tagName;
      if (badge.classList.contains("selected")) {
        if (!currentComponentTags.includes(tagName)) {
          currentComponentTags.push(tagName);
        }
      } else {
        currentComponentTags = currentComponentTags.filter(
          (t) => t !== tagName
        );
      }
      renderCurrentTags();
    });
  });
}
