let allTagsData = {};

async function loadTags() {
  try {
    const response = await fetch("/api/tags");
    allTagsData = await response.json();
  } catch (error) {
    console.error("Fehler beim Laden der Tags:", error);
  }
}

function getTagBadge(tagName) {
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

  if (tagInfo) {
    const textColor = getTextColor(tagInfo.color);
    return `<span class="tag-badge" style="background-color: ${tagInfo.color}; color: ${textColor};">${tagName}</span>`;
  }

  // Fallback für nicht gefundene Tags
  return `<span class="tag-badge" style="background-color: #e9ecef; color: #495057;">${tagName}</span>`;
}

function getTextColor(hexcolor) {
  if (!hexcolor) return "#000000";
  const r = parseInt(hexcolor.substr(1, 2), 16);
  const g = parseInt(hexcolor.substr(3, 2), 16);
  const b = parseInt(hexcolor.substr(5, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#343a40" : "#FFFFFF";
}
