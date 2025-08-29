# server/simulation.py
"""
Blueprint für den Start der MATLAB-Simulation.
"""
import os
import subprocess
from flask import Blueprint, jsonify, request
from server.utils import save_data, CONFIG_DIR

simulation_bp = Blueprint("simulation", __name__)

# --- Konfiguration ---
MATLAB_EXECUTABLE = "matlab"
# --------------------


@simulation_bp.route("/run_simulation", methods=["POST"])
def run_simulation():
    """Bereitet die Konfiguration vor und startet die MATLAB-Simulation im Hintergrund."""
    try:
        data = request.json
        config = data.get("baseConfig")
        config["scenarioParams"] = data.get("scenario")

        save_data(os.path.join(CONFIG_DIR, "simulation_run.json"), config)

        matlab_command = "run('main.m'); exit;"
        # KORRIGIERT: os.path.dirname zweimal anwenden, um zum Projekt-Root zu gelangen.
        project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

        subprocess.Popen([MATLAB_EXECUTABLE, "-batch", matlab_command], cwd=project_dir)

        return jsonify({"message": "Simulation im Hintergrund gestartet."})
    except (IOError, TypeError, subprocess.SubprocessError, KeyError) as e:
        return jsonify({"error": str(e)}), 500
