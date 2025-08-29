// static/js/tags.js
// Dieses Skript ist für die dynamische Tag-Verwaltung in der Anwendung verantwortlich.

document.addEventListener("DOMContentLoaded", () => {
  // Öffnet ein Modalfenster zur Auswahl von Tags
  window.openTagModal = (element, currentTags) => {
    const modal = document.getElementById("tag-modal");
    const selectedTagsContainer = document.getElementById(
      "modal-selected-tags"
    );
    const tagListContainer = document.getElementById("modal-tag-list");
    const searchInput = document.getElementById("tag-search-input");
    const saveBtn = document.getElementById("modal-save-btn");
    const cancelBtn = document.getElementById("modal-cancel-btn");

    let allTags = [];
    let selectedTags = new Set(currentTags || []);

    // Funktion zum Laden und Anzeigen aller Tags
    function loadAllTags() {
      fetch("/api/tags")
        .then((response) => response.json())
        .then((data) => {
          allTags = data.categories.flatMap((cat) =>
            cat.tags.map((t) => ({
              name: t.name,
              color: t.color,
            }))
          );
          renderTagList();
        })
        .catch((error) => console.error("Fehler beim Laden der Tags:", error));
    }

    // Rendert die Liste der auswählbaren Tags
    function renderTagList(filter = "") {
      tagListContainer.innerHTML = "";
      const filteredTags = allTags.filter((t) =>
        t.name.toLowerCase().includes(filter.toLowerCase())
      );
      filteredTags.forEach((tag) => {
        const tagElement = document.createElement("span");
        tagElement.className = "tag selectable-tag";
        tagElement.textContent = tag.name;
        tagElement.style.backgroundColor = tag.color;
        if (selectedTags.has(tag.name)) {
          tagElement.classList.add("selected");
        }
        tagElement.addEventListener("click", () => {
          if (selectedTags.has(tag.name)) {
            selectedTags.delete(tag.name);
          } else {
            selectedTags.add(tag.name);
          }
          renderSelectedTags();
          renderTagList(searchInput.value); // Aktualisiere Liste, um den "selected"-Status zu zeigen
        });
        tagListContainer.appendChild(tagElement);
      });
    }

    // Rendert die ausgewählten Tags
    function renderSelectedTags() {
      selectedTagsContainer.innerHTML = Array.from(selectedTags)
        .map((tagName) => {
          const tag = allTags.find((t) => t.name === tagName);
          const color = tag ? tag.color : "#ccc";
          return `<span class="tag" style="background-color: ${color};">${tagName}</span>`;
        })
        .join("");
    }

    searchInput.addEventListener("input", (e) => {
      renderTagList(e.target.value);
    });

    saveBtn.addEventListener("click", () => {
      element.value = Array.from(selectedTags).join(", ");
      modal.style.display = "none";
    });

    cancelBtn.addEventListener("click", () => {
      modal.style.display = "none";
    });

    renderSelectedTags();
    loadAllTags();
    modal.style.display = "flex";
  };
});
