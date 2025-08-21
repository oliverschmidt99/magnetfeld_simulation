import json
import os
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# Pfade für die Konfigurationsdateien
CONFIG_DIR = "conf"
LIBRARY_FILE = "library.json"

# Stelle sicher, dass der conf-Ordner existiert
if not os.path.exists(CONFIG_DIR):
    os.makedirs(CONFIG_DIR)

# Globale Variable zum Speichern der Bibliotheksdaten
library_data = {}


def load_library_data():
    """Lädt die Bauteil-Bibliothek aus der library.json."""
    global library_data
    try:
        with open(LIBRARY_FILE, "r", encoding="utf-8") as f:
            library_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        print(
            f"Warnung: '{LIBRARY_FILE}' nicht gefunden oder fehlerhaft. Erstelle leere Bibliothek."
        )
        library_data = {
            "components": {
                "copperRails": [],
                "transformers": [],
                "transformerSheets": [],
            }
        }


@app.route("/")
def index():
    """Rendert die Startseite."""
    return render_template("index.html")


@app.route("/configurator")
def configurator():
    """Rendert die Konfigurator-Seite."""
    if not library_data:
        load_library_data()
    return render_template("configurator.html", library=library_data)


@app.route("/bauteile")
def bauteile():
    """Rendert die neue Seite für den Bauteil-Editor."""
    if not library_data:
        load_library_data()
    return render_template("bauteile.html", library=library_data)


@app.route("/simulation")
def simulation():
    """Rendert die Simulations-Konfigurationsseite."""
    return render_template("simulation.html")


@app.route("/analysis")
def analysis():
    """Rendert die Analyse-Seite."""
    return render_template("analysis.html")


# --- Route zur Verwaltung der Bauteil-Bibliothek ---


@app.route("/library", methods=["POST"])
def update_library():
    """Fügt Bauteile zur library.json hinzu, aktualisiert oder löscht sie."""
    try:
        with open(LIBRARY_FILE, "r", encoding="utf-8") as f:
            lib = json.load(f)

        data = request.json
        action = data.get("action")
        comp_type_key = data.get("type")  # z.B. "copperRails"
        component_data = data.get("component")
        original_name = data.get("originalName")

        if comp_type_key not in lib.get("components", {}):
            return jsonify({"error": "Unbekannter Bauteiltyp"}), 400

        component_list = lib["components"][comp_type_key]

        if action == "save":
            existing_index = -1
            for i, item in enumerate(component_list):
                if (
                    item.get("templateProductInformation", {}).get("name")
                    == original_name
                ):
                    existing_index = i
                    break

            if existing_index != -1:
                component_list[existing_index] = component_data
                message = "Bauteil erfolgreich aktualisiert."
            else:
                component_list.append(component_data)
                message = "Bauteil erfolgreich hinzugefügt."

        elif action == "delete":
            lib["components"][comp_type_key] = [
                item
                for item in component_list
                if item.get("templateProductInformation", {}).get("name")
                != original_name
            ]
            message = "Bauteil erfolgreich gelöscht."

        else:
            return jsonify({"error": "Unbekannte Aktion"}), 400

        with open(LIBRARY_FILE, "w", encoding="utf-8") as f:
            json.dump(lib, f, indent=4)

        load_library_data()
        return jsonify({"message": message, "library": lib})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- Routen für Szenarien-Dateiverwaltung ---


@app.route("/scenarios", methods=["GET"])
def get_scenarios():
    """Gibt eine Liste aller gespeicherten Szenario-Dateinamen zurück."""
    try:
        files = [
            f.replace(".json", "")
            for f in os.listdir(CONFIG_DIR)
            if f.endswith(".json")
        ]
        return jsonify(sorted(files))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/scenarios/<name>", methods=["GET", "POST", "DELETE"])
def handle_scenario(name):
    """Laden, Speichern und Löschen von Szenarien."""
    safe_name = "".join(c for c in name if c.isalnum() or c in ("-", "_")).rstrip()
    if not safe_name:
        return jsonify({"error": "Ungültiger Szenario-Name"}), 400

    filepath = os.path.join(CONFIG_DIR, f"{safe_name}.json")

    if request.method == "POST":
        try:
            data = request.json
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4)
            return jsonify(
                {"message": f"Szenario '{safe_name}' erfolgreich gespeichert."}
            )
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    if request.method == "GET":
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
            return jsonify(data)
        except FileNotFoundError:
            return jsonify({"error": "Szenario nicht gefunden"}), 404
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    if request.method == "DELETE":
        try:
            os.remove(filepath)
            return jsonify({"message": f"Szenario '{safe_name}' erfolgreich gelöscht."})
        except Exception as e:
            return jsonify({"error": "Szenario nicht gefunden"}), 404
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    return jsonify({"error": "Ungültige Methode"}), 405


