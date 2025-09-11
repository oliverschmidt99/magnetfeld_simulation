"""
Blueprint für die Analyse- und Visualisierungs-Endpunkte.
"""

import os
import pandas as pd
from flask import Blueprint, jsonify, request
from werkzeug.utils import safe_join
from .utils import (
    RESULTS_DIR,
    parse_fem_ans_files,
    calculate_b_field,
    get_contour_lines,
    load_json,
    LIBRARY_FILE,
    load_csv,
    calculate_position_steps,
    calculate_label_positions,
)

analysis_bp = Blueprint("analysis_bp", __name__)


# ... (andere Routen bleiben unverändert) ...
@analysis_bp.route("/analysis/runs")
def list_runs():
    """Listet alle Simulationsläufe im res-Ordner auf."""
    runs = []
    try:
        if not os.path.exists(RESULTS_DIR):
            return jsonify([])
        for date_dir in sorted(os.listdir(RESULTS_DIR), reverse=True):
            date_path = os.path.join(RESULTS_DIR, date_dir)
            if os.path.isdir(date_path):
                for run_dir in sorted(os.listdir(date_path), reverse=True):
                    summary_path = safe_join(
                        date_path, run_dir, f"{run_dir}_summary.csv"
                    )
                    if summary_path and os.path.exists(summary_path):
                        runs.append(f"{date_dir}/{run_dir}")
    except OSError as e:
        print(f"Fehler beim Auflisten der Läufe: {e}")
    return jsonify(runs)


@analysis_bp.route("/analysis/summary_csv/<date_dir>/<time_dir>")
def get_summary_csv(date_dir, time_dir):
    """Liest eine summary.csv-Datei und gibt sie als JSON zurück."""
    try:
        run_dir_name = f"{time_dir}"
        csv_filename = f"{run_dir_name}_summary.csv"
        safe_path = safe_join(
            os.path.abspath(RESULTS_DIR), date_dir, run_dir_name, csv_filename
        )

        if not safe_path or not os.path.exists(safe_path):
            return jsonify({"error": "CSV-Datei nicht gefunden"}), 404

        df = pd.read_csv(safe_path)
        return jsonify(df.to_dict(orient="records"))
    except (pd.errors.EmptyDataError, ValueError, IOError) as e:
        return jsonify({"error": f"Fehler beim Lesen der CSV-Datei: {e}"}), 500


@analysis_bp.route("/analysis/files/<path:run_dir>")
def list_files_in_run(run_dir):
    """Listet alle .ans-Dateien in einem bestimmten Simulationslauf auf."""
    try:
        safe_run_path = safe_join(os.path.abspath(RESULTS_DIR), run_dir)
        if not safe_run_path or not os.path.isdir(safe_run_path):
            return jsonify({"error": "Ungültiger Pfad"}), 404
        femm_files_path = os.path.join(safe_run_path, "femm_files")
        if not os.path.isdir(femm_files_path):
            return jsonify([])
        ans_files = sorted(
            [f for f in os.listdir(femm_files_path) if f.endswith(".ans")]
        )
        return jsonify(ans_files)
    except OSError as e:
        return jsonify({"error": str(e)}), 500


@analysis_bp.route("/analysis/data/<path:filepath>")
def get_analysis_data(filepath):
    """Parst .ans- und .fem-Dateien und gibt die Plot-Daten als JSON zurück."""
    try:
        ans_path = safe_join(os.path.abspath(RESULTS_DIR), filepath)
        fem_path = ans_path.replace(".ans", ".fem")

        if not all(
            [ans_path, fem_path, os.path.exists(ans_path), os.path.exists(fem_path)]
        ):
            return jsonify({"error": ".ans- oder .fem-Datei nicht gefunden"}), 404

        nodes, elements, solution = parse_fem_ans_files(fem_path, ans_path)
        if not all([nodes, elements, solution]):
            return jsonify({"error": "Datei konnte nicht geparst werden."}), 500

        elements_data = [
            {
                "nodes": [nodes[n1], nodes[n2], nodes[n3]],
                "b_mag": (bx**2 + by**2) ** 0.5,
            }
            for n1, n2, n3 in elements
            if all(n in nodes and n in solution for n in (n1, n2, n3))
            for bx, by in [
                calculate_b_field(
                    nodes[n1],
                    nodes[n2],
                    nodes[n3],
                    solution[n1],
                    solution[n2],
                    solution[n3],
                )
            ]
        ]
        field_lines = get_contour_lines(nodes, elements, solution)

        return jsonify(
            {
                "nodes": list(nodes.values()),
                "elements": elements_data,
                "field_lines": field_lines,
            }
        )
    except (IOError, AttributeError) as e:
        return jsonify({"error": f"Fehler bei Dateiverarbeitung: {e}"}), 500


