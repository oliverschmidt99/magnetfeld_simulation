document.addEventListener("DOMContentLoaded", () => {
  const fileList = document.getElementById("file-list");
  const gridContainer = document.getElementById("grid-container");
  const currentFileTitle = document.getElementById("current-file-title");
  const saveButton = document.getElementById("save-button");
  const saveStatus = document.getElementById("save-status");
  const tabs = document.querySelectorAll(".admin-tab-button");
  const tabContents = document.querySelectorAll(".admin-tab-content");
  const rawTextarea = document.getElementById("raw-csv-textarea");

  let gridApi;
  let currentFileName = null;

  // Initialisiert oder aktualisiert die AG Grid Tabelle
  const initGrid = (data) => {
    if (gridApi) {
      gridApi.destroy();
    }
    if (!data || data.length === 0) {
      gridContainer.innerHTML = "<p>Keine Daten in dieser Datei gefunden.</p>";
      return;
    }

    const columnDefs = Object.keys(data[0]).map((key) => ({
      field: key,
      editable: true,
      filter: true,
      floatingFilter: true,
    }));

    const gridOptions = {
      rowData: data,
      columnDefs: columnDefs,
      defaultColDef: {
        resizable: true,
        sortable: true,
        flex: 1, // Spalten füllen den verfügbaren Platz
        minWidth: 100,
      },
      domLayout: "autoHeight",
      // KORREKTUR: Passt die Spaltengröße automatisch an den Inhalt an
      onGridReady: (params) => {
        params.api.autoSizeAllColumns();
      },
    };

    gridContainer.innerHTML = "";
    gridApi = agGrid.createGrid(gridContainer, gridOptions);
  };

  // Lädt und zeigt eine ausgewählte CSV-Datei an
  const loadFile = async (filename) => {
    currentFileName = filename;
    currentFileTitle.textContent = filename;
    saveButton.disabled = false;

    try {
      const response = await fetch(`/data/${filename}`);
      const data = await response.json();

      initGrid(data);

      if (data.length > 0) {
        const header = Object.keys(data[0]).join(",");
        const rows = data.map((row) => Object.values(row).join(","));
        rawTextarea.value = [header, ...rows].join("\n");
      } else {
        rawTextarea.value = "";
      }
    } catch (error) {
      console.error("Fehler beim Laden der Datei:", error);
      gridContainer.innerHTML = `<p style="color:red;">Fehler beim Laden von ${filename}.</p>`;
    }
  };

  // Speichert die aktuellen Daten aus der Tabelle
  const saveFile = async () => {
    if (!gridApi || !currentFileName) return;

    const rowData = [];
    gridApi.forEachNode((node) => rowData.push(node.data));

    saveStatus.textContent = "Speichern...";
    saveStatus.style.color = "orange";

    try {
      const response = await fetch(`/data/${currentFileName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rowData),
      });
      const result = await response.json();

      if (result.status === "success") {
        saveStatus.textContent = "Erfolgreich gespeichert!";
        saveStatus.style.color = "green";
      } else {
        throw new Error(result.error || "Unbekannter Fehler");
      }
    } catch (error) {
      saveStatus.textContent = `Fehler: ${error.message}`;
      saveStatus.style.color = "red";
    }
    setTimeout(() => (saveStatus.textContent = ""), 3000);
  };

  // Lade die Dateiliste beim Start
  fetch("/data/files")
    .then((response) => response.json())
    .then((files) => {
      fileList.innerHTML = "";
      files.forEach((file) => {
        const li = document.createElement("li");
        li.textContent = `📄 ${file}`;
        li.dataset.filename = file;
        fileList.appendChild(li);
      });
    });

  // Event Listeners
  fileList.addEventListener("click", (e) => {
    if (e.target.tagName === "LI") {
      loadFile(e.target.dataset.filename);
    }
  });

  saveButton.addEventListener("click", saveFile);
  saveButton.disabled = true;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      tabContents.forEach((content) => content.classList.remove("active"));
      document.getElementById(tab.dataset.tab).classList.add("active");
    });
  });
});
