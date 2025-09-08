// static/js/simulation.js
// JavaScript für die neue 5-Schritt-Simulationsseite.

document.addEventListener("DOMContentLoaded", () => {
    const wizard = document.getElementById("simulation-wizard");
    const steps = wizard.querySelectorAll(".step-content");
    const stepIndicators = wizard.querySelectorAll(".step-item");
    const navButtons = wizard.querySelectorAll(".nav-btn");
    const startSimBtn = document.getElementById("start-simulation-btn");

    const csvFiles = [
        "1_startpositionen.csv",
        "2_spielraum.csv",
        "3_bewegungen.csv",
        "4_schrittweiten.csv",
        "5_wandler_abmessungen.csv",
    ];

    let currentStep = 1;

    // --- Wizard Navigation ---
    function showStep(stepNumber) {
        steps.forEach(step => step.classList.remove("active"));
        stepIndicators.forEach(indicator => indicator.classList.remove("active"));

        wizard.querySelector(`.step-content[data-step="${stepNumber}"]`).classList.add("active");
        wizard.querySelector(`.step-item[data-step="${stepNumber}"]`).classList.add("active");
        currentStep = stepNumber;
    }

    navButtons.forEach(button => {
        button.addEventListener("click", () => {
            const targetStep = button.classList.contains("next-btn")
                ? parseInt(button.dataset.next)
                : parseInt(button.dataset.prev);
            showStep(targetStep);
        });
    });

    // --- CSV Table Logic ---
    async function loadCsvData(step) {
        const file = csvFiles[step - 1];
        const tableContainer = document.getElementById(`csv-table-${step}`);
        if (!file || !tableContainer) return;

        try {
            const response = await fetch(`/api/csv-data/${file}`);
            if (!response.ok) throw new Error(`Fehler beim Laden von ${file}`);
            const data = await response.json();
            renderTable(tableContainer, data.headers, data.rows, file);
        } catch (error) {
            tableContainer.innerHTML = `<p class="error">${error.message}</p>`;
        }
    }

    function renderTable(container, headers, rows, filename) {
        if (!rows || rows.length === 0) {
            container.innerHTML = "<p>Keine Daten gefunden.</p>";
            return;
        }

        const table = document.createElement("table");
        table.className = "table table-bordered table-striped";

        // Header
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        headers.forEach(h => {
            const th = document.createElement("th");
            th.textContent = h;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Body
        const tbody = document.createElement("tbody");
        rows.forEach(rowData => {
            const tr = document.createElement("tr");
            headers.forEach(header => {
                const td = document.createElement("td");
                td.textContent = rowData[header];
                td.setAttribute("contenteditable", "true");
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        container.innerHTML = "";
        container.appendChild(table);

        // Make table draggable
        new Sortable(tbody, {
            animation: 150,
            ghostClass: 'blue-background-class'
        });

        // Add save button
        const saveBtn = document.createElement("button");
        saveBtn.textContent = "Änderungen speichern";
        saveBtn.className = "btn-primary";
        saveBtn.style.marginTop = "1rem";
        saveBtn.addEventListener("click", () => saveTableData(container, filename));
        container.appendChild(saveBtn);
    }

    async function saveTableData(container, filename) {
        const table = container.querySelector("table");
        const headers = Array.from(table.querySelectorAll("th")).map(th => th.textContent);
        const rows = Array.from(table.querySelectorAll("tbody tr"));
        const dataToSave = rows.map(row => {
            const cells = Array.from(row.querySelectorAll("td"));
            const rowData = {};
            headers.forEach((header, index) => {
                rowData[header] = cells[index].textContent;
            });
            return rowData;
        });

        try {
            const response = await fetch(`/api/csv-data/${filename}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dataToSave),
            });
            const result = await response.json();
            alert(result.message);
        } catch (error) {
            alert(`Fehler beim Speichern: ${error.message}`);
        }
    }

    // --- Simulation Logic ---
    function updateSimulationProgress() {
        const progressBar = document.getElementById("progress-bar");
        const statusText = document.getElementById("simulation-status-text");

        const interval = setInterval(async () => {
            try {
                const response = await fetch("/simulation_status");
                const data = await response.json();

                progressBar.style.width = `${data.progress}%`;
                progressBar.textContent = `${data.progress}%`;
                statusText.textContent = data.status_text;

                if (!data.running) {
                    clearInterval(interval);
                    startSimBtn.disabled = false;
                }
            } catch (error) {
                statusText.textContent = "Fehler beim Abrufen des Status.";
                clearInterval(interval);
                startSimBtn.disabled = false;
            }
        }, 1000);
    }

    startSimBtn.addEventListener("click", async () => {
        const progressDiv = document.getElementById("simulation-progress");
        const statusText = document.getElementById("simulation-status-text");

        progressDiv.style.display = "block";
        statusText.textContent = "Simulation wird gestartet...";
        startSimBtn.disabled = true;

        try {
            await fetch("/start_new_simulation", { method: "POST" });
            updateSimulationProgress();
        } catch (error) {
            statusText.textContent = `Fehler beim Starten der Simulation: ${error.message}`;
            startSimBtn.disabled = false;
        }
    });


    // --- Initialisierung ---
    function initialize() {
        // Load data for all tables on startup
        for (let i = 1; i <= csvFiles.length; i++) {
            loadCsvData(i);
        }
        showStep(1); // Show the first step
    }

    initialize();
});
