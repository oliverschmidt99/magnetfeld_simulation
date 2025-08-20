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

function getTagBadge(tag) {
  let color = PREDEFINED_TAGS.manufacturer[tag];
  if (!color) {
    const currentTags = PREDEFINED_TAGS.current;
    const colorPalette = generateColorPalette(currentTags.length);
    const index = currentTags.indexOf(tag);
    if (index > -1) {
      color = colorPalette[index];
    }
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

  return colors.reverse();
}
