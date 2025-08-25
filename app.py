"""
Flask-Webanwendung für die Konfiguration und Steuerung einer Magnetfeld-Simulation.

Diese Anwendung bietet eine Weboberfläche zur Verwaltung von Bauteil-Bibliotheken,
zur Konfiguration von Simulationsszenarien und zum Starten von parametrischen Analysen,
die von einem externen MATLAB-Skript ausgeführt werden.
"""

import json
import os
import re
import secrets
import subprocess
from flask import Flask, render_template, request, jsonify
from werkzeug.utils import safe_join

app = Flask(__name__)

# --- Konfiguration ---
# Pfad zur MATLAB-Executable. Ändere dies, falls 'matlab' nicht im System-PATH ist.
# Beispiel für Windows: MATLAB_EXECUTABLE = "C:\\Program Files\\MATLAB\\R2023b\\bin\\matlab.exe"
MATLAB_EXECUTABLE = "matlab"
# --------------------

# Pfade für die Konfigurationsdateien
CONFIG_DIR = "conf"
LIBRARY_FILE = "library.json"
TAGS_FILE = "tags.json"
RESULTS_DIR = "res"

# Stelle sicher, dass die Ordner existieren
if not os.path.exists(CONFIG_DIR):
    os.makedirs(CONFIG_DIR)
if not os.path.exists(RESULTS_DIR):
    os.makedirs(RESULTS_DIR)


