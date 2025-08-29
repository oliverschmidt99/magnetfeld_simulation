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

    $.getJSON(`/data/${filename}`, function (data) {
      originalData = JSON.parse(JSON.stringify(data));
      currentPreviewType = filename.replace(/\d+_|.csv/g, "");

      initDataTable(data);
      renderVisualization(currentPreviewType, data);

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
    // Korrektur: Überprüfe, ob das Daten-Array leer ist, bevor du auf data[0] zugreifst
    if (!data || data.length === 0) {
      $("#grid-container").html("<p>Keine Daten in dieser Datei gefunden.</p>");
      return;
    }

    const allKeys = Object.keys(data[0]);
    const specialColumns = ["ID", "Strom"];
    let columns = [];

    specialColumns.forEach((key) => {
      if (allKeys.includes(key)) {
        columns.push({
          title: key,
          data: key,
        });
      }
    });

    allKeys.forEach((key) => {
      if (!specialColumns.includes(key)) {
        columns.push({
          title: key,
          data: key,
        });
      }
    });

    table = $("#csv-table").DataTable({
      data: data,
      columns: columns,
      paging: false,
      scrollY: "400px",
      scrollCollapse: true,
      scrollX: true,
      initComplete: function () {
        $("#csv-table tbody").on("change", "input", function () {
          const rowData = table.rows().data().toArray();
          renderVisualization(currentPreviewType, rowData);
        });
      },
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
    originalData = JSON.parse(JSON.stringify(dataToSave));

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
  function clearVisualization() {
    svg.innerHTML = "";
    controls.empty();
  }

  function renderVisualization(type, data) {
    clearVisualization();
    if (!data || data.length === 0) return;
    switch (type) {
      case "startpositionen":
      case "schrittweiten":
      case "wandler_abmessungen":
        renderByStrom(type, data);
        break;
      case "spielraum":
        if (data.length > 0) renderSpielraum(data[0]);
        break;
      case "bewegungen":
        renderBewegungen(data);
        break;
    }
  }

  function renderByStrom(type, data) {
    let currentIndex = 0;
    const stromValues = [...new Set(data.map((d) => d.Strom))].filter(Boolean);

    if (stromValues.length > 1) {
      controls.html(
        `<label for="strom-select">Stromstärke:</label><select id="strom-select">${stromValues
          .map((s, i) => `<option value="${i}">${s} A</option>`)
          .join("")}</select>`
      );
      $("#strom-select").on("change", function () {
        currentIndex = parseInt($(this).val());
        drawCurrentVisualization();
      });
    }

    const drawCurrentVisualization = () => {
      const row = data.find((d) => d.Strom === stromValues[currentIndex]);
      if (!row) return;

      switch (type) {
        case "startpositionen":
          drawStartPositionen(row);
          break;
        case "schrittweiten":
          drawSchrittweiten(row);
          break;
        case "wandler_abmessungen":
          drawWandlerAbmessungen(row);
          break;
      }
    };
    drawCurrentVisualization();
  }

  function renderBewegungen(data) {
    const groups = [...new Set(data.map((d) => d.PosGruppe))].filter(Boolean);
    controls.html(
      groups
        .map(
          (group, i) =>
            `<label class="checkbox-item"><input type="checkbox" value="${group}" checked><span>${group}</span></label>`
        )
        .join("")
    );

    const drawMovements = () => {
      const activeGroups = controls
        .find("input:checked")
        .map((_, el) => $(el).val())
        .get();
      setupSVG(100, { minX: -150, maxX: 150, minY: -150, maxY: 150 });
      data
        .filter((row) => activeGroups.includes(row.PosGruppe))
        .forEach((row) => {
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
          ["L1", "L2", "L3"].forEach((leiter) => {
            const direction = String(row[leiter]).trim();
            if (direction && dirMap[direction]) {
              const [dx, dy] = dirMap[direction];
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
    };

    controls.find("input").on("change", drawMovements);
    drawMovements();
  }

  function drawStartPositionen(row) {
    const points = [
      { x: parseFloat(row.x_L1), y: parseFloat(row.y_L1), label: "L1" },
      { x: parseFloat(row.x_L2), y: parseFloat(row.y_L2), label: "L2" },
      { x: parseFloat(row.x_L3), y: parseFloat(row.y_L3), label: "L3" },
    ].filter((p) => !isNaN(p.x) && !isNaN(p.y));
    const bounds = getBoundsFromPoints(points, { x: 0, y: 0 });
    setupSVG(100, bounds);
    points.forEach((p) => drawPoint(p.x, p.y, "blue", p.label));
  }

  function renderSpielraum(row) {
    const bounds = {
      minX: parseFloat(row["-maxX"]) || 0,
      maxX: parseFloat(row["+maxX"]) || 0,
      minY: parseFloat(row["-maxY"]) || 0,
      maxY: parseFloat(row["+maxY"]) || 0,
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

  function drawSchrittweiten(row) {
    const maxVal = Math.max(
      ...Object.keys(row)
        .filter((key) => key.startsWith("Pos"))
        .map((key) => parseFloat(row[key]))
        .filter((v) => !isNaN(v))
    );
    const posKeys = Object.keys(row).filter((key) => key.startsWith("Pos"));
    const numBars = posKeys.length;
    setupSVG(50, {
      minX: 0,
      maxX: numBars * 80,
      minY: 0,
      maxY: maxVal + 20,
    });
    const barWidth = 20;
    posKeys.forEach((key, index) => {
      const x_base = index * 80 + 10;
      const height = parseFloat(row[key]) || 0;
      drawRectangle(
        x_base,
        0,
        barWidth,
        height,
        `rgba(${(index * 50) % 255}, ${(index * 100) % 255}, 200, 0.6)`
      );
      drawText(x_base + barWidth / 2, height / 2, `${height}`);
      drawText(x_base + barWidth / 2, -10, key);
    });
  }

  function drawWandlerAbmessungen(row) {
    const w = parseFloat(row.Breite) || 0;
    const h = parseFloat(row.Hoehe) || 0;
    const bounds = { minX: -w / 2, maxX: w / 2, minY: -h / 2, maxY: h / 2 };
    setupSVG(50, bounds);
    drawRectangle(bounds.minX, bounds.minY, w, h, "rgba(128, 128, 128, 0.5)");
    drawText(0, 0, `${w} x ${h} mm`);
  }

  // --- SVG Hilfsfunktionen ---
  function setupSVG(padding = 50, dataBounds = null) {
    svg.innerHTML = "";
    const minX = !isNaN(dataBounds?.minX) ? dataBounds.minX : -250;
    const maxX = !isNaN(dataBounds?.maxX) ? dataBounds.maxX : 250;
    const minY = !isNaN(dataBounds?.minY) ? dataBounds.minY : -250;
    const maxY = !isNaN(dataBounds?.maxY) ? dataBounds.maxY : 250;
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
