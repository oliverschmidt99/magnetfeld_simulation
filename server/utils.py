# server/utils.py
"""
Hilfsfunktionen und Konstanten für die Simulationsanwendung.

Enthält Funktionen zum Laden/Speichern von Daten, zur ID-Generierung
und zur Verarbeitung von FEMM-Ergebnisdateien.
"""
import json
import secrets
import re

# --- Pfad-Konfiguration ---
CONFIG_DIR = "conf"
LIBRARY_FILE = "library.json"
TAGS_FILE = "tags.json"
RESULTS_DIR = "res"


def load_data(file_path, default_data):
    """Lädt JSON-Daten aus einer Datei."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default_data


def save_data(file_path, data):
    """Speichert Daten in eine JSON-Datei."""
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)


def generate_unique_id():
    """Erzeugt eine 5-stellige hexadezimale ID."""
    return secrets.token_hex(3)[:5]


def parse_ans_file(filepath):
    """Liest eine .ans-Datei von FEMM und extrahiert Knoten, Elemente und die Lösung."""
    nodes, elements, solution = {}, [], {}
    mode = None
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip().lower()
            if not line:
                continue
            if "[numnodes]" in line:
                mode = "nodes"
            elif "[numelements]" in line:
                mode = "elements"
            elif "[numcircuits]" in line:
                mode = "circuits"
            elif "[solution]" in line:
                mode = "solution"
                solution_counter = 0
            else:
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
    for n1, n2, n3 in elements:
        points = [nodes.get(i) for i in (n1, n2, n3)]
        potentials = [solution.get(i) for i in (n1, n2, n3)]
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