@app.route("/generate", methods=["POST"])
def generate_simulation_json():
    form_data = request.json
    simulation_config = {
        "description": "Setup generated by Web UI",
        "simulationParams": form_data.get("simulationParams", {}),
        "electricalSystem": form_data.get("electricalSystem", []),
        "assemblies": form_data.get("assemblies", []),
        "standAloneComponents": form_data.get("standAloneComponents", []),
    }
    try:
        with open("simulation.json", "w", encoding="utf-8") as f:
            json.dump(simulation_config, f, indent=2)
        return jsonify({"message": "simulation.json wurde erfolgreich erstellt!"}), 200
    except Exception as e:
        return jsonify({"message": f"Fehler beim Schreiben der Datei: {e}"}), 500


def get_transformer_components(t, pos):
    """Extrahiert sicher die geometrischen Teile eines Wandlers."""
    components = []
    specific_info = t.get("specificProductInformation", {})
    geo = specific_info.get("geometry", {})
    pos_x = pos.get("x", 0)
    pos_y = pos.get("y", 0)

    if geo.get("type") != "Rectangle":
        return []

    def get_dim(key):
        return geo.get(key, 0)

    components.append(
        {
            "type": "rect",
            "x": pos_x - get_dim("outerAirWidth") / 2,
            "y": pos_y - get_dim("outerAirHeight") / 2,
            "width": get_dim("outerAirWidth"),
            "height": get_dim("outerAirHeight"),
            "fill": "#f0f8ff",
            "label": "Outer Air",
        }
    )
    components.append(
        {
            "type": "rect",
            "x": pos_x - get_dim("coreOuterWidth") / 2,
            "y": pos_y - get_dim("coreOuterHeight") / 2,
            "width": get_dim("coreOuterWidth"),
            "height": get_dim("coreOuterHeight"),
            "fill": "#d3d3d3",
            "label": "Steel Core",
        }
    )
    components.append(
        {
            "type": "rect",
            "x": pos_x - get_dim("coreInnerWidth") / 2,
            "y": pos_y - get_dim("coreInnerHeight") / 2,
            "width": get_dim("coreInnerWidth"),
            "height": get_dim("coreInnerHeight"),
            "fill": "#f0f8ff",
            "label": "Inner Air",
        }
    )
    components.append(
        {
            "type": "rect",
            "x": pos_x - get_dim("innerWidth") / 2,
            "y": pos_y - get_dim("innerHeight") / 2,
            "width": get_dim("innerWidth"),
            "height": get_dim("innerHeight"),
            "fill": "#ffffff",
            "label": "Air Gap",
        }
    )
    return components


@app.route("/visualize", methods=["POST"])
def visualize_setup():
    """Erstellt eine detaillierte Datenstruktur für die SVG-Visualisierung."""
    if not library_data:
        load_library_data()

    form_data = request.json
    svg_elements = []

    all_components = library_data.get("components", {})
    all_rails = all_components.get("copperRails", [])
    all_transformers = all_components.get("transformers", [])
    all_sheets = all_components.get("transformerSheets", [])

    for asm_data in form_data.get("assemblies", []):
        rail_name = asm_data.get("copperRailName")
        transformer_name = asm_data.get("transformerName")
        pos = asm_data.get("position", {"x": 0, "y": 0})

        transformer = next(
            (
                t
                for t in all_transformers
                if t.get("templateProductInformation", {}).get("name")
                == transformer_name
            ),
            None,
        )
        if transformer:
            svg_elements.extend(get_transformer_components(transformer, pos))

        rail = next(
            (
                r
                for r in all_rails
                if r.get("templateProductInformation", {}).get("name") == rail_name
            ),
            None,
        )
        if rail:
            geo = rail.get("specificProductInformation", {}).get("geometry", {})
            svg_elements.append(
                {
                    "type": "rect",
                    "x": pos.get("x", 0) - geo.get("width", 0) / 2,
                    "y": pos.get("y", 0) - geo.get("height", 0) / 2,
                    "width": geo.get("width", 0),
                    "height": geo.get("height", 0),
                    "fill": "#b87333",
                    "label": rail_name,
                }
            )

    for comp_data in form_data.get("standAloneComponents", []):
        comp_name = comp_data.get("name")
        pos = comp_data.get("position", {"x": 0, "y": 0})
        sheet = next(
            (
                s
                for s in all_sheets
                if s.get("templateProductInformation", {}).get("name") == comp_name
            ),
            None,
        )
        if sheet:
            geo = sheet.get("specificProductInformation", {}).get("geometry", {})
            svg_elements.append(
                {
                    "type": "rect",
                    "x": pos.get("x", 0) - geo.get("width", 0) / 2,
                    "y": pos.get("y", 0) - geo.get("height", 0) / 2,
                    "width": geo.get("width", 0),
                    "height": geo.get("height", 0),
                    "fill": "#a9a9a9",
                    "label": comp_name,
                }
            )

    return jsonify(svg_elements)


if __name__ == "__main__":
    load_library_data()
    app.run(port=7070, debug=True)
