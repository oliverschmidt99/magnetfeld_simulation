# app.py
"""
Hauptanwendung für den FEMM-Simulationskonfigurator.
"""
import logging
import json
import os
import math
import time

from flask import Flask, jsonify, render_template, request, send_from_directory

from server.api import api_bp
from server.analysis import analysis_bp
from server.simulation import simulation_bp
from server.configurations import configurations_bp
from server.utils import (
    load_csv,
    calculate_position_steps,
    calculate_label_positions,
)
from server import db
from server.json_provider import CustomJSONProvider  # Importiere den neuen Provider
from src.femm_wrapper import BLOCK_INTEGRAL_TYPES

# --- Konstanten und Pfade ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SIMULATION_RUN_FILE = "simulation_run.json"
SIMULATIONS_DIR = "simulations"
ASSETS_DIR = os.path.join(BASE_DIR, "assets")

# --- App-Initialisierung ---
app = Flask(__name__)
app.json = CustomJSONProvider(app)  # Weise den benutzerdefinierten Provider zu
db.init_app(app)

# Logging konfigurieren
log = logging.getLogger("werkzeug")
log.setLevel(logging.ERROR)

# Blueprints registrieren
app.register_blueprint(api_bp)
app.register_blueprint(analysis_bp, url_prefix="/api")
app.register_blueprint(simulation_bp)
app.register_blueprint(configurations_bp, url_prefix="/api")


def get_library_from_db():
    """Holt die gesamte Bibliothek aus der DB und formatiert sie."""
    db_conn = db.get_db()
    library_data = {"materials": [], "components": {}}

    materials_cursor = db_conn.execute("SELECT * FROM materials ORDER BY name")
    for mat_row in materials_cursor.fetchall():
        material = dict(mat_row)
        bh_cursor = db_conn.execute(
            "SELECT b_value, h_value FROM bh_curve_points WHERE material_id = ?",
            (material["id"],),
        )
        material["bh_curve"] = [
            [row["b_value"], row["h_value"]] for row in bh_cursor.fetchall()
        ]
        del material["id"]
        library_data["materials"].append(material)

    components_cursor = db_conn.execute("SELECT * FROM components ORDER BY type, name")
    for comp_row in components_cursor.fetchall():
        comp_type = comp_row["type"]
        if comp_type not in library_data["components"]:
            library_data["components"][comp_type] = []

        component = {
            "templateProductInformation": {
                "name": comp_row["name"],
                "productName": comp_row["productName"],
                "manufacturer": comp_row["manufacturer"],
                "manufacturerNumber": comp_row["manufacturerNumber"],
                "companyNumber": comp_row["companyNumber"],
                "uniqueNumber": comp_row["uniqueNumber"],
            },
            "specificProductInformation": json.loads(
                comp_row["specificProductInformation"] or "{}"
            ),
        }
        tags_cursor = db_conn.execute(
            """SELECT t.name FROM tags t JOIN component_tags ct ON t.id = ct.tag_id
               WHERE ct.component_id = ?""",
            (comp_row["id"],),
        )
        component["templateProductInformation"]["tags"] = [
            row["name"] for row in tags_cursor.fetchall()
        ]
        library_data["components"][comp_type].append(component)

    return library_data


# --- Routen ---
@app.route("/api/analysis/results_file/<path:filepath>")
def serve_results_file(filepath):
    """Liefert eine Datei aus dem Simulationsergebnis-Ordner sicher aus."""
    results_path = os.path.join(app.root_path, SIMULATIONS_DIR)
    return send_from_directory(results_path, filepath)


@app.route("/")
def index():
    """Zeigt die Hauptseite an."""
    return render_template("index.html")


@app.route("/simulation")
def simulation():
    """Zeigt die kombinierte Konfigurations- und Simulations-Seite."""
    with app.app_context():
        library_data = get_library_from_db()

    spielraum_data = {str(item["Strom"]): item for item in load_csv("spielraum.csv")}
    schrittweiten_data = {
        str(item["Strom"]): item for item in load_csv("schrittweiten.csv")
    }
    startpos_data = {
        str(item["Strom"]): item for item in load_csv("startpositionen.csv")
    }

    return render_template(
        "simulation.html",
        library=library_data,
        spielraum_data=spielraum_data,
        schrittweiten_data=schrittweiten_data,
        startpos_data=startpos_data,
        timestamp=int(time.time()),
    )


