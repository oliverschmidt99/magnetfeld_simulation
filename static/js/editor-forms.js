// static/js/editor-forms.js

function getTransformerFormHtml(data) {
  const tpi = data.templateProductInformation;
  const spi = data.specificProductInformation;
  const geo = spi.geometry || {};
  const ele = spi.electrical || {};

  const materialOptions = (libraryData.materials || [])
    .map(
      (mat) =>
        `<option value="${mat.name}" ${
          geo.coreMaterial === mat.name ? "selected" : ""
        }>${mat.name}</option>`
    )
    .join("");

  const stromOptions = [
    600, 800, 1000, 1250, 1600, 2000, 2500, 3000, 4000, 5000,
  ]
    .map(
      (strom) =>
        `<option value="${strom}" ${
          ele.primaryRatedCurrentA === strom ? "selected" : ""
        }>${strom} A</option>`
    )
    .join("");

  const [ratioPrimary, ratioSecondary] = (ele.ratio || "/").split("/");

  return `
        <div class="form-section">
            <h3>Allgemeine Informationen</h3>
            <div class="form-group"><label>Name</label><input type="text" id="edit-name" value="${
              tpi.name || ""
            }" required></div>
            <div class="form-group"><label>Produktname</label><input type="text" id="edit-productName" value="${
              tpi.productName || ""
            }"></div>
            <div class="form-group"><label>Hersteller</label><input type="text" id="edit-manufacturer" value="${
              tpi.manufacturer || ""
            }"></div>
            <div class="form-group"><label>Art.-Nr. (Herst.)</label><input type="text" id="edit-manufacturerNumber" value="${
              tpi.manufacturerNumber || ""
            }"></div>
            <div class="form-group"><label>Art.-Nr. (RJ)</label><input type="text" id="edit-companyNumber" value="${
              tpi.companyNumber || ""
            }"></div>
            <div class="form-group"><label>Eindeutige Nr. / Wandler Nr.</label><input type="text" id="edit-uniqueNumber" value="${
              tpi.uniqueNumber || ""
            }"></div>
            <div class="form-group">
                <label>Tags</label>
                <div id="tags-input-container" class="tags-input-container">
                    <button type="button" class="add-tags-btn">+ Tags hinzufügen</button>
                </div>
            </div>
        </div>
        <div class="form-section">
            <h3>Elektrische Daten</h3>
            <div class="form-group"><label>Nennstrom</label><select id="edit-primaryRatedCurrentA">${stromOptions}</select></div>
            <div class="form-group">
                <label>Übersetzung</label>
                <div class="form-row">
                    <input type="number" id="edit-ratio-primary" placeholder="Primär" value="${
                      ratioPrimary || ""
                    }">
                    <input type="number" id="edit-ratio-secondary" placeholder="Sekundär" value="${
                      ratioSecondary || ""
                    }">
                </div>
            </div>
        </div>
        <div class="form-section">
            <h3>Geometrie & Material</h3>
            <div class="form-group"><label>Kernmaterial</label><select id="edit-coreMaterial">${materialOptions}</select></div>
            <hr>
            <h4>Abmessungen (mm)</h4>
            <div class="form-group"><label>Außen-Breite</label><input type="number" step="0.1" class="geo-input" id="edit-coreOuterWidth" value="${
              geo.coreOuterWidth || 0
            }"></div>
            <div class="form-group"><label>Außen-Höhe</label><input type="number" step="0.1" class="geo-input" id="edit-coreOuterHeight" value="${
              geo.coreOuterHeight || 0
            }"></div>
            <div class="form-group"><label>Innen-Breite</label><input type="number" step="0.1" class="geo-input" id="edit-coreInnerWidth" value="${
              geo.coreInnerWidth || 0
            }"></div>
            <div class="form-group"><label>Innen-Höhe</label><input type="number" step="0.1" class="geo-input" id="edit-coreInnerHeight" value="${
              geo.coreInnerHeight || 0
            }"></div>
        </div>
    `;
}

