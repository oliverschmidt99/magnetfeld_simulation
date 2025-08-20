document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("bauteile-nav")) {
    initializeBauteilEditor();
  }
});

let localLibrary = {}; // Lokale Kopie der Bibliothek

const PREDEFINED_TAGS = {
  manufacturer: {
    "310_CELSA": "#BF8F00",
    "320_MBS": "#548235",
    "330_Ritz": "#C65911",
    "340_Redur": "#305496",
  },
  current: [
    "600 A",
    "800 A",
    "1000 A",
    "1250 A",
    "1600 A",
    "2000 A",
    "2500 A",
    "3200 A",
    "4000 A",
    "5000 A",
  ],
};

function initializeBauteilEditor() {
  const libraryDataElement = document.getElementById("library-data");
  localLibrary = libraryDataElement
    ? JSON.parse(libraryDataElement.textContent)
    : {};

  // Ruft jetzt die globale Funktion aus main.js auf
  initializeCardNavigation("bauteile-nav", "bauteil-sections");

  const railForm = document.getElementById("rail-form");
  if (railForm) {
    railForm.addEventListener("submit", handleSaveComponent);
    document.getElementById("rail-clear-btn").addEventListener("click", () => {
      clearRailForm();
    });
    document
      .getElementById("rail-width")
      .addEventListener("input", () =>
        renderComponentPreview(gatherRailFormData(), "rail-preview-svg")
      );
    document
      .getElementById("rail-height")
      .addEventListener("input", () =>
        renderComponentPreview(gatherRailFormData(), "rail-preview-svg")
      );
  }

  renderTagSelectors();
  renderComponentLists();
  renderComponentPreview({ width: 40, height: 10 }, "rail-preview-svg");
}

function renderComponentLists() {
  const railsList = document.getElementById("rails-list");
  if (!railsList) return;

  railsList.innerHTML = "<h3>Vorhandene Stromschienen</h3>";

  (localLibrary.copperRails || []).forEach((rail, index) => {
    const card = document.createElement("div");
    card.className = "component-card";
    const previewId = `rail-card-preview-${index}`;

    card.innerHTML = `
            <h4>${rail.name}</h4>
            <svg id="${previewId}" class="component-card-preview"></svg>
            <div class="component-item-info">
                <span>${rail.width} x ${rail.height} mm</span>
            </div>
            <div class="tags-display">
                ${(rail.tags || []).map((tag) => getTagBadge(tag)).join("")}
            </div>
            <div class="button-group">
                <button type="button" class="edit-btn" data-name="${
                  rail.name
                }" data-type="copperRails">Bearbeiten</button>
                <button type="button" class="danger delete-btn" data-name="${
                  rail.name
                }" data-type="copperRails">Löschen</button>
            </div>
        `;
    railsList.appendChild(card);
    renderComponentPreview(rail, previewId);
  });

  document
    .querySelectorAll(".edit-btn")
    .forEach((btn) => btn.addEventListener("click", populateEditForm));
  document
    .querySelectorAll(".delete-btn")
    .forEach((btn) => btn.addEventListener("click", handleDeleteComponent));
}

function populateEditForm(event) {
  const name = event.target.dataset.name;
  const type = event.target.dataset.type;

  if (type === "copperRails") {
    const component = localLibrary.copperRails.find((c) => c.name === name);
    if (!component) return;

    document.getElementById(
      "rail-form-title"
    ).textContent = `Stromschiene bearbeiten: ${name}`;
    document.getElementById("rail-original-name").value = name;
    document.getElementById("rail-name").value = component.name;
    document.getElementById("rail-manufacturer").value = component.manufacturer;
    document.getElementById("rail-width").value = component.width;
    document.getElementById("rail-height").value = component.height;

    const tagContainer = document.getElementById("rail-tags-container");
    tagContainer.querySelectorAll(".tag-badge").forEach((badge) => {
      if ((component.tags || []).includes(badge.textContent)) {
        badge.classList.add("selected");
      } else {
        badge.classList.remove("selected");
      }
    });
    renderComponentPreview(component, "rail-preview-svg");
  }
}

async function handleSaveComponent(event) {
  event.preventDefault();
  const form = event.target;
  const type = "copperRails";

  const component = {
    name: form.querySelector("#rail-name").value,
    manufacturer: form.querySelector("#rail-manufacturer").value,
    width: parseFloat(form.querySelector("#rail-width").value),
    height: parseFloat(form.querySelector("#rail-height").value),
    material: "Copper",
    tags: Array.from(
      document.querySelectorAll("#rail-tags-container .tag-badge.selected")
    ).map((b) => b.textContent),
  };

  const originalName =
    form.querySelector("#rail-original-name").value || component.name;

  const response = await fetch("/library", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "save", type, component, originalName }),
  });

  const result = await response.json();
  alert(result.message || result.error);

  if (response.ok) {
    localLibrary = result.library;
    renderComponentLists();
    clearRailForm();
  }
}

