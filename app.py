"""
Hauptanwendung für den FEMM-Simulationskonfigurator.

Diese Flask-Anwendung stellt eine Web-Oberfläche zur Verfügung, um FEMM-Simulationen
interaktiv zu konfigurieren und zu verwalten.
"""

# 1. Standard-Bibliotheken
import copy
import json
import os
from typing import Any, Dict, List, Tuple

# 2. Third-Party-Bibliotheken
import pandas as pd
from flask import Flask, jsonify, render_template, request

# 3. Lokale Anwendungsimporte
from server.api import api_bp
from server.analysis import analysis_bp
from server.simulation import simulation_bp

# --- Konfiguration ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCENARIOS_DIR = os.path.join(BASE_DIR, "conf")
LIBRARY_FILE = "library.json"

app = Flask(__name__)

# --- Blueprints registrieren ---
app.register_blueprint(api_bp)
app.register_blueprint(analysis_bp)
app.register_blueprint(simulation_bp)


# --- Hilfsfunktionen ---
def load_json(filename: str) -> Any:
    """Lädt eine JSON-Datei sicher aus dem Projektverzeichnis."""
    filepath = os.path.join(BASE_DIR, filename)
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def load_csv(filename: str) -> List[Dict]:
    """Lädt eine CSV-Datei sicher aus dem data-Verzeichnis und bereinigt die Header."""
    filepath = os.path.join(BASE_DIR, "data", filename)
    if not os.path.exists(filepath):
        return []
    try:
        df = pd.read_csv(filepath, sep=None, engine="python", encoding="utf-8")
        df.columns = [col.strip() for col in df.columns]
        return df.where(pd.notna(df), None).to_dict("records")
    except (IOError, pd.errors.ParserError):
        return []


# --- Logik für den Konfigurator ---
def parse_direction_to_vector(direction_str: str) -> Tuple[int, int]:
    """Wandelt einen Richtungstext (z.B. '← Westen') in einen (x, y) Vektor um."""
    if not isinstance(direction_str, str):
        return (0, 0)
    mapping = {
        "Westen": (-1, 0),
        "Osten": (1, 0),
        "Norden": (0, 1),
        "Süden": (0, -1),
        "Nordosten": (1, 1),
        "Nordwesten": (-1, 1),
        "Südosten": (1, -1),
        "Südwesten": (-1, -1),
    }
    for key, vector in mapping.items():
        if key in direction_str:
            return vector
    return (0, 0)


def calculate_position_steps(
    start_pos: Dict, bewegung: Dict, schrittweiten: Dict
) -> List[Dict]:
    """Berechnet die Koordinaten für alle Positionsschritte basierend auf den Stammdaten."""
    all_steps = []
    start_pos_vec = {
        f"L{i}": {
            "x": float(start_pos.get(f"x_L{i}", 0)),
            "y": float(start_pos.get(f"y_L{i}", 0)),
        }
        for i in range(1, 4)
    }
    current_pos = copy.deepcopy(start_pos_vec)
    all_steps.append(current_pos)
    for i in range(1, 5):
        pos_key = f"Pos{i}"
        step_width_str = schrittweiten.get(pos_key)
        if not step_width_str:
            continue
        step_width = float(step_width_str)
        next_pos = copy.deepcopy(all_steps[-1])
        for leiter in ["L1", "L2", "L3"]:
            direction_str = bewegung.get(leiter, "")
            vector = parse_direction_to_vector(direction_str)
            next_pos[leiter]["x"] += vector[0] * step_width
            next_pos[leiter]["y"] += vector[1] * step_width
        all_steps.append(next_pos)
    return all_steps


# --- Routen für die Webseiten ---
@app.route("/")
def index():
    """Zeigt die Hauptseite an."""
    return render_template("index.html")


