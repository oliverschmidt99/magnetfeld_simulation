// static/js/editor.js

document.addEventListener("DOMContentLoaded", () => {
  // This script will be loaded dynamically by library.js when the library page is opened.
});

// Globale Variablen, um die geladenen Daten zu speichern
let libraryData = {};
let tagsData = {};
let currentEditorComponent = null; // Speichert das Bauteil, das gerade bearbeitet wird
let currentEditorComponentType = null; // Speichert den Typ des Bauteils (z.B. 'transformers')

/**
 * Initialisiert den gesamten Editor. Wird von library.js aufgerufen.
 * @param {object} library - Das geladene library.json Objekt.
 */
async function initializeEditor(library) {
  libraryData = library;
  await loadTagsForEditor();
  setupFilters();
  renderComponentList();
  document
    .getElementById("add-new-component-btn")
    .addEventListener("click", () => openEditor());
}

/**
 * Lädt die Tag-Daten vom Server.
 */
async function loadTagsForEditor() {
  try {
    const response = await fetch("/api/tags");
    tagsData = await response.json();
  } catch (error) {
    console.error("Fehler beim Laden der Tags:", error);
  }
}

/**
 * Richtet die Event-Listener für die Filter- und Suchfelder ein.
 */
function setupFilters() {
  document
    .getElementById("component-type-filter")
    .addEventListener("change", renderComponentList);
  document
    .getElementById("search-filter")
    .addEventListener("input", renderComponentList);
}

/**
 * Rendert die Liste der Bauteile basierend auf den aktuellen Filtereinstellungen.
 */
