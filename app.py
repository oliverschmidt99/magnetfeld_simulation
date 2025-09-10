"""
Hauptanwendung für den FEMM-Simulationskonfigurator.

Diese Flask-Anwendung stellt eine Web-Oberfläche zur Verfügung, um FEMM-Simulationen
interaktiv zu konfigurieren und zu verwalten.
"""

import os
import json
import csv
from typing import List, Dict, Any, Tuple
import copy
from flask import Flask, jsonify, render_template, request

# Importiere die Blueprints aus dem 'server'-Paket
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
    """Lädt eine CSV-Datei sicher aus dem data-Verzeichnis."""
    filepath = os.path.join(BASE_DIR, "data", filename)
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            # Annahme: Semikolon als Trennzeichen
            reader = csv.DictReader(f)
            return list(reader)
    except FileNotFoundError:
        return []


# --- Logik für den interaktiven Konfigurator ---
def parse_direction_to_vector(direction_str: str) -> Tuple[int, int]:
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
    return render_template("index.html")


@app.route("/configurator")
def configurator():
    library = load_json(LIBRARY_FILE)
    bewegungen = load_csv("3_bewegungen.csv")
    return render_template("configurator.html", library=library, bewegungen=bewegungen)


@app.route("/simulation_v2")
def simulation_v2():
    return render_template("simulation_v2.html")


@app.route("/simulation")
def simulation():
    return render_template("simulation.html")


@app.route("/analysis")
def analysis():
    return render_template("analysis.html")


@app.route("/bauteile")
def bauteile():
    library = load_json(LIBRARY_FILE)
    return render_template("bauteile.html", library=library)


@app.route("/admin")
def admin():
    return "Admin-Seite (noch nicht implementiert)"


@app.route("/settings")
def settings():
    return render_template("settings.html")


# --- API Endpunkt für den interaktiven Konfigurator ---
@app.route("/generate_v2", methods=["POST"])
def generate_simulation_v2():
    data = request.json
    library = load_json(LIBRARY_FILE)
    bewegungen_data = load_csv("3_bewegungen.csv")
    startpos_data = {item["Strom"]: item for item in load_csv("1_startpositionen.csv")}
    spielraum_data = {item["Strom"]: item for item in load_csv("2_spielraum.csv")}
    schrittweiten_data = {
        item["Strom"]: item for item in load_csv("4_schrittweiten.csv")
    }

    nennstrom = data.get("nennstrom")
    wandler_name = data.get("wandler")
    bewegung_gruppe_name = data.get("bewegungsgruppe")

    wandler_details = next(
        (
            t
            for t in library.get("components", {}).get("transformers", [])
            if t.get("templateProductInformation", {}).get("name") == wandler_name
        ),
        None,
    )
    if not wandler_details:
        return jsonify({"error": f"Wandler '{wandler_name}' nicht gefunden."}), 400

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

    startpositionen = startpos_data.get(nennstrom)
    spielraum = spielraum_data.get(nennstrom)
    schrittweiten = schrittweiten_data.get(nennstrom)

    if not all([startpositionen, spielraum, schrittweiten]):
        return jsonify({"error": f"Stammdaten für {nennstrom}A unvollständig."}), 400

    leiter_bewegungspfade = calculate_position_steps(
        startpositionen, gewaehlte_bewegung, schrittweiten
    )

    phasenwinkel_params = data.get("phasenwinkel", {})
    output = {
        "bauteildaten": wandler_details,
        "geometriedaten": {
            "startpositionen": startpositionen,
            "bewegungspfade": leiter_bewegungspfade,
        },
        "simulationsparameter": {
            "simulationsstroeme_A": [
                float(s) for s in data.get("simulationsstroeme", [])
            ],
            "phasenwinkel_sweep": {
                "start_deg": int(phasenwinkel_params.get("start", 0)),
                "end_deg": int(phasenwinkel_params.get("end", 180)),
                "step_deg": int(phasenwinkel_params.get("step", 5)),
            },
        },
        "simulationsraum": spielraum,
    }

    output_path = os.path.join(BASE_DIR, "simulation.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    return jsonify({"message": "simulation.json erfolgreich erstellt!", "data": output})


if __name__ == "__main__":
    if not os.path.exists(SCENARIOS_DIR):
        os.makedirs(SCENARIOS_DIR)
    app.run(debug=True)
