"""
Hauptanwendung für den FEMM-Simulationskonfigurator.
"""

import json
import os
import math

from flask import Flask, jsonify, render_template, request

from server.api import api_bp
from server.analysis import analysis_bp
from server.simulation import simulation_bp
from server.utils import (
    load_json,
    load_csv,
    calculate_position_steps,
    calculate_label_positions,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LIBRARY_FILE = "library.json"
SIMULATION_RUN_FILE = "simulation_run.json"

app = Flask(__name__)

app.register_blueprint(api_bp)
app.register_blueprint(analysis_bp)
app.register_blueprint(simulation_bp)


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
    )


@app.route("/results")
def results():
    """Zeigt die Ergebnisseite."""
    return render_template("ergebnisse.html")


@app.route("/library")
def library():
    """Zeigt die kombinierte Bibliotheks- und Stammdaten-Verwaltung."""
    library_data = load_json(os.path.join(BASE_DIR, LIBRARY_FILE))
    return render_template("library.html", library=library_data)


@app.route("/settings")
def settings():
    """Zeigt die Einstellungs-Seite an."""
    return render_template("settings.html")


@app.route("/generate", methods=["POST"])
def generate_simulation():
    """Erstellt die `simulation_run.json` basierend auf den Benutzereingaben."""
    data = request.json
    library_data = load_json(os.path.join(BASE_DIR, LIBRARY_FILE))

    sim_params = data.get("simulationParams", {})
    nennstrom_str = sim_params.get("ratedCurrent")
    sim_params["type"] = "none"

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
    for assembly_data in data.get("assemblies", []):
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
    for component_data in data.get("standAloneComponents", []):
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

    # KORRIGIERTER AUFRUF
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

    simulation_data = {
        "description": "Konfiguration erstellt via Web-UI",
        "scenarioParams": sim_params,
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


if __name__ == "__main__":
    app.run(debug=True)
