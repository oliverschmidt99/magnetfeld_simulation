let allTagsData = {}; // Globale Variable, die in bauteile.js verwendet wird

async function loadTags() {
  try {
    const response = await fetch("/tags");
    if (!response.ok) throw new Error("Netzwerk-Antwort war nicht ok.");
    allTagsData = await response.json();
  } catch (error) {
    console.error("Fehler beim Laden der Tags:", error);
    allTagsData = { categories: [] };
  }
}

function getTagColor(tagName) {
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = `hsl(${hash % 360}, 90%, 85%)`;
  return color;
}

function getTagBadge(tagName) {
  if (!tagName) return "";
  return `<span class="tag-badge" style="background-color: ${getTagColor(
    tagName
  )}">${tagName}</span>`;
}

function updateSelectedTagsDisplay(containerId, tags) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const addBtn = container.querySelector(".add-tags-btn");
  container.innerHTML = "";

  tags.forEach((tag) => {
    const badge = document.createElement("span");
    badge.className = "tag-badge";
    badge.style.backgroundColor = getTagColor(tag);
    badge.textContent = tag;

    const removeBtn = document.createElement("span");
    removeBtn.className = "remove-tag";
    removeBtn.innerHTML = "&times;";
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      currentEditingTags = currentEditingTags.filter((t) => t !== tag);
      updateSelectedTagsDisplay(containerId, currentEditingTags);
    };
    badge.appendChild(removeBtn);
    container.appendChild(badge);
  });

  if (addBtn) {
    container.appendChild(addBtn);
  }
}
