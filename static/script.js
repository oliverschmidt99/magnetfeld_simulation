// Ersetze den gesamten Inhalt deiner static/script.js Datei
document.addEventListener("DOMContentLoaded", () => {
  // ... (Der obere Teil mit Konva, den Datenmodellen und dem Objekt-Management bleibt gleich)
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
    rotateEnabled: true,
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
  const defaultParams = {
    "freier-leiter": {
      leiter_breite: 100,
      leiter_hoehe: 40,
      spitzenstrom: 4000,
    },
    "standard-leiter": { spitzenstrom: 600 },
    wandler: {
      wandler_breite: 140,
      wandler_hoehe: 140,
      wandler_dicke: 20,
      buerde: 15,
      mu_r: 2500,
      nenn_prim: 4000,
      nenn_sek: 5,
      material: "M-36 Steel",
    },
    blech: { breite: 80, hoehe: 80 },
  };
  document.querySelectorAll(".library-item").forEach((item) => {
    item.addEventListener("dragstart", (e) =>
      e.dataTransfer.setData("text/plain", e.target.dataset.type)
    );
  });
  stage.container().addEventListener("dragover", (e) => e.preventDefault());
  stage.container().addEventListener("drop", (e) => {
    e.preventDefault();
    stage.setPointersPositions(e);
    createObject(
      e.dataTransfer.getData("text/plain"),
      stage.getPointerPosition()
    );
  });
  function createObject(type, pos) {
    const id = `${type}-${Date.now()}`;
    const props = {
      id: id,
      type: type,
      x: pos.x,
      y: pos.y,
      rotation: 0,
      ...defaultParams[type],
    };
    simulationObjects[id] = props;
    renderObject(id);
    selectShape(id);
  }
  function renderObject(id) {
    const props = simulationObjects[id];
    let group = stage.findOne("#" + id);
    if (!group) {
      group = new Konva.Group({ id: id, draggable: true });
      layer.add(group);
      group.on("dragend transformend", () => {
        props.x = group.x();
        props.y = group.y();
        props.rotation = group.rotation();
        updatePropertiesPanel();
      });
    }

    group.x(props.x).y(props.y).rotation(props.rotation);
    group.destroyChildren();

    let width, height;
    if (props.type === "standard-leiter") {
      const dims = stromstufen[props.spitzenstrom];
      width = dims.breite;
      height = dims.hoehe;
      props.leiter_breite = width;
      props.leiter_hoehe = height;
    } else if (props.type === "freier-leiter") {
      width = props.leiter_breite;
      height = props.leiter_hoehe;
    }

    if (props.type.includes("leiter")) {
      group.add(
        new Konva.Rect({
          width: width,
          height: height,
          fill: "#ff8800",
          stroke: "#fff",
          strokeWidth: 2,
        })
      );
    } else if (props.type === "wandler") {
      const d = props.wandler_dicke;
      group.add(
        new Konva.Rect({
          width: props.wandler_breite,
          height: props.wandler_hoehe,
          fill: "#555",
          stroke: "#999",
          strokeWidth: 1,
        })
      );
      group.add(
        new Konva.Rect({
          x: d,
          y: d,
          width: props.wandler_breite - 2 * d,
          height: props.wandler_hoehe - 2 * d,
          fill: "#1e1e1e",
        })
      );
    } else if (props.type === "blech") {
      group.add(
        new Konva.Rect({
          width: props.breite,
          height: props.hoehe,
          fill: "silver",
        })
      );
    }

    group.offsetX(group.getClientRect().width / 2);
    group.offsetY(group.getClientRect().height / 2);
    layer.draw();
  }
  function selectShape(id) {
    selectedShapeId = id;
    const selectedNode = stage.findOne("#" + id);
    transformer.nodes(selectedNode ? [selectedNode] : []);

    if (selectedNode && selectedNode.id().startsWith("standard-leiter")) {
      transformer.enabledAnchors([
        "top-left",
        "top-right",
        "bottom-left",
        "bottom-right",
      ]);
    } else {
      transformer.enabledAnchors(null);
    }

    updatePropertiesPanel();
    layer.draw();
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
            <div class="prop-group">
                <label>ID</label>
                <input type="text" value="${props.id}" disabled>
            </div>
            <div class="prop-group">
                <label>Position X</label>
                <input type="number" value="${props.x.toFixed(
                  1
                )}" onchange="updateProp('${props.id}', 'x', this.value, true)">
            </div>
            <div class="prop-group">
                <label>Position Y</label>
                <input type="number" value="${props.y.toFixed(
                  1
                )}" onchange="updateProp('${props.id}', 'y', this.value, true)">
            </div>`;

    if (props.type === "standard-leiter") {
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
                <div class="prop-group">
                    <label>Breite (mm)</label>
                    <input type="number" value="${
                      props.leiter_breite
                    }" disabled>
                </div>
                <div class="prop-group">
                    <label>Höhe (mm)</label>
                    <input type="number" value="${props.leiter_hoehe}" disabled>
                </div>`;
    } else if (props.type === "freier-leiter") {
      html += `
                <div class="prop-group"><label>Breite (mm)</label><input type="number" value="${props.leiter_breite}" onchange="updateProp('${props.id}', 'leiter_breite', this.value, true)"></div>
                <div class="prop-group"><label>Höhe (mm)</label><input type="number" value="${props.leiter_hoehe}" onchange="updateProp('${props.id}', 'leiter_hoehe', this.value, true)"></div>
                <div class="prop-group"><label>Spitzenstrom (A)</label><input type="number" value="${props.spitzenstrom}" onchange="updateProp('${props.id}', 'spitzenstrom', this.value)"></div>`;
    } else if (props.type === "wandler") {
      html += `
                <div class="prop-group"><label>Bürde</label><input type="number" value="${props.buerde}" onchange="updateProp('${props.id}', 'buerde', this.value)"></div>
                <div class="prop-group"><label>µr</label><input type="number" value="${props.mu_r}" onchange="updateProp('${props.id}', 'mu_r', this.value)"></div>
                <div class="prop-group"><label>I1 / I2</label><input type="number" value="${props.nenn_prim}" onchange="updateProp('${props.id}', 'nenn_prim', this.value)"> <input type="number" value="${props.nenn_sek}" onchange="updateProp('${props.id}', 'nenn_sek', this.value)"></div>
                <div class="prop-group"><label>Material</label><input type="text" value="${props.material}" onchange="updateProp('${props.id}', 'material', this.value)"></div>`;
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

  // --- NEU: Simulation mit standardisierter 'params'-Struktur ---
  document
    .getElementById("run-simulation")
    .addEventListener("click", async () => {
      const statusDiv = document.getElementById("status");
      const button = document.getElementById("run-simulation");

      // Finde den ersten Leiter und den ersten Wandler auf der Stage
      const leiter = Object.values(simulationObjects).find((o) =>
        o.type.includes("leiter")
      );
      const wandler = Object.values(simulationObjects).find(
        (o) => o.type === "wandler"
      );

      if (!leiter || !wandler) {
        statusDiv.textContent =
          "Status: Bitte einen Leiter UND einen Wandler platzieren.";
        return;
      }

      // Erstelle die finale 'params'-Struktur
      const params = {
        abstand: 220, // Dieser Wert könnte auch aus der UI kommen
        leiter_hoehe: leiter.leiter_hoehe,
        leiter_breite: leiter.leiter_breite,
        spitzenstrom: leiter.spitzenstrom,
        wandler_luftspalt: 10, // Fester Wert, könnte auch aus UI kommen
        wandler_dicke: wandler.wandler_dicke,
        wandler_material: wandler.material,
        nenn_prim: wandler.nenn_prim,
        nenn_sek: wandler.nenn_sek,
        problem_tiefe: 30, // Fester Wert, könnte auch aus UI kommen
        mu_r_wandler: wandler.mu_r,
      };

      statusDiv.textContent = "Status: Sende Daten an Server...";
      button.disabled = true;
      button.textContent = "Simuliere...";

      try {
        const response = await fetch("/run-simulation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params), // Sende die einzelne params-Struktur
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
  window.addEventListener("resize", () => {
    stage.width(document.getElementById("editor-wrapper").clientWidth);
    stage.height(document.getElementById("editor-wrapper").clientHeight);
  });
});
