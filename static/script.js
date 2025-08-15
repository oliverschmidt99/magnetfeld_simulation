document.addEventListener("DOMContentLoaded", () => {
  // --- KONFIGURATION & DATENMODELLE ---
  const stage = new Konva.Stage({
    container: "editor-container",
    width: document.getElementById("editor-wrapper").clientWidth,
    height: document.getElementById("editor-wrapper").clientHeight,
    draggable: true,
  });
  const layer = new Konva.Layer();
  stage.add(layer);
  const transformer = new Konva.Transformer({
    borderStroke: "#00aaff",
    anchorStroke: "#00aaff",
    anchorFill: "#fff",
    rotateEnabled: false, // Drehen bei diesem Bauteil meist nicht nötig
    resizeEnabled: false, // Größe wird über Parameter gesteuert
  });
  layer.add(transformer);

  let simulationObjects = {};
  let selectedShapeId = null;

  const stromstufen = {
    600: { breite: 40, hoehe: 10 },
    800: { breite: 50, hoehe: 10 },
    1000: { breite: 60, hoehe: 10 },
    1250: { breite: 40, hoehe: 20 },
    1600: { breite: 60, hoehe: 20 },
    2000: { breite: 80, hoehe: 20 },
    2500: { breite: 100, hoehe: 20 },
    3200: { breite: 100, hoehe: 30 },
    4000: { breite: 100, hoehe: 40 },
    5000: { breite: 120, hoehe: 50 },
  };

  // NEU: Kombinierte Standardparameter
  const defaultParams = {
    "wandler-mit-leiter": {
      // Leiter-Eigenschaften
      spitzenstrom: 600,
      leiter_breite: 40, // Startwert für 600A
      leiter_hoehe: 10, // Startwert für 600A
      // Wandler-Eigenschaften
      wandler_dicke: 20,
      wandler_luftspalt: 10,
      buerde: 15,
      mu_r: 2500,
      nenn_prim: 4000,
      nenn_sek: 5,
      material: "M-36 Steel",
    },
    "freier-leiter": {
      leiter_breite: 100,
      leiter_hoehe: 40,
      spitzenstrom: 4000,
    },
    blech: { breite: 80, hoehe: 80 },
  };

  // --- OBJEKT-MANAGEMENT ---
  function createObject(type, pos) {
    const id = `${type}-${Date.now()}`;
    const props = {
      id: id,
      type: type,
      x: pos.x,
      y: pos.y,
      ...defaultParams[type],
    };
    simulationObjects[id] = props;
    renderObject(id);
    return props;
  }

  function renderObject(id) {
    const props = simulationObjects[id];
    let group = stage.findOne("#" + id);
    if (!group) {
      group = new Konva.Group({ id: id, draggable: true });
      layer.add(group);
      group.on("dragend", () => {
        props.x = group.x();
        props.y = group.y();
        updatePropertiesPanel();
      });
    }

    group.x(props.x).y(props.y);
    group.destroyChildren();

    if (props.type === "wandler-mit-leiter") {
      // Aktualisiere Leiter-Maße basierend auf Strom
      const dims = stromstufen[props.spitzenstrom];
      props.leiter_breite = dims.breite;
      props.leiter_hoehe = dims.hoehe;

      const wandler_breite =
        props.leiter_breite +
        2 * props.wandler_luftspalt +
        2 * props.wandler_dicke;
      const wandler_hoehe =
        props.leiter_hoehe +
        2 * props.wandler_luftspalt +
        2 * props.wandler_dicke;

      // Zeichne den äußeren Stahlkern
      group.add(
        new Konva.Rect({
          width: wandler_breite,
          height: wandler_hoehe,
          fill: "#555",
          stroke: "#999",
          strokeWidth: 1,
        })
      );
      // Zeichne die schwarze Füllung, die den Leiter verdeckt
      group.add(
        new Konva.Rect({
          x: props.wandler_dicke,
          y: props.wandler_dicke,
          width: wandler_breite - 2 * props.wandler_dicke,
          height: wandler_hoehe - 2 * props.wandler_dicke,
          fill: "black", // SCHWARZE FÜLLUNG
        })
      );
    }
    // ... (Code für freie Leiter und Blech bleibt gleich)

    group.offsetX(group.getClientRect().width / 2);
    group.offsetY(group.getClientRect().height / 2);
    layer.draw();
  }

  // --- LAYOUT, AUSWAHL & EIGENSCHAFTEN ---
  function createDefaultLayout() {
    const canvasWidth = stage.width();
    const canvasHeight = stage.height();
    const abstand = 220;
    const positions = [-abstand, 0, abstand];
    positions.forEach((x_pos) => {
      createObject("wandler-mit-leiter", {
        x: canvasWidth / 2 + x_pos,
        y: canvasHeight / 2,
      });
    });
    selectShape(null);
  }

  function selectShape(id) {
    selectedShapeId = id;
    const selectedNode = stage.findOne("#" + id);
    transformer.nodes(selectedNode ? [selectedNode] : []);
    updatePropertiesPanel();
  }

  stage.on("click tap", (e) => {
    if (e.target === stage) selectShape(null);
    else if (e.target.getParent() instanceof Konva.Group)
      selectShape(e.target.getParent().id());
  });

  function updatePropertiesPanel() {
    const contentDiv = document.getElementById("properties-content");
    if (!selectedShapeId) {
      contentDiv.innerHTML =
        '<p class="placeholder">Ein Bauteil auswählen.</p>';
      return;
    }
    const props = simulationObjects[selectedShapeId];
    let html = `
        <div class="prop-group"><label>Position X</label><input type="number" value="${props.x.toFixed(
          1
        )}" onchange="updateProp('${props.id}', 'x', this.value, true)"></div>
        <div class="prop-group"><label>Position Y</label><input type="number" value="${props.y.toFixed(
          1
        )}" onchange="updateProp('${props.id}', 'y', this.value, true)"></div>
        <hr>`;

    if (props.type === "wandler-mit-leiter") {
      html += `
          <div class="prop-group">
              <label>Strom (Standard)</label>
              <select onchange="updateProp('${
                props.id
              }', 'spitzenstrom', this.value, true)">
                  ${Object.keys(stromstufen)
                    .map(
                      (s) =>
                        `<option value="${s}" ${
                          props.spitzenstrom == s ? "selected" : ""
                        }>${s} A</option>`
                    )
                    .join("")}
              </select>
          </div>
          <div class="prop-group"><label>Leiter-Breite</label><input type="number" value="${
            props.leiter_breite
          }" disabled></div>
          <div class="prop-group"><label>Leiter-Höhe</label><input type="number" value="${
            props.leiter_hoehe
          }" disabled></div>
          <hr>
          <div class="prop-group"><label>Wandler-Dicke</label><input type="number" value="${
            props.wandler_dicke
          }" onchange="updateProp('${
        props.id
      }', 'wandler_dicke', this.value, true)"></div>
          <div class="prop-group"><label>Luftspalt</label><input type="number" value="${
            props.wandler_luftspalt
          }" onchange="updateProp('${
        props.id
      }', 'wandler_luftspalt', this.value, true)"></div>
          <div class="prop-group"><label>µr</label><input type="number" value="${
            props.mu_r
          }" onchange="updateProp('${props.id}', 'mu_r', this.value)"></div>
          <div class="prop-group"><label>I1 / I2</label><input type="number" value="${
            props.nenn_prim
          }" onchange="updateProp('${
        props.id
      }', 'nenn_prim', this.value)"> <input type="number" value="${
        props.nenn_sek
      }" onchange="updateProp('${props.id}', 'nenn_sek', this.value)"></div>`;
    }
    contentDiv.innerHTML = html;
  }

  window.updateProp = (id, key, value, shouldRender = false) => {
    const props = simulationObjects[id];
    if (!props) return;
    props[key] = isNaN(parseFloat(value)) ? value : parseFloat(value);
    if (shouldRender) {
      renderObject(id);
      updatePropertiesPanel();
    }
  };

  // --- SIMULATION (unverändert) ---
  document
    .getElementById("run-simulation")
    .addEventListener("click", async () => {
      const statusDiv = document.getElementById("status");
      const button = document.getElementById("run-simulation");
      const bauteil = Object.values(simulationObjects).find(
        (o) => o.type === "wandler-mit-leiter"
      );
      if (!bauteil) {
        statusDiv.textContent =
          "Status: Bitte mind. ein 'Wandler mit Leiter' platzieren.";
        return;
      }
      const params = {
        abstand: 220,
        leiter_hoehe: bauteil.leiter_hoehe,
        leiter_breite: bauteil.leiter_breite,
        spitzenstrom: bauteil.spitzenstrom,
        wandler_luftspalt: bauteil.wandler_luftspalt,
        wandler_dicke: bauteil.wandler_dicke,
        wandler_material: bauteil.material,
        nenn_prim: bauteil.nenn_prim,
        nenn_sek: bauteil.nenn_sek,
        problem_tiefe: 30,
        mu_r_wandler: bauteil.mu_r,
      };
      statusDiv.textContent = "Status: Sende Daten...";
      button.disabled = true;
      button.textContent = "Simuliere...";
      try {
        const response = await fetch("/run-simulation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        statusDiv.textContent = `Status: ${result.message}`;
      } catch (error) {
        statusDiv.textContent = `Status: FEHLER - ${error.message}`;
      } finally {
        button.disabled = false;
        button.textContent = "Simulation starten";
      }
    });

  // --- INITIALISIERUNG ---
  createDefaultLayout();
});
