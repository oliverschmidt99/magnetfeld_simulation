# server/utils.py
"""
Hilfsfunktionen und Konstanten für die Simulationsanwendung.

Enthält Funktionen zum Laden/Speichern von Daten, zur ID-Generierung
und zur Verarbeitung von FEMM-Ergebnisdateien.
"""
import json
import secrets
import re
import os

# --- Pfad-Konfiguration ---
CONFIG_DIR = "conf"
LIBRARY_FILE = os.path.join(CONFIG_DIR, "library.json")
TAGS_FILE = os.path.join(CONFIG_DIR, "tags.json")
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


def parse_fem_ans_files(fem_path, ans_path):
    """
    Liest die Geometrie aus einer .fem-Datei und die Lösung aus einer .ans-Datei.
    """
    nodes, elements, solution = {}, [], {}
    print(f"\n--- DEBUG: Lese Geometrie aus: {fem_path} ---")

    # 1. Geometrie aus .fem-Datei lesen
    try:
        with open(fem_path, "r", encoding="utf-8") as f:
            content = f.read()
        # Extrahiert den Block zwischen [Nodes] und [NumElements]
        node_block = re.search(
            r"\[Nodes\](.*?)\[NumElements\]", content, re.DOTALL | re.IGNORECASE
        ).group(1)
        for line in node_block.strip().split("\n"):
            parts = line.split()
            if len(parts) >= 3:
                nodes[int(parts[0])] = (float(parts[1]), float(parts[2]))

        # Extrahiert den Block zwischen [Elements] und [NumBlockLabels]
        element_block = re.search(
            r"\[Elements\](.*?)\[NumBlockLabels\]", content, re.DOTALL | re.IGNORECASE
        ).group(1)
        for line in element_block.strip().split("\n"):
            parts = line.split()
            if len(parts) >= 7:  # Standard .fem element line has 7 columns
                elements.append(tuple(int(p) for p in parts[3:6]))
    except (AttributeError, FileNotFoundError) as e:
        print(f"FEHLER: Konnte Geometrie aus .fem-Datei nicht lesen: {e}")
        return {}, [], {}

    print(f"--- DEBUG: Lese Lösung aus: {ans_path} ---")
    # 2. Lösung aus .ans-Datei lesen
    try:
        with open(ans_path, "r", encoding="utf-8") as f:
            content = f.read()
        solution_block = re.search(
            r"\[Solution\](.*)", content, re.DOTALL | re.IGNORECASE
        ).group(1)
        for i, line in enumerate(solution_block.strip().split("\n")):
            if line.strip():
                solution[i] = float(line.split()[0])
    except (AttributeError, FileNotFoundError) as e:
        print(f"FEHLER: Konnte Lösung aus .ans-Datei nicht lesen: {e}")
        return nodes, elements, {}

    print(
        f"DEBUG: Parsing beendet. Gefunden: {len(nodes)} Knoten, {len(elements)} Elemente, {len(solution)} Lösungspunkte."
    )
    return nodes, elements, solution


def calculate_b_field(p1, p2, p3, a1, a2, a3):
    """Berechnet die mittlere Flussdichte (Bx, By) für ein Dreieck."""
    det = (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p3[0] - p1[0]) * (p2[1] - p1[1])
    if abs(det) < 1e-12:
        return (0.0, 0.0)

    # B = (dA/dy, -dA/dx)
    # This is the correct 2D curl for scalar potential A
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
                            p_start[0] * (1 - t) + p_end[0] * t,
                            p_start[1] * (1 - t) + p_end[1] * t,
                        )
                    )
            if len(sides) == 2:
                lines.append(sides)
    return lines
