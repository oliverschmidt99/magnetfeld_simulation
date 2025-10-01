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


def sanitize_filename(name):
    """Bereinigt einen String, um ihn als sicheren Datei- oder Ordnernamen zu verwenden."""
    if not isinstance(name, str):
        name = str(name)
    name = re.sub(r'[<>:"/\\|?*]', "_", name)
    name = name.replace(" ", "_")
    return name


def _safe_float(value, default=0.0):
    """Wandelt einen Wert sicher in einen Float um."""
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def load_json(file_path, default_data=None):
    """Lädt JSON-Daten aus einer Datei."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default_data if default_data is not None else {}


def load_csv(filename: str):
    """Lädt eine CSV-Datei sicher aus dem data-Verzeichnis und bereinigt die Header."""
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        return []
    try:
        df = pd.read_csv(filepath, sep=None, engine="python", encoding="utf-8")
        df.columns = [col.strip() for col in df.columns]
        return df.where(pd.notna(df), None).to_dict("records")
    except (IOError, pd.errors.ParserError):
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
    x = _safe_float(direction_dict.get("x"))
    y = _safe_float(direction_dict.get("y"))

    if x == 0 and y == 0:
        return (0.0, 0.0)

    norm = math.sqrt(x**2 + y**2)
    return (x / norm, y / norm) if norm > 0 else (0.0, 0.0)


def calculate_position_steps(
    start_pos: Dict, bewegung: Dict, schrittweiten: Dict
) -> List[Dict]:
    """Berechnet alle Positionsschritte."""
    all_steps = []

    start_pos = start_pos or {}
    bewegung = bewegung or {}
    schrittweiten = schrittweiten or {}

    conductors = sorted(list(set([key.split("_")[1] for key in start_pos.keys()])))
    if not conductors:
        conductors = ["L1", "L2", "L3"]

    start_pos_vec = {
        leiter: {
            "x": _safe_float(start_pos.get(f"x_{leiter}")),
            "y": _safe_float(start_pos.get(f"y_{leiter}")),
        }
        for leiter in conductors
    }

    current_pos = copy.deepcopy(start_pos_vec)
    all_steps.append(current_pos)

    for i in range(1, 5):
        pos_key = f"Pos{i}"
        step_width = _safe_float(schrittweiten.get(pos_key))

        if step_width == 0:
            continue

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


def parse_fem_ans_files(fem_path, ans_path):
    """
    Liest die Geometrie aus einer .fem-Datei und die Lösung aus einer .ans-Datei.
    """
    nodes, elements, solution = {}, [], {}
    try:
        with open(fem_path, "r", encoding="utf-8") as f:
            content = f.read()
        node_block = re.search(
            r"\[Nodes\](.*?)\[NumElements\]", content, re.DOTALL | re.IGNORECASE
        ).group(1)
        for line in node_block.strip().split("\n"):
            parts = line.split()
            if len(parts) >= 3:
                nodes[int(parts[0])] = (float(parts[1]), float(parts[2]))
        element_block = re.search(
            r"\[Elements\](.*?)\[NumBlockLabels\]", content, re.DOTALL | re.IGNORECASE
        ).group(1)
        for line in element_block.strip().split("\n"):
            parts = line.split()
            if len(parts) >= 7:
                elements.append(tuple(int(p) for p in parts[3:6]))
    except (AttributeError, FileNotFoundError):
        return {}, [], {}
    try:
        with open(ans_path, "r", encoding="utf-8") as f:
            content = f.read()
        solution_block = re.search(
            r"\[Solution\](.*)", content, re.DOTALL | re.IGNORECASE
        ).group(1)
        for i, line in enumerate(solution_block.strip().split("\n")):
            if line.strip():
                solution[i] = float(line.split()[0])
    except (AttributeError, FileNotFoundError):
        return nodes, elements, {}
    return nodes, elements, solution


def calculate_b_field(p1, p2, p3, a1, a2, a3):
    """Berechnet die mittlere Flussdichte (Bx, By) für ein Dreieck."""
    det = (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p3[0] - p1[0]) * (p2[1] - p1[1])
    if abs(det) < 1e-12:
        return (0.0, 0.0)
    bx = ((p1[1] - p2[1]) * a3 + (p2[1] - p3[1]) * a1 + (p3[1] - p1[1]) * a2) / det
    by = -((p2[0] - p1[0]) * a3 + (p3[0] - p2[0]) * a1 + (p1[0] - p3[0]) * a2) / det
    return (bx, by)


def get_contour_lines(nodes, elements, solution, num_levels=30):
    """Erzeugt Isolinien (Feldlinien) für das Vektorpotential A."""
    lines = []
    if not solution:
        return []
    min_a, max_a = min(solution.values()), max(solution.values())
    if abs(max_a - min_a) < 1e-9:
        return []
    levels = [min_a + (max_a - min_a) * i / num_levels for i in range(1, num_levels)]
    for n1, n2, n3 in elements:
        points = [nodes.get(i) for i in (n1, n2, n3)]
        potentials = [solution.get(i) for i in (n1, n2, n3)]
        if not all(p is not None for p in points) or not all(
            p is not None for p in potentials
        ):
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
                            (p_start[0] * (1 - t) + p_end[0] * t),
                            (p_start[1] * (1 - t) + p_end[1] * t),
                        )
                    )
            if len(sides) == 2:
                lines.append(sides)
    return lines
