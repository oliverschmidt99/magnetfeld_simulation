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
    load_json,
    load_csv,
    calculate_position_steps,
    calculate_label_positions,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LIBRARY_FILE = "library.json"
SIMULATION_RUN_FILE = "simulation_run.json"
SIMULATIONS_DIR = "simulations"

app = Flask(__name__)

# Deaktiviere das Standard-Flask-Logging für GET-Anfragen
log = logging.getLogger("werkzeug")
log.setLevel(logging.ERROR)

app.register_blueprint(api_bp)
app.register_blueprint(analysis_bp, url_prefix="/api")
app.register_blueprint(simulation_bp)
app.register_blueprint(configurations_bp, url_prefix="/api")


@app.route("/api/analysis/results_file/<path:filepath>")
def serve_results_file(filepath):
    """Liefert eine Datei aus dem Simulationsergebnis-Ordner sicher aus."""
    return send_from_directory(os.path.join(app.root_path, SIMULATIONS_DIR), filepath)


@app.route("/")
def index():
    """Zeigt die Hauptseite an."""
    return render_template("index.html")


@app.route("/simulation")
def simulation():
    """Zeigt die kombinierte Konfigurations- und Simulations-Seite."""
    library_data = load_json(os.path.join(BASE_DIR, LIBRARY_FILE))
    spielraum_data = {str(item["Strom"]): item for item in load_csv("spielraum.csv")}
    schrittweiten_data = {
        str(item["Strom"]): item for item in load_csv("schrittweiten.csv")
    }
    startpos_data = {
        str(item["Strom"]): item for item in load_csv("startpositionen.csv")
    }
    direction_options = [
        {"value": "Keine Bewegung", "text": "Keine Bewegung"},
        {"value": "Norden", "text": "⬆️ Norden"},
        {"value": "Osten", "text": "➡️ Osten"},
        {"value": "Süden", "text": "⬇️ Süden"},
        {"value": "Westen", "text": "⬅️ Westen"},
        {"value": "Nordosten", "text": "↗️ Nordosten"},
        {"value": "Nordwesten", "text": "↖️ Nordwesten"},
        {"value": "Südosten", "text": "↘️ Südosten"},
        {"value": "Südwesten", "text": "↙️ Südwesten"},
    ]
    return render_template(
        "simulation.html",
        library=library_data,
        spielraum_data=spielraum_data,
        schrittweiten_data=schrittweiten_data,
        startpos_data=startpos_data,
        direction_options=direction_options,
        timestamp=int(time.time()),
    )


@app.route("/results")
def results():
    """Zeigt die Ergebnisseite."""
    return render_template("ergebnisse.html", timestamp=int(time.time()))


@app.route("/library")
def library():
    """Zeigt die kombinierte Bibliotheks- und Stammdaten-Verwaltung."""
    library_data = load_json(os.path.join(BASE_DIR, LIBRARY_FILE))
    return render_template(
        "library.html", library=library_data, timestamp=int(time.time())
    )


@app.route("/settings")
def settings():
    """Zeigt die Einstellungs-Seite an."""
    return render_template("settings.html")


