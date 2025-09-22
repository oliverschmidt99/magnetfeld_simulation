// static/js/materials.js

let bhChart = null;
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
    .getElementById("material-bh-type")
    .addEventListener("change", toggleBHCurveInputs);
  document
    .getElementById("material-lamination-type")
    .addEventListener("change", toggleLaminationInputs);

  // Event Listeners für den neuen FEMM-Import-Modal
  document
    .getElementById("import-femm-material-btn")
    .addEventListener("click", openFemmImportModal);
  document
    .getElementById("cancel-femm-import-btn")
    .addEventListener("click", () => {
      document.getElementById("femm-import-modal").style.display = "none";
    });
  document
    .getElementById("femm-material-search")
    .addEventListener("input", filterFemmMaterialList);

  renderMaterialList(library.materials || []);
}

// --- FEMM Material Import ---

async function openFemmImportModal() {
  const modal = document.getElementById("femm-import-modal");
  const container = document.getElementById("femm-material-list-container");
  container.innerHTML = "<p>Lade Materialliste aus FEMM...</p>";
  document.getElementById("femm-material-search").value = "";
  modal.style.display = "flex";

  try {
    const response = await fetch("/api/femm_materials");
    if (!response.ok) {
      const err = await response.json();
      throw new Error(
        err.error || "FEMM-Materialien konnten nicht geladen werden."
      );
    }

    const structuredMaterials = await response.json();

    container.innerHTML = "";

    structuredMaterials.forEach((group) => {
      const details = document.createElement("details");
      details.className = "accordion-item";

      const summary = document.createElement("summary");
      summary.className = "accordion-button";
      summary.textContent = group.folder;

      const materialList = document.createElement("ul");
      materialList.className = "femm-material-list";

      group.materials.forEach((mat) => {
        const fullMaterialName =
          group.folder === "Uncategorized" ? mat : `${group.folder}\\${mat}`;
        const listItem = document.createElement("li");
        listItem.textContent = mat;
        listItem.dataset.materialName = fullMaterialName;
        listItem.addEventListener("click", () =>
          importFemmMaterial(fullMaterialName)
        );
        materialList.appendChild(listItem);
      });

      details.appendChild(summary);
      details.appendChild(materialList);
      container.appendChild(details);
    });
  } catch (error) {
    container.innerHTML = `<p style="color:red;">Fehler: ${error.message}</p>`;
  }
}

function filterFemmMaterialList(event) {
  const filter = event.target.value.toLowerCase();
  const allFolders = document.querySelectorAll(
    "#femm-material-list-container .accordion-item"
  );

  allFolders.forEach((folder) => {
    const items = folder.querySelectorAll("li");
    let folderHasVisibleItems = false;

    items.forEach((item) => {
      const text = item.textContent.toLowerCase();
      const isVisible = text.includes(filter);
      item.style.display = isVisible ? "" : "none";
      if (isVisible) {
        folderHasVisibleItems = true;
      }
    });

    folder.style.display = folderHasVisibleItems ? "" : "none";
    if (folderHasVisibleItems && filter) {
      folder.open = true;
    } else if (!filter) {
      folder.open = false;
    }
  });
}

async function importFemmMaterial(materialName) {
  const importModal = document.getElementById("femm-import-modal");
  importModal.style.display = "none";

  const editorModal = document.getElementById("material-editor-modal");
  editorModal.style.display = "flex";

  document.getElementById(
    "material-editor-title"
  ).textContent = `Importiere ${materialName}...`;

  try {
    const response = await fetch(
      `/api/femm_material_details/${encodeURIComponent(materialName)}`
    );
    if (!response.ok) {
      const err = await response.json();
      throw new Error(
        err.error || "Material-Details konnten nicht geladen werden."
      );
    }

    const props = await response.json();

    openMaterialEditor();
    document.getElementById(
      "material-editor-title"
    ).textContent = `Material importieren: ${props.name || materialName}`;

    document.getElementById("material-name").value = props.name || materialName;
    document.getElementById("material-name").disabled = false;
    document.getElementById("material-bh-type").value = props.is_nonlinear
      ? "nonlinear"
      : "linear";
    document.getElementById("material-mur-x").value = props.mu_x || 1;
    document.getElementById("material-mur-y").value = props.mu_y || 1;
    document.getElementById("material-hc").value = props.hc || 0;
    document.getElementById("material-sigma").value = props.sigma || 0;

    const tableBody = document.querySelector("#bh-curve-table tbody");
    tableBody.innerHTML = "";
    if (props.is_nonlinear && props.bh_curve && props.bh_curve.length > 0) {
      props.bh_curve.forEach((p) => addBHPointRow(p[0], p[1]));
    } else {
      addBHPointRow(0, 0);
    }

    toggleBHCurveInputs();
    updateBHChart();
  } catch (error) {
    alert(`Fehler beim Importieren von ${materialName}: ${error.message}`);
    document.getElementById("material-editor-modal").style.display = "none";
  }
}