@app.route("/results")
def results():
    """Zeigt die Ergebnisseite."""
    return render_template("ergebnisse.html", timestamp=int(time.time()))


@app.route("/library")
def library():
    """Zeigt die kombinierte Bibliotheks- und Stammdaten-Verwaltung."""
    with app.app_context():
        library_data = get_library_from_db()
    return render_template(
        "library.html", library=library_data, timestamp=int(time.time())
    )


@app.route("/measurements")
def measurements():
    """Zeigt die Seite für die Messwerterfassung."""
    with app.app_context():
        library_data = get_library_from_db()
    return render_template("measurements.html", library=library_data)


@app.route("/documentation")
def documentation():
    """Zeigt die Seite für das Ersatzschaltbild."""
    xml_path = os.path.join(ASSETS_DIR, "ersatzschaltbild.xml")
    try:
        with open(xml_path, "r", encoding="utf-8") as f:
            diagram_data = json.dumps(f.read())
    except FileNotFoundError:
        diagram_data = json.dumps(
            "<mxfile><diagram>Diagramm nicht gefunden!</diagram></mxfile>"
        )

    return render_template("documentation.html", diagram_xml=diagram_data)


@app.route("/settings")
def settings():
    """Zeigt die Einstellungs-Seite an."""
    return render_template("settings.html")


@app.route("/generate", methods=["POST"])
def generate_simulation():
    """Erstellt die `simulation_run.json` basierend auf den Benutzereingaben."""
    data = request.json
    with app.app_context():
        library_data = get_library_from_db()

    active_assemblies = [
        a for a in data.get("assemblies", []) if a.get("enabled", True)
    ]
    active_standalone = [
        c for c in data.get("standAloneComponents", []) if c.get("enabled", True)
    ]
    sim_params = data.get("simulationParams", {})

    try:
        nennstrom_float = float(sim_params.get("ratedCurrent"))
    except (ValueError, TypeError):
        return jsonify({"error": "Ungültiger Nennstrom-Wert."}), 400

    leiter_bewegungspfade = calculate_position_steps(
        sim_params.get("startpositionen"),
        sim_params.get("bewegungsRichtungen"),
        sim_params.get("schrittweiten"),
    )

    assemblies_with_details = [
        add_details_to_assembly(asm, library_data) for asm in active_assemblies
    ]
    standalone_with_details = [
        add_details_to_standalone(comp, library_data) for comp in active_standalone
    ]

    initial_labels = calculate_label_positions(
        assemblies_with_details,
        standalone_with_details,
        leiter_bewegungspfade[0],
        sim_params.get("spielraum"),
    )

    electrical_system = data.get("electricalSystem", [])
    for phase in electrical_system:
        phase["peakCurrentA"] = nennstrom_float * math.sqrt(2)

    final_assemblies = []
    for asm_data in assemblies_with_details:
        phase_name = asm_data.get("phaseName")
        if sim_params.get("startpositionen", {}).get(f"x_{phase_name}") is not None:
            asm_data["calculated_positions"] = [
                step[phase_name] for step in leiter_bewegungspfade
            ]
            final_assemblies.append(asm_data)

    simulation_data = {
        "description": "Konfiguration erstellt via Web-UI",
        "scenarioParams": sim_params,
        "materials": library_data.get("materials", []),
        "electricalSystem": electrical_system,
        "assemblies": final_assemblies,
        "standAloneComponents": standalone_with_details,
        "simulation_meta": {
            **data.get("simulationMeta", {}),
            "nennstrom_A": sim_params.get("ratedCurrent"),
            "bewegungsgruppe": sim_params.get("bewegungsRichtungen"),
            "simulationsraum": sim_params.get("spielraum"),
            "bewegungspfade_alle_leiter": {
                "beschreibung": "Bewegungsgruppe: Manuell",
                "schritte_details": leiter_bewegungspfade,
            },
            "material_labels": initial_labels,
        },
    }

    output_path = os.path.join(BASE_DIR, SIMULATION_RUN_FILE)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(simulation_data, f, indent=2, ensure_ascii=False)

    return jsonify(
        {
            "message": f"{SIMULATION_RUN_FILE} erfolgreich erstellt!",
            "data": simulation_data,
        }
    )


