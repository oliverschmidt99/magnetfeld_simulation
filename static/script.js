document.addEventListener("DOMContentLoaded", () => {
  // =========================================================================
  // ## UI-Elemente ##
  // =========================================================================
  const tabBar = document.getElementById("tab-bar");

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
    if (tabId.startsWith("editor-")) {
      content?.remove(); // Geklonte Editoren vollständig aus dem DOM entfernen
    } else {
      content?.classList.remove("active");
    }

    const firstTab = tabBar.querySelector(".tab");
    if (firstTab) {
      activateTab(firstTab.dataset.tab);
    }
  }

  function openTab(tabId, title, isClosable = true) {
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

  let editorInstances = {}; // Verwalte mehrere Editor-Instanzen

  function initializeEditor(tabId, config) {
    if (editorInstances[tabId]) return;

    const newEditorContent = document.getElementById(tabId);
    const konvaContainer = newEditorContent.querySelector(".editor-canvas");
    konvaContainer.innerHTML = ""; // Leere den Container, um sicherzustellen, dass er sauber ist

    const stage = new Konva.Stage({
      container: konvaContainer,
      width: konvaContainer.clientWidth,
      height: konvaContainer.clientHeight,
      draggable: true,
    });
    const layer = new Konva.Layer();
    stage.add(layer);

    editorInstances[tabId] = { stage, layer, config };
    console.log(`Editor für Projekt "${config.projectName}" initialisiert.`);

    // Zeichne das Layout basierend auf der Konfiguration
    drawLayout(editorInstances[tabId]);
  }

  function drawLayout({ stage, layer, config }) {
    layer.destroyChildren(); // Altes Layout sauber entfernen
    const canvasWidth = stage.width();
    const canvasHeight = stage.height();

    // Parameter, die die Geometrie definieren (könnten später aus der UI kommen)
    const params = {
      abstand: 150,
      leiter_breite: 40,
      leiter_hoehe: 40,
      wandler_luftspalt: 10,
      wandler_dicke: 15,
    };

    if (config.simType === "3-leiter") {
      const positions = [-params.abstand, 0, params.abstand];

      positions.forEach((x_offset, index) => {
        const center_x = canvasWidth / 2 + x_offset;
        const center_y = canvasHeight / 2;

        const group = new Konva.Group({ draggable: true });
        layer.add(group);

        // 1. Äußerer Stahlkern
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
            strokeWidth: 1,
          })
        );

        // 2. Mittlerer Luftspalt (als "Loch")
        const luft_b = params.leiter_breite + 2 * params.wandler_luftspalt;
        const luft_h = params.leiter_hoehe + 2 * params.wandler_luftspalt;
        group.add(
          new Konva.Rect({
            x: center_x - luft_b / 2,
            y: center_y - luft_h / 2,
            width: luft_b,
            height: luft_h,
            fill: "#FFFFFF", // Weiß für Luft
          })
        );

        // 3. Innerer Kupferleiter
        group.add(
          new Konva.Rect({
            x: center_x - params.leiter_breite / 2,
            y: center_y - params.leiter_hoehe / 2,
            width: params.leiter_breite,
            height: params.leiter_hoehe,
            fill: "#B87333", // Kupferfarbe
          })
        );

        // 4. Beschriftungen
        group.add(
          new Konva.Text({
            text: "M-36 Steel",
            x: center_x + stahl_b / 2 + 5,
            y: center_y - 8,
            fontSize: 12,
            fill: "black",
          })
        );
        group.add(
          new Konva.Text({
            text: `L${index + 1}`,
            x: center_x - 5,
            y: center_y - 8,
            fontSize: 14,
            fill: "white",
            fontStyle: "bold",
          })
        );
      });
    }

    stage.draw();
  }

  // =========================================================================
  // ## EVENT-LISTENER ##
  // =========================================================================

  // Event-Listener für die Hauptmenü-Buttons
  document.querySelectorAll(".main-menu button[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = button.dataset.tab;
      const title = button.textContent;
      openTab(tabId, title);
    });
  });

  // "Projekt erstellen"-Button
  document.getElementById("start-projekt-btn").addEventListener("click", () => {
    const config = {
      projectName:
        document.getElementById("proj-name").value || "Unbenanntes Projekt",
      simType: document.getElementById("sim-type").value,
    };
    const tabId = `editor-${Date.now()}`;

    const editorTemplate = document.getElementById("editor");
    const newEditor = editorTemplate.cloneNode(true);
    newEditor.id = tabId;
    newEditor.classList.add("active"); // Mache den neuen Tab sofort aktiv
    document.querySelector(".tab-content-area").appendChild(newEditor);

    openTab(tabId, config.projectName, true);

    setTimeout(() => initializeEditor(tabId, config), 50);
  });

  // Start-Tab initial öffnen
  openTab("neues-projekt", "Neues Projekt", false);
});
