document.addEventListener("DOMContentLoaded", function () {
  const fileSelect = document.getElementById("csv-file-select");
  const gridContainer = document.getElementById("csv-grid-container");
  const bewegungenContainer = document.getElementById(
    "bewegungen-editor-container"
  );
  const saveButton = document.getElementById("save-csv-button");
  const gridDiv = document.getElementById("csv-grid");
  const bewegungenTableBody = document.querySelector("#bewegungen-table tbody");
  let gridApi;

  function initializePage() {
    fetch("/api/csv-files")
      .then((response) => response.json())
      .then((files) => {
        const bewegungenOption = fileSelect.querySelector(
          'option[value="3_bewegungen.csv"]'
        );
        files.forEach((file) => {
          const option = document.createElement("option");
          option.value = file;
          option.textContent = file;
          fileSelect.insertBefore(option, bewegungenOption);
        });
      })
      .catch((error) =>
        console.error("Fehler beim Laden der CSV-Dateiliste:", error)
      );
  }

  function hideAllEditors() {
    gridContainer.style.display = "none";
    bewegungenContainer.style.display = "none";
    saveButton.style.display = "none";
    if (gridApi) {
      gridApi.destroy();
      gridApi = null;
    }
  }

  function displayStandardGrid(filename) {
    hideAllEditors();
    gridContainer.style.display = "block";
    saveButton.style.display = "block";
    fetch(`/api/csv-data/${filename}`)
      .then((response) => response.json())
      .then((data) => {
        const columnDefs = data.headers.map((header) => {
          const colDef = {
            field: header,
            headerName: header.charAt(0).toUpperCase() + header.slice(1),
          };
          if (header.toLowerCase() === "id") {
            colDef.editable = false;
            colDef.cellStyle = {
              "background-color": "#f0f0f0",
              "font-weight": "bold",
            };
          }
          return colDef;
        });
        const gridOptions = {
          columnDefs: columnDefs,
          rowData: data.rows,
          defaultColDef: {
            editable: true,
            filter: true,
            floatingFilter: true,
            resizable: true,
            sortable: true,
          },
          domLayout: "autoHeight",
        };
        gridApi = agGrid.createGrid(gridDiv, gridOptions);
      })
      .catch((error) =>
        console.error(`Fehler beim Laden der Daten für ${filename}:`, error)
      );
  }

  function displayBewegungenEditor() {
    hideAllEditors();
    bewegungenContainer.style.display = "block";
    saveButton.style.display = "block";
    fetch("/api/bewegungen-data")
      .then((response) => response.json())
      .then((data) => {
        bewegungenTableBody.innerHTML = "";
        const options = data.options;
        data.rows.forEach((row) => {
          const tr = document.createElement("tr");
          ["L1", "L2", "L3"].forEach((colName) => {
            const td = document.createElement("td");
            const select = document.createElement("select");
            select.className = "form-control";
            select.innerHTML = '<option value=""></option>';
            options.forEach((opt) => {
              const option = document.createElement("option");
              option.value = opt;
              option.textContent = opt;
              if (opt === row[colName]) {
                option.selected = true;
              }
              select.appendChild(option);
            });
            td.appendChild(select);
            tr.appendChild(td);
          });
          const posTd = document.createElement("td");
          posTd.textContent = row.PosGruppe;
          posTd.style.backgroundColor = "#f0f0f0";
          tr.appendChild(posTd);
          bewegungenTableBody.appendChild(tr);
        });
      })
      .catch((error) =>
        console.error("Fehler beim Laden der Bewegungsdaten:", error)
      );
  }

  function saveStandardCsvData(filename) {
    if (!gridApi) return;
    const rowData = [];
    gridApi.forEachNode((node) => rowData.push(node.data));
    fetch(`/api/csv-data/${filename}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rowData),
    })
      .then((response) => response.json())
      .then((result) => alert(result.message))
      .catch((error) =>
        console.error("Fehler beim Speichern der CSV-Daten:", error)
      );
  }

  function saveBewegungenData() {
    const rows = bewegungenTableBody.querySelectorAll("tr");
    const dataToSave = [];
    rows.forEach((tr) => {
      const selects = tr.querySelectorAll("select");
      const posGruppe = tr.querySelector("td:last-child").textContent;
      dataToSave.push({
        L1: selects[0].value,
        L2: selects[1].value,
        L3: selects[2].value,
        PosGruppe: posGruppe,
      });
    });
    fetch("/api/bewegungen-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataToSave),
    })
      .then((response) => response.json())
      .then((result) => alert(result.message))
      .catch((error) =>
        console.error("Fehler beim Speichern der Bewegungsdaten:", error)
      );
  }

  fileSelect.addEventListener("change", function () {
    const selectedFile = this.value;
    if (!selectedFile) {
      hideAllEditors();
      return;
    }
    if (selectedFile === "3_bewegungen.csv") {
      displayBewegungenEditor();
    } else {
      displayStandardGrid(selectedFile);
    }
  });

  saveButton.addEventListener("click", function () {
    const selectedFile = fileSelect.value;
    if (!selectedFile) return;
    if (selectedFile === "3_bewegungen.csv") {
      saveBewegungenData();
    } else {
      saveStandardCsvData(selectedFile);
    }
  });

  initializePage();
});
