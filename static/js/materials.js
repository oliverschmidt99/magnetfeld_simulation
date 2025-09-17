// static/js/materials.js

let bhChart = null; // Globale Chart-Instanz
let currentEditingMaterial = null;

function initializeMaterialEditor(library) {
  document
    .getElementById("add-new-material-btn")
    .addEventListener("click", () => openMaterialEditor());
  document
    .getElementById("add-bh-point-btn")
    .addEventListener("click", () => addBHPointRow());
  document
    .getElementById("cancel-material-edit-btn")
    .addEventListener("click", () => {
      document.getElementById("material-editor-modal").style.display = "none";
    });
  document
    .getElementById("save-material-btn")
    .addEventListener("click", saveMaterial);
  document
    .getElementById("delete-material-btn")
    .addEventListener("click", deleteMaterial);
  document
    .getElementById("material-is-nonlinear")
    .addEventListener("change", toggleBHCurveInputs);

  renderMaterialList(library.materials || []);
}

function renderMaterialList(materials) {
  const container = document.getElementById("material-list");
  container.innerHTML = "";

  const table = document.createElement("table");
  table.className = "summary-table";
  table.innerHTML = `
        <thead>
            <tr>
                <th>Name</th>
                <th>Typ</th>
                <th>Aktion</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;
  const tbody = table.querySelector("tbody");
  materials.forEach((mat) => {
    const row = tbody.insertRow();
    row.innerHTML = `
            <td>${mat.name}</td>
            <td>${mat.is_nonlinear ? "Nichtlinear (B-H Kurve)" : "Linear"}</td>
            <td><button class="button secondary edit-material-btn">Bearbeiten</button></td>
        `;
    row
      .querySelector(".edit-material-btn")
      .addEventListener("click", () => openMaterialEditor(mat));
  });

  container.appendChild(table);
}

function openMaterialEditor(material = null) {
  currentEditingMaterial = material;
  const modal = document.getElementById("material-editor-modal");
  const title = document.getElementById("material-editor-title");
  const nameInput = document.getElementById("material-name");
  const murInput = document.getElementById("material-mur");
  const isNonlinearCheckbox = document.getElementById("material-is-nonlinear");
  const tableBody = document.querySelector("#bh-curve-table tbody");
  tableBody.innerHTML = "";

  if (material) {
    title.textContent = `Material bearbeiten: ${material.name}`;
    nameInput.value = material.name;
    nameInput.disabled = true;
    murInput.value = material.mu_x || 1;
    isNonlinearCheckbox.checked = material.is_nonlinear || false;
    (material.bh_curve || []).forEach((point) =>
      addBHPointRow(point[0], point[1])
    );
  } else {
    title.textContent = "Neues Material erstellen";
    nameInput.value = "";
    nameInput.disabled = false;
    murInput.value = "2500";
    isNonlinearCheckbox.checked = false;
    addBHPointRow(0, 0);
  }

  document.getElementById("delete-material-btn").style.display = material
    ? "inline-block"
    : "none";

  toggleBHCurveInputs();
  updateBHChart();
  modal.style.display = "flex";
}

function toggleBHCurveInputs() {
  const isNonlinear = document.getElementById("material-is-nonlinear").checked;
  document.getElementById("nonlinear-bh-group").style.display = isNonlinear
    ? "block"
    : "none";
  document.getElementById("linear-mu-group").style.display = isNonlinear
    ? "none"
    : "block";
  updateBHChart();
}

function addBHPointRow(b = "", h = "") {
  const tableBody = document.querySelector("#bh-curve-table tbody");
  const row = tableBody.insertRow();
  row.innerHTML = `
        <td><input type="number" class="bh-b" value="${b}" step="0.1"></td>
        <td><input type="number" class="bh-h" value="${h}" step="10"></td>
        <td><button type="button" class="button danger remove-bh-point-btn">&times;</button></td>
    `;
  row.querySelector(".remove-bh-point-btn").addEventListener("click", () => {
    row.remove();
    updateBHChart();
  });
  row
    .querySelectorAll("input")
    .forEach((input) =>
      input.addEventListener("input", debounce(updateBHChart, 300))
    );
}

function updateBHChart() {
  const isNonlinear = document.getElementById("material-is-nonlinear").checked;
  const ctx = document.getElementById("bh-curve-chart").getContext("2d");

  if (bhChart) {
    bhChart.destroy();
  }

  if (!isNonlinear) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "#6c757d";
    ctx.textAlign = "center";
    ctx.fillText(
      "Lineares Material, keine Kurve.",
      ctx.canvas.width / 2,
      ctx.canvas.height / 2
    );
    return;
  }

  const tableRows = document.querySelectorAll("#bh-curve-table tbody tr");
  const dataPoints = Array.from(tableRows)
    .map((row) => ({
      x: parseFloat(row.querySelector(".bh-h").value) || 0,
      y: parseFloat(row.querySelector(".bh-b").value) || 0,
    }))
    .sort((a, b) => a.x - b.x);

  bhChart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: "B-H Kurve",
          data: dataPoints,
          borderColor: "#0d6efd",
          fill: false, // Geändert: keine Füllung
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: "Magnetische Feldstärke H (A/m)" } },
        y: { title: { display: true, text: "Magnetische Flussdichte B (T)" } },
      },
    },
  });
}

function gatherMaterialData() {
  const isNonlinear = document.getElementById("material-is-nonlinear").checked;
  const bh_curve = isNonlinear
    ? Array.from(document.querySelectorAll("#bh-curve-table tbody tr")).map(
        (row) => [
          parseFloat(row.querySelector(".bh-b").value) || 0,
          parseFloat(row.querySelector(".bh-h").value) || 0,
        ]
      )
    : [];

  return {
    name: document.getElementById("material-name").value,
    is_nonlinear: isNonlinear,
    mu_x: parseFloat(document.getElementById("material-mur").value) || 1,
    mu_y: parseFloat(document.getElementById("material-mur").value) || 1,
    bh_curve: bh_curve,
  };
}

async function saveMaterial() {
  const materialData = gatherMaterialData();
  if (!materialData.name) {
    alert("Bitte einen Materialnamen angeben.");
    return;
  }

  const response = await fetch("/api/library", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "save_material",
      material: materialData,
      originalName: currentEditingMaterial ? currentEditingMaterial.name : null,
    }),
  });

  const result = await response.json();
  alert(result.message);
  if (response.ok) {
    document.getElementById("material-editor-modal").style.display = "none";
    const libResponse = await fetch("/api/library");
    libraryData = await libResponse.json(); // Globale Variable aktualisieren
    renderMaterialList(libraryData.materials || []);
  }
}

async function deleteMaterial() {
  if (
    !currentEditingMaterial ||
    !confirm(
      `Soll das Material "${currentEditingMaterial.name}" wirklich gelöscht werden?`
    )
  ) {
    return;
  }

  const response = await fetch("/api/library", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "delete_material",
      originalName: currentEditingMaterial.name,
    }),
  });

  const result = await response.json();
  alert(result.message);
  if (response.ok) {
    document.getElementById("material-editor-modal").style.display = "none";
    const libResponse = await fetch("/api/library");
    libraryData = await libResponse.json(); // Globale Variable aktualisieren
    renderMaterialList(libraryData.materials || []);
  }
}

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}
