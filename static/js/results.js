// static/js/results.js
document.addEventListener("DOMContentLoaded", () => {
  const runSelector = document.getElementById("run-selector");
  const positionSelector = document.getElementById("position-selector");
  const currentSelector = document.getElementById("current-selector");
  const yAxisSelector = document.getElementById("y-axis-selector");
  const conductorSelector = document.getElementById("conductor-selector");
  const plotDiv = document.getElementById("plot-div");
  const loadingMessage = document.getElementById("loading-message");
  const previewSvg = document.getElementById("results-preview-svg");
  const previewLoadingMessage = document.getElementById(
    "preview-loading-message"
  );

  let simulationRuns = [];
  const storageKey = "resultsSelection";
  let myChart = null; // Globale Chart-Instanz

  // Hilfsfunktion zum Speichern der Auswahl
  const saveSelection = () => {
    const selection = {
      run: runSelector.value,
      position: positionSelector.value,
      current: currentSelector.value,
      yAxis: yAxisSelector.value,
    };
    localStorage.setItem(storageKey, JSON.stringify(selection));
  };

  // Hilfsfunktion zum Laden der Auswahl
  const loadSelection = () => {
    return JSON.parse(localStorage.getItem(storageKey)) || {};
  };

  // Initiales Laden der Simulationsläufe
  fetch("/api/analysis/runs")
    .then((response) => response.json())
    .then((runs) => {
      simulationRuns = runs;
      runSelector.innerHTML = '<option value="">Bitte wählen...</option>';
      if (runs.length === 0) {
        runSelector.add(new Option("Keine Simulationsläufe gefunden.", ""));
        return;
      }
      runs.forEach((run, index) => {
        const [date, time] = run.name.split("/");
        const formattedName = `${date.slice(0, 4)}-${date.slice(
          4,
          6
        )}-${date.slice(6, 8)} ${time.slice(0, 2)}:${time.slice(
          2,
          4
        )}:${time.slice(4, 6)}`;
        runSelector.add(new Option(formattedName, index));
      });

      const lastSelection = loadSelection();
      if (
        lastSelection.run &&
        runSelector.options[parseInt(lastSelection.run) + 1]
      ) {
        runSelector.value = lastSelection.run;
      }
      handleRunChange();
    });

  // Event Listeners
  runSelector.addEventListener("change", handleRunChange);
  positionSelector.addEventListener("change", handlePositionChange);
  currentSelector.addEventListener("change", handleCurrentChange);
  yAxisSelector.addEventListener("change", () => fetchPlotData(false));
  conductorSelector.addEventListener("change", () => fetchPlotData(false));

  function handleRunChange() {
    const runIndex = runSelector.value;
    const lastSelection = loadSelection();

    positionSelector.innerHTML = '<option value="">--</option>';
    if (runIndex !== "") {
      const selectedRun = simulationRuns[runIndex];
      selectedRun.positions.forEach((posGroup) => {
        positionSelector.add(new Option(posGroup.replace("_", " "), posGroup));
      });
      positionSelector.disabled = false;
      if (
        lastSelection.position &&
        Array.from(positionSelector.options).some(
          (o) => o.value === lastSelection.position
        )
      ) {
        positionSelector.value = lastSelection.position;
      }
    } else {
      positionSelector.disabled = true;
    }
    handlePositionChange();
  }

  function handlePositionChange() {
    const runIndex = runSelector.value;
    const selectedPos = positionSelector.value;
    const lastSelection = loadSelection();

    currentSelector.innerHTML = '<option value="">--</option>';
    if (runIndex !== "" && selectedPos !== "") {
      const selectedRun = simulationRuns[runIndex];
      Object.entries(selectedRun.currents).forEach(([key, value]) => {
        currentSelector.add(new Option(`${key} (${value}A)`, key));
      });
      currentSelector.disabled = false;
      if (
        lastSelection.current &&
        Array.from(currentSelector.options).some(
          (o) => o.value === lastSelection.current
        )
      ) {
        currentSelector.value = lastSelection.current;
      }
    } else {
      currentSelector.disabled = true;
    }
    handleCurrentChange();
  }

  function handleCurrentChange() {
    fetchPlotData(true);
    fetchPreviewData();
  }

  function fetchPlotData(isInitialLoad = false) {
    const runIndex = runSelector.value;
    const posGroup = positionSelector.value;
    const currentGroup = currentSelector.value;

    if (runIndex === "" || posGroup === "" || currentGroup === "") {
      plotDiv.style.display = "none";
      yAxisSelector.disabled = true;
      yAxisSelector.innerHTML = '<option value="">--</option>';
      conductorSelector.innerHTML = "";
      return;
    }

    saveSelection();
    const lastSelection = loadSelection();
    const selectedRun = simulationRuns[runIndex];
    const selectedYAxis = yAxisSelector.value;
    const selectedConductors = Array.from(
      conductorSelector.querySelectorAll("input:checked")
    ).map((cb) => cb.value);

    const queryParams = new URLSearchParams({
      run_folder: selectedRun.name,
      pos_group: posGroup,
      current_group: currentGroup,
    });

    if (selectedYAxis) {
      queryParams.append("y_axis", selectedYAxis);
    }
    selectedConductors.forEach((c) => queryParams.append("conductors[]", c));

    plotDiv.style.display = "none";
    loadingMessage.style.display = "block";

    fetch(`/api/analysis/plot?${queryParams.toString()}`)
      .then((response) => response.json())
      .then((data) => {
        loadingMessage.style.display = "none";
        if (data.error) {
          if (myChart && typeof myChart.destroy === "function") {
            myChart.destroy();
          }
          console.error("Fehler vom Server:", data.error);
          return;
        }

        if (isInitialLoad) {
          const currentYAxis = yAxisSelector.value;
          yAxisSelector.innerHTML = "";
          data.columns.forEach((col) => {
            yAxisSelector.add(new Option(col.name, col.value));
          });
          if (
            Array.from(yAxisSelector.options).some(
              (o) => o.value === currentYAxis
            )
          ) {
            yAxisSelector.value = currentYAxis;
          } else if (
            lastSelection.yAxis &&
            Array.from(yAxisSelector.options).some(
              (o) => o.value === lastSelection.yAxis
            )
          ) {
            yAxisSelector.value = lastSelection.yAxis;
          }
        }
        yAxisSelector.disabled = false;

        conductorSelector.innerHTML = "";
        data.conductors.forEach((conductor) => {
          const label = document.createElement("label");
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.value = conductor;
          checkbox.checked = true;
          checkbox.addEventListener("change", () => fetchPlotData(false));
          label.appendChild(checkbox);
          label.appendChild(document.createTextNode(conductor));
          conductorSelector.appendChild(label);
        });

        if (myChart && typeof myChart.destroy === "function") {
          myChart.destroy();
        }
        const ctx = document.getElementById("plot-canvas").getContext("2d");
        myChart = new Chart(ctx, {
          type: "line",
          data: data.chart_data,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: `${data.y_axis_label} vs. ${data.x_axis_label}`,
              },
              legend: {
                position: "top",
              },
            },
            scales: {
              y: {
                title: {
                  display: true,
                  text: data.y_axis_label,
                },
              },
              x: {
                title: {
                  display: true,
                  text: data.x_axis_label,
                },
              },
            },
          },
        });
        plotDiv.style.display = "block";
      });
  }

  function fetchPreviewData() {
    const runIndex = runSelector.value;
    const posGroup = positionSelector.value;

    if (runIndex === "" || posGroup === "") {
      previewSvg.innerHTML = "";
      return;
    }

    const selectedRun = simulationRuns[runIndex];
    previewSvg.innerHTML = "";
    previewLoadingMessage.style.display = "block";

    fetch(`/api/analysis/preview/${selectedRun.name}/${posGroup}`)
      .then((response) => response.json())
      .then((data) => {
        previewLoadingMessage.style.display = "none";
        if (data.error) {
          previewSvg.innerHTML = `<text x="50%" y="50%" fill="red" dominant-baseline="middle" text-anchor="middle">${data.error}</text>`;
          return;
        }
        renderPreview(previewSvg, data.scene, data.room);
      })
      .catch((error) => {
        previewLoadingMessage.style.display = "none";
        console.error("Fehler beim Laden der Vorschau:", error);
      });
  }

  function renderPreview(svgElement, scene, room) {
    const roomWidth = parseFloat(room.Laenge || room.Länge);
    const roomHeight = parseFloat(room.Breite);
    if (isNaN(roomWidth) || isNaN(roomHeight)) return;

    const padding = 50;
    const viewBox = `${-roomWidth / 2 - padding} ${-roomHeight / 2 - padding} ${
      roomWidth + 2 * padding
    } ${roomHeight + 2 * padding}`;
    svgElement.setAttribute("viewBox", viewBox);

    const createSvgElement = (tag, attrs, textContent = null) => {
      const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
      for (const key in attrs) el.setAttribute(key, attrs[key]);
      if (textContent) el.textContent = textContent;
      return el;
    };

    const mainGroup = createSvgElement("g", { transform: "scale(1, -1)" });
    svgElement.innerHTML = ""; // Clear previous preview
    svgElement.appendChild(mainGroup);

    mainGroup.appendChild(
      createSvgElement("rect", {
        x: -roomWidth / 2,
        y: -roomHeight / 2,
        width: roomWidth,
        height: roomHeight,
        class: "simulation-room-border",
      })
    );

    (scene.elements || []).forEach((elData) => {
      let el;
      if (elData.type === "rect") {
        el = createSvgElement("rect", {
          x: elData.x,
          y: elData.y,
          width: elData.width,
          height: elData.height,
          fill: elData.fill,
          stroke: "#343a40",
          "stroke-width": 1,
          transform: elData.transform || "",
        });
      } else if (elData.type === "text") {
        el = createSvgElement(
          "text",
          {
            x: elData.x,
            y: -elData.y,
            "text-anchor": "middle",
            "dominant-baseline": "middle",
            transform: "scale(1, -1)",
          },
          elData.text
        );
      }
      if (el) mainGroup.appendChild(el);
    });

    enablePanZoom(svgElement);
  }

  function enablePanZoom(svg) {
    let pan = false;
    let point = { x: 0, y: 0 };
    let viewbox = { x: 0, y: 0, w: svg.clientWidth, h: svg.clientHeight };
    const updateViewBox = () => {
      const parts = (svg.getAttribute("viewBox") || "0 0 1 1")
        .split(" ")
        .map(Number);
      [viewbox.x, viewbox.y, viewbox.w, viewbox.h] = parts;
    };

    svg.addEventListener("mousedown", (e) => {
      pan = true;
      point.x = e.clientX;
      point.y = e.clientY;
      updateViewBox();
    });

    svg.addEventListener("mousemove", (e) => {
      if (!pan) return;
      const dx = e.clientX - point.x;
      const dy = e.clientY - point.y;
      viewbox.x -= dx * (viewbox.w / svg.clientWidth);
      viewbox.y -= dy * (viewbox.h / svg.clientHeight);
      svg.setAttribute(
        "viewBox",
        `${viewbox.x} ${viewbox.y} ${viewbox.w} ${viewbox.h}`
      );
      point.x = e.clientX;
      point.y = e.clientY;
    });

    const stopPan = () => {
      pan = false;
    };
    svg.addEventListener("mouseup", stopPan);
    svg.addEventListener("mouseleave", stopPan);

    svg.addEventListener("wheel", (e) => {
      e.preventDefault();
      updateViewBox();
      const w = viewbox.w;
      const h = viewbox.h;
      const mx = e.offsetX;
      const my = e.offsetY;
      const dw = w * Math.sign(e.deltaY) * 0.1;
      const dh = h * Math.sign(e.deltaY) * 0.1;
      const dx = (dw * mx) / svg.clientWidth;
      const dy = (dh * my) / svg.clientHeight;
      viewbox = { x: viewbox.x + dx, y: viewbox.y + dy, w: w - dw, h: h - dh };
      svg.setAttribute(
        "viewBox",
        `${viewbox.x} ${viewbox.y} ${viewbox.w} ${viewbox.h}`
      );
    });
  }
});
