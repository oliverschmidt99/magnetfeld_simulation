// static/js/settings.js
// JavaScript für die Einstellungsseite (Tag-Verwaltung).

document.addEventListener("DOMContentLoaded", () => {
  const categoriesContainer = document.getElementById("categories-container");
  const addCategoryForm = document.getElementById("add-category-form");
  const editTagModal = document.getElementById("edit-tag-modal");
  const editTagForm = document.getElementById("edit-tag-form");

  let currentTagsData = { categories: [] };
  let selectedColor = "#FFFFFF";

  // Funktion zum Laden der Tags vom Server
  function loadTags() {
    fetch("/api/tags")
      .then((response) => response.json())
      .then((data) => {
        currentTagsData = data;
        renderTags();
      })
      .catch((error) => console.error("Fehler beim Laden der Tags:", error));
  }

  // Funktion zum Rendern der Kategorien und Tags
  function renderTags() {
    categoriesContainer.innerHTML = "";
    currentTagsData.categories.forEach((category) => {
      const categoryDiv = document.createElement("div");
      categoryDiv.className = "category-card";
      categoryDiv.innerHTML = `
                <h4>
                    ${category.name}
                    <button type="button" class="edit-category-btn" data-category-name="${
                      category.name
                    }">✏️</button>
                    <button type="button" class="delete-category-btn" data-category-name="${
                      category.name
                    }">&times;</button>
                </h4>
                <div class="tags-container" data-category="${category.name}">
                    ${category.tags
                      .map(
                        (tag) => `
                        <span class="tag" style="background-color: ${tag.color};"
                              data-tag-name="${tag.name}">
                            ${tag.name}
                            <button type="button" class="edit-tag-btn" data-tag-name="${tag.name}" data-category-name="${category.name}">✏️</button>
                            <button type="button" class="delete-tag-btn" data-tag-name="${tag.name}" data-category-name="${category.name}">&times;</button>
                        </span>
                    `
                      )
                      .join("")}
                    <button type="button" class="add-tag-btn" data-category-name="${
                      category.name
                    }">+ Tag</button>
                </div>
            `;
      categoriesContainer.appendChild(categoryDiv);
    });

    // Event-Listener für Buttons hinzufügen
    document.querySelectorAll(".edit-tag-btn").forEach((button) => {
      button.addEventListener("click", openEditTagModal);
    });
    document.querySelectorAll(".delete-tag-btn").forEach((button) => {
      button.addEventListener("click", deleteTag);
    });
    document.querySelectorAll(".add-tag-btn").forEach((button) => {
      button.addEventListener("click", openAddTagModal);
    });
    document.querySelectorAll(".edit-category-btn").forEach((button) => {
      button.addEventListener("click", editCategory);
    });
    document.querySelectorAll(".delete-category-btn").forEach((button) => {
      button.addEventListener("click", deleteCategory);
    });
  }

  // Funktion zum Speichern der gesamten Tag-Daten
  function saveTags() {
    fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", tags: currentTagsData }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Tags gespeichert:", data.message);
        loadTags();
      })
      .catch((error) =>
        console.error("Fehler beim Speichern der Tags:", error)
      );
  }

  // Modal öffnen, um einen Tag zu bearbeiten
  function openEditTagModal(event) {
    const tagName = event.target.dataset.tagName;
    const categoryName = event.target.dataset.categoryName;
    const category = currentTagsData.categories.find(
      (c) => c.name === categoryName
    );
    const tag = category.tags.find((t) => t.name === tagName);

    document.getElementById("edit-tag-original-name").value = tagName;
    document.getElementById("edit-tag-category-name").value = categoryName;
    document.getElementById("edit-tag-name").value = tagName;
    selectedColor = tag.color;
    renderColorPalette();
    editTagModal.style.display = "flex";
  }

  // Modal öffnen, um einen neuen Tag hinzuzufügen
  function openAddTagModal(event) {
    const categoryName = event.target.dataset.categoryName;
    document.getElementById("edit-tag-original-name").value = "";
    document.getElementById("edit-tag-category-name").value = categoryName;
    document.getElementById("edit-tag-name").value = "";
    selectedColor = "#A0C4FF"; // Standardfarbe
    renderColorPalette();
    editTagModal.style.display = "flex";
  }

  // Farbauswahl im Modal rendern
  function renderColorPalette() {
    const palette = document.getElementById("edit-tag-color-palette");
    palette.innerHTML = "";
    const colors = [
      "#A0C4FF",
      "#FFD6A5",
      "#C65911",
      "#305496",
      "#FDFFB6",
      "#CAFFBF",
      "#9BF6FF",
      "#BDB2FF",
      "#FFC6FF",
      "#FFADAD",
    ];
    colors.forEach((color) => {
      const span = document.createElement("span");
      span.className = "color-swatch";
      span.style.backgroundColor = color;
      if (color === selectedColor) {
        span.classList.add("active");
      }
      span.addEventListener("click", () => {
        document
          .querySelectorAll(".color-swatch")
          .forEach((sw) => sw.classList.remove("active"));
        span.classList.add("active");
        selectedColor = color;
      });
      palette.appendChild(span);
    });
  }

  // Speichern/Bearbeiten-Logik für einen Tag
  editTagForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const originalName = document.getElementById(
      "edit-tag-original-name"
    ).value;
    const categoryName = document.getElementById(
      "edit-tag-category-name"
    ).value;
    const newName = document.getElementById("edit-tag-name").value;
    const newColor = selectedColor;

    const category = currentTagsData.categories.find(
      (c) => c.name === categoryName
    );
    if (!category) return;

    if (originalName) {
      // Bearbeiten eines bestehenden Tags
      const tag = category.tags.find((t) => t.name === originalName);
      if (tag) {
        tag.name = newName;
        tag.color = newColor;
      }
    } else {
      // Hinzufügen eines neuen Tags
      category.tags.push({ name: newName, color: newColor });
    }

    saveTags();
    editTagModal.style.display = "none";
  });

  // Löschen eines Tags
  function deleteTag(event) {
    if (!confirm("Soll dieser Tag wirklich gelöscht werden?")) return;
    const tagName = event.target.dataset.tagName;
    const categoryName = event.target.dataset.categoryName;

    const category = currentTagsData.categories.find(
      (c) => c.name === categoryName
    );
    if (category) {
      category.tags = category.tags.filter((t) => t.name !== tagName);
      saveTags();
    }
  }

  // Neue Kategorie hinzufügen
  addCategoryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const newCategoryName = document.getElementById("new-category-name").value;
    if (
      newCategoryName &&
      !currentTagsData.categories.some((c) => c.name === newCategoryName)
    ) {
      currentTagsData.categories.push({ name: newCategoryName, tags: [] });
      saveTags();
      document.getElementById("new-category-name").value = "";
    } else {
      alert("Die Kategorie existiert bereits oder der Name ist ungültig.");
    }
  });

  // Kategorie bearbeiten
  function editCategory(event) {
    const originalName = event.target.dataset.categoryName;
    const newName = prompt(
      `Neuen Namen für die Kategorie "${originalName}" eingeben:`
    );
    if (newName && newName !== originalName) {
      fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit_category",
          originalName: originalName,
          newName: newName,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          alert(data.message);
          loadTags();
        })
        .catch((error) => alert("Fehler beim Umbenennen der Kategorie."));
    }
  }

  // Kategorie löschen
  function deleteCategory(event) {
    const categoryName = event.target.dataset.categoryName;
    if (
      confirm(
        `Soll die Kategorie "${categoryName}" und alle ihre Tags wirklich gelöscht werden?`
      )
    ) {
      fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_category",
          categoryName: categoryName,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          alert(data.message);
          loadTags();
        })
        .catch((error) => alert("Fehler beim Löschen der Kategorie."));
    }
  }

  // Modal schließen
  document
    .getElementById("edit-tag-modal-cancel")
    .addEventListener("click", () => {
      editTagModal.style.display = "none";
    });

  loadTags();
});
