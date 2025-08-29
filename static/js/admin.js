// static/js/admin.js
$(document).ready(function () {
  const fileList = $("#file-list");
  const currentFileTitle = $("#current-file-title");
  const saveButton = $("#save-button");
  const resetButton = $("#reset-button");
  const saveStatus = $("#save-status");

  let table;
  let currentFileName = null;
  let originalData = []; // Für die "Zurücksetzen"-Funktion
  let currentPreviewType = "none";

  // --- Initialisierung ---

  $.getJSON("/data/files", function (files) {
    fileList.empty();
    files.forEach((file) => {
      fileList.append(`<li data-filename="${file}">📄 ${file}</li>`);
    });
  });

  // --- Event Listener ---
  fileList.on("click", "li", function () {
    const clickedFile = $(this).data("filename");
    if (clickedFile !== currentFileName) {
      loadFile(clickedFile);
      fileList.find("li").removeClass("active");
      $(this).addClass("active");
    }
  });

  saveButton.on("click", saveFile);
  resetButton.on("click", resetData);
  saveButton.prop("disabled", true);
  resetButton.prop("disabled", true);

  // --- Hauptfunktionen ---

  function loadFile(filename) {
    currentFileName = filename;
    currentFileTitle.text(filename);

    $.getJSON(`/data/${filename}`, function (response) {
      originalData = JSON.parse(JSON.stringify(response.data)); // Tiefe Kopie für Reset
      currentPreviewType = response.preview_type;

      initDataTable(response.data);
      renderVisualization(currentPreviewType, response.data);

      saveButton.prop("disabled", false);
      resetButton.prop("disabled", false);
    }).fail(function () {
      $("#grid-container").html(
        `<p style="color:red;">Fehler beim Laden von ${filename}.</p>`
      );
      clearVisualization();
    });
  }

  function initDataTable(data) {
    if (table) {
      table.destroy();
      $("#csv-table").empty();
    }
    if (!data || data.length === 0) {
      $("#grid-container").html("<p>Keine Daten in dieser Datei gefunden.</p>");
      return;
    }

    const columns = Object.keys(data[0]).map((key) => ({
      title: key,
      data: key,
    }));

    table = $("#csv-table").DataTable({
      data: data,
      columns: columns,
      paging: false,
      scrollY: "400px",
      scrollCollapse: true,
      scrollX: true,
    });

    // Zellen editierbar machen
    $("#csv-table tbody").on("click", "td", function () {
      const cell = table.cell(this);
      if ($(this).find("input").length > 0) return;

      const originalContent = cell.data();
      const input = $(
        `<input type='text' value='${originalContent}' style='width: 100%; box-sizing: border-box;'>`
      );
      $(this).html(input);
      input.focus();

      input.on("blur", function () {
        const newValue = $(this).val();
        cell.data(newValue).draw();
        onGridDataChanged();
      });

      input.on("keydown", function (e) {
        if (e.which === 13) {
          $(this).blur();
        } else if (e.which === 27) {
          cell.data(originalContent).draw();
        }
      });
    });
  }

  function saveFile() {
    if (!table || !currentFileName) return;
    const dataToSave = table.rows().data().toArray();
    originalData = JSON.parse(JSON.stringify(dataToSave)); // Nach Speichern ist der neue Stand der "originale"

    saveStatus.text("Speichern...").css("color", "orange");
    $.ajax({
      url: `/data/${currentFileName}`,
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify(dataToSave),
      success: function (result) {
        saveStatus.text("Erfolgreich gespeichert!").css("color", "green");
        setTimeout(() => saveStatus.text(""), 3000);
      },
      error: function (xhr, status, error) {
        saveStatus.text(`Fehler: ${error}`).css("color", "red");
        setTimeout(() => saveStatus.text(""), 3000);
      },
    });
  }

  function resetData() {
    if (originalData.length > 0) {
      initDataTable(JSON.parse(JSON.stringify(originalData)));
      renderVisualization(currentPreviewType, originalData);
      saveStatus.text("Änderungen zurückgesetzt.").css("color", "blue");
      setTimeout(() => saveStatus.text(""), 3000);
    }
  }

  function onGridDataChanged() {
    if (!table) return;
    const data = table.rows().data().toArray();
    renderVisualization(currentPreviewType, data);
  }

  // --- Visualisierungs-Funktionen ---
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.getElementById("admin-preview-svg");
  const controls = document.getElementById("visualization-controls");

  function clearVisualization() {
    svg.innerHTML = "";
    controls.innerHTML = "";
  }

  function renderVisualization(type, data) {
    clearVisualization();
    if (!data || data.length === 0) return;
    switch (type) {
      case "startpositionen":
        renderStartPositionen(data);
        break;
      case "spielraum":
        renderSpielraum(data[0]);
        break;
      case "bewegungen":
        renderBewegungen(data);
        break;
      case "schrittweiten":
        renderSchrittweiten(data);
        break;
      case "wandler_abmessungen":
        renderWandlerAbmessungen(data);
        break;
    }
  }

  function setupSVG(padding = 50, dataBounds = null) {
    svg.innerHTML = "";
    const bounds = dataBounds || {
      minX: -250,
      maxX: 250,
      minY: -250,
      maxY: 250,
    };
    const minX = isNaN(bounds.minX) ? -250 : bounds.minX;
    const maxX = isNaN(bounds.maxX) ? 250 : bounds.maxX;
    const minY = isNaN(bounds.minY) ? -250 : bounds.minY;
    const maxY = isNaN(bounds.maxY) ? 250 : bounds.maxY;
    const width = maxX - minX;
    const height = maxY - minY;
    const viewBox = {
      minX: minX - padding,
      minY: minY - padding,
      width: (width > 0 ? width : 500) + 2 * padding,
      height: (height > 0 ? height : 500) + 2 * padding,
    };
    svg.setAttribute(
      "viewBox",
      `${viewBox.minX} ${-viewBox.minY - viewBox.height} ${viewBox.width} ${
        viewBox.height
      }`
    );
    const defs = document.createElementNS(svgNS, "defs");
    defs.innerHTML = `<marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke"/></marker><pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="gray" stroke-width="0.5"/></pattern><pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="url(#smallGrid)"/><path d="M 100 0 L 0 0 0 100" fill="none" stroke="gray" stroke-width="1"/></pattern>`;
    svg.prepend(defs);
    const gridRect = document.createElementNS(svgNS, "rect");
    gridRect.setAttribute("x", viewBox.minX);
    gridRect.setAttribute("y", -viewBox.minY - viewBox.height);
    gridRect.setAttribute("width", "100%");
    gridRect.setAttribute("height", "100%");
    gridRect.setAttribute("fill", "url(#grid)");
    svg.appendChild(gridRect);
  }

  function renderStartPositionen(data) {
    let currentIndex = 0;
    const stromValues = [...new Set(data.map((d) => d.Strom))];
    if (stromValues.length > 1) {
      controls.innerHTML = `<label for="strom-select">Stromstärke:</label><select id="strom-select">${stromValues
        .map((s, i) => `<option value="${i}">${s} A</option>`)
        .join("")}</select>`;
      $("#strom-select").on("change", function () {
        currentIndex = parseInt($(this).val());
        drawPoints();
      });
    }
    const drawPoints = () => {
      const row = data[currentIndex];
      const points = [
        { x: parseFloat(row.x_L1), y: parseFloat(row.y_L1), label: "L1" },
        { x: parseFloat(row.x_L2), y: parseFloat(row.y_L2), label: "L2" },
        { x: parseFloat(row.x_L3), y: parseFloat(row.y_L3), label: "L3" },
      ].filter((p) => !isNaN(p.x) && !isNaN(p.y));
      const bounds = getBoundsFromPoints(points, { x: 0, y: 0 });
      setupSVG(100, bounds);
      points.forEach((p) => drawPoint(p.x, p.y, "blue", p.label));
    };
    drawPoints();
  }

  function renderSpielraum(row) {
    const bounds = {
      minX: parseFloat(row["-maxX"]),
      maxX: parseFloat(row["+maxX"]),
      minY: parseFloat(row["-maxY"]),
      maxY: parseFloat(row["+maxY"]),
    };
    setupSVG(50, bounds);
    drawRectangle(
      bounds.minX,
      bounds.minY,
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY,
      "rgba(0, 100, 255, 0.2)"
    );
  }

  function renderBewegungen(data) {
    setupSVG(100, { minX: -50, maxX: 50, minY: -50, maxY: 50 });
    const dirMap = {
      "← Westen": [-1, 0],
      "→ Osten": [1, 0],
      "↑ Norden": [0, 1],
      "↓ Süden": [0, -1],
      "↗ Nordosten": [1, 1],
      "↘ Südosten": [1, -1],
      "↙ Südwesten": [-1, -1],
      "↖ Nordwesten": [-1, 1],
    };
    data.forEach((row) => {
      ["L1", "L2", "L3"].forEach((leiter) => {
        if (row[leiter] && dirMap[row[leiter]]) {
          const [dx, dy] = dirMap[row[leiter]];
          drawArrow(
            0,
            0,
            dx * 50,
            dy * 50,
            leiter === "L1" ? "red" : leiter === "L2" ? "green" : "blue",
            `${row.PosGruppe} ${leiter}`
          );
        }
      });
    });
  }

  function renderSchrittweiten(data) {
    const maxVal = Math.max(
      ...data
        .flatMap((d) => [
          parseFloat(d.Pos1),
          parseFloat(d.Pos2),
          parseFloat(d.Pos3),
        ])
        .filter((v) => !isNaN(v))
    );
    setupSVG(50, { minX: 0, maxX: data.length * 80, minY: 0, maxY: maxVal });
    const barWidth = 20;
    data.forEach((row, index) => {
      const x_base = index * 80 + 10;
      drawRectangle(
        x_base,
        0,
        barWidth,
        parseFloat(row.Pos1),
        "rgba(0,0,255,0.6)"
      );
      drawRectangle(
        x_base + barWidth + 5,
        0,
        barWidth,
        parseFloat(row.Pos2),
        "rgba(255,0,0,0.6)"
      );
      drawRectangle(
        x_base + 2 * (barWidth + 5),
        0,
        barWidth,
        parseFloat(row.Pos3),
        "rgba(0,255,0,0.6)"
      );
      drawText(x_base + 30, -20, `${row.Strom}A`);
    });
  }

  function renderWandlerAbmessungen(data) {
    let currentIndex = 0;
    const stromValues = [...new Set(data.map((d) => d.Strom))];
    if (stromValues.length > 1) {
      controls.innerHTML = `<label for="strom-select">Stromstärke:</label><select id="strom-select">${stromValues
        .map((s, i) => `<option value="${i}">${s} A</option>`)
        .join("")}</select>`;
      $("#strom-select").on("change", function () {
        currentIndex = parseInt($(this).val());
        drawWandler();
      });
    }
    const drawWandler = () => {
      const row = data[currentIndex];
      const w = parseFloat(row.Breite);
      const h = parseFloat(row.Hoehe);
      if (isNaN(w) || isNaN(h)) return;
      const bounds = { minX: -w / 2, maxX: w / 2, minY: -h / 2, maxY: h / 2 };
      setupSVG(50, bounds);
      drawRectangle(bounds.minX, bounds.minY, w, h, "rgba(128, 128, 128, 0.5)");
      drawText(0, 0, `${w} x ${h} mm`);
    };
    drawWandler();
  }

  // --- SVG Hilfsfunktionen ---
  function drawText(x, y, content, size = 12) {
    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", x);
    text.setAttribute("y", -y);
    text.setAttribute("fill", "black");
    text.setAttribute("font-size", `${size}px`);
    text.setAttribute("transform", `scale(1, -1)`);
    text.setAttribute("text-anchor", "middle");
    text.textContent = content;
    const g = document.createElementNS(svgNS, "g");
    g.setAttribute("transform", `scale(1, -1) translate(0, ${2 * y})`);
    g.appendChild(text);
    svg.appendChild(g);
  }

  function drawPoint(x, y, color = "red", label = "") {
    const g = document.createElementNS(svgNS, "g");
    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", -y);
    circle.setAttribute("r", 5);
    circle.setAttribute("fill", color);
    g.appendChild(circle);
    drawText(x + 10, y, label);
    svg.appendChild(g);
  }

  function drawRectangle(x, y, width, height, fill) {
    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", -y - height);
    rect.setAttribute("width", width);
    rect.setAttribute("height", height);
    rect.setAttribute("fill", fill);
    rect.setAttribute("stroke", "black");
    svg.appendChild(rect);
  }

  function drawArrow(x1, y1, x2, y2, color, label) {
    const g = document.createElementNS(svgNS, "g");
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", -y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", -y2);
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", 2);
    line.setAttribute("marker-end", "url(#arrow)");
    g.appendChild(line);
    drawText(x2 + 10, y2, label);
    svg.appendChild(g);
  }

  function getBoundsFromPoints(points, center) {
    const allX = points
      .map((p) => p.x)
      .concat(center.x)
      .filter((v) => !isNaN(v));
    const allY = points
      .map((p) => p.y)
      .concat(center.y)
      .filter((v) => !isNaN(v));
    return {
      minX: Math.min(...allX),
      maxX: Math.max(...allX),
      minY: Math.min(...allY),
      maxY: Math.max(...allY),
    };
  }
});
