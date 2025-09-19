// static/js/results_comparison.js
document.addEventListener("DOMContentLoaded", () => {
  // Globale Steuerelemente
  const conductorSelector = document.getElementById("conductor-selector");
  const syncBtn = document.getElementById("sync-btn");
  const playPauseSyncBtn = document.getElementById("play-pause-sync-btn");
  const speedSlider = document.getElementById("speed-slider");
  const speedDisplay = document.getElementById("speed-display");

  // Zustand und Daten
  let simulationRuns = [];
  let charts = { 1: null, 2: null };
  let globalAnimationInterval = null;

  // Initialisierung der beiden Vergleichs-Spalten
  const side1 = setupSide(1);
  const side2 = setupSide(2);

  // Lade die verfügbaren Simulationsläufe
  fetch("/api/analysis/runs")
    .then((response) => response.json())
    .then((runs) => {
      simulationRuns = runs;
      populateRunSelectors(runs);
      const lastSelection1 =
        JSON.parse(localStorage.getItem("resultsSelection1")) || {};
      const lastSelection2 =
        JSON.parse(localStorage.getItem("resultsSelection2")) || {};

      if (lastSelection1.run)
        document.getElementById("run-selector-1").value = lastSelection1.run;
      if (lastSelection2.run)
        document.getElementById("run-selector-2").value = lastSelection2.run;

      side1.handleRunChange(lastSelection1);
      side2.handleRunChange(lastSelection2);
    });

  // Event-Listener
  conductorSelector.addEventListener("change", () => {
    side1.fetchPlotData();
    side2.fetchPlotData();
  });

  syncBtn.addEventListener("click", () => {
    const runIndex1 = document.getElementById("run-selector-1").value;
    const current1 = document.getElementById("current-selector-1").value;
    const yAxis1 = document.getElementById("y-axis-selector-1").value;
    const runSelector2 = document.getElementById("run-selector-2");

    if (runSelector2.value !== runIndex1) {
      runSelector2.value = runIndex1;
      runSelector2.dispatchEvent(
        new CustomEvent("change", {
          detail: { current: current1, yAxis: yAxis1 },
        })
      );
    } else {
      document.getElementById("current-selector-2").value = current1;
      side2.fetchPlotData(yAxis1);
    }
  });

  playPauseSyncBtn.addEventListener("click", toggleGlobalAnimation);
  speedSlider.addEventListener("input", () => {
    speedDisplay.textContent = `${speedSlider.value}ms`;
    if (globalAnimationInterval) {
      stopGlobalAnimation();
      startGlobalAnimation();
    }
  });

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

  function populateRunSelectors(runs) {
    const selector1 = document.getElementById("run-selector-1");
    const selector2 = document.getElementById("run-selector-2");
    [selector1, selector2].forEach((selector) => {
      selector.innerHTML = '<option value="">Bitte wählen...</option>';
      if (runs.length === 0) {
        selector.add(new Option("Keine Läufe gefunden.", ""));
        return;
      }
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
    playPauseSyncBtn.innerHTML = "⏸️ Animation stoppen";
    globalAnimationInterval = setInterval(() => {
      side1.advanceSlider();
      side2.advanceSlider();
    }, speedSlider.value);
  }

  function stopGlobalAnimation() {
    clearInterval(globalAnimationInterval);
    globalAnimationInterval = null;
    playPauseSyncBtn.innerHTML = "▶️ Animation synchron starten";
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
    const densityLoading = document.getElementById(
      `density-plot-loading-${id}`
    );
    const densityImg = document.getElementById(`density-plot-img-${id}`);

    let densityPlotList = [];
    let imageTransform = { scale: 1, translateX: 0, translateY: 0 };

    runSelector.addEventListener("change", (event) =>
      handleRunChange(event.detail || {})
    );
    currentSelector.addEventListener("change", () => fetchPlotData());
    yAxisSelector.addEventListener("change", () => fetchPlotData());
    angleSlider.addEventListener("input", handleSliderChange);

    function saveSelection() {
      const selection = {
        run: runSelector.value,
        current: currentSelector.value,
        yAxis: yAxisSelector.value,
      };
      localStorage.setItem(`resultsSelection${id}`, JSON.stringify(selection));
    }

    function handleRunChange(preselect = {}) {
      stopGlobalAnimation();
      const runIndex = runSelector.value;
      if (runIndex === "") {
        clearAll();
        return;
      }

      const selectedRun = simulationRuns[runIndex];
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
            null
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

      if (!runIndex || !currentGroup) {
        if (charts[id]) charts[id].destroy();
        plotDiv.classList.add("initially-hidden");
        loadingMsg.style.display = "block";
        loadingMsg.textContent = "Bitte Primärstrom wählen.";
        yAxisSelector.disabled = true;
        return;
      }

      const selectedRun = simulationRuns[runIndex];
      const posGroup = selectedRun.positions[0] || null;
      if (!posGroup) return;

      const selectedConductors = Array.from(
        conductorSelector.querySelectorAll("input:checked")
      ).map((cb) => cb.value);

      const queryParams = new URLSearchParams({
        run_folder: selectedRun.name,
        pos_group: posGroup,
        current_group: currentGroup,
      });
      if (desiredYAxis) queryParams.append("y_axis", desiredYAxis);
      selectedConductors.forEach((c) => queryParams.append("conductors[]", c));

      plotDiv.classList.add("initially-hidden");
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

          yAxisSelector.innerHTML = "";
          data.columns.forEach((col) =>
            yAxisSelector.add(new Option(col.name, col.value))
          );

          if (
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

          const finalYAxis = data.y_axis_label.replace(/ /g, "_");
          if (yAxisSelector.value !== finalYAxis) {
            queryParams.set("y_axis", yAxisSelector.value);
            fetch(`/api/analysis/plot?${queryParams.toString()}`)
              .then((res) => res.json())
              .then((newData) => {
                updateChart(newData);
                plotDiv.classList.remove("initially-hidden");
                saveSelection();
                equalizeCardHeights();
              });
          } else {
            updateChart(data);
            plotDiv.classList.remove("initially-hidden");
            saveSelection();
            equalizeCardHeights();
          }
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
      if (!runIndex || !currentGroup) {
        femmContainer.classList.add("initially-hidden");
        return;
      }

      const selectedRun = simulationRuns[runIndex];
      const posGroup = selectedRun.positions[0] || null;

      stopGlobalAnimation();
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
        pos_group: posGroup,
        current_group: currentGroup,
      });

      fetch(`/api/analysis/femm_plots?${queryParams.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          densityPlotList = data.density_plots || [];
          if (densityPlotList.length > 1) {
            angleSlider.max = densityPlotList.length - 1;
            angleSlider.disabled = false;
            handleSliderChange();
            densityLoading.style.display = "none";
          } else if (densityPlotList.length === 1) {
            handleSliderChange();
            densityLoading.style.display = "none";
          } else {
            densityLoading.textContent = "Keine Plots verfügbar.";
          }
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
          plugins: { legend: { display: true, position: "top" } },
          scales: {
            y: { title: { display: true, text: data.y_axis_label } },
            x: { title: { display: true, text: data.x_axis_label } },
          },
        },
      });
    }

    function handleSliderChange() {
      const index = parseInt(angleSlider.value, 10);
      if (densityPlotList[index]) {
        densityImg.src = densityPlotList[index].url;
        densityImg.classList.remove("initially-hidden");
        angleDisplay.textContent = `${densityPlotList[index].angle}°`;
      }
    }

    function advanceSlider() {
      if (angleSlider.disabled) return;
      let nextValue = parseInt(angleSlider.value, 10) + 1;
      if (nextValue > angleSlider.max) nextValue = 0;
      angleSlider.value = nextValue;
      handleSliderChange();
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
        densityImg.style.transform = `translate(${imageTransform.translateX}px, ${imageTransform.translateY}px) scale(${imageTransform.scale})`;
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
        imageTransform.scale += e.deltaY * -scaleAmount;
        imageTransform.scale = Math.max(0.5, Math.min(imageTransform.scale, 5));
        densityImg.style.transform = `translate(${imageTransform.translateX}px, ${imageTransform.translateY}px) scale(${imageTransform.scale})`;
      });
    }

    function setupZoomControls() {
      const zoomInBtn = document.getElementById(`zoom-in-btn-${id}`);
      const zoomOutBtn = document.getElementById(`zoom-out-btn-${id}`);
      const zoomHomeBtn = document.getElementById(`zoom-home-btn-${id}`);

      zoomInBtn.addEventListener("click", () => {
        imageTransform.scale += 0.2;
        densityImg.style.transform = `translate(${imageTransform.translateX}px, ${imageTransform.translateY}px) scale(${imageTransform.scale})`;
      });
      zoomOutBtn.addEventListener("click", () => {
        imageTransform.scale = Math.max(0.5, imageTransform.scale - 0.2);
        densityImg.style.transform = `translate(${imageTransform.translateX}px, ${imageTransform.translateY}px) scale(${imageTransform.scale})`;
      });
      zoomHomeBtn.addEventListener("click", () => {
        imageTransform = { scale: 1, translateX: 0, translateY: 0 };
        densityImg.style.transform = `translate(${imageTransform.translateX}px, ${imageTransform.translateY}px) scale(${imageTransform.scale})`;
      });
    }

    enableImagePanZoom(`density-plot-wrapper-${id}`);
    setupZoomControls();

    return { handleRunChange, fetchPlotData, advanceSlider };
  }
});