function getSimpleComponentFormHtml(data, type) {
  const tpi = data.templateProductInformation;
  const spi = data.specificProductInformation;
  const geo = spi.geometry || {};
  const ele = spi.electrical || {};

  const stromOptions = [
    600, 800, 1000, 1250, 1600, 2000, 2500, 3000, 4000, 5000,
  ]
    .map(
      (strom) =>
        `<option value="${strom}" ${
          ele.ratedCurrentA === strom ? "selected" : ""
        }>${strom} A</option>`
    )
    .join("");

  const materialOptions = (libraryData.materials || [])
    .map(
      (mat) =>
        `<option value="${mat.name}" ${
          geo.material === mat.name ? "selected" : ""
        }>${mat.name}</option>`
    )
    .join("");

  return `
        <div class="form-section">
            <h3>Allgemeine Informationen</h3>
            <div class="form-group"><label>Name</label><input type="text" id="edit-name" value="${
              tpi.name || ""
            }" required></div>
            <div class="form-group"><label>Produktname</label><input type="text" id="edit-productName" value="${
              tpi.productName || ""
            }"></div>
            <div class="form-group"><label>Hersteller</label><input type="text" id="edit-manufacturer" value="${
              tpi.manufacturer || ""
            }"></div>
             <div class="form-group">
                <label>Tags</label>
                <div id="tags-input-container" class="tags-input-container">
                    <button type="button" class="add-tags-btn">+ Tags hinzufügen</button>
                </div>
            </div>
        </div>
        ${
          type === "copperRails"
            ? `
        <div class="form-section">
            <h3>Elektrische Daten</h3>
            <div class="form-group"><label>Nennstrom</label><select id="edit-ratedCurrentA">${stromOptions}</select></div>
        </div>`
            : ""
        }
        <div class="form-section">
            <h3>Geometrie & Material</h3>
             <div class="form-group"><label>Material</label><select id="edit-material">${materialOptions}</select></div>
            <hr>
            <h4>Abmessungen (mm)</h4>
            <div class="form-group"><label>Breite</label><input type="number" step="0.1" class="geo-input" id="edit-width" value="${
              geo.width || 0
            }"></div>
            <div class="form-group"><label>Höhe</label><input type="number" step="0.1" class="geo-input" id="edit-height" value="${
              geo.height || 0
            }"></div>
        </div>
     `;
}

function getSheetPackageFormHtml(data) {
  const tpi = data.templateProductInformation;
  const geo = data.specificProductInformation.geometry || {};

  const materialOptions = (libraryData.materials || [])
    .map(
      (mat) =>
        `<option value="${mat.name}" ${
          geo.material === mat.name ? "selected" : ""
        }>${mat.name}</option>`
    )
    .join("");

  const insulationMaterialOptions = (libraryData.materials || [])
    .map(
      (mat) =>
        `<option value="${mat.name}" ${
          geo.insulationMaterial === mat.name ? "selected" : ""
        }>${mat.name}</option>`
    )
    .join("");

  return `
        <div class="form-section">
            <h3>Allgemeine Informationen</h3>
            <div class="form-group"><label>Name</label><input type="text" id="edit-name" value="${
              tpi.name || ""
            }" required></div>
            <div class="form-group"><label>Produktname</label><input type="text" id="edit-productName" value="${
              tpi.productName || ""
            }"></div>
            <div class="form-group"><label>Hersteller</label><input type="text" id="edit-manufacturer" value="${
              tpi.manufacturer || ""
            }"></div>
            <div class="form-group">
                <label>Tags</label>
                <div id="tags-input-container" class="tags-input-container">
                    <button type="button" class="add-tags-btn">+ Tags hinzufügen</button>
                </div>
            </div>
        </div>
        <div class="form-section">
            <h3>Geometrie & Material</h3>
            <div class="form-group"><label>Material der Bleche</label><select id="edit-material">${materialOptions}</select></div>
            <div class="form-group"><label>Anzahl der Bleche</label><input type="number" id="edit-sheetCount" class="geo-input" min="1" step="1" value="${
              geo.sheetCount || 1
            }"></div>
            <div class="form-group"><label>Dicke pro Blech (mm)</label><input type="number" id="edit-sheetThickness" class="geo-input" step="0.1" value="${
              geo.sheetThickness || 1.0
            }"></div>
            <div class="form-group"><label>Gesamthöhe (mm)</label><input type="number" id="edit-height" class="geo-input" step="0.1" value="${
              geo.height || 100
            }"></div>
            <hr>
            <h4>Isolierung</h4>
            <div class="form-group checkbox-group">
                <input type="checkbox" id="edit-withInsulation" class="geo-input" ${
                  geo.withInsulation ? "checked" : ""
                }>
                <label for="edit-withInsulation">Mit Außenisolierung</label>
            </div>
            <div class="form-group"><label>Isolationsmaterial</label><select id="edit-insulationMaterial">${insulationMaterialOptions}</select></div>
            <div class="form-group"><label>Dicke der Isolierung (mm)</label><input type="number" id="edit-insulationThickness" class="geo-input" step="0.1" value="${
              geo.insulationThickness || 0.5
            }"></div>
        </div>
    `;
}
