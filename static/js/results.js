// static/js/results.js
document.addEventListener("DOMContentLoaded", () => {
  const runSelector = document.getElementById("run-selector");
  const positionSelector = document.getElementById("position-selector");
  const currentSelector = document.getElementById("current-selector");
  const yAxisSelector = document.getElementById("y-axis-selector");
  const conductorSelector = document.getElementById("conductor-selector");
  const plotDiv = document.getElementById("plot-div");
  const plotLoadingMessage = document.getElementById("loading-message");
  const previewContainer = document.getElementById("results-preview-container");
  const previewLoadingMessage = document.getElementById(
    "preview-loading-message"
  );
  const femmPlotsContainer = document.getElementById("femm-plots-container");
  const angleSlider = document.getElementById("angle-slider");
  const angleDisplay = document.getElementById("angle-display");
  const playPauseBtn = document.getElementById("play-pause-btn");
  const speedSlider = document.getElementById("speed-slider");
  const speedDisplay = document.getElementById("speed-display");

  let simulationRuns = [];
  const storageKey = "resultsSelection";
  let myChart = null;
  let densityPlotList = [];
  let vectorPlotList = [];
  let imageTransform = { scale: 1, translateX: 0, translateY: 0 };
  let animationInterval = null;

  const saveSelection = () => {
    const selection = {
      run: runSelector.value,
      position: positionSelector.value,
      current: currentSelector.value,
      yAxis: yAxisSelector.value,
    };
    localStorage.setItem(storageKey, JSON.stringify(selection));
  };

  const loadSelection = () => {
    return JSON.parse(localStorage.getItem(storageKey)) || {};
  };

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

  runSelector.addEventListener("change", handleRunChange);
  currentSelector.addEventListener("change", () => fetchPlotData(true));
  yAxisSelector.addEventListener("change", () => fetchPlotData(false));
  conductorSelector.addEventListener("change", () => fetchPlotData(false));
  angleSlider.addEventListener("input", handleSliderChange);
  playPauseBtn.addEventListener("click", toggleAnimation);
  speedSlider.addEventListener("input", () => {
    speedDisplay.textContent = `${speedSlider.value}ms`;
    if (animationInterval) {
      stopAnimation();
      startAnimation();
    }
  });

  function handleRunChange() {
    const runIndex = runSelector.value;
    const lastSelection = loadSelection();
    stopAnimation();

    previewContainer.innerHTML =
      '<p class="loading-message">Lade Vorschau...</p>';
    if (myChart) myChart.destroy();
    plotDiv.classList.add("initially-hidden");

    positionSelector.innerHTML = '<option value="">--</option>';
    currentSelector.innerHTML = '<option value="">--</option>';

    if (runIndex === "") {
      positionSelector.disabled = true;
      currentSelector.disabled = true;
      return;
    }

    const selectedRun = simulationRuns[runIndex];
    selectedRun.positions.forEach((posGroup) => {
      positionSelector.add(new Option(posGroup.replace("_", " "), posGroup));
    });
    positionSelector.disabled = false;
    if (
      lastSelection.run === runIndex &&
      lastSelection.position &&
      Array.from(positionSelector.options).some(
        (o) => o.value === lastSelection.position
      )
    ) {
      positionSelector.value = lastSelection.position;
    }

    Object.entries(selectedRun.currents).forEach(([key, value]) => {
      currentSelector.add(new Option(`${key} (${value}A)`, key));
    });
    currentSelector.disabled = false;
    if (
      lastSelection.run === runIndex &&
      lastSelection.current &&
      Array.from(currentSelector.options).some(
        (o) => o.value === lastSelection.current
      )
    ) {
      currentSelector.value = lastSelection.current;
    }

    fetchFullPreview(selectedRun.name);
    fetchPlotData(true);
  }

  function onStepClick(posGroup) {
    if (positionSelector.value !== posGroup) {
      positionSelector.value = posGroup;
      fetchPlotData(true);
    }
  }

  function fetchFullPreview(runFolder) {
    previewLoadingMessage.style.display = "block";
    fetch(`/api/analysis/full_preview/${runFolder}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          previewContainer.innerHTML = `<p style="color:red;">${data.error}</p>`;
          return;
        }
        renderInteractivePreview(
          "results-preview-container",
          data.scenes,
          data.room,
          onStepClick
        );
      })
      .catch((error) => {
        console.error("Fehler beim Laden der Vorschau:", error);
        previewContainer.innerHTML = `<p style="color:red;">Vorschau konnte nicht geladen werden.</p>`;
      });
  }

  function fetchPlotData(isInitialLoad = false) {
    const runIndex = runSelector.value;
    const posGroup = positionSelector.value;
    const currentGroup = currentSelector.value;

    if (runIndex === "" || posGroup === "" || currentGroup === "") {
      plotDiv.classList.add("initially-hidden");
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

    plotDiv.classList.add("initially-hidden");
    plotLoadingMessage.style.display = "block";

    fetchFemmPlots();

    fetch(`/api/analysis/plot?${queryParams.toString()}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Datei '${posGroup}_${currentGroup}_summary.csv' nicht gefunden.`
          );
        }
        return response.json();
      })
      .then((data) => {
        plotLoadingMessage.style.display = "none";
        if (data.error) {
          if (myChart) myChart.destroy();
          plotLoadingMessage.textContent = `Fehler: ${data.error}`;
          plotLoadingMessage.style.display = "block";
          console.error("Fehler vom Server:", data.error);
          return;
        }

        if (isInitialLoad) {
          const currentYAxis = yAxisSelector.value;
          yAxisSelector.innerHTML = "";
          data.columns.forEach((col) =>
            yAxisSelector.add(new Option(col.name, col.value))
          );
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

        if (myChart) myChart.destroy();

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
              legend: { position: "top" },
            },
            scales: {
              y: { title: { display: true, text: data.y_axis_label } },
              x: { title: { display: true, text: data.x_axis_label } },
            },
          },
        });
        plotDiv.classList.remove("initially-hidden");
      })
      .catch((error) => {
        if (myChart) myChart.destroy();
        plotLoadingMessage.textContent = `Fehler: ${error.message}`;
        plotLoadingMessage.style.display = "block";
        console.error("Fehler beim Laden der Plot-Daten:", error);
      });
  }

  function fetchFemmPlots() {
    const runIndex = runSelector.value;
    const posGroup = positionSelector.value;
    const currentGroup = currentSelector.value;

    stopAnimation();
    densityPlotList = [];
    vectorPlotList = [];
    angleSlider.disabled = true;
    playPauseBtn.disabled = true;
    angleSlider.value = 0;
    angleSlider.max = 0;
    angleDisplay.textContent = "--°";

    if (runIndex === "" || posGroup === "" || currentGroup === "") {
      femmPlotsContainer.classList.add("initially-hidden");
      return;
    }

    const selectedRun = simulationRuns[runIndex];
    const queryParams = new URLSearchParams({
      run_folder: selectedRun.name,
      pos_group: posGroup,
      current_group: currentGroup,
    });

    const densityImg = document.getElementById("density-plot-img");
    const vectorImg = document.getElementById("vector-plot-img");
    const densityLoading = document.getElementById("density-plot-loading");
    const vectorLoading = document.getElementById("vector-plot-loading");

    densityImg.classList.add("initially-hidden");
    vectorImg.classList.add("initially-hidden");
    densityLoading.style.display = "block";
    vectorLoading.style.display = "block";
    femmPlotsContainer.classList.remove("initially-hidden");

    fetch(`/api/analysis/femm_plots?${queryParams.toString()}`)
      .then((response) => response.json())
      .then((data) => {
        densityPlotList = data.density_plots || [];
        vectorPlotList = data.vector_plots || [];

        if (densityPlotList.length > 1) {
          angleSlider.max = densityPlotList.length - 1;
          angleSlider.disabled = false;
          playPauseBtn.disabled = false;
          handleSliderChange();
          densityLoading.style.display = "none";
        } else if (densityPlotList.length === 1) {
          handleSliderChange();
          densityLoading.style.display = "none";
        } else {
          densityLoading.textContent = "Keine Plots verfügbar.";
        }

        if (vectorPlotList.length === 0) {
          vectorLoading.textContent = "Keine Plots verfügbar.";
        } else {
          vectorLoading.style.display = "none";
        }
      })
      .catch((error) => {
        console.error("Fehler beim Laden der FEMM-Plots:", error);
        densityLoading.textContent = "Fehler beim Laden.";
        vectorLoading.textContent = "Fehler beim Laden.";
      });
  }

  function handleSliderChange() {
    const index = parseInt(angleSlider.value, 10);

    if (densityPlotList[index]) {
      const densityImg = document.getElementById("density-plot-img");
      densityImg.src = densityPlotList[index].url;
      densityImg.classList.remove("initially-hidden");
      applyImageTransform(densityImg);
      angleDisplay.textContent = `${densityPlotList[index].angle}°`;
    }

    if (vectorPlotList[index]) {
      const vectorImg = document.getElementById("vector-plot-img");
      vectorImg.src = vectorPlotList[index].url;
      vectorImg.classList.remove("initially-hidden");
      applyImageTransform(vectorImg);
    }
  }

  function toggleAnimation() {
    if (animationInterval) {
      stopAnimation();
    } else {
      startAnimation();
    }
  }

  function startAnimation() {
    playPauseBtn.textContent = "❚❚";
    animationInterval = setInterval(() => {
      let nextValue = parseInt(angleSlider.value, 10) + 1;
      if (nextValue > angleSlider.max) {
        nextValue = 0;
      }
      angleSlider.value = nextValue;
      handleSliderChange();
    }, speedSlider.value);
  }

  function stopAnimation() {
    clearInterval(animationInterval);
    animationInterval = null;
    playPauseBtn.textContent = "▶";
  }

  function applyImageTransform(imageElement) {
    imageElement.style.transform = `translate(${imageTransform.translateX}px, ${imageTransform.translateY}px) scale(${imageTransform.scale})`;
    imageElement.style.transformOrigin = "center center";
  }

  function updateAllImagesTransform() {
    applyImageTransform(document.getElementById("density-plot-img"));
    applyImageTransform(document.getElementById("vector-plot-img"));
  }

  function setupZoomControls() {
    const zoomInBtn = document.getElementById("zoom-in-btn");
    const zoomOutBtn = document.getElementById("zoom-out-btn");
    const zoomHomeBtn = document.getElementById("zoom-home-btn");
    const scaleAmount = 0.2;

    zoomInBtn.addEventListener("click", () => {
      imageTransform.scale += scaleAmount;
      updateAllImagesTransform();
    });

    zoomOutBtn.addEventListener("click", () => {
      imageTransform.scale = Math.max(0.5, imageTransform.scale - scaleAmount);
      updateAllImagesTransform();
    });

    zoomHomeBtn.addEventListener("click", () => {
      imageTransform = { scale: 1, translateX: 0, translateY: 0 };
      updateAllImagesTransform();
    });
  }

  function enableImagePanZoom(wrapperId) {
    const wrapper = document.getElementById(wrapperId);
    let isPanning = false;
    let startPos = { x: 0, y: 0 };

    wrapper.addEventListener("mousedown", (e) => {
      e.preventDefault();
      isPanning = true;
      startPos = {
        x: e.clientX - imageTransform.translateX,
        y: e.clientY - imageTransform.translateY,
      };
      wrapper.style.cursor = "grabbing";
    });

    wrapper.addEventListener("mousemove", (e) => {
      if (!isPanning) return;
      e.preventDefault();
      imageTransform.translateX = e.clientX - startPos.x;
      imageTransform.translateY = e.clientY - startPos.y;
      updateAllImagesTransform();
    });

    const stopPan = () => {
      isPanning = false;
      wrapper.style.cursor = "grab";
    };
    wrapper.addEventListener("mouseup", stopPan);
    wrapper.addEventListener("mouseleave", stopPan);

    wrapper.addEventListener("wheel", (e) => {
      e.preventDefault();
      const scaleAmount = 0.02; // Zoom-Geschwindigkeit verfeinert
      imageTransform.scale += e.deltaY * -scaleAmount;
      imageTransform.scale = Math.max(0.2, Math.min(imageTransform.scale, 10)); // Min/Max Zoom angepasst
      updateAllImagesTransform();
    });
  }

  enableImagePanZoom("density-plot-wrapper");
  enableImagePanZoom("vector-plot-wrapper");
  setupZoomControls();
});
