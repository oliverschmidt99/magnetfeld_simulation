document.addEventListener("DOMContentLoaded", () => {
  // =========================================================================
  // ## UI-Elemente ##
  // =========================================================================
  const tabBar = document.getElementById("tab-bar");
  const simTypeSelect = document.getElementById("sim-type");
  const wandlerCheckboxesContainer =
    document.getElementById("wandler-checkboxes");

  // =========================================================================
  // ## TAB-MANAGEMENT FUNKTIONEN (Vollständig) ##
  // =========================================================================

  function deactivateAllTabs() {
    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((c) => c.classList.remove("active"));
  }

  function activateTab(tabId) {
    deactivateAllTabs();
    const tabElement = document.querySelector(`.tab[data-tab="${tabId}"]`);
    const contentElement = document.getElementById(tabId);
    if (tabElement && contentElement) {
      tabElement.classList.add("active");
      contentElement.classList.add("active");
    }
  }

  function closeTab(tabId) {
    const tab = document.querySelector(`.tab[data-tab="${tabId}"]`);
    const content = document.getElementById(tabId);

    tab?.remove();
    // Geklonte Editor-Tabs werden vollständig aus dem DOM entfernt
    if (tabId.startsWith("editor-")) {
      content?.remove();
    } else {
      content?.classList.remove("active");
    }

    // Den ersten verbleibenden Tab aktivieren, falls vorhanden
    const firstTab = tabBar.querySelector(".tab");
    if (firstTab) {
      activateTab(firstTab.dataset.tab);
    }
  }

  function openTab(tabId, title, isClosable = true) {
    // Wenn der Tab bereits existiert, nur aktivieren
    if (document.querySelector(`.tab[data-tab="${tabId}"]`)) {
      activateTab(tabId);
      return;
    }
    const tab = document.createElement("div");
    tab.className = "tab";
    tab.dataset.tab = tabId;
    tab.innerHTML = `${title} ${
      isClosable ? '<span class="close-btn">&times;</span>' : ""
    }`;
    tabBar.appendChild(tab);

    tab.addEventListener("click", (e) => {
      if (e.target.classList.contains("close-btn")) {
        closeTab(tabId);
      } else {
        activateTab(tabId);
      }
    });

    activateTab(tabId);
  }

  // =========================================================================
  // ## EDITOR-LOGIK ##
  // =========================================================================

  let editorInstances = {}; // Verwaltet alle geöffneten Editor-Instanzen

  function initializeEditor(tabId, config) {
    console.log(
      "Starte Initialisierung für Editor-Tab:",
      tabId,
      "mit Config:",
      config
    );
    try {
      const editorContent = document.getElementById(tabId);
      const konvaContainer = editorContent.querySelector(".editor-canvas");

      const stage = new Konva.Stage({
        container: konvaContainer,
        width: konvaContainer.clientWidth,
        height: konvaContainer.clientHeight,
        draggable: true,
      });
      const layer = new Konva.Layer();
      stage.add(layer);

      editorInstances[tabId] = { stage, layer, config };

      drawLayout(editorInstances[tabId]);
      console.log("Editor Initialisierung erfolgreich.");
    } catch (error) {
      console.error("Fehler bei der Editor-Initialisierung:", error);
    }
  }

  function drawLayout({ stage, layer, config }) {
    layer.destroyChildren();
    const canvasWidth = stage.width();
    const canvasHeight = stage.height();

    const params = {
      leiter_breite: 40,
      leiter_hoehe: 40,
      wandler_luftspalt: 10,
      wandler_dicke: 15,
    };

    const leiterMapping = {
      "2-leiter": ["L1", "N"],
      "3-leiter": ["L1", "L2", "L3"],
      "4-leiter": ["L1", "L2", "L3", "N"],
      "5-leiter": ["L1", "L2", "L3", "N", "PE"],
    };
    const leiterNamen = leiterMapping[config.simType] || [];
    const anzahlLeiter = leiterNamen.length;
    const abstand =
      anzahlLeiter > 1 ? (canvasWidth * 0.6) / (anzahlLeiter - 1) : 0;

    leiterNamen.forEach((name, index) => {
      const x_offset =
        anzahlLeiter > 1 ? -canvasWidth * 0.3 + index * abstand : 0;
      const center_x = canvasWidth / 2 + x_offset;
      const center_y = canvasHeight / 2;

      const group = new Konva.Group({ draggable: true });
      layer.add(group);

      if (config.wandler[name]) {
        const stahl_b =
          params.leiter_breite +
          2 * params.wandler_luftspalt +
          2 * params.wandler_dicke;
        const stahl_h =
          params.leiter_hoehe +
          2 * params.wandler_luftspalt +
          2 * params.wandler_dicke;
        group.add(
          new Konva.Rect({
            x: center_x - stahl_b / 2,
            y: center_y - stahl_h / 2,
            width: stahl_b,
            height: stahl_h,
            fill: "#D2D2D2",
            stroke: "black",
          })
        );
        const luft_b = params.leiter_breite + 2 * params.wandler_luftspalt;
        const luft_h = params.leiter_hoehe + 2 * params.wandler_luftspalt;
        group.add(
          new Konva.Rect({
            x: center_x - luft_b / 2,
            y: center_y - luft_h / 2,
            width: luft_b,
            height: luft_h,
            fill: "#FFFFFF",
          })
        );
      }

      group.add(
        new Konva.Rect({
          x: center_x - params.leiter_breite / 2,
          y: center_y - params.leiter_hoehe / 2,
          width: params.leiter_breite,
          height: params.leiter_hoehe,
          fill: "#B87333",
        })
      );
      group.add(
        new Konva.Text({
          text: name,
          x: center_x - 5,
          y: center_y - 8,
          fontSize: 14,
          fill: "white",
          fontStyle: "bold",
          listening: false,
        })
      );
    });

    stage.draw();
  }

  // =========================================================================
  // ## EVENT-LISTENER & START ##
  // =========================================================================

  // Event-Listener für die Hauptmenü-Buttons
  document.querySelectorAll(".main-menu button[data-tab]").forEach((button) => {
    button.addEventListener("click", () =>
      openTab(button.dataset.tab, button.textContent)
    );
  });

  // Funktion zum Aktualisieren der Wandler-Checkboxen
  function updateWandlerCheckboxes() {
    const leiterMapping = {
      "2-leiter": ["L1", "N"],
      "3-leiter": ["L1", "L2", "L3"],
      "4-leiter": ["L1", "L2", "L3", "N"],
      "5-leiter": ["L1", "L2", "L3", "N", "PE"],
    };
    const leiterNamen = leiterMapping[simTypeSelect.value] || [];
    wandlerCheckboxesContainer.innerHTML = "";
    leiterNamen.forEach((name) => {
      const id = `wandler-${name}`;
      const checkboxHtml = `
                <input type="checkbox" id="${id}" data-leiter="${name}" checked>
                <label for="${id}">${name}</label>
            `;
      wandlerCheckboxesContainer.innerHTML += checkboxHtml;
    });
  }

  // Event-Listener, um die Checkboxen bei Änderung der Konfiguration zu aktualisieren
  simTypeSelect.addEventListener("change", updateWandlerCheckboxes);

  // "Projekt erstellen"-Button
  document.getElementById("start-projekt-btn").addEventListener("click", () => {
    const wandlerConfig = {};
    wandlerCheckboxesContainer
      .querySelectorAll('input[type="checkbox"]')
      .forEach((cb) => {
        wandlerConfig[cb.dataset.leiter] = cb.checked;
      });

    const config = {
      projectName:
        document.getElementById("proj-name").value || "Unbenanntes Projekt",
      simType: simTypeSelect.value,
      stromstaerke: document.getElementById("stromstaerke").value,
      wandler: wandlerConfig,
    };

    const tabId = `editor-${Date.now()}`;
    const editorTemplate = document.getElementById("editor-template");
    const newEditor = editorTemplate.cloneNode(true);
    newEditor.id = tabId;
    newEditor.classList.add("editor-instance");
    newEditor.style.display = "flex";
    document.querySelector(".tab-content-area").appendChild(newEditor);

    openTab(tabId, config.projectName, true);
    setTimeout(() => initializeEditor(tabId, config), 100);
  });

  // Initialen Zustand beim Laden der Seite herstellen
  updateWandlerCheckboxes();
  openTab("neues-projekt", "Neues Projekt", false);
});
