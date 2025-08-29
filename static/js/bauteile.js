// static/js/bauteile.js
// JavaScript für die Bauteil-Editor-Seite

document.addEventListener("DOMContentLoaded", () => {
  const libraryData = JSON.parse(
    document.getElementById("library-data").textContent
  );
  const bauteileNav = document.getElementById("bauteile-nav");
  const bauteilSections = document.getElementById("bauteil-sections");

  // Funktion zum Rendern eines Bauteil-Formulars
  function renderComponentForm(container, component, type) {
    const { templateProductInformation, specificProductInformation } =
      component;
    const formId = `form-${templateProductInformation.name.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}`;
    const formHtml = `
            <div class="component-card">
                <form id="${formId}">
                    <input type="hidden" name="originalName" value="${
                      templateProductInformation.name
                    }">
                    <input type="hidden" name="type" value="${type}">
                    <h3>${templateProductInformation.name}</h3>
                    <div class="form-group-wrapper">
                        <div class="form-group">
                            <label>Produktname</label>
                            <input type="text" name="productName" value="${
                              templateProductInformation.productName
                            }">
                        </div>
                        <div class="form-group">
                            <label>Hersteller</label>
                            <input type="text" name="manufacturer" value="${
                              templateProductInformation.manufacturer
                            }">
                        </div>
                        <div class="form-group">
                            <label>Tags</label>
                            <input type="text" name="tags" value="${(
                              templateProductInformation.tags || []
                            ).join(", ")}">
                        </div>
                    </div>
                    <h4>Spezifische Informationen</h4>
                    <div class="form-group-wrapper">
                        ${Object.keys(specificProductInformation.geometry || {})
                          .map(
                            (key) => `
                            <div class="form-group">
                                <label>${key}</label>
                                <input type="text" name="geometry-${key}" value="${specificProductInformation.geometry[key]}">
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                    <div class="button-group">
                        <button type="submit" class="button">Speichern</button>
                        <button type="button" class="button danger delete-btn">Löschen</button>
                    </div>
                </form>
            </div>
        `;
    container.insertAdjacentHTML("beforeend", formHtml);
    return document.getElementById(formId);
  }

  // Funktion zum Speichern von Bauteilen
  function saveComponent(form, type) {
    const formData = new FormData(form);
    const component = {
      templateProductInformation: {},
      specificProductInformation: { geometry: {} },
    };

    for (const [key, value] of formData.entries()) {
      if (key.startsWith("geometry-")) {
        const geoKey = key.replace("geometry-", "");
        component.specificProductInformation.geometry[geoKey] = value;
      } else {
        component.templateProductInformation[key] = value;
      }
    }

    // Tags als Array parsen
    component.templateProductInformation.tags =
      component.templateProductInformation.tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);

    const payload = {
      action: "save",
      type: type,
      originalName: formData.get("originalName"),
      component: component,
    };

    fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((response) => response.json())
      .then((data) => {
        alert(data.message);
        // Optional: UI neu laden oder aktualisieren
        location.reload();
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("Fehler beim Speichern des Bauteils.");
      });
  }

  // Funktion zum Löschen von Bauteilen
  function deleteComponent(name, type) {
    if (!confirm(`Soll das Bauteil "${name}" wirklich gelöscht werden?`)) {
      return;
    }

    const payload = {
      action: "delete",
      type: type,
      originalName: name,
    };

    fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((response) => response.json())
      .then((data) => {
        alert(data.message);
        location.reload();
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("Fehler beim Löschen des Bauteils.");
      });
  }

  // Navigations-Logik
  bauteileNav.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;

    bauteileNav
      .querySelectorAll(".card")
      .forEach((c) => c.classList.remove("active"));
    card.classList.add("active");

    const targetId = card.dataset.target;
    bauteilSections.querySelectorAll(".config-section").forEach((section) => {
      section.classList.remove("active");
    });
    document.getElementById(targetId).classList.add("active");
  });

  // Rendern der Bauteile
  const railContainer = document.getElementById("bauteil-rails");
  (libraryData.components.copperRails || []).forEach((rail) => {
    const form = renderComponentForm(railContainer, rail, "copperRails");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      saveComponent(form, "copperRails");
    });
    form.querySelector(".delete-btn").addEventListener("click", () => {
      deleteComponent(rail.templateProductInformation.name, "copperRails");
    });
  });

  // ... (Logik für Transformers und Sheets)
  const transformersContainer = document.getElementById("bauteil-transformers");
  (libraryData.components.transformers || []).forEach((transformer) => {
    const form = renderComponentForm(
      transformersContainer,
      transformer,
      "transformers"
    );
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      saveComponent(form, "transformers");
    });
    form.querySelector(".delete-btn").addEventListener("click", () => {
      deleteComponent(
        transformer.templateProductInformation.name,
        "transformers"
      );
    });
  });

  const sheetsContainer = document.getElementById("bauteil-sheets");
  (libraryData.components.transformerSheets || []).forEach((sheet) => {
    const form = renderComponentForm(
      sheetsContainer,
      sheet,
      "transformerSheets"
    );
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      saveComponent(form, "transformerSheets");
    });
    form.querySelector(".delete-btn").addEventListener("click", () => {
      deleteComponent(
        sheet.templateProductInformation.name,
        "transformerSheets"
      );
    });
  });

  // Platzhalter für neuen Eintrag
  function renderNewComponentButton(container, type) {
    const button = document.createElement("button");
    button.className = "button secondary";
    button.textContent = `+ Neues Bauteil hinzufügen (${type})`;
    button.addEventListener("click", () => {
      // Hier würde die Logik zum Erstellen eines neuen, leeren Formulars kommen
      // Da das Frontend dafür noch nicht vollständig ist, ist dies ein Platzhalter
      alert('Funktion "Bauteil hinzufügen" ist in Entwicklung.');
    });
    container.appendChild(button);
  }

  renderNewComponentButton(railContainer, "Kupferschiene");
  renderNewComponentButton(transformersContainer, "Wandler");
  renderNewComponentButton(sheetsContainer, "Abschirmblech");
});
