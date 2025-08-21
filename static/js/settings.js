document.addEventListener("DOMContentLoaded", () => {
  loadCategories();

  const addCategoryForm = document.getElementById("add-category-form");
  if (addCategoryForm) {
    addCategoryForm.addEventListener("submit", handleAddCategory);
  }

  const editTagForm = document.getElementById("edit-tag-form");
  if (editTagForm) {
    editTagForm.addEventListener("submit", handleSaveTag);
  }

  document
    .getElementById("edit-tag-modal-cancel")
    .addEventListener("click", () => {
      document.getElementById("edit-tag-modal").style.display = "none";
    });
});

let currentTagsData = {};
const pastelColors = [
  "#FFADAD",
  "#FFD6A5",
  "#FDFFB6",
  "#CAFFBF",
  "#9BF6FF",
  "#A0C4FF",
  "#BDB2FF",
  "#FFC6FF",
  "#FFADAD",
  "#FFD6A5",
];

async function loadCategories() {
  try {
    const response = await fetch("/api/tags");
    currentTagsData = await response.json();
    renderCategories();
  } catch (error) {
    console.error("Fehler beim Laden der Tags:", error);
  }
}

async function saveAllTags() {
  try {
    await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentTagsData),
    });
    renderCategories(); // Neu rendern, um die Ansicht zu aktualisieren
  } catch (error) {
    console.error("Fehler beim Speichern der Tags:", error);
  }
}

function renderCategories() {
  const container = document.getElementById("categories-container");
  container.innerHTML = "";

  if (!currentTagsData.categories || currentTagsData.categories.length === 0) {
    container.innerHTML = "<p>Noch keine Kategorien erstellt.</p>";
    return;
  }

  currentTagsData.categories.forEach((category) => {
    const categoryElement = document.createElement("div");
    categoryElement.className = "category-card";

    let tagsHtml = (category.tags || [])
      .map(
        (tag) => `
            <span class="tag-badge" style="background-color: ${
              tag.color
            }; color: ${getTextColor(tag.color)};">
                ${tag.name}
                <span class="tag-actions">
                    <button class="edit-tag-btn" data-category="${
                      category.name
                    }" data-tag="${tag.name}">✎</button>
                    <button class="delete-tag-btn" data-category="${
                      category.name
                    }" data-tag="${tag.name}">×</button>
                </span>
            </span>
        `
      )
      .join("");

    categoryElement.innerHTML = `
            <div class="category-header">
                <h3>${category.name}</h3>
                <button class="delete-category-btn" data-category="${category.name}">Kategorie löschen</button>
            </div>
            <div class="tags-list">${tagsHtml}</div>
            <form class="add-tag-form" data-category="${category.name}">
                <input type="text" placeholder="Neuer Tag-Name..." required>
                <button type="submit">+ Tag</button>
            </form>
        `;
    container.appendChild(categoryElement);
  });

  // Event Listeners für die neuen Elemente hinzufügen
  addEventListenersToCategories();
}

function addEventListenersToCategories() {
  document
    .querySelectorAll(".delete-category-btn")
    .forEach((btn) => btn.addEventListener("click", handleDeleteCategory));
  document
    .querySelectorAll(".add-tag-form")
    .forEach((form) => form.addEventListener("submit", handleAddTag));
  document
    .querySelectorAll(".edit-tag-btn")
    .forEach((btn) => btn.addEventListener("click", handleEditTag));
  document
    .querySelectorAll(".delete-tag-btn")
    .forEach((btn) => btn.addEventListener("click", handleDeleteTag));
}

function handleAddCategory(event) {
  event.preventDefault();
  const input = document.getElementById("new-category-name");
  const newCategoryName = input.value.trim();
  if (
    newCategoryName &&
    !currentTagsData.categories.find((c) => c.name === newCategoryName)
  ) {
    currentTagsData.categories.push({ name: newCategoryName, tags: [] });
    saveAllTags();
    input.value = "";
  } else {
    alert("Kategoriename ist ungültig oder existiert bereits.");
  }
}

function handleDeleteCategory(event) {
  const categoryName = event.target.dataset.category;
  if (
    confirm(`Soll die Kategorie "${categoryName}" wirklich gelöscht werden?`)
  ) {
    currentTagsData.categories = currentTagsData.categories.filter(
      (c) => c.name !== categoryName
    );
    saveAllTags();
  }
}

function handleAddTag(event) {
  event.preventDefault();
  const categoryName = event.target.dataset.category;
  const input = event.target.querySelector("input");
  const tagName = input.value.trim();

  const category = currentTagsData.categories.find(
    (c) => c.name === categoryName
  );
  if (tagName && category && !category.tags.find((t) => t.name === tagName)) {
    const colorIndex = (category.tags.length || 0) % pastelColors.length;
    category.tags.push({ name: tagName, color: pastelColors[colorIndex] });
    saveAllTags();
    input.value = "";
  } else {
    alert("Tag-Name ist ungültig oder existiert bereits in dieser Kategorie.");
  }
}

function handleEditTag(event) {
  const categoryName = event.target.dataset.category;
  const tagName = event.target.dataset.tag;
  const category = currentTagsData.categories.find(
    (c) => c.name === categoryName
  );
  const tag = category ? category.tags.find((t) => t.name === tagName) : null;

  if (tag) {
    document.getElementById("edit-tag-original-name").value = tag.name;
    document.getElementById("edit-tag-category-name").value = categoryName;
    document.getElementById("edit-tag-name").value = tag.name;

    const palette = document.getElementById("edit-tag-color-palette");
    palette.innerHTML = "";
    pastelColors.forEach((color) => {
      const swatch = document.createElement("div");
      swatch.className = "color-swatch";
      swatch.style.backgroundColor = color;
      swatch.dataset.color = color;
      if (color === tag.color) {
        swatch.classList.add("selected");
      }
      swatch.addEventListener("click", () => {
        palette.querySelector(".selected")?.classList.remove("selected");
        swatch.classList.add("selected");
      });
      palette.appendChild(swatch);
    });

    document.getElementById("edit-tag-modal").style.display = "flex";
  }
}

function handleSaveTag(event) {
  event.preventDefault();
  const originalName = document.getElementById("edit-tag-original-name").value;
  const categoryName = document.getElementById("edit-tag-category-name").value;
  const newName = document.getElementById("edit-tag-name").value.trim();
  const selectedColor = document.querySelector(
    "#edit-tag-color-palette .selected"
  ).dataset.color;

  const category = currentTagsData.categories.find(
    (c) => c.name === categoryName
  );
  const tagIndex = category
    ? category.tags.findIndex((t) => t.name === originalName)
    : -1;

  if (tagIndex > -1) {
    category.tags[tagIndex] = { name: newName, color: selectedColor };
    saveAllTags();
    document.getElementById("edit-tag-modal").style.display = "none";
  }
}

function handleDeleteTag(event) {
  const categoryName = event.target.dataset.category;
  const tagName = event.target.dataset.tag;
  if (confirm(`Soll der Tag "${tagName}" wirklich gelöscht werden?`)) {
    const category = currentTagsData.categories.find(
      (c) => c.name === categoryName
    );
    if (category) {
      category.tags = category.tags.filter((t) => t.name !== tagName);
      saveAllTags();
    }
  }
}

function getTextColor(hexcolor) {
  if (!hexcolor) return "#000000";
  const r = parseInt(hexcolor.substr(1, 2), 16);
  const g = parseInt(hexcolor.substr(3, 2), 16);
  const b = parseInt(hexcolor.substr(5, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#343a40" : "#FFFFFF";
}
