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

  let simulationRuns = [];
  const storageKey = "resultsSelection";
  let myChart = null;

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

  function handleRunChange() {
    const runIndex = runSelector.value;
    const lastSelection = loadSelection();

    // Reset views
    previewContainer.innerHTML =
      '<p class="loading-message">Lade Vorschau...</p>';
    if (myChart) myChart.destroy();
    plotDiv.style.display = "none";

    positionSelector.innerHTML = '<option value="">--</option>';
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
    plotLoadingMessage.style.display = "block";

    fetch(`/api/analysis/plot?${queryParams.toString()}`)
      .then((response) => response.json())
      .then((data) => {
        plotLoadingMessage.style.display = "none";
        if (data.error) {
          if (myChart && typeof myChart.destroy === "function")
            myChart.destroy();
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

        if (myChart && typeof myChart.destroy === "function") myChart.destroy();

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
        plotDiv.style.display = "block";
      });
  }
});