@app.route("/generate", methods=["POST"])
def generate_simulation():
    """Erstellt die `simulation_run.json` basierend auf den Benutzereingaben."""
    data = request.json
    library_data = load_json(os.path.join(BASE_DIR, LIBRARY_FILE))

    active_assemblies = [
        asm for asm in data.get("assemblies", []) if asm.get("enabled", True)
    ]
    active_standalone = [
        comp
        for comp in data.get("standAloneComponents", [])
        if comp.get("enabled", True)
    ]

    sim_params = data.get("simulationParams", {})
    nennstrom_str = sim_params.get("ratedCurrent")
    sim_params["type"] = "none"
    sim_params["coreRelPermeability"] = sim_params.get("coreRelPermeability", 2500)

    try:
        nennstrom_float = float(nennstrom_str)
    except (ValueError, TypeError):
        return jsonify({"error": "Ungültiger Nennstrom-Wert."}), 400

    startpositionen = sim_params.get("startpositionen")
    schrittweiten = sim_params.get("schrittweiten")
    spielraum = sim_params.get("spielraum")
    bewegungs_richtungen = sim_params.get("bewegungsRichtungen", {})

    if not startpositionen:
        return (
            jsonify(
                {
                    "error": f"Keine Startpositionen für Nennstrom {nennstrom_str}A gefunden."
                }
            ),
            400,
        )

    leiter_bewegungspfade = calculate_position_steps(
        startpositionen, bewegungs_richtungen, schrittweiten
    )

    assemblies_with_details = []
    for assembly_data in active_assemblies:
        transformer_details = next(
            (
                t
                for t in library_data.get("components", {}).get("transformers", [])
                if t.get("templateProductInformation", {}).get("name")
                == assembly_data.get("transformerName")
            ),
            None,
        )
        rail_details = next(
            (
                r
                for r in library_data.get("components", {}).get("copperRails", [])
                if r.get("templateProductInformation", {}).get("name")
                == assembly_data.get("copperRailName")
            ),
            None,
        )
        if transformer_details:
            assembly_data["transformer_details"] = transformer_details
        if rail_details:
            assembly_data["copperRail_details"] = rail_details
        assemblies_with_details.append(assembly_data)

    standalone_with_details = []
    for component_data in active_standalone:
        component_details = next(
            (
                s
                for s in library_data.get("components", {}).get("transformerSheets", [])
                if s.get("templateProductInformation", {}).get("name")
                == component_data.get("name")
            ),
            None,
        )
        if component_details:
            component_data["component_details"] = component_details
        standalone_with_details.append(component_data)

    initial_labels = calculate_label_positions(
        assemblies_with_details,
        standalone_with_details,
        leiter_bewegungspfade[0],
        spielraum,
    )

    peak_current = nennstrom_float * math.sqrt(2)
    electrical_system = data.get("electricalSystem", [])
    for phase in electrical_system:
        phase["peakCurrentA"] = peak_current

    final_assemblies = []
    for assembly_data in assemblies_with_details:
        phase_name = assembly_data.get("phaseName")
        if startpositionen and f"x_{phase_name}" in startpositionen:
            assembly_data["calculated_positions"] = [
                step[phase_name] for step in leiter_bewegungspfade
            ]
            final_assemblies.append(assembly_data)

    # Materialien aus der Bibliothek übernehmen
    materials = library_data.get("materials", [])

    simulation_data = {
        "description": "Konfiguration erstellt via Web-UI",
        "scenarioParams": sim_params,
        "materials": materials,
        "electricalSystem": electrical_system,
        "assemblies": final_assemblies,
        "standAloneComponents": standalone_with_details,
        "simulation_meta": {
            "nennstrom_A": nennstrom_str,
            "bewegungsgruppe": bewegungs_richtungen,
            "simulationsraum": spielraum,
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
    library_data = load_json(os.path.join(BASE_DIR, LIBRARY_FILE))

    active_assemblies = [
        asm for asm in data.get("assemblies", []) if asm.get("enabled", True)
    ]
    active_standalone = [
        comp
        for comp in data.get("standAloneComponents", [])
        if comp.get("enabled", True)
    ]

    sim_params = data.get("simulationParams", {})
    spielraum = sim_params.get("spielraum")
    startpositionen = sim_params.get("startpositionen")
    bewegungs_richtungen = sim_params.get("bewegungsRichtungen", {})
    schrittweiten = sim_params.get("schrittweiten")

    position_steps = calculate_position_steps(
        startpositionen, bewegungs_richtungen, schrittweiten
    )

    assemblies = active_assemblies
    for asm in assemblies:
        asm["transformer_details"] = next(
            (
                t
                for t in library_data.get("components", {}).get("transformers", [])
                if t.get("templateProductInformation", {}).get("name")
                == asm.get("transformerName")
            ),
            None,
        )
        asm["copperRail_details"] = next(
            (
                r
                for r in library_data.get("components", {}).get("copperRails", [])
                if r.get("templateProductInformation", {}).get("name")
                == asm.get("copperRailName")
            ),
            None,
        )

    standalone_components = active_standalone
    for comp in standalone_components:
        comp["component_details"] = next(
            (
                s
                for s in library_data.get("components", {}).get("transformerSheets", [])
                if s.get("templateProductInformation", {}).get("name")
                == comp.get("name")
            ),
            None,
        )

    scenes = []
    coordinate_summary = []
    for i, step in enumerate(position_steps):
        scene_elements = []
        step_coords = {"step_name": f"Positionsschritt {i}", "components": []}

        for asm in assemblies:
            phase = asm.get("phaseName")
            pos = step.get(phase, {"x": 0, "y": 0})
            trans = asm.get("transformer_details")
            rail = asm.get("copperRail_details")

            if trans and rail:
                t_geo = trans["specificProductInformation"]["geometry"]
                r_geo = rail["specificProductInformation"]["geometry"]
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
                        {
                            "type": "rect",
                            "x": pos["x"] - r_geo["width"] / 2,
                            "y": pos["y"] - r_geo["height"] / 2,
                            "width": r_geo["width"],
                            "height": r_geo["height"],
                            "fill": "#b87333",
                        },
                        {
                            "type": "text",
                            "x": pos["x"],
                            "y": pos["y"] + t_geo["coreOuterHeight"] / 2 + 10,
                            "text": phase,
                        },
                    ]
                )
                step_coords["components"].append(
                    {
                        "name": asm.get("name"),
                        "type": "Assembly",
                        "x": pos["x"],
                        "y": pos["y"],
                    }
                )

        for comp in standalone_components:
            pos = comp.get("position", {"x": 0, "y": 0})
            sheet = comp.get("component_details")
            if sheet:
                s_geo = sheet["specificProductInformation"]["geometry"]
                rotation = comp.get("rotation", 0)

                if s_geo.get("type") == "SheetPackage":
                    sheet_count = s_geo.get("sheetCount", 1)
                    sheet_thickness = s_geo.get("sheetThickness", 0)
                    insulation_thickness = (
                        s_geo.get("insulationThickness", 0)
                        if s_geo.get("withInsulation")
                        else 0
                    )
                    total_width = (sheet_count * sheet_thickness) + (
                        2 * insulation_thickness
                    )

                    current_offset = -total_width / 2

                    if s_geo.get("withInsulation"):
                        scene_elements.append(
                            {
                                "type": "rect",
                                "x": pos["x"] + current_offset,
                                "y": pos["y"] - s_geo["height"] / 2,
                                "width": insulation_thickness,
                                "height": s_geo["height"],
                                "fill": "#ADD8E6",
                                "transform": f"rotate({-rotation} {pos['x']} {pos['y']})",
                            }
                        )
                        current_offset += insulation_thickness

                    for _ in range(sheet_count):
                        scene_elements.append(
                            {
                                "type": "rect",
                                "x": pos["x"] + current_offset,
                                "y": pos["y"] - s_geo["height"] / 2,
                                "width": sheet_thickness,
                                "height": s_geo["height"],
                                "fill": "#a9a9a9",
                                "transform": f"rotate({-rotation} {pos['x']} {pos['y']})",
                            }
                        )
                        current_offset += sheet_thickness

                    if s_geo.get("withInsulation"):
                        scene_elements.append(
                            {
                                "type": "rect",
                                "x": pos["x"] + current_offset,
                                "y": pos["y"] - s_geo["height"] / 2,
                                "width": insulation_thickness,
                                "height": s_geo["height"],
                                "fill": "#ADD8E6",
                                "transform": f"rotate({-rotation} {pos['x']} {pos['y']})",
                            }
                        )

                else:
                    scene_elements.append(
                        {
                            "type": "rect",
                            "x": pos["x"] - s_geo.get("width", 0) / 2,
                            "y": pos["y"] - s_geo.get("height", 0) / 2,
                            "width": s_geo.get("width", 0),
                            "height": s_geo.get("height", 0),
                            "fill": "#a9a9a9",
                            "transform": f"rotate({-rotation} {pos['x']} {pos['y']})",
                        }
                    )
                step_coords["components"].append(
                    {
                        "name": comp.get("name"),
                        "type": "Standalone",
                        "x": pos["x"],
                        "y": pos["y"],
                        "rotation": rotation,
                    }
                )

        scenes.append({"name": f"Schritt {i}", "elements": scene_elements})
        coordinate_summary.append(step_coords)

    return jsonify(
        {
            "scenes": scenes,
            "room": spielraum,
            "position_steps": len(position_steps),
            "coordinate_summary": coordinate_summary,
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=2020, debug=True)