@app.route("/visualize", methods=["POST"])
def visualize_configuration():
    """Erstellt eine SVG-Visualisierung der Simulationskonfiguration."""
    data = request.json
    with app.app_context():
        library_data = get_library_from_db()

    active_assemblies = [
        a for a in data.get("assemblies", []) if a.get("enabled", True)
    ]
    active_standalone = [
        c for c in data.get("standAloneComponents", []) if c.get("enabled", True)
    ]
    sim_params = data.get("simulationParams", {})

    position_steps = calculate_position_steps(
        sim_params.get("startpositionen"),
        sim_params.get("bewegungsRichtungen"),
        sim_params.get("schrittweiten"),
    )

    scenes, coordinate_summary = [], []
    for i, step in enumerate(position_steps):
        scene_elements, step_coords = [], {
            "step_name": f"Positionsschritt {i}",
            "components": [],
        }

        for asm_data in active_assemblies:
            scene_elements, step_coords = process_assembly_for_viz(
                asm_data, step, library_data, scene_elements, step_coords
            )
        for comp_data in active_standalone:
            scene_elements, step_coords = process_standalone_for_viz(
                comp_data, library_data, scene_elements, step_coords
            )

        scenes.append(
            {
                "name": f"Schritt {i}",
                "elements": scene_elements,
                "pos_group": f"pos_{i+1}",
            }
        )
        coordinate_summary.append(step_coords)

    return jsonify(
        {
            "scenes": scenes,
            "room": sim_params.get("spielraum", {}),
            "position_steps": len(position_steps),
            "coordinate_summary": coordinate_summary,
        }
    )


# --- Hilfsfunktionen ---
def add_details_to_assembly(assembly_data, library_data):
    """Fügt Bauteil-Details aus der Bibliothek zu einem Assembly hinzu."""
    if assembly_data.get("transformerName"):
        assembly_data["transformer_details"] = next(
            (
                t
                for t in library_data.get("components", {}).get("transformers", [])
                if t.get("templateProductInformation", {}).get("name")
                == assembly_data.get("transformerName")
            ),
            None,
        )
    assembly_data["copperRail_details"] = next(
        (
            r
            for r in library_data.get("components", {}).get("copperRails", [])
            if r.get("templateProductInformation", {}).get("name")
            == assembly_data.get("copperRailName")
        ),
        None,
    )
    return assembly_data


def add_details_to_standalone(component_data, library_data):
    """Fügt Bauteil-Details zu einem Standalone-Bauteil hinzu."""
    component_data["component_details"] = next(
        (
            s
            for s in library_data.get("components", {}).get("transformerSheets", [])
            if s.get("templateProductInformation", {}).get("name")
            == component_data.get("name")
        ),
        None,
    )
    return component_data


def process_assembly_for_viz(asm_data, step, library_data, scene_elements, step_coords):
    """Verarbeitet ein Assembly für die SVG-Visualisierung."""
    phase = asm_data.get("phaseName")
    pos = step.get(phase, {"x": 0, "y": 0})
    asm_details = add_details_to_assembly(asm_data, library_data)
    trans, rail = asm_details.get("transformer_details"), asm_details.get(
        "copperRail_details"
    )

    if rail:
        r_geo = rail["specificProductInformation"]["geometry"]
        if trans:
            t_geo = trans["specificProductInformation"]["geometry"]
            scene_elements.extend(
                [
                    {
                        "type": "rect",
                        "x": pos["x"] - t_geo["coreOuterWidth"] / 2,
                        "y": pos["y"] - t_geo["coreOuterHeight"] / 2,
                        "width": t_geo["coreOuterWidth"],
                        "height": t_geo["coreOuterHeight"],
                        "fill": "#808080",
                    },
                    {
                        "type": "rect",
                        "x": pos["x"] - t_geo["coreInnerWidth"] / 2,
                        "y": pos["y"] - t_geo["coreInnerHeight"] / 2,
                        "width": t_geo["coreInnerWidth"],
                        "height": t_geo["coreInnerHeight"],
                        "fill": "white",
                    },
                ]
            )
        scene_elements.append(
            {
                "type": "rect",
                "x": pos["x"] - r_geo["width"] / 2,
                "y": pos["y"] - r_geo["height"] / 2,
                "width": r_geo["width"],
                "height": r_geo["height"],
                "fill": "#b87333",
            }
        )
        label_y_offset = (
            trans["specificProductInformation"]["geometry"]["coreOuterHeight"] / 2
            if trans
            else r_geo["height"] / 2
        )
        scene_elements.append(
            {
                "type": "text",
                "x": pos["x"],
                "y": pos["y"] + label_y_offset + 15,
                "text": phase,
            }
        )
        step_coords["components"].append(
            {
                "name": asm_data.get("name"),
                "type": "Assembly",
                "x": pos["x"],
                "y": pos["y"],
            }
        )
    return scene_elements, step_coords


