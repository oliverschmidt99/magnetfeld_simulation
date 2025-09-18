# server/utils.py
"""
Hilfsfunktionen und Konstanten für die Simulationsanwendung.
"""
import copy
import json
import os
import re
import secrets
from typing import Dict, List, Tuple
import math

import pandas as pd

# --- Pfad-Konfiguration ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "data")
CONFIG_DIR = "conf"
LIBRARY_FILE = "library.json"
TAGS_FILE = "tags.json"
RESULTS_DIR = "res"


def load_json(file_path, default_data=None):
    """Lädt JSON-Daten aus einer Datei."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default_data if default_data is not None else {}


def load_csv(filename: str):
    """
    Lädt eine CSV-Datei sicher aus dem data-Verzeichnis und bereinigt die Header.
    Versucht robust, das korrekte Trennzeichen (Semikolon oder Komma) zu verwenden.
    """
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        return []

    try:
        # Versuch 1: Semikolon als Trennzeichen (üblich in DE)
        df = pd.read_csv(filepath, sep=";", engine="python", encoding="utf-8-sig")
        # Wenn nur eine Spalte erkannt wird, war das Trennzeichen falsch
        if len(df.columns) <= 1:
            # Versuch 2: Komma als Trennzeichen
            df = pd.read_csv(filepath, sep=",", engine="python", encoding="utf-8-sig")

        df.columns = [col.strip() for col in df.columns]
        return df.where(pd.notna(df), None).to_dict("records")
    except (IOError, pd.errors.ParserError) as e:
        print(f"Konnte die CSV-Datei '{filename}' nicht laden. Fehler: {e}")
        return []


def save_data(file_path, data):
    """Speichert Daten in eine JSON-Datei."""
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)


def generate_unique_id():
    """Erzeugt eine 5-stellige hexadezimale ID."""
    return secrets.token_hex(3)[:5]


def parse_direction_to_vector(direction_dict: Dict) -> Tuple[float, float]:
    """Wandelt ein Richtungs-Dictionary in einen normalisierten (x, y) Vektor um."""
    try:
        x = float(direction_dict.get("x", 0))
        y = float(direction_dict.get("y", 0))
    except (ValueError, TypeError):
        x, y = 0.0, 0.0

    if x == 0 and y == 0:
        return (0.0, 0.0)

    norm = math.sqrt(x**2 + y**2)
    return (x / norm, y / norm) if norm > 0 else (0.0, 0.0)


def calculate_position_steps(
    start_pos: Dict, bewegung: Dict, schrittweiten: Dict
) -> List[Dict]:
    """Berechnet alle Positionsschritte."""
    all_steps = []

    conductors = sorted(list(set([key.split("_")[1] for key in start_pos.keys()])))
    if not conductors:
        conductors = ["L1", "L2", "L3"]

    start_pos_vec = {
        leiter: {
            "x": float(start_pos.get(f"x_{leiter}", 0)),
            "y": float(start_pos.get(f"y_{leiter}", 0)),
        }
        for leiter in conductors
    }

    current_pos = copy.deepcopy(start_pos_vec)
    all_steps.append(current_pos)

    for i in range(1, 5):
        pos_key = f"Pos{i}"
        step_width_str = schrittweiten.get(pos_key)

        if not step_width_str or float(step_width_str) == 0:
            continue

        step_width = float(step_width_str)
        next_pos = copy.deepcopy(all_steps[-1])

        for leiter in conductors:
            direction_dict = bewegung.get(leiter, {})
            vector = parse_direction_to_vector(direction_dict)
            next_pos[leiter]["x"] += vector[0] * step_width
            next_pos[leiter]["y"] += vector[1] * step_width
        all_steps.append(next_pos)

    return all_steps


def calculate_label_positions(assemblies, standalone_components, positions, room):
    """Berechnet die Positionen aller Material-Labels für die Simulation."""
    labels = []

    # Labels für Baugruppen
    for asm_data in assemblies:
        phase_name = asm_data.get("phaseName")
        pos = positions.get(phase_name, {"x": 0, "y": 0})

        transformer = asm_data.get("transformer_details")
        rail = asm_data.get("copperRail_details")

        if transformer and rail:
            t_geo = transformer["specificProductInformation"]["geometry"]
            r_geo = rail["specificProductInformation"]["geometry"]

            labels.append({"material": "Copper", "x": pos["x"], "y": pos["y"]})

            steel_x = (
                pos["x"]
                + (t_geo.get("coreInnerWidth", 0) + t_geo.get("coreOuterWidth", 0)) / 4
            )
            labels.append({"material": "M-36 Steel", "x": steel_x, "y": pos["y"]})

            air_x = (
                pos["x"] + (r_geo.get("width", 0) + t_geo.get("coreInnerWidth", 0)) / 4
            )
            labels.append({"material": "Air", "x": air_x, "y": pos["y"]})

    # Labels für eigenständige Bauteile
    for comp_data in standalone_components:
        sheet = comp_data.get("component_details")
        if sheet:
            pos = comp_data.get("position", {"x": 0, "y": 0})
            material = sheet["specificProductInformation"]["geometry"].get(
                "material", "M-36 Steel"
            )
            labels.append(
                {"material": material, "x": pos.get("x", 0), "y": pos.get("y", 0)}
            )

    # Labels für den Simulationsraum
    room_length = float(room.get("Laenge", room.get("Länge", 0)))
    room_width = float(room.get("Breite", 0))
    labels.append(
        {"material": "Air", "x": room_length / 2 - 10, "y": room_width / 2 - 10}
    )
    labels.append(
        {"material": "Air", "x": -room_length / 2 + 10, "y": -room_width / 2 + 10}
    )

    return labels
