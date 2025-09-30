// static/js/editor-api.js

function gatherComponentDataFromForm(type) {
  const form = document.getElementById("component-editor-form");
  const data = {};

  if (type === "transformers") {
    const ratioPrimary = form.querySelector("#edit-ratio-primary")?.value || "";
    const ratioSecondary =
      form.querySelector("#edit-ratio-secondary")?.value || "";

    data.geometry = {
      type: "Rectangle",
      coreMaterial:
        form.querySelector("#edit-coreMaterial")?.value || "M-36 Steel",
      coreOuterWidth:
        parseFloat(form.querySelector("#edit-coreOuterWidth")?.value) || 0,
      coreOuterHeight:
        parseFloat(form.querySelector("#edit-coreOuterHeight")?.value) || 0,
      coreInnerWidth:
        parseFloat(form.querySelector("#edit-coreInnerWidth")?.value) || 0,
      coreInnerHeight:
        parseFloat(form.querySelector("#edit-coreInnerHeight")?.value) || 0,
    };
    data.electrical = {
      primaryRatedCurrentA:
        parseInt(form.querySelector("#edit-primaryRatedCurrentA")?.value) || 0,
      ratio: `${ratioPrimary}/${ratioSecondary}`,
      ratedBurdenVA:
        parseFloat(form.querySelector("#edit-ratedBurdenVA")?.value) || null,
      accuracyClass: form.querySelector("#edit-accuracyClass")?.value || null,
    };
  } else if (type === "transformerSheets") {
    data.geometry = {
      type: "SheetPackage",
      material: form.querySelector("#edit-material")?.value || "M-36 Steel",
      insulationMaterial:
        form.querySelector("#edit-insulationMaterial")?.value || "Kunststoff",
      sheetCount: parseInt(form.querySelector("#edit-sheetCount")?.value) || 1,
      sheetThickness:
        parseFloat(form.querySelector("#edit-sheetThickness")?.value) || 0,
      height: parseFloat(form.querySelector("#edit-height")?.value) || 0,
      withInsulation:
        form.querySelector("#edit-withInsulation")?.checked || false,
      insulationThickness:
        parseFloat(form.querySelector("#edit-insulationThickness")?.value) || 0,
    };
  } else {
    data.geometry = {
      type: "Rectangle",
      width: parseFloat(form.querySelector("#edit-width")?.value) || 0,
      height: parseFloat(form.querySelector("#edit-height")?.value) || 0,
      material:
        form.querySelector("#edit-material")?.value ||
        (type === "copperRails" ? "Copper" : "M-36 Steel"),
    };
    if (type === "copperRails") {
      data.electrical = {
        ratedCurrentA:
          parseInt(form.querySelector("#edit-ratedCurrentA")?.value) || 0,
      };
    }
  }
  return data;
}

function saveComponent() {
  const form = document.getElementById("component-editor-form");
  const newName = form.querySelector("#edit-name").value;
  if (!newName) {
    alert("Der Name des Bauteils darf nicht leer sein.");
    return;
  }

  const isNew = !currentEditorComponent;
  const componentToSave = isNew
    ? {
        templateProductInformation: { tags: [] },
        specificProductInformation: { geometry: {}, electrical: {} },
      }
    : JSON.parse(JSON.stringify(currentEditorComponent));

  if (!componentToSave.specificProductInformation) {
    componentToSave.specificProductInformation = {};
  }
  if (!componentToSave.specificProductInformation.electrical) {
    componentToSave.specificProductInformation.electrical = {};
  }
  if (!componentToSave.specificProductInformation.geometry) {
    componentToSave.specificProductInformation.geometry = {};
  }

  componentToSave.templateProductInformation.tags = [...currentComponentTags];
  componentToSave.templateProductInformation.name = newName;
  componentToSave.templateProductInformation.productName =
    form.querySelector("#edit-productName")?.value || "";
  componentToSave.templateProductInformation.manufacturer =
    form.querySelector("#edit-manufacturer")?.value || "";
  componentToSave.templateProductInformation.manufacturerNumber =
    form.querySelector("#edit-manufacturerNumber")?.value || "";
  componentToSave.templateProductInformation.companyNumber =
    form.querySelector("#edit-companyNumber")?.value || "";
  componentToSave.templateProductInformation.uniqueNumber =
    form.querySelector("#edit-uniqueNumber")?.value || "";

  const updatedData = gatherComponentDataFromForm(currentEditorComponentType);
  componentToSave.specificProductInformation.geometry = {
    ...componentToSave.specificProductInformation.geometry,
    ...updatedData.geometry,
  };
  componentToSave.specificProductInformation.electrical = {
    ...componentToSave.specificProductInformation.electrical,
    ...updatedData.electrical,
  };

  fetch("/api/library", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "save",
      type: currentEditorComponentType,
      component: componentToSave,
      originalName: isNew
        ? null
        : currentEditorComponent.templateProductInformation.name,
    }),
  })
    .then((res) => res.json())
    .then(async (result) => {
      alert(result.message);
      if (result.message.includes("erfolgreich")) {
        document.getElementById("component-editor-modal").style.display =
          "none";
        const libResponse = await fetch("/api/library");
        libraryData = await libResponse.json();
        renderComponentList();
      }
    });
}

function deleteComponent() {
  if (
    !currentEditorComponent ||
    !confirm(
      `Soll das Bauteil "${currentEditorComponent.templateProductInformation.name}" wirklich gelöscht werden?`
    )
  ) {
    return;
  }

  fetch("/api/library", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "delete",
      type: currentEditorComponentType,
      originalName: currentEditorComponent.templateProductInformation.name,
    }),
  })
    .then((res) => res.json())
    .then(async (result) => {
      alert(result.message);
      if (result.message.includes("gelöscht")) {
        document.getElementById("component-editor-modal").style.display =
          "none";
        const libResponse = await fetch("/api/library");
        libraryData = await libResponse.json();
        renderComponentList();
      }
    });
}
