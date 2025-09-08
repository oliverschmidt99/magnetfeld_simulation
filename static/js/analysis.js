$(document).ready(function () {
  // Funktion zum Laden der Simulationsläufe
  function loadRuns() {
    $.get("/analysis/runs", function (runs) {
      const runList = $("#run-list");
      runList.empty();
      runs.forEach((run) => {
        const listItem = $(
          `<a href="#" class="list-group-item list-group-item-action">${run}</a>`
        );
        listItem.on("click", function (e) {
          e.preventDefault();
          runList.find("a").removeClass("active");
          $(this).addClass("active");
          loadFiles(run);
        });
        runList.append(listItem);
      });
    });
  }

  // Funktion zum Laden der Dateien eines Laufs
  function loadFiles(runDir) {
    $.get(`/analysis/files/${runDir}`, function (files) {
      const fileList = $("#file-list");
      fileList.empty();
      files.forEach((file) => {
        const listItem = $(
          `<a href="#" class="list-group-item list-group-item-action">${file}</a>`
        );
        listItem.on("click", function (e) {
          e.preventDefault();
          fileList.find("a").removeClass("active");
          $(this).addClass("active");
          const currentStrength = $("#current-strength").val();
          loadVisualization(runDir, file, currentStrength);
        });
        fileList.append(listItem);
      });
    });
  }

  // Funktion zum Laden der Visualisierungsdaten
  function loadVisualization(runDir, file, current) {
    const url = `/analysis/data/${runDir}/femm_files/${file}?current=${current}`;
    $.get(url, function (data) {
      drawVisualization(data);
    }).fail(function () {
      alert("Fehler beim Laden der Visualisierungsdaten.");
    });
  }

  // Listener für das Dropdown-Menü hinzufügen
  $("#current-strength").on("change", function () {
    const selectedRun = $("#run-list a.active").text();
    const selectedFile = $("#file-list a.active").text();
    if (selectedRun && selectedFile) {
      loadVisualization(selectedRun, selectedFile, $(this).val());
    }
  });

  // Funktion zum Zeichnen der Visualisierung (bleibt unverändert)
  function drawVisualization(data) {
    const canvas = document.getElementById("femm-canvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Skalierungs- und Zentrierungslogik
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    data.nodes.forEach((node) => {
      if (node.x < minX) minX = node.x;
      if (node.x > maxX) maxX = node.x;
      if (node.y < minY) minY = node.y;
      if (node.y > maxY) maxY = node.y;
    });

    const scale =
      Math.min(canvas.width / (maxX - minX), canvas.height / (maxY - minY)) *
      0.9;
    const offsetX = (canvas.width - (maxX - minX) * scale) / 2 - minX * scale;
    const offsetY = (canvas.height - (maxY - minY) * scale) / 2 - minY * scale;

    function transform(x, y) {
      return {
        x: x * scale + offsetX,
        y: canvas.height - (y * scale + offsetY),
      };
    }

    // Elemente zeichnen
    const maxBMag = Math.max(...data.elements.map((e) => e.b_mag));
    data.elements.forEach((element) => {
      const p1 = transform(element.nodes[0].x, element.nodes[0].y);
      const p2 = transform(element.nodes[1].x, element.nodes[1].y);
      const p3 = transform(element.nodes[2].x, element.nodes[2].y);

      const colorValue = Math.floor(255 * (1 - element.b_mag / maxBMag));
      ctx.fillStyle = `rgb(${colorValue}, ${colorValue}, 255)`;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.fill();
    });

    // Feldlinien zeichnen
    ctx.strokeStyle = "rgba(255, 0, 0, 0.7)";
    ctx.lineWidth = 1;
    data.field_lines.forEach((line) => {
      ctx.beginPath();
      const startPoint = transform(line[0].x, line[0].y);
      ctx.moveTo(startPoint.x, startPoint.y);
      for (let i = 1; i < line.length; i++) {
        const point = transform(line[i].x, line[i].y);
        ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
    });
  }

  // Initiales Laden der Läufe
  loadRuns();
});
