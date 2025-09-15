# server/analysis.py
"""
Dieses Modul stellt die Logik für die Analyse- und Ergebnisseite bereit.
"""
import base64
import io
import os
import re
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
from flask import Blueprint, jsonify, request

from server.utils import load_json

analysis_bp = Blueprint("analysis_bp", __name__)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.join(BASE_DIR, "..")
RESULTS_DIR = os.path.join(PROJECT_ROOT, "simulations")
LIBRARY_FILE = os.path.join(PROJECT_ROOT, "library.json")


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
            # KORREKTUR: Regex ist jetzt flexibler
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


def create_plot(df, x_col, y_col, title, xlabel, ylabel, selected_conductors):
    """Erstellt einen Plot und gibt ihn als Base64-String zurück."""
    plt.style.use("seaborn-v0_8-whitegrid")
    fig, ax = plt.subplots(figsize=(10, 5))

    if selected_conductors and "conductor" in df.columns:
        df_filtered = df[df["conductor"].isin(selected_conductors)]
    else:
        df_filtered = df

    for label, group in df_filtered.groupby("conductor"):
        ax.plot(group[x_col], group[y_col], marker="o", linestyle="-", label=label)

    ax.set_title(title, fontsize=16)
    ax.set_xlabel(xlabel, fontsize=12)
    ax.set_ylabel(ylabel, fontsize=12)
    ax.legend()
    ax.grid(True)

    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight")
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


@analysis_bp.route("/analysis/plot", methods=["GET"])
def get_plot_data():
    """Erstellt Plots basierend auf den Filter-Parametern."""
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

        all_columns = df.columns.tolist()
        plot_columns = [
            col
            for col in all_columns
            if col
            not in [
                "conductor",
                "phaseAngle",
                "run_identifier",
                "pos_name",
                "current_name",
            ]
            and "pos_" not in col
        ]

        columns_for_frontend = [{"value": col, "name": col} for col in plot_columns]
        selected_conductors = request.args.getlist("conductors[]")
        y_axis_variable = request.args.get("y_axis") or (
            plot_columns[0] if plot_columns else None
        )

        if not y_axis_variable:
            return jsonify({"error": "Keine plotbaren Spalten gefunden."})

        plot = create_plot(
            df,
            "phaseAngle",
            y_axis_variable,
            f"{y_axis_variable} vs. Phasenwinkel",
            "Phasenwinkel (°)",
            y_axis_variable,
            selected_conductors,
        )

        return jsonify(
            {
                "plot": plot,
                "conductors": conductors,
                "columns": columns_for_frontend,
            }
        )
    except (FileNotFoundError, pd.errors.ParserError) as e:
        return jsonify({"error": f"Fehler beim Lesen der Datei: {e}"})
    except KeyError as e:
        return jsonify({"error": f"Fehlende Spalte: {e}"})


@analysis_bp.route("/analysis/preview/<path:run_folder>/<pos_group>", methods=["GET"])
def get_result_preview(run_folder, pos_group):
    """Erstellt eine SVG-Visualisierung für einen spezifischen Simulationslauf."""
    sim_run_path = os.path.join(RESULTS_DIR, run_folder, "simulation_run.json")
    if not os.path.exists(sim_run_path):
        return jsonify({"error": "simulation_run.json nicht gefunden."}), 404

    data = load_json(sim_run_path)
    library_data = load_json(LIBRARY_FILE)

    try:
        step_index = int(pos_group.split("_")[1]) - 1
    except (IndexError, ValueError):
        return jsonify({"error": "Ungültiger Positionsschritt."}), 400

    all_pos_steps = (
        data.get("simulation_meta", {})
        .get("bewegungspfade_alle_leiter", {})
        .get("schritte_details", [])
    )
    if step_index >= len(all_pos_steps):
        return jsonify({"error": "Positionsschritt existiert nicht."}), 404

    current_step_positions = all_pos_steps[step_index]
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

    scene_elements = []
    for asm in assemblies:
        phase = asm.get("phaseName")
        pos = current_step_positions.get(phase, {"x": 0, "y": 0})
        trans = asm.get("transformer_details")
        rail = asm.get("copperRail_details")
        if trans and rail:
            t_geo = trans["specificProductInformation"]["geometry"]
            r_geo = rail["specificProductInformation"]["geometry"]
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
                    {
                        "type": "rect",
                        "x": pos["x"] - r_geo["width"] / 2,
                        "y": pos["y"] - r_geo["height"] / 2,
                        "width": r_geo["width"],
                        "height": r_geo["height"],
                        "fill": "#b87333",
                    },
                    {
                        "type": "text",
                        "x": pos["x"],
                        "y": pos["y"] + t_geo["coreOuterHeight"] / 2 + 10,
                        "text": phase,
                    },
                ]
            )

    for comp in standalone_components:
        pos = comp.get("position", {"x": 0, "y": 0})
        sheet = comp.get("component_details")
        if sheet:
            s_geo = sheet["specificProductInformation"]["geometry"]
            rotation = comp.get("rotation", 0)
            scene_elements.append(
                {
                    "type": "rect",
                    "x": pos["x"] - s_geo["width"] / 2,
                    "y": pos["y"] - s_geo["height"] / 2,
                    "width": s_geo["width"],
                    "height": s_geo["height"],
                    "fill": "#a9a9a9",
                    "transform": f"rotate({-rotation} {pos['x']} {pos['y']})",
                }
            )

    return jsonify(
        {
            "scene": {"elements": scene_elements},
            "room": data.get("simulation_meta", {}).get("simulationsraum", {}),
        }
    )
