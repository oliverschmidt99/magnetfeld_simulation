// static/js/results_comparison.js
document.addEventListener("DOMContentLoaded", () => {
  // Globale Steuerelemente
  const conductorSelector = document.getElementById("conductor-selector");
  const syncBtn = document.getElementById("sync-btn");

  // Globale Animations-Steuerelemente
  const playPauseSyncBtn = document.getElementById("play-pause-sync-btn");
  const globalSpeedSlider = document.getElementById("speed-slider-global");
  const globalSpeedDisplay = document.getElementById("speed-display-global");
  const globalAngleSlider = document.getElementById("angle-slider-global");
  const globalAngleDisplay = document.getElementById("angle-display-global");

  const speedMap = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
  const baseInterval = 200;

  // Zustand und Daten
  let simulationRuns = [];
  let charts = { 1: null, 2: null };
  let globalAnimationInterval = null;

  // --- HELPER FUNCTIONS (DEFINED FIRST) ---

  function equalizeCardHeights() {
    setTimeout(() => {
      const cards1 = document.querySelectorAll("#column-1 > .card");
      const cards2 = document.querySelectorAll("#column-2 > .card");
      const numCards = Math.min(cards1.length, cards2.length);

      for (let i = 0; i < numCards; i++) {
        cards1[i].style.minHeight = "auto";
        cards2[i].style.minHeight = "auto";
        const height1 = cards1[i].offsetHeight;
        const height2 = cards2[i].offsetHeight;
        const maxHeight = Math.max(height1, height2);
        cards1[i].style.minHeight = `${maxHeight}px`;
        cards2[i].style.minHeight = `${maxHeight}px`;
      }
    }, 250);
  }

  function enableImagePanZoom(wrapperId, imageElement, transformState) {
    const wrapper = document.getElementById(wrapperId);
    let isPanning = false;
    let startPos = { x: 0, y: 0 };

    const applyTransform = () => {
      imageElement.style.transform = `translate(${transformState.translateX}px, ${transformState.translateY}px) scale(${transformState.scale})`;
    };

    wrapper.addEventListener("mousedown", (e) => {
      e.preventDefault();
      isPanning = true;
      startPos = {
        x: e.clientX - transformState.translateX,
        y: e.clientY - transformState.translateY,
      };
      wrapper.style.cursor = "grabbing";
    });
    wrapper.addEventListener("mousemove", (e) => {
      if (!isPanning) return;
      e.preventDefault();
      transformState.translateX = e.clientX - startPos.x;
      transformState.translateY = e.clientY - startPos.y;
      applyTransform();
    });
    const stopPan = () => {
      isPanning = false;
      wrapper.style.cursor = "grab";
    };
    wrapper.addEventListener("mouseup", stopPan);
    wrapper.addEventListener("mouseleave", stopPan);
    wrapper.addEventListener("wheel", (e) => {
      e.preventDefault();
      const scaleAmount = 0.1;
      transformState.scale += e.deltaY * -scaleAmount;
      transformState.scale = Math.max(0.5, Math.min(transformState.scale, 5));
      applyTransform();
    });
  }

  function setupZoomControls(sideId, imageElement, transformState) {
    const zoomInBtn = document.getElementById(`zoom-in-btn-${sideId}`);
    const zoomOutBtn = document.getElementById(`zoom-out-btn-${sideId}`);
    const zoomHomeBtn = document.getElementById(`zoom-home-btn-${sideId}`);

    const applyTransform = () => {
      imageElement.style.transform = `translate(${transformState.translateX}px, ${transformState.translateY}px) scale(${transformState.scale})`;
    };

    zoomInBtn.addEventListener("click", () => {
      transformState.scale += 0.2;
      applyTransform();
    });
    zoomOutBtn.addEventListener("click", () => {
      transformState.scale = Math.max(0.5, transformState.scale - 0.2);
      applyTransform();
    });
    zoomHomeBtn.addEventListener("click", () => {
      transformState.scale = 1;
      transformState.translateX = 0;
      transformState.translateY = 0;
      applyTransform();
    });
  }

  // --- MAIN LOGIC ---

  const side1 = setupSide(1);
  const side2 = setupSide(2);

  fetch("/api/analysis/runs")
    .then((response) => response.json())
    .then((runs) => {
      simulationRuns = runs;
      populateRunSelectors(runs);
      const lastSelection1 =
        JSON.parse(localStorage.getItem("resultsSelection1")) || {};
      const lastSelection2 =
        JSON.parse(localStorage.getItem("resultsSelection2")) || {};

      if (lastSelection1.run && runs[lastSelection1.run])
        document.getElementById("run-selector-1").value = lastSelection1.run;
      if (lastSelection2.run && runs[lastSelection2.run])
        document.getElementById("run-selector-2").value = lastSelection2.run;

      side1.handleRunChange(lastSelection1);
      side2.handleRunChange(lastSelection2);
    });

  conductorSelector.addEventListener("change", () => {
    side1.fetchPlotData();
    side2.fetchPlotData();
  });

  syncBtn.addEventListener("click", () => {
    const current1 = document.getElementById("current-selector-1").value;
    const yAxis1 = document.getElementById("y-axis-selector-1").value;
    document.getElementById("current-selector-2").value = current1;
    side2.fetchPlotData(yAxis1);
  });

  playPauseSyncBtn.addEventListener("click", toggleGlobalAnimation);

  globalSpeedSlider.addEventListener("input", () => {
    const speedMultiplier = speedMap[globalSpeedSlider.value];
    globalSpeedDisplay.textContent = `${speedMultiplier.toFixed(2)}x`;
    if (globalAnimationInterval) {
      stopGlobalAnimation();
      startGlobalAnimation();
    }
  });

  globalAngleSlider.addEventListener("input", () => {
    const newIndex = globalAngleSlider.value;
    side1.updatePlotByIndex(newIndex, true);
    side2.updatePlotByIndex(newIndex, true);
  });

  function populateRunSelectors(runs) {
    const selector1 = document.getElementById("run-selector-1");
    const selector2 = document.getElementById("run-selector-2");
    [selector1, selector2].forEach((selector) => {
      selector.innerHTML = '<option value="">Bitte wählen...</option>';
      runs.forEach((run, index) => {
        const [date, time] = run.name.split("/");
        const name = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(
          6,
          8
        )} ${time.slice(0, 2)}:${time.slice(2, 4)}`;
        selector.add(new Option(name, index));
      });
    });
  }

  function toggleGlobalAnimation() {
    if (globalAnimationInterval) stopGlobalAnimation();
    else startGlobalAnimation();
  }

  function startGlobalAnimation() {
    playPauseSyncBtn.textContent = "❚❚";
    side1.stopAnimation();
    side2.stopAnimation();
    const speedMultiplier = speedMap[globalSpeedSlider.value];
    globalAnimationInterval = setInterval(() => {
      let nextValue = parseInt(globalAngleSlider.value, 10) + 1;
      if (nextValue > globalAngleSlider.max) nextValue = 0;
      globalAngleSlider.value = nextValue;
      globalAngleSlider.dispatchEvent(new Event("input"));
    }, baseInterval / speedMultiplier);
  }

  function stopGlobalAnimation() {
    clearInterval(globalAnimationInterval);
    globalAnimationInterval = null;
    playPauseSyncBtn.textContent = "▶";
  }

  function updateGlobalSlider() {
    const max1 = side1.getPlotCount() - 1;
    const max2 = side2.getPlotCount() - 1;
    const newMax = Math.min(max1, max2);

    if (newMax >= 0) {
      globalAngleSlider.max = newMax;
      globalAngleSlider.disabled = false;
      playPauseSyncBtn.disabled = false;
    } else {
      globalAngleSlider.max = 0;
      globalAngleSlider.disabled = true;
      playPauseSyncBtn.disabled = true;
    }
    globalAngleSlider.dispatchEvent(new Event("input"));
  }

  function setupSide(id) {
    const runSelector = document.getElementById(`run-selector-${id}`);
    const currentSelector = document.getElementById(`current-selector-${id}`);
    const yAxisSelector = document.getElementById(`y-axis-selector-${id}`);
    const plotDiv = document.getElementById(`plot-div-${id}`);
    const loadingMsg = document.getElementById(`loading-message-${id}`);
    const previewContainer = document.getElementById(
      `results-preview-container-${id}`
    );
    const femmContainer = document.getElementById(`femm-plots-container-${id}`);
    const angleSlider = document.getElementById(`angle-slider-${id}`);
    const angleDisplay = document.getElementById(`angle-display-${id}`);
    const playBtn = document.getElementById(`play-pause-btn-${id}`);
    const speedSlider = document.getElementById(`speed-slider-${id}`);
    const speedDisplay = document.getElementById(`speed-display-${id}`);
    const densityLoading = document.getElementById(
      `density-plot-loading-${id}`
    );
    const densityImg = document.getElementById(`density-plot-img-${id}`);

    let densityPlotList = [];
    let imageTransform = { scale: 1, translateX: 0, translateY: 0 };
    let currentPositionGroup = null;
    let animationInterval = null;

    runSelector.addEventListener("change", (event) =>
      handleRunChange(event.detail || {})
    );
    currentSelector.addEventListener("change", () => fetchPlotData());
    yAxisSelector.addEventListener("change", () => fetchPlotData());
    angleSlider.addEventListener("input", () =>
      updatePlotByIndex(angleSlider.value)
    );
    playBtn.addEventListener("click", toggleAnimation);
    speedSlider.addEventListener("input", () => {
      const speedMultiplier = speedMap[speedSlider.value];
      speedDisplay.textContent = `${speedMultiplier.toFixed(2)}x`;
      if (animationInterval) {
        stopAnimation();
        startAnimation();
      }
    });

    const saveSelection = () => {
      const selection = {
        run: runSelector.value,
        current: currentSelector.value,
        yAxis: yAxisSelector.value,
      };
      localStorage.setItem(`resultsSelection${id}`, JSON.stringify(selection));
    };

    function handleRunChange(preselect = {}) {
      stopAnimation();
      const runIndex = runSelector.value;
      if (runIndex === "") {
        clearAll();
        return;
      }

      const selectedRun = simulationRuns[runIndex];
      currentPositionGroup = selectedRun.positions[0] || null;
      const preselectedCurrent = preselect.current || currentSelector.value;
      currentSelector.innerHTML = "";
      Object.entries(selectedRun.currents).forEach(([key, value]) => {
        currentSelector.add(new Option(`${key} (${value}A)`, key));
      });

      if (
        Array.from(currentSelector.options).some(
          (o) => o.value === preselectedCurrent
        )
      ) {
        currentSelector.value = preselectedCurrent;
      } else if (currentSelector.options.length > 0) {
        currentSelector.value = currentSelector.options[0].value;
      }

      currentSelector.disabled = currentSelector.options.length === 0;

      fetchFullPreview(selectedRun.name);
      fetchPlotData(preselect.yAxis);
      fetchFemmPlots();
    }

    function onStepClick(posGroup) {
      if (currentPositionGroup !== posGroup) {
        currentPositionGroup = posGroup;
        fetchPlotData();
        fetchFemmPlots();
      }
    }

    function clearAll() {
      if (charts[id]) charts[id].destroy();
      plotDiv.classList.add("initially-hidden");
      loadingMsg.textContent = "Bitte einen Lauf wählen.";
      previewContainer.innerHTML = `<h3>Simulations-Vorschau: Lauf ${id}</h3><p class="loading-message">Bitte einen Lauf wählen.</p>`;
      femmContainer.classList.add("initially-hidden");
      currentSelector.disabled = true;
      yAxisSelector.disabled = true;
      equalizeCardHeights();
    }

    function fetchFullPreview(runFolder) {
      previewContainer.innerHTML = `<h3>Simulations-Vorschau: Lauf ${id}</h3><p class="loading-message">Lade Vorschau...</p>`;
      fetch(`/api/analysis/full_preview/${runFolder}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          renderInteractivePreview(
            `results-preview-container-${id}`,
            data.scenes,
            data.room,
            onStepClick
          );
          equalizeCardHeights();
        })
        .catch((err) => {
          previewContainer.innerHTML = `<p class="loading-message" style="color:red;">Vorschau-Fehler: ${err.message}</p>`;
        });
    }

    function fetchPlotData(preselectYAxis = null) {
      const runIndex = runSelector.value;
      const currentGroup = currentSelector.value;
      const desiredYAxis = preselectYAxis || yAxisSelector.value;

      if (!runIndex || !currentGroup || !currentPositionGroup) {
        return;
      }

      saveSelection();
      const selectedRun = simulationRuns[runIndex];
      const selectedConductors = Array.from(
        conductorSelector.querySelectorAll("input:checked")
      ).map((cb) => cb.value);
      const queryParams = new URLSearchParams({
        run_folder: selectedRun.name,
        pos_group: currentPositionGroup,
        current_group: currentGroup,
      });

      if (desiredYAxis) {
        queryParams.append("y_axis", desiredYAxis);
      }

      selectedConductors.forEach((c) => queryParams.append("conductors[]", c));

      loadingMsg.style.display = "block";
      loadingMsg.textContent = "Lade Diagramm...";

      fetch(`/api/analysis/plot?${queryParams.toString()}`)
        .then((res) =>
          res.ok
            ? res.json()
            : Promise.reject(new Error("Daten konnten nicht geladen werden"))
        )
        .then((data) => {
          loadingMsg.style.display = "none";
          if (data.error) throw new Error(data.error);

          const currentlySelectedYAxis = yAxisSelector.value;
          yAxisSelector.innerHTML = "";
          data.columns.forEach((col) =>
            yAxisSelector.add(new Option(col.name, col.value))
          );

          if (
            Array.from(yAxisSelector.options).some(
              (o) => o.value === currentlySelectedYAxis
            )
          ) {
            yAxisSelector.value = currentlySelectedYAxis;
          } else if (
            Array.from(yAxisSelector.options).some(
              (o) => o.value === desiredYAxis
            )
          ) {
            yAxisSelector.value = desiredYAxis;
          } else if (data.columns.length > 0) {
            yAxisSelector.value = data.columns[0].value;
          }
          yAxisSelector.disabled = false;

          if (id === 1 && conductorSelector.innerHTML === "") {
            conductorSelector.innerHTML = "";
            data.conductors.forEach((c) => {
              const label = document.createElement("label");
              const checkbox = document.createElement("input");
              checkbox.type = "checkbox";
              checkbox.value = c;
              checkbox.checked = true;
              label.appendChild(checkbox);
              label.appendChild(document.createTextNode(c));
              conductorSelector.appendChild(label);
            });
          }
          updateChart(data);
        })
        .catch((err) => {
          if (charts[id]) charts[id].destroy();
          loadingMsg.textContent = `Fehler: ${err.message}`;
          loadingMsg.style.display = "block";
        });
    }

    function fetchFemmPlots() {
      const runIndex = runSelector.value;
      const currentGroup = currentSelector.value;
      if (!runIndex || !currentGroup || !currentPositionGroup) {
        return;
      }
      const selectedRun = simulationRuns[runIndex];

      stopAnimation();
      densityPlotList = [];
      angleSlider.disabled = true;
      angleSlider.value = 0;
      angleSlider.max = 0;

      femmContainer.classList.remove("initially-hidden");
      densityImg.classList.add("initially-hidden");
      densityLoading.style.display = "block";
      densityLoading.textContent = "Lade Plot...";

      const queryParams = new URLSearchParams({
        run_folder: selectedRun.name,
        pos_group: currentPositionGroup,
        current_group: currentGroup,
      });

      fetch(`/api/analysis/femm_plots?${queryParams.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          densityPlotList = data.density_plots || [];
          if (densityPlotList.length > 0) {
            angleSlider.max = densityPlotList.length - 1;
            angleSlider.disabled = false;
            playBtn.disabled = false;
            updatePlotByIndex(angleSlider.value);
            densityLoading.style.display = "none";
          } else {
            densityLoading.textContent = "Keine Plots verfügbar.";
            playBtn.disabled = true;
          }
          updateGlobalSlider();
          equalizeCardHeights();
        })
        .catch((err) => {
          densityLoading.textContent = "Fehler beim Laden.";
        });
    }

    function updateChart(data) {
      if (charts[id]) charts[id].destroy();
      const ctx = document.getElementById(`plot-canvas-${id}`).getContext("2d");
      charts[id] = new Chart(ctx, {
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
      equalizeCardHeights();
    }

    function updatePlotByIndex(indexStr, fromGlobal = false) {
      const index = parseInt(indexStr, 10);
      if (angleSlider.value != index) angleSlider.value = index;

      if (densityPlotList[index]) {
        densityImg.src = densityPlotList[index].url;
        densityImg.classList.remove("initially-hidden");
        angleDisplay.textContent = `${densityPlotList[index].angle}°`;
        if (!fromGlobal && globalAngleSlider.value != index) {
          globalAngleSlider.value = index;
          globalAngleDisplay.textContent = `${densityPlotList[index].angle}°`;
        }
      } else {
        densityImg.classList.add("initially-hidden");
      }
    }

    function toggleAnimation() {
      if (animationInterval) stopAnimation();
      else startAnimation();
    }

    function startAnimation() {
      stopGlobalAnimation();
      playBtn.textContent = "❚❚";
      const speedMultiplier = speedMap[speedSlider.value];
      animationInterval = setInterval(() => {
        let nextValue = parseInt(angleSlider.value, 10) + 1;
        if (nextValue > angleSlider.max) nextValue = 0;
        angleSlider.value = nextValue;
        updatePlotByIndex(angleSlider.value);
      }, baseInterval / speedMultiplier);
    }

    function stopAnimation() {
      clearInterval(animationInterval);
      animationInterval = null;
      playBtn.textContent = "▶";
    }

    enableImagePanZoom(
      `density-plot-wrapper-${id}`,
      densityImg,
      imageTransform
    );
    setupZoomControls(id, densityImg, imageTransform);

    return {
      handleRunChange,
      fetchPlotData,
      getPlotCount: () => densityPlotList.length,
      updatePlotByIndex,
      stopAnimation,
    };
  }
});
