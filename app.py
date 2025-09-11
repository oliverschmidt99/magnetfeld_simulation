"""
Hauptanwendung für den FEMM-Simulationskonfigurator.
"""

# 1. Standard-Bibliotheken
import json
import os
import math

# 2. Third-Party-Bibliotheken
from flask import Flask, jsonify, render_template, request

# 3. Lokale Anwendungsimporte
from server.api import api_bp
from server.analysis import analysis_bp
from server.simulation import simulation_bp
from server.utils import (
    load_json,
    load_csv,
    calculate_position_steps,
    calculate_label_positions,
)

# --- Konfiguration ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCENARIOS_DIR = os.path.join(BASE_DIR, "conf")
LIBRARY_FILE = "library.json"
SIMULATION_RUN_FILE = "simulation_run.json"

app = Flask(__name__)

# --- Blueprints registrieren ---
app.register_blueprint(api_bp)
app.register_blueprint(analysis_bp)
app.register_blueprint(simulation_bp)


# --- Routen für die Webseiten ---
@app.route("/")
def index():
    """Zeigt die Hauptseite an."""
    return render_template("index.html")


@app.route("/simulation")
def simulation():
    """Zeigt die kombinierte Konfigurations- und Simulations-Seite."""
    library_data = load_json(os.path.join(BASE_DIR, LIBRARY_FILE))
    bewegungen = load_csv("bewegungen.csv")
    spielraum_data = {str(item["Strom"]): item for item in load_csv("spielraum.csv")}
    schrittweiten_data = {
        str(item["Strom"]): item for item in load_csv("schrittweiten.csv")
    }
    startpos_data = {
        str(item["Strom"]): item for item in load_csv("startpositionen.csv")
    }
    direction_options = [
        {"value": "Keine Bewegung", "text": "Keine Bewegung"},
        {"value": "Westen", "text": "⬅️ Westen"},
        {"value": "Osten", "text": "➡️ Osten"},
        {"value": "Norden", "text": "⬆️ Norden"},
        {"value": "Süden", "text": "⬇️ Süden"},
        {"value": "Nordosten", "text": "↗️ Nordosten"},
        {"value": "Nordwesten", "text": "↖️ Nordwesten"},
        {"value": "Südosten", "text": "↘️ Südosten"},
        {"value": "Südwesten", "text": "↙️ Südwesten"},
    ]
    return render_template(
        "simulation.html",
        library=library_data,
        bewegungen=bewegungen,
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


# --- API Endpunkt für den Konfigurator ---
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

    # Werte direkt aus der Anfrage übernehmen
    startpositionen = sim_params.get("startpositionen")
    schrittweiten = sim_params.get("schrittweiten")
    spielraum = sim_params.get("spielraum")

    # Bewegungsgruppe aus individuellen Dropdowns zusammensetzen
    bewegungs_richtungen = sim_params.get("bewegungsRichtungen", {})
    gewaehlte_bewegung = {
        "PosGruppe": "Manuell",
        "L1": bewegungs_richtungen.get("L1"),
        "L2": bewegungs_richtungen.get("L2"),
        "L3": bewegungs_richtungen.get("L3"),
    }

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
        startpositionen, gewaehlte_bewegung, schrittweiten
    )
    material_labels = calculate_label_positions(
        data.get("assemblies", []), leiter_bewegungspfade[0], library_data, spielraum
    )

    peak_current = nennstrom_float * math.sqrt(2)
    electrical_system = data.get("electricalSystem", [])
    for phase in electrical_system:
        phase["peakCurrentA"] = peak_current

    final_assemblies = []
    for assembly_data in data.get("assemblies", []):
        phase_name = assembly_data.get("phaseName")
        if startpositionen and f"x_{phase_name}" in startpositionen:
            transformer_details = next(
                (
                    t
                    for t in library_data.get("components", {}).get("transformers", [])
                    if t.get("templateProductInformation", {}).get("name")
                    == assembly_data.get("transformerName")
                ),
                None,
            )
            if transformer_details:
                assembly_data["transformer_details"] = transformer_details
            assembly_data["calculated_positions"] = [
                step[phase_name] for step in leiter_bewegungspfade
            ]
            final_assemblies.append(assembly_data)

    output = {
        "description": "Konfiguration erstellt via Web-UI",
        "scenarioParams": sim_params,
        "electricalSystem": electrical_system,
        "assemblies": final_assemblies,
        "standAloneComponents": data.get("standAloneComponents"),
        "simulation_meta": {
            "nennstrom_A": nennstrom_str,
            "bewegungsgruppe": gewaehlte_bewegung,
            "simulationsraum": spielraum,
            "bewegungspfade_alle_leiter": {
                "beschreibung": f"Bewegungsgruppe: Manuell",
                "schritte_details": leiter_bewegungspfade,
            },
            "material_labels": material_labels,
        },
    }

    output_path = os.path.join(BASE_DIR, SIMULATION_RUN_FILE)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    return jsonify(
        {"message": f"{SIMULATION_RUN_FILE} erfolgreich erstellt!", "data": output}
    )


if __name__ == "__main__":
    if not os.path.exists(SCENARIOS_DIR):
        os.makedirs(SCENARIOS_DIR)
    app.run(debug=True)