async function handleDeleteComponent(event) {
  const name = event.target.dataset.name;
  const type = event.target.dataset.type;

  if (confirm(`Möchtest du das Bauteil '${name}' wirklich löschen?`)) {
    const response = await fetch("/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", type, originalName: name }),
    });

    const result = await response.json();
    alert(result.message || result.error);

    if (response.ok) {
      localLibrary = result.library;
      renderComponentLists();
    }
  }
}

function renderTagSelectors() {
  const container = document.getElementById("rail-tags-container");
  if (!container) return;
  container.innerHTML = "";

  let manufacturerHtml = '<div class="tag-group"><strong>Hersteller</strong>';
  for (const [name, color] of Object.entries(PREDEFINED_TAGS.manufacturer)) {
    manufacturerHtml += getTagBadge(name, color);
  }
  manufacturerHtml += "</div>";
  container.innerHTML += manufacturerHtml;

  const currentColors = generateColorPalette(PREDEFINED_TAGS.current.length);
  let currentHtml = '<div class="tag-group"><strong>Strom</strong>';
  PREDEFINED_TAGS.current.forEach((current, index) => {
    currentHtml += getTagBadge(current, currentColors[index]);
  });
  currentHtml += "</div>";
  container.innerHTML += currentHtml;

  container.querySelectorAll(".tag-badge").forEach((badge) => {
    badge.addEventListener("click", () => badge.classList.toggle("selected"));
  });
}

function getTagBadge(tag, color) {
  if (!color) {
    color =
      PREDEFINED_TAGS.manufacturer[tag] ||
      generateColorPalette(PREDEFINED_TAGS.current.length)[
        PREDEFINED_TAGS.current.indexOf(tag)
      ];
  }
  const textColor = getTextColor(color);
  return `<span class="tag-badge" style="background-color: ${color}; color: ${textColor};">${tag}</span>`;
}

function getTextColor(hexcolor) {
  if (!hexcolor) return "#000000";
  const r = parseInt(hexcolor.substr(1, 2), 16);
  const g = parseInt(hexcolor.substr(3, 2), 16);
  const b = parseInt(hexcolor.substr(5, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#000000" : "#FFFFFF";
}

function generateColorPalette(numColors) {
  const colors = [];
  if (numColors === 0) return colors;
  const nGroups = 3;
  let nPerGroup = Math.floor(numColors / nGroups);
  let remainder = numColors % nGroups;
  const groupSizes = [nPerGroup, nPerGroup, nPerGroup];
  for (let i = 0; i < remainder; i++) groupSizes[i]++;

  const maps = [
    (i, s) =>
      `rgb(${Math.round((0 + 0.5 * (i / (s - 1 || 1))) * 255)}, ${Math.round(
        (0 + 0.8 * (i / (s - 1 || 1))) * 255
      )}, ${Math.round((0.5 + 0.5 * (i / (s - 1 || 1))) * 255)})`,
    (i, s) =>
      `rgb(${Math.round((0 + 0.6 * (i / (s - 1 || 1))) * 255)}, ${Math.round(
        (0.4 + 0.6 * (i / (s - 1 || 1))) * 255
      )}, ${Math.round((0 + 0.6 * (i / (s - 1 || 1))) * 255)})`,
    (i, s) =>
      `rgb(${Math.round((0.6 + 0.4 * (i / (s - 1 || 1))) * 255)}, ${Math.round(
        (0 + 0.6 * (i / (s - 1 || 1))) * 255
      )}, ${Math.round((0 + 0.6 * (i / (s - 1 || 1))) * 255)})`,
  ];

  for (let i = 0; i < groupSizes[0]; i++)
    colors.push(maps[0](i, groupSizes[0]));
  for (let i = 0; i < groupSizes[1]; i++)
    colors.push(maps[1](i, groupSizes[1]));
  for (let i = 0; i < groupSizes[2]; i++)
    colors.push(maps[2](i, groupSizes[2]));

  return colors;
}

function renderComponentPreview(component, svgId) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  svg.innerHTML = "";

  const width = parseFloat(component.width) || 0;
  const height = parseFloat(component.height) || 0;

  if (width <= 0 || height <= 0) return;

  const padding = 20;
  const svgWidth = Math.max(width, height) + 2 * padding;
  const svgHeight = svgWidth;

  svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);

  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  const x = (svgWidth - width) / 2;
  const y = (svgHeight - height) / 2;

  rect.setAttribute("x", x);
  rect.setAttribute("y", y);
  rect.setAttribute("width", width);
  rect.setAttribute("height", height);
  rect.setAttribute("fill", "#b87333");
  rect.setAttribute("stroke", "#343a40");
  rect.setAttribute("stroke-width", "1");
  svg.appendChild(rect);
}

function gatherRailFormData() {
  return {
    width: document.getElementById("rail-width").value,
    height: document.getElementById("rail-height").value,
  };
}

function clearRailForm() {
  const form = document.getElementById("rail-form");
  form.reset();
  document.getElementById("rail-original-name").value = "";
  document.getElementById("rail-form-title").textContent =
    "Neue Stromschiene erstellen";
  form
    .querySelectorAll(".tag-badge.selected")
    .forEach((b) => b.classList.remove("selected"));
  renderComponentPreview({ width: 40, height: 10 }, "rail-preview-svg");
}
