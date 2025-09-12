# server/analysis.py

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
    calculate_position_steps,
    calculate_label_positions,
)

analysis_bp = Blueprint("analysis_bp", __name__)


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
    sim_params = form_data.get("simulationParams", {})

    bewegungs_richtungen = sim_params.get("bewegungsRichtungen", {})
    gewaehlte_bewegung = {
        "PosGruppe": "Manuell",
        "L1": bewegungs_richtungen.get("L1"),
        "L2": bewegungs_richtungen.get("L2"),
        "L3": bewegungs_richtungen.get("L3"),
    }

    startpositionen = sim_params.get("startpositionen")
    schrittweiten = sim_params.get("schrittweiten")
    spielraum = sim_params.get("spielraum")

    if not all([startpositionen, schrittweiten, spielraum]):
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

    assemblies_with_details = []
    for asm_data in form_data.get("assemblies", []):
        asm_data["transformer_details"] = next(
            (
                t
                for t in library.get("components", {}).get("transformers", [])
                if t.get("templateProductInformation", {}).get("name")
                == asm_data.get("transformerName")
            ),
            None,
        )
        asm_data["copperRail_details"] = next(
            (
                r
                for r in library.get("components", {}).get("copperRails", [])
                if r.get("templateProductInformation", {}).get("name")
                == asm_data.get("copperRailName")
            ),
            None,
        )
        assemblies_with_details.append(asm_data)

    standalone_with_details = []
    for comp_data in form_data.get("standAloneComponents", []):
        comp_data["component_details"] = next(
            (
                s
                for s in library.get("components", {}).get("transformerSheets", [])
                if s.get("templateProductInformation", {}).get("name")
                == comp_data.get("name")
            ),
            None,
        )
        standalone_with_details.append(comp_data)

    scenes = []
    coordinate_summary = []

    for i, step in enumerate(position_steps):
        step_name = f"Pos {i}" if i > 0 else "Start"
        svg_elements = []

        # KORRIGIERTER AUFRUF
        labels = calculate_label_positions(
            assemblies_with_details,
            standalone_with_details,
            step,
            spielraum,
        )

        step_components = []

        # Baugruppen zeichnen
        for asm in assemblies_with_details:
            phase_name = asm.get("phaseName")
            pos = step.get(phase_name)
            if not pos:
                continue

            transformer = asm.get("transformer_details")
            rail = asm.get("copperRail_details")

            if transformer and rail:
                t_geo = transformer["specificProductInformation"]["geometry"]
                r_geo = rail["specificProductInformation"]["geometry"]

                svg_elements.append(
                    {
                        "type": "text",
                        "x": pos["x"],
                        "y": pos["y"] + t_geo["coreOuterHeight"] / 2 + 10,
                        "class": "assembly-label",
                        "text": f"{phase_name}: {asm.get('name')}",
                    }
                )
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
                        "fill": "#b87333",
                    }
                )
                step_components.append(
                    {
                        "name": asm.get("name"),
                        "type": "Baugruppe",
                        "x": pos["x"],
                        "y": pos["y"],
                    }
                )

        # Eigenständige Bauteile zeichnen
        for comp in standalone_with_details:
            sheet = comp.get("component_details")
            if sheet:
                s_geo = sheet["specificProductInformation"]["geometry"]

                s_pos_raw = comp.get("position", {})
                s_pos = {}
                try:
                    s_pos["x"] = float(s_pos_raw.get("x", 0))
                except (ValueError, TypeError):
                    s_pos["x"] = 0
                try:
                    s_pos["y"] = float(s_pos_raw.get("y", 0))
                except (ValueError, TypeError):
                    s_pos["y"] = 0

                try:
                    rotation = float(comp.get("rotation", 0))
                except (ValueError, TypeError):
                    rotation = 0

                svg_elements.append(
                    {
                        "type": "rect",
                        "x": -s_geo["width"] / 2,
                        "y": -s_geo["height"] / 2,
                        "width": s_geo["width"],
                        "height": s_geo["height"],
                        "fill": "#a9a9a9",
                        "transform": f"translate({s_pos['x']}, {s_pos['y']}) rotate({rotation})",
                    }
                )
                step_components.append(
                    {
                        "name": comp.get("name"),
                        "type": "Blech",
                        "x": s_pos["x"],
                        "y": s_pos["y"],
                        "rotation": rotation,
                    }
                )

        # Alle Labels zeichnen
        for label in labels:
            svg_elements.append(
                {
                    "type": "circle",
                    "cx": label["x"],
                    "cy": label["y"],
                    "r": 3,
                    "fill": "red",
                    "material": label["material"],
                }
            )

        scenes.append({"name": step_name, "elements": svg_elements})
        coordinate_summary.append(
            {"step_name": step_name, "components": step_components}
        )

    return jsonify(
        {
            "scenes": scenes,
            "room": spielraum,
            "position_steps": position_steps,
            "coordinate_summary": coordinate_summary,
        }
    )
