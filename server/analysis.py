# server/analysis.py
"""
Dieses Modul stellt die Logik für die Analyse- und Ergebnisseite bereit.
"""
import os
import re
import json
import numpy as np
import pandas as pd
from flask import Blueprint, jsonify, request, current_app

from server.db import get_db
from server.utils import load_json

analysis_bp = Blueprint("analysis_bp", __name__)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.join(BASE_DIR, "..")
RESULTS_DIR = os.path.join(PROJECT_ROOT, "simulations")


def _get_library_from_db():
    """Hilfsfunktion, um die Bibliothek innerhalb des Blueprints aus der DB zu laden."""
    db_conn = get_db()
    library_data = {"materials": [], "components": {}}

    # Materialien laden
    materials_cursor = db_conn.execute("SELECT * FROM materials ORDER BY name")
    for mat_row in materials_cursor.fetchall():
        material = dict(mat_row)
        bh_cursor = db_conn.execute(
            "SELECT b_value, h_value FROM bh_curve_points WHERE material_id = ?",
            (material["id"],),
        )
        material["bh_curve"] = [
            [row["b_value"], row["h_value"]] for row in bh_cursor.fetchall()
        ]
        del material["id"]
        library_data["materials"].append(material)

    # Bauteile laden
    components_cursor = db_conn.execute("SELECT * FROM components ORDER BY type, name")
    for comp_row in components_cursor.fetchall():
        comp_type = comp_row["type"]
        if comp_type not in library_data["components"]:
            library_data["components"][comp_type] = []

        component = {
            "templateProductInformation": {
                "name": comp_row["name"],
                "productName": comp_row["productName"],
                "manufacturer": comp_row["manufacturer"],
                "manufacturerNumber": comp_row["manufacturerNumber"],
                "companyNumber": comp_row["companyNumber"],
                "uniqueNumber": comp_row["uniqueNumber"],
            },
            "specificProductInformation": json.loads(
                comp_row["specificProductInformation"] or "{}"
            ),
        }
        tags_cursor = db_conn.execute(
            """SELECT t.name FROM tags t JOIN component_tags ct ON t.id = ct.tag_id
               WHERE ct.component_id = ?""",
            (comp_row["id"],),
        )
        component["templateProductInformation"]["tags"] = [
            row["name"] for row in tags_cursor.fetchall()
        ]
        library_data["components"][comp_type].append(component)

    return library_data


@analysis_bp.route("/analysis/runs", methods=["GET"])
def get_simulation_runs():
    """
    Sucht nach allen Simulationsläufen und extrahiert die verfügbaren
    Positionsschritte und gemessenen Primärströme aus der JSON-Konfiguration.
    """
    runs = []
    if not os.path.exists(RESULTS_DIR):
        return jsonify(runs)

    for date_folder in sorted(os.listdir(RESULTS_DIR), reverse=True):
        date_path = os.path.join(RESULTS_DIR, date_folder)
        if not os.path.isdir(date_path):
            continue
        for run_folder in sorted(os.listdir(date_path), reverse=True):
            run_path = os.path.join(date_path, run_folder)
            sim_run_json_path = os.path.join(run_path, "simulation_run.json")

            if not os.path.isdir(run_path) or not os.path.exists(sim_run_json_path):
                continue

            sim_config = load_json(sim_run_json_path)
            params = sim_config.get("scenarioParams", {})
            measured_currents = {
                "I_1_mes": params.get("I_1_mes"),
                "I_2_mes": params.get("I_2_mes"),
                "I_3_mes": params.get("I_3_mes"),
            }
            current_options = {
                k: v for k, v in measured_currents.items() if v and float(v) > 0
            }

            csv_files = [f for f in os.listdir(run_path) if f.endswith(".csv")]
            pos_groups = sorted(
                list(
                    set(
                        re.match(r"(pos_\d+)_.*_summary\.csv", f).groups()[0]
                        for f in csv_files
                        if re.match(r"(pos_\d+)_.*_summary\.csv", f)
                    )
                )
            )

            if pos_groups and current_options:
                runs.append(
                    {
                        "name": f"{date_folder}/{run_folder}",
                        "positions": pos_groups,
                        "currents": current_options,
                    }
                )
    return jsonify(runs)


