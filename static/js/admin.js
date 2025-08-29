// static/js/admin.js
// JavaScript für die Admin-Oberfläche (CSV-Editor)
$(document).ready(function () {
  const fileList = $("#file-list");
  const currentFileTitle = $("#current-file-title");
  const saveButton = $("#save-button");
  const resetButton = $("#reset-button");
  const saveStatus = $("#save-status");
  const visualizationPanel = $(".visualization-panel");
  const stromSelect = $("#strom-select");

  let currentData = null;
  let currentFilename = null;
  let currentGrid = null;

  // Funktion zum Laden der Dateiliste
  function loadFileList() {
    $.getJSON("/data/files")
      .done(function (files) {
        fileList.empty();
        if (files.length === 0) {
          fileList.append("<li>Keine CSV-Dateien gefunden.</li>");
        } else {
          files.forEach(function (file) {
            const li = $("<li>").text(file);
            li.click(function () {
              loadCsvFile(file);
            });
            fileList.append(li);
          });
        }
      })
      .fail(function () {
        fileList.empty().append("<li>Fehler beim Laden der Dateiliste.</li>");
      });
  }

  // Funktion zum Laden und Anzeigen einer CSV-Datei
  function loadCsvFile(filename) {
    currentFilename = filename;
    $.getJSON(`/data/${filename}`)
      .done(function (response) {
        currentData = response.data;
        currentFileTitle.text(`Bearbeite: ${filename}`);
        saveStatus.text("").removeClass("success error");
        initGrid(currentData);
        handlePreview(filename, currentData);
      })
      .fail(function (jqXHR) {
        const error = jqXHR.responseJSON
          ? jqXHR.responseJSON.error
          : "Unbekannter Fehler.";
        saveStatus
          .text(`Fehler beim Laden der Datei: ${error}`)
          .addClass("error");
      });
  }

  // Initialisiert oder aktualisiert das Datenraster (DataGrid)
  function initGrid(data) {
    if (currentGrid) {
      currentGrid.destroy(); // Zerstöre vorherige Instanz
    }
    $("#csv-table").empty();

    if (data.length === 0) {
      $("#grid-container").html("<p>Die Datei ist leer.</p>");
      return;
    }

    const columns = Object.keys(data[0]).map((key) => ({
      title: key,
      data: key,
      className: key === "Strom" || key === "PosGruppe" ? "uneditable" : "",
      createdCell: function (td, cellData, rowData, row, col) {
        if ($(td).hasClass("uneditable")) {
          $(td).attr("contenteditable", "false");
        } else {
          $(td).attr("contenteditable", "true");
        }
      },
    }));

    currentGrid = $("#csv-table").DataTable({
      data: data,
      columns: columns,
      paging: false,
      searching: false,
      info: false,
      ordering: false,
      createdRow: function (row) {
        $(row).on("input", 'td[contenteditable="true"]', function () {
          const rowIdx = $(this).parent().index();
          const colIdx = $(this).index();
          const header = currentGrid.column(colIdx).header().textContent;
          const newValue = $(this).text();
          currentData[rowIdx][header] = isNaN(newValue)
            ? newValue
            : Number(newValue);
        });
      },
    });
  }

  // Funktion zum Speichern der Daten
  saveButton.click(function () {
    if (!currentData || !currentFilename) {
      saveStatus
        .text("Keine Datei zum Speichern ausgewählt.")
        .addClass("error");
      return;
    }

    $.ajax({
      url: `/data/${currentFilename}`,
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify(currentData),
      success: function (response) {
        saveStatus
          .text(response.message)
          .addClass("success")
          .removeClass("error");
      },
      error: function (jqXHR) {
        const error = jqXHR.responseJSON
          ? jqXHR.responseJSON.error
          : "Unbekannter Fehler.";
        saveStatus.text(`Fehler beim Speichern: ${error}`).addClass("error");
      },
    });
  });

  // Funktion zum Zurücksetzen der Daten
  resetButton.click(function () {
    if (currentFilename) {
      loadCsvFile(currentFilename);
      saveStatus
        .text("Daten wurden zurückgesetzt.")
        .addClass("success")
        .removeClass("error");
    }
  });

  // Funktion für die Vorschau
  function handlePreview(filename, data) {
    $("#admin-preview-svg").empty();
    visualizationPanel.hide();
    stromSelect
      .empty()
      .append('<option value="">-- Stromstärke auswählen --</option>');

    // Zeige Visualisierung nur für relevante Dateien
    if (
      filename.includes("startpositionen.csv") ||
      filename.includes("spielraum.csv") ||
      filename.includes("bewegungen.csv")
    ) {
      visualizationPanel.show();

      // Befülle das Stromstärke-Dropdown
      const stromstaerken = [...new Set(data.map((d) => d.Strom))].sort(
        (a, b) => a - b
      );
      stromstaerken.forEach((strom) => {
        const option = $("<option>").val(strom).text(`${strom}A`);
        stromSelect.append(option);
      });

      // Event-Listener für das Dropdown
      stromSelect.off("change").on("change", function () {
        const selectedStrom = $(this).val();
        if (selectedStrom) {
          const filteredData = data.filter((d) => d.Strom == selectedStrom);
          createSimplePreview(filteredData, filename);
        } else {
          $("#admin-preview-svg").empty();
        }
      });
    }
  }

  function createSimplePreview(data, filename) {
    const svg = d3.select("#admin-preview-svg");
    const svgWidth = 600;
    const svgHeight = 400;
    const margin = 20;

    // Finde die Grenzen für die Skalierung
    let xCoords = data.flatMap((d) => [
      d.X || d.x1_in,
      d.X || d.x2_in,
      d.X || d.x3_in,
      d.x_res,
      d.x_res,
    ]);
    let yCoords = data.flatMap((d) => [
      d.Y || d.y1_in,
      d.Y || d.y2_in,
      d.Y || d.y3_in,
      d.y_res,
      d.y_res,
    ]);

    // Ignoriere leere Werte
    xCoords = xCoords.filter((n) => !isNaN(n));
    yCoords = yCoords.filter((n) => !isNaN(n));

    const minX = d3.min(xCoords) || -100;
    const maxX = d3.max(xCoords) || 100;
    const minY = d3.min(yCoords) || -100;
    const maxY = d3.max(yCoords) || 100;

    const scaleX = d3
      .scaleLinear()
      .domain([minX - margin, maxX + margin])
      .range([0, svgWidth]);
    const scaleY = d3
      .scaleLinear()
      .domain([minY - margin, maxY + margin])
      .range([svgHeight, 0]);

    svg.attr("width", svgWidth).attr("height", svgHeight);
    svg.empty(); // SVG leeren

    // Achsen hinzufügen
    const xAxis = d3.axisBottom(scaleX);
    const yAxis = d3.axisLeft(scaleY);

    svg
      .append("g")
      .attr("transform", `translate(0, ${svgHeight - margin})`)
      .call(xAxis);

    svg.append("g").attr("transform", `translate(${margin}, 0)`).call(yAxis);

    // Titel hinzufügen
    svg
      .append("text")
      .attr("x", svgWidth / 2)
      .attr("y", margin / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text(`Vorschau: ${filename} (Strom: ${data[0].Strom || "N/A"}A)`);

    // Datenpunkte zeichnen
    const points = data.filter((d) => d.x_res != null && d.y_res != null);
    svg
      .selectAll(".point")
      .data(points)
      .enter()
      .append("circle")
      .attr("class", "point")
      .attr("cx", (d) => scaleX(d.x_res))
      .attr("cy", (d) => scaleY(d.y_res))
      .attr("r", 5)
      .attr("fill", "blue")
      .append("title")
      .text((d) => `Leiter: ${d.Leiter}, X: ${d.x_res}, Y: ${d.y_res}`);
  }

  loadFileList();
});
