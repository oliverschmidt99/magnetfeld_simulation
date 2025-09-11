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
      // KORREKTUR: type="button" bei den dynamisch erzeugten Buttons hinzugefügt
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
    specificProductInformation: { geometry: { type: "Rectangle" } },
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
            <h3>Geometrie (Rechteck-Wandler)</h3>
            <h4>Äußere Luft</h4>
            <div class="form-group"><label>Breite (outerAirWidth)</label><input type="number" step="0.1" class="geo-input" id="edit-outerAirWidth" value="${
              geo.outerAirWidth || 0
            }"></div>
            <div class="form-group"><label>Höhe (outerAirHeight)</label><input type="number" step="0.1" class="geo-input" id="edit-outerAirHeight" value="${
              geo.outerAirHeight || 0
            }"></div>
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
            <h4>Leiter-Spalt</h4>
            <div class="form-group"><label>Breite (innerWidth)</label><input type="number" step="0.1" class="geo-input" id="edit-innerWidth" value="${
              geo.innerWidth || 0
            }"></div>
            <div class="form-group"><label>Höhe (innerHeight)</label><input type="number" step="0.1" class="geo-input" id="edit-innerHeight" value="${
              geo.innerHeight || 0
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
  return `
        <div class="form-section">
            <h3>Allgemeine Informationen</h3>
            <div class="form-group"><label>Name</label><input type="text" id="edit-name" value="${
              tpi.name || ""
            }" required></div>
        </div>
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
  if (type === "transformers") {
    return {
      type: "Rectangle",
      outerAirWidth:
        parseFloat(form.querySelector("#edit-outerAirWidth")?.value) || 0,
      outerAirHeight:
        parseFloat(form.querySelector("#edit-outerAirHeight")?.value) || 0,
      coreOuterWidth:
        parseFloat(form.querySelector("#edit-coreOuterWidth")?.value) || 0,
      coreOuterHeight:
        parseFloat(form.querySelector("#edit-coreOuterHeight")?.value) || 0,
      coreInnerWidth:
        parseFloat(form.querySelector("#edit-coreInnerWidth")?.value) || 0,
      coreInnerHeight:
        parseFloat(form.querySelector("#edit-coreInnerHeight")?.value) || 0,
      innerWidth:
        parseFloat(form.querySelector("#edit-innerWidth")?.value) || 0,
      innerHeight:
        parseFloat(form.querySelector("#edit-innerHeight")?.value) || 0,
    };
  } else {
    return {
      type: "Rectangle",
      width: parseFloat(form.querySelector("#edit-width")?.value) || 0,
      height: parseFloat(form.querySelector("#edit-height")?.value) || 0,
      material: type === "copperRails" ? "Copper" : "M-36 Steel",
    };
  }
}

/**
 * Aktualisiert die visuelle Vorschau des Bauteils.
 * @param {string} type - Der Typ des Bauteils.
 */
function updateEditorPreview(type) {
  const componentData = gatherComponentDataFromForm(type);
  if (componentData) {
    if (type === "transformers") {
      renderTransformerPreview(componentData, "editor-preview-svg", true);
    } else {
      renderComponentPreview(componentData, "editor-preview-svg", true);
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
      { templateProductInformation: {}, specificProductInformation: {} }
    : JSON.parse(JSON.stringify(currentEditorComponent));

  // Allgemeine Infos aktualisieren
  componentToSave.templateProductInformation.name = newName;
  componentToSave.templateProductInformation.manufacturer =
    form.querySelector("#edit-manufacturer")?.value || "";

  // Geometrie aktualisieren
  componentToSave.specificProductInformation.geometry =
    gatherComponentDataFromForm(currentEditorComponentType);

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