def load_data(file_path, default_data):
    """Lädt JSON-Daten aus einer Datei."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default_data


def save_tags_data(data):
    """Speichert die Tag-Daten in die tags.json."""
    with open(TAGS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)


def generate_unique_id():
    """Erzeugt eine 5-stellige hexadezimale ID."""
    return secrets.token_hex(3)[:5]


@app.route("/")
def index():
    """Rendert die Startseite."""
    return render_template("index.html")


@app.route("/configurator")
def configurator():
    """Rendert die Konfigurator-Seite."""
    library_data = load_data(LIBRARY_FILE, {})
    return render_template("configurator.html", library=library_data)


@app.route("/bauteile")
def bauteile():
    """Rendert die Bauteil-Editor-Seite."""
    library_data = load_data(LIBRARY_FILE, {})
    return render_template("bauteile.html", library=library_data)


@app.route("/settings")
def settings():
    """Rendert die Einstellungsseite."""
    return render_template("settings.html")


@app.route("/simulation")
def simulation():
    """Rendert die Simulations-Seite."""
    return render_template("simulation.html")


@app.route("/analysis")
def analysis():
    """Rendert die Analyse-Seite."""
    return render_template("analysis.html")


# --- API für Tags ---


@app.route("/api/tags", methods=["GET"])
def get_tags():
    """Gibt die komplette Tag-Struktur zurück."""
    tags_data = load_data(TAGS_FILE, {"categories": []})
    return jsonify(tags_data)


@app.route("/api/tags", methods=["POST"])
def update_tags():
    """Zentrale Funktion zum Aktualisieren der Tags."""
    try:
        tags_data = request.json
        save_tags_data(tags_data)
        return jsonify({"message": "Tags erfolgreich aktualisiert.", "tags": tags_data})
    except (IOError, TypeError) as e:
        return jsonify({"error": str(e)}), 500


# --- Route zur Verwaltung der Bauteil-Bibliothek ---


@app.route("/library", methods=["GET", "POST"])
def update_library():
    """Verwaltet die Bauteil-Bibliothek."""
    library_data = load_data(LIBRARY_FILE, {"components": {}})
    if request.method == "GET":
        return jsonify({"library": library_data})

    # POST-Logik
    try:
        data = request.json
        action = data.get("action")
        comp_type_key = data.get("type")
        component_data = data.get("component")
        original_name = data.get("originalName")

        if comp_type_key not in library_data.get("components", {}):
            library_data["components"][comp_type_key] = []

        component_list = library_data["components"][comp_type_key]

        if action == "save":
            existing_index = next(
                (
                    i
                    for i, item in enumerate(component_list)
                    if item.get("templateProductInformation", {}).get("name")
                    == original_name
                ),
                -1,
            )

            if existing_index != -1:
                uid = (
                    component_list[existing_index]
                    .get("templateProductInformation", {})
                    .get("uniqueNumber")
                    or generate_unique_id()
                )
                component_data["templateProductInformation"]["uniqueNumber"] = uid
                component_list[existing_index] = component_data
                message = "Bauteil erfolgreich aktualisiert."
            else:
                component_data["templateProductInformation"][
                    "uniqueNumber"
                ] = generate_unique_id()
                component_list.append(component_data)
                message = "Bauteil erfolgreich hinzugefügt."

        elif action == "delete":
            library_data["components"][comp_type_key] = [
                item
                for item in component_list
                if item.get("templateProductInformation", {}).get("name")
                != original_name
            ]
            message = "Bauteil erfolgreich gelöscht."
        else:
            return jsonify({"error": "Unbekannte Aktion"}), 400

        with open(LIBRARY_FILE, "w", encoding="utf-8") as f:
            json.dump(library_data, f, indent=4)

        return jsonify({"message": message, "library": library_data})

    except (IOError, TypeError, KeyError) as e:
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
    except OSError as e:
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
        except (IOError, TypeError) as e:
            return jsonify({"error": str(e)}), 500

    if request.method == "GET":
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
            return jsonify(data)
        except FileNotFoundError:
            return jsonify({"error": "Szenario nicht gefunden"}), 404
        except (IOError, json.JSONDecodeError) as e:
            return jsonify({"error": str(e)}), 500

    if request.method == "DELETE":
        try:
            os.remove(filepath)
            return jsonify({"message": f"Szenario '{safe_name}' erfolgreich gelöscht."})
        except FileNotFoundError:
            return jsonify({"error": "Szenario nicht gefunden"}), 404
        except OSError as e:
            return jsonify({"error": str(e)}), 500

    return jsonify({"error": "Ungültige Methode"}), 405


@app.route("/generate", methods=["POST"])
def generate_simulation_json():
    """Erstellt die `simulation.json` aus den Formulardaten."""
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
    except IOError as e:
        return jsonify({"message": f"Fehler beim Schreiben der Datei: {e}"}), 500


# --- ROUTE FÜR SIMULATIONSLAUF ---
@app.route("/run_simulation", methods=["POST"])
def run_simulation():
    """Bereitet die Konfiguration vor und startet die MATLAB-Simulation im Hintergrund."""
    try:
        data = request.json
        config = data.get("baseConfig")
        scenario = data.get("scenario")

        config["scenarioParams"] = scenario

        with open("simulation_run.json", "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)

        matlab_command = "run('main.m'); exit;"
        project_dir = os.path.dirname(os.path.abspath(__file__))
        subprocess.Popen(
            [MATLAB_EXECUTABLE, "-batch", matlab_command], cwd=project_dir, shell=True
        )

        return (
            jsonify(
                {
                    "message": "Simulation im Hintergrund gestartet. Die Ergebnisse werden im 'res'-Ordner gespeichert."
                }
            ),
            200,
        )

    except (IOError, TypeError, subprocess.SubprocessError) as e:
        return jsonify({"error": str(e)}), 500


# --- Routen und Funktionen für die Analyse-Seite ---


def parse_ans_file(filepath):
    """
    Liest eine .ans-Datei von FEMM und extrahiert Knoten, Elemente und die Lösung.
    Diese Version ist robuster und geht die Datei Zeile für Zeile durch.
    """
    nodes, elements, solution = {}, [], {}
    mode = None

    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip().lower()
            if not line:
                continue

            # Modus wechseln, wenn ein Header gefunden wird
            if "[numnodes]" in line:
                mode = "nodes"
                continue
            if "[numelements]" in line:
                mode = "elements"
                continue
            if "[numcircuits]" in line:
                mode = "circuits"  # Ignorieren, aber stoppt das Lesen von Elementen
                continue
            if "[solution]" in line:
                mode = "solution"
                solution_counter = 0
                continue

            # Zeilen basierend auf dem aktuellen Modus verarbeiten
            try:
                if mode == "nodes":
                    parts = line.split()
                    if len(parts) >= 3:
                        nodes[int(parts[0])] = (float(parts[1]), float(parts[2]))
                elif mode == "elements":
                    parts = line.split()
                    if len(parts) >= 4:
                        elements.append(tuple(int(p) for p in parts[:3]))
                elif mode == "solution":
                    parts = line.split()
                    if parts:
                        solution[solution_counter] = float(parts[0])
                        solution_counter += 1
            except (ValueError, IndexError):
                # Ignoriere Zeilen, die nicht dem erwarteten Format entsprechen
                continue

    return nodes, elements, solution


def calculate_b_field(p1, p2, p3, a1, a2, a3):
    """Berechnet Bx und By für ein Dreieckselement."""
    y21, y32, y13 = p2[1] - p1[1], p3[1] - p2[1], p1[1] - p3[1]
    x12, x23, x31 = p1[0] - p2[0], p2[0] - p3[0], p3[0] - p1[0]

    area2 = p1[0] * y32 + p2[0] * y13 + p3[0] * y21
    if abs(area2) < 1e-12:
        return 0, 0

    bx = (y21 * a3 + y32 * a1 + y13 * a2) / area2
    by = (x12 * a3 + x23 * a1 + x31 * a2) / area2
    return bx, by


def get_contour_lines(nodes, elements, solution, num_levels=30):
    """Erzeugt Isolinien für das Vektorpotential A."""
    lines = []
    if not solution:
        return []
    min_a, max_a = min(solution.values()), max(solution.values())
    if abs(max_a - min_a) < 1e-9:
        return []

    levels = [min_a + (max_a - min_a) * i / num_levels for i in range(1, num_levels)]

    for n1_idx, n2_idx, n3_idx in elements:
        points = [nodes.get(n) for n in (n1_idx, n2_idx, n3_idx)]
        potentials = [solution.get(n) for n in (n1_idx, n2_idx, n3_idx)]
        if not all(points) or not all(p is not None for p in potentials):
            continue

        for level in levels:
            sides = []
            for i in range(3):
                p_start, p_end = points[i], points[(i + 1) % 3]
                a_start, a_end = potentials[i], potentials[(i + 1) % 3]
                if (a_start > level) != (a_end > level):
                    t = (level - a_start) / (a_end - a_start)
                    sides.append(
                        (
                            p_start[0] * (1 - t) + p_end[0] * t,
                            p_start[1] * (1 - t) + p_end[1] * t,
                        )
                    )

            if len(sides) == 2:
                lines.append(sides)
    return lines


@app.route("/analysis/runs")
def list_runs():
    """Listet alle Simulationsläufe im res-Ordner auf."""
    runs = []
    try:
        for date_dir in sorted(os.listdir(RESULTS_DIR), reverse=True):
            date_path = os.path.join(RESULTS_DIR, date_dir)
            if os.path.isdir(date_path):
                for run_dir in sorted(os.listdir(date_path), reverse=True):
                    if os.path.isdir(os.path.join(date_path, run_dir)):
                        runs.append(f"{date_dir}/{run_dir}")
    except OSError:
        pass  # Ordner existiert möglicherweise noch nicht
    return jsonify(runs)


@app.route("/analysis/data/<path:filepath>")
def get_analysis_data(filepath):
    """Parst eine .ans-Datei und gibt die Plot-Daten als JSON zurück."""
    try:
        safe_path = safe_join(os.path.abspath(RESULTS_DIR), filepath)
        if not safe_path or not os.path.exists(safe_path):
            return (
                jsonify({"error": "Ungültiger oder nicht existierender Dateipfad"}),
                404,
            )

        nodes, elements, solution = parse_ans_file(safe_path)

        if not nodes or not elements or not solution:
            return (
                jsonify(
                    {
                        "error": "Datei konnte nicht vollständig geparst werden. Inhalt ist möglicherweise leer oder fehlerhaft."
                    }
                ),
                500,
            )

        elements_data = [
            {
                "nodes": [nodes[n1], nodes[n2], nodes[n3]],
                "b_mag": (bx**2 + by**2) ** 0.5,
            }
            for n1, n2, n3 in elements
            if all(n in nodes and n in solution for n in (n1, n2, n3))
            for bx, by in [
                calculate_b_field(
                    nodes[n1],
                    nodes[n2],
                    nodes[n3],
                    solution[n1],
                    solution[n2],
                    solution[n3],
                )
            ]
        ]
        field_lines = get_contour_lines(nodes, elements, solution)

        return jsonify(
            {
                "nodes": list(nodes.values()),
                "elements": elements_data,
                "field_lines": field_lines,
            }
        )
    except Exception as e:
        return jsonify({"error": f"Fehler beim Verarbeiten der Datei: {e}"}), 500


def get_transformer_components(t, pos):
    """Extrahiert sicher die geometrischen Teile eines Wandlers."""
    components = []
    geo = t.get("specificProductInformation", {}).get("geometry", {})
    pos_x = pos.get("x", 0)
    pos_y = pos.get("y", 0)

    if geo.get("type") != "Rectangle":
        return []

    def get_dim(key):
        return geo.get(key, 0) or 0

    components.extend(
        [
            {
                "type": "rect",
                "x": pos_x - get_dim("outerAirWidth") / 2,
                "y": pos_y - get_dim("outerAirHeight") / 2,
                "width": get_dim("outerAirWidth"),
                "height": get_dim("outerAirHeight"),
                "fill": "#f0f8ff",
                "label": "Outer Air",
            },
            {
                "type": "rect",
                "x": pos_x - get_dim("coreOuterWidth") / 2,
                "y": pos_y - get_dim("coreOuterHeight") / 2,
                "width": get_dim("coreOuterWidth"),
                "height": get_dim("coreOuterHeight"),
                "fill": "#d3d3d3",
                "label": "Steel Core",
            },
            {
                "type": "rect",
                "x": pos_x - get_dim("coreInnerWidth") / 2,
                "y": pos_y - get_dim("coreInnerHeight") / 2,
                "width": get_dim("coreInnerWidth"),
                "height": get_dim("coreInnerHeight"),
                "fill": "#f0f8ff",
                "label": "Inner Air",
            },
            {
                "type": "rect",
                "x": pos_x - get_dim("innerWidth") / 2,
                "y": pos_y - get_dim("innerHeight") / 2,
                "width": get_dim("innerWidth"),
                "height": get_dim("innerHeight"),
                "fill": "#ffffff",
                "label": "Air Gap",
            },
        ]
    )
    return components


@app.route("/visualize", methods=["POST"])
def visualize_setup():
    """Erstellt eine detaillierte Datenstruktur für die SVG-Visualisierung."""
    library_data = load_data(LIBRARY_FILE, {"components": {}})
    form_data = request.json
    svg_elements = []

    all_components = library_data.get("components", {})
    all_rails = all_components.get("copperRails", [])
    all_transformers = all_components.get("transformers", [])
    all_sheets = all_components.get("transformerSheets", [])

    for asm_data in form_data.get("assemblies", []):
        pos = asm_data.get("position", {"x": 0, "y": 0})

        transformer = next(
            (
                t
                for t in all_transformers
                if t.get("templateProductInformation", {}).get("name")
                == asm_data.get("transformerName")
            ),
            None,
        )
        if transformer:
            svg_elements.extend(get_transformer_components(transformer, pos))

        rail = next(
            (
                r
                for r in all_rails
                if r.get("templateProductInformation", {}).get("name")
                == asm_data.get("copperRailName")
            ),
            None,
        )
        if rail:
            geo = rail.get("specificProductInformation", {}).get("geometry", {})
            width = geo.get("width") or 0
            height = geo.get("height") or 0
            svg_elements.append(
                {
                    "type": "rect",
                    "x": pos.get("x", 0) - width / 2,
                    "y": pos.get("y", 0) - height / 2,
                    "width": width,
                    "height": height,
                    "fill": "#b87333",
                    "label": asm_data.get("copperRailName"),
                }
            )

    for comp_data in form_data.get("standAloneComponents", []):
        pos = comp_data.get("position", {"x": 0, "y": 0})
        sheet = next(
            (
                s
                for s in all_sheets
                if s.get("templateProductInformation", {}).get("name")
                == comp_data.get("name")
            ),
            None,
        )
        if sheet:
            geo = sheet.get("specificProductInformation", {}).get("geometry", {})
            width = geo.get("width") or 0
            height = geo.get("height") or 0
            svg_elements.append(
                {
                    "type": "rect",
                    "x": pos.get("x", 0) - width / 2,
                    "y": pos.get("y", 0) - height / 2,
                    "width": width,
                    "height": height,
                    "fill": "#a9a9a9",
                    "label": comp_data.get("name"),
                }
            )

    return jsonify(svg_elements)


if __name__ == "__main__":
    app.run(port=7070, debug=True)