def process_standalone_for_viz(comp_data, library_data, scene_elements, step_coords):
    """Verarbeitet ein Standalone-Bauteil für die SVG-Visualisierung."""
    pos = comp_data.get("position", {"x": 0, "y": 0})
    sheet_details = add_details_to_standalone(comp_data, library_data).get(
        "component_details"
    )

    if sheet_details:
        s_geo = sheet_details["specificProductInformation"]["geometry"]
        rotation = comp_data.get("rotation", 0)

        # Logik für Blechpakete
        if s_geo.get("type") == "SheetPackage":
            sheet_count = int(s_geo.get("sheetCount", 1))
            sheet_thickness = s_geo.get("sheetThickness", 0)
            height = s_geo.get("height", 0)
            with_insulation = s_geo.get("withInsulation", False)
            insulation_thickness = (
                s_geo.get("insulationThickness", 0) if with_insulation else 0
            )

            total_width = (sheet_count * sheet_thickness) + (2 * insulation_thickness)
            current_x_offset = -total_width / 2
            transform = f"rotate({-rotation} {pos.get('x', 0)} {pos.get('y', 0)})"

            if with_insulation and insulation_thickness > 0:
                scene_elements.append(
                    {
                        "type": "rect",
                        "x": pos.get("x", 0) + current_x_offset,
                        "y": pos.get("y", 0) - height / 2,
                        "width": insulation_thickness,
                        "height": height,
                        "fill": "#e9ecef",
                        "transform": transform,
                    }
                )
                current_x_offset += insulation_thickness

            for _ in range(sheet_count):
                scene_elements.append(
                    {
                        "type": "rect",
                        "x": pos.get("x", 0) + current_x_offset,
                        "y": pos.get("y", 0) - height / 2,
                        "width": sheet_thickness,
                        "height": height,
                        "fill": "#a9a9a9",
                        "transform": transform,
                    }
                )
                current_x_offset += sheet_thickness

            if with_insulation and insulation_thickness > 0:
                scene_elements.append(
                    {
                        "type": "rect",
                        "x": pos.get("x", 0) + current_x_offset,
                        "y": pos.get("y", 0) - height / 2,
                        "width": insulation_thickness,
                        "height": height,
                        "fill": "#e9ecef",
                        "transform": transform,
                    }
                )

        else:  # Fallback
            width = s_geo.get("width", 0)
            height = s_geo.get("height", 0)
            scene_elements.append(
                {
                    "type": "rect",
                    "x": pos.get("x", 0) - width / 2,
                    "y": pos.get("y", 0) - height / 2,
                    "width": width,
                    "height": height,
                    "fill": "#a9a9a9",
                    "transform": f"rotate({-rotation} {pos.get('x', 0)} {pos.get('y', 0)})",
                }
            )

        step_coords["components"].append(
            {
                "name": comp_data.get("name"),
                "type": "Standalone",
                "x": pos.get("x", 0),
                "y": pos.get("y", 0),
                "rotation": rotation,
            }
        )

    return scene_elements, step_coords


@app.route("/api/block_integral_types")
def get_block_integral_types():
    """Stellt die Definitionen der Blockintegrale für das Frontend bereit."""
    return jsonify(BLOCK_INTEGRAL_TYPES)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=2020, debug=True)