@analysis_bp.route("/visualize", methods=["POST"])
def visualize_setup():
    """Erstellt eine SVG-Vorschau für alle Positionsschritte."""
    library_path = os.path.join(os.path.dirname(__file__), "..", LIBRARY_FILE)
    library = load_json(library_path)
    form_data = request.json

    nennstrom_str = form_data.get("simulationParams", {}).get("ratedCurrent")
    bewegung_gruppe_name = form_data.get("simulationParams", {}).get("movementGroup")

    startpos_data = {
        str(item["Strom"]): item for item in load_csv("startpositionen.csv")
    }
    schrittweiten_data = {
        str(item["Strom"]): item for item in load_csv("schrittweiten.csv")
    }
    bewegungen_data = load_csv("bewegungen.csv")
    spielraum_data = {str(item["Strom"]): item for item in load_csv("spielraum.csv")}

    startpositionen = startpos_data.get(nennstrom_str)
    schrittweiten = schrittweiten_data.get(nennstrom_str)
    gewaehlte_bewegung = next(
        (b for b in bewegungen_data if b["PosGruppe"] == bewegung_gruppe_name), None
    )
    spielraum_raw = spielraum_data.get(nennstrom_str)

    spielraum = {}
    if spielraum_raw:
        for key, value in spielraum_raw.items():
            if key.lower() == "länge":
                spielraum["Länge"] = value
            elif key.lower() == "breite":
                spielraum["Breite"] = value
    if "Länge" not in spielraum or "Breite" not in spielraum:
        spielraum = {"Länge": "600", "Breite": "400"}

    if not all([startpositionen, schrittweiten, gewaehlte_bewegung]):
        position_steps = [
            {
                "L1": {"x": -150, "y": 0},
                "L2": {"x": 0, "y": 0},
                "L3": {"x": 150, "y": 0},
            }
        ]
    else:
        position_steps = calculate_position_steps(
            startpositionen, gewaehlte_bewegung, schrittweiten
        )

    all_rails = library.get("components", {}).get("copperRails", [])
    all_transformers = library.get("components", {}).get("transformers", [])

    scenes = []
    for i, step in enumerate(position_steps):
        step_name = f"Pos {i}" if i > 0 else "Start"
        svg_elements = []
        labels = calculate_label_positions(
            form_data.get("assemblies", []), step, library, spielraum
        )

        for asm in form_data.get("assemblies", []):
            phase_name = asm.get("phaseName")
            pos = step.get(phase_name)
            if not pos:
                continue

            transformer = next(
                (
                    t
                    for t in all_transformers
                    if t["templateProductInformation"]["name"]
                    == asm.get("transformerName")
                ),
                None,
            )
            rail = next(
                (
                    r
                    for r in all_rails
                    if r["templateProductInformation"]["name"]
                    == asm.get("copperRailName")
                ),
                None,
            )

            if transformer and rail:
                t_geo = transformer["specificProductInformation"]["geometry"]
                r_geo = rail["specificProductInformation"]["geometry"]
                svg_elements.append(
                    {
                        "type": "rect",
                        "x": pos["x"] - t_geo["coreOuterWidth"] / 2,
                        "y": pos["y"] - t_geo["coreOuterHeight"] / 2,
                        "width": t_geo["coreOuterWidth"],
                        "height": t_geo["coreOuterHeight"],
                        "fill": "#808080",
                    }
                )
                svg_elements.append(
                    {
                        "type": "rect",
                        "x": pos["x"] - t_geo["coreInnerWidth"] / 2,
                        "y": pos["y"] - t_geo["coreInnerHeight"] / 2,
                        "width": t_geo["coreInnerWidth"],
                        "height": t_geo["coreInnerHeight"],
                        "fill": "white",
                        "stroke": "#DDD",
                    }
                )
                svg_elements.append(
                    {
                        "type": "rect",
                        "x": pos["x"] - r_geo["width"] / 2,
                        "y": pos["y"] - r_geo["height"] / 2,
                        "width": r_geo["width"],
                        "height": r_geo["height"],
                        "fill": "#FFA500",
                    }
                )

        for label in labels:
            svg_elements.append(
                {
                    "type": "circle",
                    "cx": label["x"],
                    "cy": label["y"],
                    "r": 3,
                    "fill": "red",
                }
            )
            svg_elements.append(
                {
                    "type": "text",
                    "x": label["x"] + 8,
                    "y": label["y"] - 8,
                    "class": "material-label",
                    "text": f'"material": "{label["material"]}"',
                }
            )

        scenes.append({"name": step_name, "elements": svg_elements})

    return jsonify({"scenes": scenes, "room": spielraum})
