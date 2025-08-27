// static/js/tags.js
let allTagsData = {};

async function loadTags() {
  if (Object.keys(allTagsData).length > 0) return;
  try {
    const response = await fetch("/api/tags");
    if (!response.ok) throw new Error("Netzwerk-Antwort war nicht ok.");
    allTagsData = await response.json();
  } catch (error) {
    console.error("Fehler beim Laden der Tags:", error);
    allTagsData = { categories: [] };
  }
}

function getTagBadge(tagName, removable = false) {
  let tagInfo = null;
  if (allTagsData.categories) {
    for (const category of allTagsData.categories) {
      const foundTag = category.tags.find((t) => t.name === tagName);
      if (foundTag) {
        tagInfo = foundTag;
        break;
      }
    }
  }

  const removeBtn = removable
    ? `<span class="remove-tag" title="Tag entfernen">&times;</span>`
    : "";
  const tagDataAttr = `data-tag="${tagName}"`;

  if (tagInfo) {
    const textColor = getTextColor(tagInfo.color);
    return `<span class="tag-badge" ${tagDataAttr} style="background-color: ${tagInfo.color}; color: ${textColor};">${tagName}${removeBtn}</span>`;
  }
  return `<span class="tag-badge" ${tagDataAttr} style="background-color: #e9ecef; color: #495057;">${tagName}${removeBtn}</span>`;
}

function getTextColor(hexcolor) {
  if (!hexcolor || hexcolor.length < 7) return "#000000";
  const r = parseInt(hexcolor.substr(1, 2), 16);
  const g = parseInt(hexcolor.substr(3, 2), 16);
  const b = parseInt(hexcolor.substr(5, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#343a40" : "#FFFFFF";
}

function getTagColor(tagName) {
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${hash % 360}, 90%, 85%)`;
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
