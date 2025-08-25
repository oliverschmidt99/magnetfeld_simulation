# server/analysis.py
"""
Blueprint für die Analyse- und Visualisierungs-Endpunkte.
"""
import os
from flask import Blueprint, jsonify, request
from werkzeug.utils import safe_join
from server.utils import (
    RESULTS_DIR,
    parse_fem_ans_files,
    calculate_b_field,
    get_contour_lines,
    load_data,
    LIBRARY_FILE,
)

analysis_bp = Blueprint("analysis_bp", __name__)


@analysis_bp.route("/analysis/runs")
def list_runs():
    """Listet alle Simulationsläufe im res-Ordner auf."""
    runs = []
    try:
        for date_dir in sorted(os.listdir(RESULTS_DIR), reverse=True):
            date_path = os.path.join(RESULTS_DIR, date_dir)
            if os.path.isdir(date_path):
                for run_dir in sorted(os.listdir(date_path), reverse=True):
                    runs.append(f"{date_dir}/{run_dir}")
    except OSError:
        pass
    return jsonify(runs)


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
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@analysis_bp.route("/analysis/data/<path:filepath>")
def get_analysis_data(filepath):
    """Parst eine .ans- und .fem-Datei und gibt die Plot-Daten als JSON zurück."""
    try:
        # Pfade für beide Dateien erstellen
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
    except Exception as e:
        return jsonify({"error": f"Fehler bei Dateiverarbeitung: {e}"}), 500


def get_transformer_components(t, pos):
    """Extrahiert sicher die geometrischen Teile eines Wandlers."""
    components, geo = [], t.get("specificProductInformation", {}).get("geometry", {})
    pos_x, pos_y = pos.get("x", 0), pos.get("y", 0)
    if geo.get("type") != "Rectangle":
        return []

    def get_dim(key):
        return geo.get(key, 0) or 0

    dims = ["outerAir", "coreOuter", "coreInner", "inner"]
    labels = ["Outer Air", "Steel Core", "Inner Air", "Air Gap"]
    fills = ["#f0f8ff", "#d3d3d3", "#f0f8ff", "#ffffff"]

    for i, dim_name in enumerate(dims):
        w, h = get_dim(f"{dim_name}Width"), get_dim(f"{dim_name}Height")
        components.append(
            {
                "type": "rect",
                "x": pos_x - w / 2,
                "y": pos_y - h / 2,
                "width": w,
                "height": h,
                "fill": fills[i],
                "label": labels[i],
            }
        )
    return components


@analysis_bp.route("/visualize", methods=["POST"])
def visualize_setup():
    """Erstellt eine SVG-Vorschau für den Konfigurator."""
    library = load_data(LIBRARY_FILE, {"components": {}})
    form_data = request.json
    svg_elements = []

    all_rails = library.get("components", {}).get("copperRails", [])
    all_transformers = library.get("components", {}).get("transformers", [])
    all_sheets = library.get("components", {}).get("transformerSheets", [])

    for asm in form_data.get("assemblies", []):
        pos = asm.get("position", {})
        transformer = next(
            (
                t
                for t in all_transformers
                if t["templateProductInformation"]["name"] == asm.get("transformerName")
            ),
            None,
        )
        if transformer:
            svg_elements.extend(get_transformer_components(transformer, pos))

        rail = next(
            (
                r
                for r in all_rails
                if r["templateProductInformation"]["name"] == asm.get("copperRailName")
            ),
            None,
        )
        if rail:
            geo = rail.get("specificProductInformation", {}).get("geometry", {})
            w, h = geo.get("width", 0) or 0, geo.get("height", 0) or 0
            svg_elements.append(
                {
                    "type": "rect",
                    "x": pos.get("x", 0) - w / 2,
                    "y": pos.get("y", 0) - h / 2,
                    "width": w,
                    "height": h,
                    "fill": "#b87333",
                    "label": asm.get("copperRailName"),
                }
            )

    for comp in form_data.get("standAloneComponents", []):
        pos = comp.get("position", {})
        sheet = next(
            (
                s
                for s in all_sheets
                if s["templateProductInformation"]["name"] == comp.get("name")
            ),
            None,
        )
        if sheet:
            geo = sheet.get("specificProductInformation", {}).get("geometry", {})
            w, h = geo.get("width", 0) or 0, geo.get("height", 0) or 0
            svg_elements.append(
                {
                    "type": "rect",
                    "x": pos.get("x", 0) - w / 2,
                    "y": pos.get("y", 0) - h / 2,
                    "width": w,
                    "height": h,
                    "fill": "#a9a9a9",
                    "label": comp.get("name"),
                }
            )

    return jsonify(svg_elements)
