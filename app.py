"""
Hauptanwendung für den FEMM-Simulationskonfigurator.

Diese Flask-Anwendung stellt eine Web-Oberfläche zur Verfügung, um FEMM-Simulationen
interaktiv zu konfigurieren und zu verwalten.
"""

# 1. Standard-Bibliotheken
import copy
import csv
import json
import os
from typing import Any, Dict, List, Tuple

# 2. Third-Party-Bibliotheken
from flask import Flask, jsonify, render_template, request

# Annahme: Die app.py liegt im Hauptverzeichnis des Projekts
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCENARIOS_DIR = os.path.join(BASE_DIR, "conf")

app = Flask(__name__)

# --- Hilfsfunktionen zum Laden von Daten ---


def load_json(filename: str) -> Any:
    """Lädt eine JSON-Datei sicher aus dem Projektverzeichnis."""
    filepath = os.path.join(BASE_DIR, filename)
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def load_csv(filename: str) -> List[Dict]:
    """Lädt eine CSV-Datei sicher aus dem Projektverzeichnis."""
    filepath = os.path.join(BASE_DIR, filename)
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            return list(reader)
    except FileNotFoundError:
        return []


# --- BERECHNUNGSLOGIK FÜR BEWEGUNG ---


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
    """Berechnet die Koordinaten für alle Positionsschritte."""
    all_steps = []
    for i in range(1, 4):
        pos_key = f"Pos{i}"
        step_width = schrittweiten.get(pos_key, 0)
        current_pos = all_steps[-1] if all_steps else start_pos
        next_pos = copy.deepcopy(current_pos)
        for leiter in ["L1", "L2", "L3"]:
            direction_str = bewegung.get(leiter, "")
            vector = parse_direction_to_vector(direction_str)
            next_pos[leiter]["x"] += vector[0] * step_width
            next_pos[leiter]["y"] += vector[1] * step_width
        all_steps.append(next_pos)
    return [start_pos] + all_steps


# --- FLASK ROUTEN (ALLE SEITEN) ---


@app.route("/")
def index():
    """Zeigt die Hauptseite an."""
    return render_template("index.html")


@app.route("/configurator")
def configurator():
    """Zeigt die Konfigurator-Seite an."""
    library = load_json("library.json")
    bewegungen = load_csv("bewegungen.csv")
    return render_template("configurator.html", library=library, bewegungen=bewegungen)


@app.route("/simulation")
def simulation():
    """Zeigt die Simulations-Seite an."""
    # Hier Logik für die Simulationsseite einfügen
    return render_template("simulation.html")


@app.route("/analysis")
def analysis():
    """Zeigt die Analyse-Seite an."""
    # Hier Logik für die Analyse-Seite einfügen
    return render_template("analysis.html")


@app.route("/bauteile")
def bauteile():
    """Zeigt die Bauteile-Seite an."""
    library = load_json("library.json")
    return render_template("bauteile.html", library=library)


@app.route("/admin")
def admin():
    """Platzhalter für die Admin-Seite."""
    return "Admin-Seite (noch nicht implementiert)"


@app.route("/settings")
def settings():
    """Zeigt die Einstellungs-Seite an."""
    return render_template("settings.html")


# --- API ENDPUNKTE ---


@app.route("/generate", methods=["POST"])
def generate_simulation():
    """
    Nimmt die Konfiguration vom Frontend entgegen, berechnet die Leiterpositionen
    und erstellt die finale simulation.json.
    """
    data = request.json

    stammdaten = load_json("stammdaten.json")
    bewegungen_data = load_csv("bewegungen.csv")
    library = load_json("library.json")

    sim_params = data.get("simulationParams", {})
    nennstrom_str = sim_params.get("ratedCurrent", "600")
    nennstrom = int(nennstrom_str)
    bewegung_gruppe_name = sim_params.get("movementGroup")

    strom_key = f"{nennstrom}A"
    aktuelle_stammdaten = stammdaten.get(strom_key)
    if not aktuelle_stammdaten:
        return (
            jsonify(
                {"error": f"Keine Stammdaten für Nennstrom {nennstrom}A gefunden."}
            ),
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

    startpositionen = aktuelle_stammdaten["startpositionen"]
    schrittweiten = aktuelle_stammdaten["schrittweiten"]
    leiter_bewegungspfade = calculate_position_steps(
        startpositionen, gewaehlte_bewegung, schrittweiten
    )

    final_assemblies = []
    for assembly_data in data.get("assemblies", []):
        phase_name = assembly_data.get("phaseName")
        if phase_name in startpositionen:
            transformer_details = next(
                (
                    t
                    for t in library.get("components", {}).get("transformers", [])
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
            "simulationsraum": aktuelle_stammdaten["spielraum"],
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
