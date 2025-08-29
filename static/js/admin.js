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
  let allVisualizationData = null;

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
        // Lade Visualisierungsdaten asynchron
        loadVisualizationData(filename);
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

  // Funktion zum Laden der gesamten Visualisierungsdaten
  function loadVisualizationData(filename) {
    // Prüfe, ob eine Visualisierung relevant ist
    if (
      [
        "1_startpositionen.csv",
        "2_spielraum.csv",
        "3_bewegungen.csv",
        "4_schrittweiten.csv",
        "5_wandler_abmessungen.csv",
      ].includes(filename)
    ) {
      visualizationPanel.show();
      fetch("/data/visualization_data")
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP-Fehler! Status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          allVisualizationData = data;
          if (data.ergebnisse && data.ergebnisse.length > 0) {
            populateStromSelect(data.ergebnisse);
          } else {
            handleNoVisualizationData();
          }
        })
        .catch((error) => {
          console.error("Fehler beim Laden der Visualisierungsdaten:", error);
          handleNoVisualizationData();
          saveStatus.text(`Fehler: ${error.message}`).addClass("error");
        });
    } else {
      // Keine Visualisierung für diese Datei
      visualizationPanel.hide();
    }
  }

  function populateStromSelect(ergebnisse) {
    stromSelect
      .empty()
      .append('<option value="">-- Stromstärke auswählen --</option>');
    const stromstaerken = [...new Set(ergebnisse.map((d) => d.Strom))].sort(
      (a, b) => a - b
    );
    stromstaerken.forEach((strom) => {
      const option = $("<option>").val(strom).text(`${strom}A`);
      stromSelect.append(option);
    });

    stromSelect.off("change").on("change", function () {
      const selectedStrom = $(this).val();
      if (selectedStrom && allVisualizationData) {
        createSimplePreview(selectedStrom, allVisualizationData);
      } else {
        $("#admin-preview-svg").empty();
      }
    });
  }

  function handleNoVisualizationData() {
    stromSelect
      .empty()
      .append('<option value="">-- Keine Daten verfügbar --</option>');
    $("#admin-preview-svg").empty();
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

  // Erstellt die SVG-Visualisierung
  function createSimplePreview(selectedStrom, allData) {
    const svg = d3.select("#admin-preview-svg");
    svg.empty(); // SVG leeren

    const ergebnisse = allData.ergebnisse.filter(
      (d) => d.Strom == selectedStrom
    );
    if (ergebnisse.length === 0) {
      svg
        .append("text")
        .attr("x", 10)
        .attr("y", 20)
        .text("Keine Ergebnisse für diese Stromstärke gefunden.");
      return;
    }

    const grenzen = allData.grenzen;
    const svgWidth = 600;
    const svgHeight = 400;
    const margin = 50;

    const scaleX = d3
      .scaleLinear()
      .domain([grenzen["-maxX"] - 50, grenzen["+maxX"] + 50])
      .range([margin, svgWidth - margin]);
    const scaleY = d3
      .scaleLinear()
      .domain([grenzen["-maxY"] - 50, grenzen["+maxY"] + 50])
      .range([svgHeight - margin, margin]);

    svg.attr("width", svgWidth).attr("height", svgHeight);

    // Titel hinzufügen
    svg
      .append("text")
      .attr("x", svgWidth / 2)
      .attr("y", margin / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text(`Visualisierung für ${selectedStrom}A`);

    // Spielraum-Rechteck
    svg
      .append("rect")
      .attr("x", scaleX(grenzen["-maxX"]))
      .attr("y", scaleY(grenzen["+maxY"]))
      .attr("width", scaleX(grenzen["+maxX"]) - scaleX(grenzen["-maxX"]))
      .attr("height", scaleY(grenzen["-maxY"]) - scaleY(grenzen["+maxY"]))
      .attr("fill", "lightgrey")
      .attr("stroke", "black")
      .attr("stroke-width", 2)
      .attr("opacity", 0.5);

    // Sicherer Spielraum-Rechteck
    const sicherheitsabstand = 20;
    svg
      .append("rect")
      .attr("x", scaleX(grenzen["-maxX"] + sicherheitsabstand))
      .attr("y", scaleY(grenzen["+maxY"] - sicherheitsabstand))
      .attr(
        "width",
        scaleX(grenzen["+maxX"] - sicherheitsabstand) -
          scaleX(grenzen["-maxX"] + sicherheitsabstand)
      )
      .attr(
        "height",
        scaleY(grenzen["-maxY"] + sicherheitsabstand) -
          scaleY(grenzen["+maxY"] - sicherheitsabstand)
      )
      .attr("fill", "none")
      .attr("stroke", "red")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");

    // Datenpunkte (Ergebnisse)
    svg
      .selectAll(".result-point")
      .data(ergebnisse)
      .enter()
      .append("circle")
      .attr(
        "class",
        (d) =>
          `result-point ${d.Kollision === "Kollision" ? "collision" : "ok"}`
      )
      .attr("cx", (d) => scaleX(d.x_res))
      .attr("cy", (d) => scaleY(d.y_res))
      .attr("r", (d) => (d.Kollision === "Kollision" ? 8 : 6))
      .attr("fill", (d) => (d.Kollision === "Kollision" ? "red" : "green"))
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .append("title")
      .text(
        (d) =>
          `Leiter: ${d.Leiter}, Position: ${d.PosGruppe}, Status: ${d.Kollision}`
      );
  }

  loadFileList();
});