function renderComponentList() {
  const accordion = document.getElementById("component-list-accordion");
  accordion.innerHTML = "";
  const typeFilter = document.getElementById("component-type-filter").value;
  const searchFilter = document
    .getElementById("search-filter")
    .value.toLowerCase();

  // Iteriert durch alle Bauteil-Typen in der Bibliothek (transformers, copperRails, etc.)
  for (const type in libraryData.components) {
    if (typeFilter !== "all" && type !== typeFilter) continue;

    libraryData.components[type].forEach((component) => {
      const name = component.templateProductInformation.name || "";
      if (!name.toLowerCase().includes(searchFilter)) return;

      const item = document.createElement("div");
      item.className = "accordion-item";
      item.innerHTML = `
                <button type="button" class="accordion-button">
                    <span>${name} <small>(${type})</small></span>
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

/**
 * Öffnet das Editor-Fenster (Modal) für ein neues oder bestehendes Bauteil.
 * @param {object} [component=null] - Das zu bearbeitende Bauteil. Wenn null, wird ein neues erstellt.
 * @param {string} [type='transformers'] - Der Typ des Bauteils.
 */
function openEditor(component = null, type = "transformers") {
  currentEditorComponent = component;
  currentEditorComponentType = type;

  const modal = document.getElementById("component-editor-modal");
  const form = document.getElementById("component-editor-form");
  const title = document.getElementById("editor-title");

  title.textContent = component
    ? `Bauteil bearbeiten: ${component.templateProductInformation.name}`
    : "Neues Bauteil erstellen";

  const data = component || {
    templateProductInformation: { name: "", manufacturer: "", tags: [] },
    specificProductInformation: {
      geometry: { type: "Rectangle" },
      electrical: {},
    },
  };

  // Wählt das passende Formular basierend auf dem Bauteiltyp
  if (type === "transformers") {
    form.innerHTML = getTransformerFormHtml(data);
  } else {
    form.innerHTML = getSimpleComponentFormHtml(data, type);
  }

  // Event-Listener für Live-Vorschau hinzufügen
  form.addEventListener("input", () => updateEditorPreview(type));
  updateEditorPreview(type);

  // Button-Events zuweisen
  document.getElementById("save-component-btn").onclick = saveComponent;
  document.getElementById("delete-component-btn").onclick = deleteComponent;
  document.getElementById("cancel-edit-btn").onclick = () =>
    (modal.style.display = "none");

  modal.style.display = "flex";
}

/**
 * Erstellt das HTML für das Formular eines Transformators.
 * @param {object} data - Die Daten des Bauteils.
 * @returns {string} - Der HTML-String für das Formular.
 */
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

  return `
        <div class="form-section">
            <h3>Allgemeine Informationen</h3>
            <div class="form-group"><label>Name</label><input type="text" id="edit-name" value="${
              tpi.name || ""
            }" required></div>
            <div class="form-group"><label>Hersteller</label><input type="text" id="edit-manufacturer" value="${
              tpi.manufacturer || ""
            }"></div>
        </div>
        <div class="form-section">
            <h3>Elektrische Daten</h3>
            <div class="form-group"><label>Nennstrom</label><select id="edit-primaryRatedCurrentA">${stromOptions}</select></div>
            <div class="form-group"><label>Bürde (VA)</label><input type="number" step="0.1" id="edit-burdenVA" value="${
              ele.burdenVA || 0
            }"></div>
            <div class="form-group"><label>Übersetzung</label><input type="text" id="edit-ratio" placeholder="z.B. 800/1A" value="${
              ele.ratio || ""
            }"></div>
            <div class="form-group"><label>Klasse</label><input type="text" id="edit-accuracyClass" placeholder="z.B. 0.5" value="${
              ele.accuracyClass || ""
            }"></div>
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
        <button type="submit" style="display: none;" aria-hidden="true"></button>
    `;
}

/**
 * Erstellt das HTML für ein einfaches Bauteil (Kupferschiene, Blech).
 * @param {object} data - Die Daten des Bauteils.
 * @param {string} type - Der Typ des Bauteils.
 * @returns {string} - Der HTML-String für das Formular.
 */
function getSimpleComponentFormHtml(data, type) {
  const tpi = data.templateProductInformation;
  const geo = data.specificProductInformation.geometry || {};
  const ele = data.specificProductInformation.electrical || {};

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

  return `
        <div class="form-section">
            <h3>Allgemeine Informationen</h3>
            <div class="form-group"><label>Name</label><input type="text" id="edit-name" value="${
              tpi.name || ""
            }" required></div>
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
            <div class="form-group"><label>Breite (width)</label><input type="number" step="0.1" class="geo-input" id="edit-width" value="${
              geo.width || 0
            }"></div>
            <div class="form-group"><label>Höhe (height)</label><input type="number" step="0.1" class="geo-input" id="edit-height" value="${
              geo.height || 0
            }"></div>
        </div>
        <button type="submit" style="display: none;" aria-hidden="true"></button>
     `;
}

/**
 * Sammelt die Geometrie-Daten aus dem aktuell offenen Formular.
 * @param {string} type - Der Typ des Bauteils.
 * @returns {object} - Ein Objekt mit den Geometrie-Daten.
 */
function gatherComponentDataFromForm(type) {
  const form = document.getElementById("component-editor-form");
  const data = {};

  if (type === "transformers") {
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
      ratio: form.querySelector("#edit-ratio")?.value || "",
      accuracyClass: form.querySelector("#edit-accuracyClass")?.value || "",
    };
  } else {
    data.geometry = {
      type: "Rectangle",
      width: parseFloat(form.querySelector("#edit-width")?.value) || 0,
      height: parseFloat(form.querySelector("#edit-height")?.value) || 0,
      material: type === "copperRails" ? "Copper" : "M-36 Steel",
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

/**
 * Aktualisiert die visuelle Vorschau des Bauteils.
 * @param {string} type - Der Typ des Bauteils.
 */
function updateEditorPreview(type) {
  const componentData = gatherComponentDataFromForm(type);
  if (componentData) {
    if (type === "transformers") {
      renderTransformerPreview(
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

/**
 * Speichert das aktuell bearbeitete Bauteil (neu oder geändert).
 */
function saveComponent() {
  const form = document.getElementById("component-editor-form");
  const newName = form.querySelector("#edit-name").value;
  if (!newName) {
    alert("Der Name des Bauteils darf nicht leer sein.");
    return;
  }

  const isNew = !currentEditorComponent;
  const componentToSave = isNew
    ? // Erstellt eine leere Vorlage für ein neues Bauteil
      {
        templateProductInformation: { tags: [] },
        specificProductInformation: { geometry: {}, electrical: {} },
      }
    : JSON.parse(JSON.stringify(currentEditorComponent));

  // KORREKTUR: Stellt sicher, dass die verschachtelten Objekte existieren, bevor darauf zugegriffen wird.
  if (!componentToSave.specificProductInformation) {
    componentToSave.specificProductInformation = {};
  }
  if (!componentToSave.specificProductInformation.electrical) {
    componentToSave.specificProductInformation.electrical = {};
  }
  if (!componentToSave.specificProductInformation.geometry) {
    componentToSave.specificProductInformation.geometry = {};
  }
  if (!componentToSave.templateProductInformation.tags) {
    componentToSave.templateProductInformation.tags = [];
  }

  // Allgemeine Infos aktualisieren
  componentToSave.templateProductInformation.name = newName;
  componentToSave.templateProductInformation.manufacturer =
    form.querySelector("#edit-manufacturer")?.value || "";

  // Geometrie & Elektrische Daten aktualisieren
  const updatedData = gatherComponentDataFromForm(currentEditorComponentType);
  componentToSave.specificProductInformation.geometry = {
    ...componentToSave.specificProductInformation.geometry,
    ...updatedData.geometry,
  };
  componentToSave.specificProductInformation.electrical = {
    ...componentToSave.specificProductInformation.electrical,
    ...updatedData.electrical,
  };

  // Nennstrom als Tag hinzufügen, um die Filterung zu ermöglichen
  const stromTag = `${
    updatedData.electrical.primaryRatedCurrentA ||
    updatedData.electrical.ratedCurrentA
  } A`;

  if (
    stromTag &&
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
        // Bibliothek neu laden und Ansicht aktualisieren
        const libResponse = await fetch("/api/library");
        libraryData = await libResponse.json();
        renderComponentList();
      }
    });
}

/**
 * Löscht das aktuell ausgewählte Bauteil.
 */
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