def create_chartjs_data(df, x_col, y_col, selected_conductors):
    """Erstellt Daten im Chart.js-Format aus einem DataFrame."""
    if selected_conductors and "conductor" in df.columns:
        df_filtered = df[df["conductor"].isin(selected_conductors)]
    else:
        df_filtered = df

    df_filtered = df_filtered.sort_values(by=x_col)

    labels = df_filtered[x_col].unique().tolist()
    datasets = []

    colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"]

    conductors = df_filtered["conductor"].unique().tolist()

    for i, conductor in enumerate(conductors):
        conductor_df = df_filtered[df_filtered["conductor"] == conductor]
        data_points = []
        conductor_data_map = pd.Series(
            conductor_df[y_col].values, index=conductor_df[x_col].values
        )
        for label in labels:
            data_points.append(conductor_data_map.get(label, None))

        dataset = {
            "label": conductor,
            "data": data_points,
            "borderColor": colors[i % len(colors)],
            "fill": False,
            "tension": 0.1,
        }
        datasets.append(dataset)

    return {"labels": labels, "datasets": datasets}


@analysis_bp.route("/analysis/plot", methods=["GET"])
def get_plot_data():
    """Erstellt Chart.js-Daten basierend auf den Filter-Parametern."""
    run_folder = request.args.get("run_folder")
    pos_group = request.args.get("pos_group")
    current_group = request.args.get("current_group")

    if not all([run_folder, pos_group, current_group]):
        return jsonify({"error": "Fehlende Parameter."}), 400

    csv_file = f"{pos_group}_{current_group}_summary.csv"
    file_path = os.path.join(RESULTS_DIR, run_folder, csv_file)

    if not os.path.exists(file_path):
        return jsonify({"error": f"Datei '{csv_file}' nicht gefunden."}), 404

    try:
        df = pd.read_csv(file_path)
        conductors = df["conductor"].unique().tolist()

        # Konvertiere alle relevanten Spalten in numerische Werte
        cols_to_convert = [
            "Iprim_sim_real_A",
            "Iprim_sim_imag_A",
            "Isec_real_A",
            "Isec_imag_A",
            "circuit_voltage_real_V",
            "circuit_voltage_imag_V",
            "Flux_real_Wb",
            "Flux_imag_Wb",
            "B_avg_T",
            "H_avg_real_Am",
            "H_avg_imag_Am",
        ]
        for col in cols_to_convert:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        for real_col, imag_col, abs_col in [
            ("Iprim_sim_real_A", "Iprim_sim_imag_A", "Iprim_sim_abs_A"),
            ("Isec_real_A", "Isec_imag_A", "Isec_abs_A"),
            (
                "circuit_voltage_real_V",
                "circuit_voltage_imag_V",
                "circuit_voltage_abs_V",
            ),
            ("Flux_real_Wb", "Flux_imag_Wb", "Flux_abs_Wb"),
            ("H_avg_real_Am", "H_avg_imag_Am", "H_avg_abs_Am"),
        ]:
            if real_col in df.columns and imag_col in df.columns:
                df[abs_col] = np.sqrt(df[real_col] ** 2 + df[imag_col] ** 2)

        all_columns = df.columns.tolist()
        plot_columns = [
            col
            for col in all_columns
            if col
            not in [
                "conductor",
                "phaseAngle_deg",
                "run_identifier",
                "pos_name",
                "current_name",
            ]
            and "pos_" not in col
        ]

        columns_for_frontend = [
            {"value": col, "name": col.replace("_", " ")} for col in plot_columns
        ]

        y_axis_variable = request.args.get("y_axis")

        if not y_axis_variable or y_axis_variable not in df.columns:
            y_axis_variable = plot_columns[0] if plot_columns else None

        if not y_axis_variable:
            return (
                jsonify({"error": "Keine darstellbaren Daten in der Datei gefunden."}),
                400,
            )

        selected_conductors = request.args.getlist("conductors[]")
        y_axis_label_for_chart = y_axis_variable.replace("_", " ")

        chart_data = create_chartjs_data(
            df, "phaseAngle_deg", y_axis_variable, selected_conductors
        )

        return jsonify(
            {
                "chart_data": chart_data,
                "conductors": conductors,
                "columns": columns_for_frontend,
                "x_axis_label": "Phasenwinkel (°)",
                "y_axis_label": y_axis_label_for_chart,
            }
        )
    except (IOError, pd.errors.ParserError, KeyError, ValueError) as e:
        current_app.logger.error(f"Error in get_plot_data: {e}", exc_info=True)
        return jsonify({"error": "Ein interner Serverfehler ist aufgetreten."}), 500