@app.route("/simulation")
def simulation():
    """Zeigt die kombinierte Konfigurations- und Simulations-Seite."""
    library_data = load_json(LIBRARY_FILE)
    bewegungen = load_csv("bewegungen.csv")
    return render_template(
        "simulation.html", library=library_data, bewegungen=bewegungen
    )


@app.route("/results")
def results():
    """Zeigt die Ergebnisseite."""
    return render_template("ergebnisse.html")


@app.route("/library")
def library():
    """Zeigt die kombinierte Bibliotheks- und Stammdaten-Verwaltung."""
    library_data = load_json(LIBRARY_FILE)
    return render_template("library.html", library=library_data)


@app.route("/settings")
def settings():
    """Zeigt die Einstellungs-Seite an."""
    return render_template("settings.html")


# --- API Endpunkt für den Konfigurator ---
@app.route("/generate", methods=["POST"])
def generate_simulation():
    """Erstellt die `simulation.json` basierend auf den Benutzereingaben."""
    data = request.json
    library_data = load_json(LIBRARY_FILE)

    bewegungen_data = load_csv("bewegungen.csv")
    startpos_data = {
        str(item["Strom"]): item for item in load_csv("startpositionen.csv")
    }
    schrittweiten_data = {
        str(item["Strom"]): item for item in load_csv("schrittweiten.csv")
    }
    spielraum_data = {str(item["Strom"]): item for item in load_csv("spielraum.csv")}

    sim_params = data.get("simulationParams", {})
    nennstrom = sim_params.get("ratedCurrent")
    bewegung_gruppe_name = sim_params.get("movementGroup")

    startpositionen = startpos_data.get(nennstrom)
    schrittweiten = schrittweiten_data.get(nennstrom)
    spielraum = spielraum_data.get(nennstrom)

    if not all([startpositionen, schrittweiten, spielraum]):
        return (
            jsonify({"error": f"Stammdaten für Nennstrom {nennstrom}A unvollständig."}),
            400,
        )

    gewaehlte_bewegung = next(
        (b for b in bewegungen_data if b["PosGruppe"] == bewegung_gruppe_name), None
    )
    if not gewaehlte_bewegung:
        return (
            jsonify(
                {"error": f"Bewegungsgruppe '{bewegung_gruppe_name}' nicht gefunden."}
            ),
            400,
        )

    leiter_bewegungspfade = calculate_position_steps(
        startpositionen, gewaehlte_bewegung, schrittweiten
    )

    final_assemblies = []
    for assembly_data in data.get("assemblies", []):
        phase_name = assembly_data.get("phaseName")
        if startpositionen and phase_name in startpositionen:
            transformer_details = next(
                (
                    t
                    for t in library_data.get("components", {}).get("transformers", [])
                    if t.get("templateProductInformation", {}).get("name")
                    == assembly_data["transformerName"]
                ),
                None,
            )
            assembly_data["calculated_positions"] = [
                step[phase_name] for step in leiter_bewegungspfade
            ]
            assembly_data["transformer_details"] = transformer_details
            final_assemblies.append(assembly_data)

    output = {
        "description": "Konfiguration erstellt via Web-UI mit automatischer Positionierung",
        "simulationParams": sim_params,
        "electricalSystem": data.get("electricalSystem"),
        "assemblies": final_assemblies,
        "standAloneComponents": data.get("standAloneComponents"),
        "simulation_meta": {
            "nennstrom_A": nennstrom,
            "bewegungsgruppe": gewaehlte_bewegung,
            "simulationsraum": spielraum,
            "bewegungspfade_alle_leiter": {
                "beschreibung": f"Bewegungsgruppe: {bewegung_gruppe_name}",
                "schritte_details": leiter_bewegungspfade,
            },
        },
    }

    output_path = os.path.join(BASE_DIR, "simulation.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    return jsonify({"message": "simulation.json erfolgreich erstellt!", "data": output})


if __name__ == "__main__":
    if not os.path.exists(SCENARIOS_DIR):
        os.makedirs(SCENARIOS_DIR)
    app.run(debug=True)
