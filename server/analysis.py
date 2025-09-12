# server/analysis.py
"""
Dieses Modul stellt die Logik für die Analyse- und Ergebnisseite bereit.
"""
import base64
import io
import os
import matplotlib

matplotlib.use("Agg")  # WICHTIG: Setzt das Backend, bevor pyplot importiert wird
import matplotlib.pyplot as plt
import pandas as pd
from flask import Blueprint, jsonify, request

analysis_bp = Blueprint("analysis_bp", __name__)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RESULTS_DIR = os.path.join(BASE_DIR, "..", "res")


@analysis_bp.route("/analysis/runs", methods=["GET"])
def get_simulation_runs():
    """Sucht nach allen Simulationsläufen und deren CSV-Dateien."""
    runs = []
    if os.path.exists(RESULTS_DIR):
        for date_folder in sorted(os.listdir(RESULTS_DIR), reverse=True):
            date_path = os.path.join(RESULTS_DIR, date_folder)
            if os.path.isdir(date_path):
                for run_folder in sorted(os.listdir(date_path), reverse=True):
                    run_path = os.path.join(date_path, run_folder)
                    if os.path.isdir(run_path):
                        csv_files = [
                            f for f in os.listdir(run_path) if f.endswith(".csv")
                        ]
                        if csv_files:
                            runs.append(
                                {
                                    "name": f"{date_folder}/{run_folder}",
                                    "csv_files": sorted(csv_files),
                                }
                            )
    return jsonify(runs)


def create_plot(df, x_col, y_col, title, xlabel, ylabel, selected_conductors):
    """Erstellt einen Plot und gibt ihn als Base64-String zurück."""
    plt.style.use("seaborn-v0_8-whitegrid")
    fig, ax = plt.subplots(figsize=(10, 5))

    if selected_conductors:
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


@analysis_bp.route(
    "/analysis/pandas_plots/<path:run_folder>/<csv_file>", methods=["GET"]
)
def get_pandas_plots(run_folder, csv_file):
    """Erstellt Plots aus der ausgewählten CSV-Datei des Laufs."""
    file_path = os.path.join(RESULTS_DIR, run_folder, csv_file)

    if not os.path.exists(file_path):
        return jsonify({"error": "Die angegebene CSV-Datei wurde nicht gefunden."})

    try:
        df = pd.read_csv(file_path)
        conductors = df["conductor"].unique().tolist()
        columns = [
            {"value": "iSecAbs_A", "name": "Sekundärstrom (Absolut)"},
            {"value": "iPrimA", "name": "Primärstrom"},
            {"value": "bAvgMagnitude_T", "name": "Flussdichte (Betrag)"},
            {"value": "iSecReal_A", "name": "Sekundärstrom (Real)"},
            {"value": "iSecImag_A", "name": "Sekundärstrom (Imaginär)"},
        ]

        selected_conductors = request.args.getlist("conductors[]")
        y_axis_variable = request.args.get("y_axis") or "iSecAbs_A"
        y_axis_name = next(
            (c["name"] for c in columns if c["value"] == y_axis_variable),
            y_axis_variable,
        )

        plot = create_plot(
            df,
            "phaseAngle",
            y_axis_variable,
            f"{y_axis_name} vs. Phasenwinkel",
            "Phasenwinkel (°)",
            y_axis_name,
            selected_conductors,
        )

        return jsonify(
            {
                "plot": plot,
                "conductors": conductors,
                "columns": columns,
            }
        )
    except (FileNotFoundError, pd.errors.ParserError) as e:
        return jsonify({"error": f"Fehler beim Lesen der Ergebnisdatei: {str(e)}"})
    except KeyError as e:
        return jsonify({"error": f"Fehlende Spalte in der CSV-Datei: {str(e)}"})