@analysis_bp.route("/analysis/femm_plots", methods=["GET"])
def get_femm_plots():
    """
    Sucht alle FEMM-Plot-Bilder für einen Lauf und gibt eine Liste mit URLs und Winkeln zurück.
    """
    run_folder = request.args.get("run_folder")
    pos_group = request.args.get("pos_group")
    current_group = request.args.get("current_group")

    if not all([run_folder, pos_group, current_group]):
        return jsonify({"error": "Fehlende Parameter."}), 400

    plots_dir = os.path.join(RESULTS_DIR, run_folder, "femm_plots")
    if not os.path.isdir(plots_dir):
        return jsonify({"density_plots": [], "vector_plots": []})

    plot_files = os.listdir(plots_dir)

    pattern = re.compile(f"{pos_group}_{current_group}_angle(\\d+)_.*\\.png")

    density_plots = []
    vector_plots = []

    for filename in plot_files:
        match = pattern.match(filename)
        if match:
            angle = int(match.group(1))
            url = f"/api/analysis/results_file/{run_folder}/femm_plots/{filename}"
            plot_info = {"angle": angle, "url": url}

            if "density" in filename:
                density_plots.append(plot_info)
            elif "vector" in filename:
                vector_plots.append(plot_info)

    density_plots.sort(key=lambda p: p["angle"])
    vector_plots.sort(key=lambda p: p["angle"])

    return jsonify({"density_plots": density_plots, "vector_plots": vector_plots})