// --- Standard Material Editor Funktionen ---

function renderMaterialList(materials) {
  const container = document.getElementById("material-list");
  container.innerHTML = "";
  if (!materials) return;

  const table = document.createElement("table");
  table.className = "summary-table";
  table.innerHTML = `<thead><tr><th>Name</th><th>Typ</th><th>Aktion</th></tr></thead><tbody></tbody>`;
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
  const bhTypeSelect = document.getElementById("material-bh-type");
  const tableBody = document.querySelector("#bh-curve-table tbody");
  tableBody.innerHTML = "";

  if (material) {
    title.textContent = `Material bearbeiten: ${material.name}`;
    nameInput.value = material.name;
    nameInput.disabled = true;
    bhTypeSelect.value = material.is_nonlinear ? "nonlinear" : "linear";
    document.getElementById("material-mur-x").value = material.mu_x || 1;
    document.getElementById("material-mur-y").value = material.mu_y || 1;
    document.getElementById("material-hc").value = material.hc || 0;
    document.getElementById("material-sigma").value = material.sigma || 0;
    document.getElementById("material-j").value = material.j || 0;
    document.getElementById("material-lamination-type").value =
      material.lamination_type || 0;
    document.getElementById("material-lam-thickness").value =
      material.lam_thickness || 0;
    document.getElementById("material-lam-fill").value =
      material.lam_fill_factor || 1;

    (material.bh_curve || []).forEach((point) =>
      addBHPointRow(point[0], point[1])
    );
    if ((material.bh_curve || []).length === 0) addBHPointRow(0, 0);
  } else {
    title.textContent = "Neues Material erstellen";
    nameInput.value = "";
    nameInput.disabled = false;
    bhTypeSelect.value = "linear";
    document.getElementById("material-mur-x").value = "2500";
    document.getElementById("material-mur-y").value = "2500";
    document.getElementById("material-hc").value = "0";
    document.getElementById("material-sigma").value = "0";
    document.getElementById("material-j").value = "0";
    document.getElementById("material-lamination-type").value = "0";
    document.getElementById("material-lam-thickness").value = "0";
    document.getElementById("material-lam-fill").value = "1";
    addBHPointRow(0, 0);
  }

  document.getElementById("delete-material-btn").style.display = material
    ? "inline-block"
    : "none";

  toggleBHCurveInputs();
  toggleLaminationInputs();
  updateBHChart();
  modal.style.display = "flex";
}

function toggleBHCurveInputs() {
  const isNonlinear =
    document.getElementById("material-bh-type").value === "nonlinear";
  const nonlinearSection = document.getElementById(
    "nonlinear-properties-section"
  );
  const linearSection = document.getElementById("linear-properties-section");

  if (isNonlinear) {
    nonlinearSection.style.display = "block";
    nonlinearSection.open = true;
    linearSection.style.display = "none";
  } else {
    nonlinearSection.style.display = "none";
    nonlinearSection.open = false;
    linearSection.style.display = "block";
  }

  updateBHChart();
}

function toggleLaminationInputs() {
  const lamType = document.getElementById("material-lamination-type").value;
  const laminationFields = document.getElementById("lamination-fields");
  if (parseInt(lamType) > 0 && parseInt(lamType) < 4) {
    laminationFields.style.display = "flex";
  } else {
    laminationFields.style.display = "none";
  }
}

function addBHPointRow(b = "", h = "") {
  const tableBody = document.querySelector("#bh-curve-table tbody");
  const row = tableBody.insertRow();
  row.innerHTML = `
        <td><input type="number" class="bh-b" value="${b}" step="any"></td>
        <td><input type="number" class="bh-h" value="${h}" step="any"></td>
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
  const isNonlinear =
    document.getElementById("material-bh-type").value === "nonlinear";
  const ctx = document.getElementById("bh-curve-chart").getContext("2d");

  if (bhChart) bhChart.destroy();

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
    type: "scatter",
    data: {
      datasets: [
        {
          label: "B-H Kurve",
          data: dataPoints,
          borderColor: "#0d6efd",
          backgroundColor: "#0d6efd",
          showLine: true,
          tension: 0.2,
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
  const isNonlinear =
    document.getElementById("material-bh-type").value === "nonlinear";
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
    mu_x: parseFloat(document.getElementById("material-mur-x").value) || 1,
    mu_y: parseFloat(document.getElementById("material-mur-y").value) || 1,
    hc: parseFloat(document.getElementById("material-hc").value) || 0,
    sigma: parseFloat(document.getElementById("material-sigma").value) || 0,
    j: parseFloat(document.getElementById("material-j").value) || 0,
    lamination_type:
      parseInt(document.getElementById("material-lamination-type").value) || 0,
    lam_thickness:
      parseFloat(document.getElementById("material-lam-thickness").value) || 0,
    lam_fill_factor:
      parseFloat(document.getElementById("material-lam-fill").value) || 1,
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
    libraryData = await libResponse.json();
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
    libraryData = await libResponse.json();
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