@analysis_bp.route("/analysis/full_preview/<path:run_folder>", methods=["GET"])
def get_full_result_preview(run_folder):
    """Erstellt eine vollständige SVG-Visualisierung für alle Positionsschritte eines Laufs."""
    sim_run_path = os.path.join(RESULTS_DIR, run_folder, "simulation_run.json")
    if not os.path.exists(sim_run_path):
        return jsonify({"error": "simulation_run.json nicht gefunden."}), 404

    data = load_json(sim_run_path)
    library_data = _get_library_from_db()

    spielraum = data.get("simulation_meta", {}).get("simulationsraum", {})
    position_steps = (
        data.get("simulation_meta", {})
        .get("bewegungspfade_alle_leiter", {})
        .get("schritte_details", [])
    )

    assemblies = data.get("assemblies", [])
    for asm in assemblies:
        asm["transformer_details"] = next(
            (
                t
                for t in library_data.get("components", {}).get("transformers", [])
                if t.get("templateProductInformation", {}).get("name")
                == asm.get("transformerName")
            ),
            None,
        )
        asm["copperRail_details"] = next(
            (
                r
                for r in library_data.get("components", {}).get("copperRails", [])
                if r.get("templateProductInformation", {}).get("name")
                == asm.get("copperRailName")
            ),
            None,
        )

    standalone_components = data.get("standAloneComponents", [])
    for comp in standalone_components:
        comp["component_details"] = next(
            (
                s
                for s in library_data.get("components", {}).get("transformerSheets", [])
                if s.get("templateProductInformation", {}).get("name")
                == comp.get("name")
            ),
            None,
        )

    scenes = []
    for i, step in enumerate(position_steps):
        scene_elements = []
        for asm in assemblies:
            phase = asm.get("phaseName")
            pos = step.get(phase, {"x": 0, "y": 0})
            trans = asm.get("transformer_details")
            rail = asm.get("copperRail_details")

            if rail:
                r_geo = rail["specificProductInformation"]["geometry"]

                if trans:
                    t_geo = trans["specificProductInformation"]["geometry"]
                    scene_elements.extend(
                        [
                            {
                                "type": "rect",
                                "x": pos["x"] - t_geo["coreOuterWidth"] / 2,
                                "y": pos["y"] - t_geo["coreOuterHeight"] / 2,
                                "width": t_geo["coreOuterWidth"],
                                "height": t_geo["coreOuterHeight"],
                                "fill": "#808080",
                            },
                            {
                                "type": "rect",
                                "x": pos["x"] - t_geo["coreInnerWidth"] / 2,
                                "y": pos["y"] - t_geo["coreInnerHeight"] / 2,
                                "width": t_geo["coreInnerWidth"],
                                "height": t_geo["coreInnerHeight"],
                                "fill": "white",
                            },
                        ]
                    )

                scene_elements.append(
                    {
                        "type": "rect",
                        "x": pos["x"] - r_geo["width"] / 2,
                        "y": pos["y"] - r_geo["height"] / 2,
                        "width": r_geo["width"],
                        "height": r_geo["height"],
                        "fill": "#b87333",
                    }
                )

                label_y_offset = (
                    trans["specificProductInformation"]["geometry"]["coreOuterHeight"]
                    / 2
                    if trans
                    else r_geo["height"] / 2
                )
                scene_elements.append(
                    {
                        "type": "text",
                        "x": pos["x"],
                        "y": pos["y"] + label_y_offset + 10,
                        "text": phase,
                    }
                )

        for comp in standalone_components:
            pos = comp.get("position", {"x": 0, "y": 0})
            sheet = comp.get("component_details")
            if sheet:
                s_geo = sheet["specificProductInformation"]["geometry"]
                rotation = comp.get("rotation", 0)

                if s_geo.get("type") == "SheetPackage":
                    sheet_count = s_geo.get("sheetCount", 1)
                    sheet_thickness = s_geo.get("sheetThickness", 0)
                    insulation_thickness = (
                        s_geo.get("insulationThickness", 0)
                        if s_geo.get("withInsulation")
                        else 0
                    )
                    total_width = (sheet_count * sheet_thickness) + (
                        2 * insulation_thickness
                    )
                    current_offset = -total_width / 2
                    transform = (
                        f"rotate({-rotation} {pos.get('x', 0)} {pos.get('y', 0)})"
                    )

                    if s_geo.get("withInsulation"):
                        scene_elements.append(
                            {
                                "type": "rect",
                                "x": pos["x"] + current_offset,
                                "y": pos["y"] - s_geo["height"] / 2,
                                "width": insulation_thickness,
                                "height": s_geo["height"],
                                "fill": "#e9ecef",
                                "transform": transform,
                            }
                        )
                        current_offset += insulation_thickness
                    for _ in range(sheet_count):
                        scene_elements.append(
                            {
                                "type": "rect",
                                "x": pos["x"] + current_offset,
                                "y": pos["y"] - s_geo["height"] / 2,
                                "width": sheet_thickness,
                                "height": s_geo["height"],
                                "fill": "#a9a9a9",
                                "transform": transform,
                            }
                        )
                        current_offset += sheet_thickness
                    if s_geo.get("withInsulation"):
                        scene_elements.append(
                            {
                                "type": "rect",
                                "x": pos["x"] + current_offset,
                                "y": pos["y"] - s_geo["height"] / 2,
                                "width": insulation_thickness,
                                "height": s_geo["height"],
                                "fill": "#e9ecef",
                                "transform": transform,
                            }
                        )
                else:
                    scene_elements.append(
                        {
                            "type": "rect",
                            "x": pos["x"] - s_geo.get("width", 0) / 2,
                            "y": pos["y"] - s_geo.get("height", 0) / 2,
                            "width": s_geo.get("width", 0),
                            "height": s_geo.get("height", 0),
                            "fill": "#a9a9a9",
                            "transform": f"rotate({-rotation} {pos['x']} {pos['y']})",
                        }
                    )
        scenes.append(
            {
                "name": f"Schritt {i}",
                "elements": scene_elements,
                "pos_group": f"pos_{i+1}",
            }
        )
    return jsonify({"scenes": scenes, "room": spielraum})
