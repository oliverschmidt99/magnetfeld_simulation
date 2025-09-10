"""
Blueprint für die neue 5-Schritt-Simulation und den Simulationsstart.
"""

import os
import subprocess
import threading
from flask import Blueprint, jsonify

# Umbenannt: Der Blueprint heißt jetzt wieder simulation_bp
simulation_bp = Blueprint("simulation_bp", __name__)

# --- Status-Objekt statt globaler Variablen ---
simulation_status = {
    "running": False,
    "progress": 0,
    "status_text": "Nicht gestartet",
}

# --- Konfiguration ---
MATLAB_EXECUTABLE = "matlab"
# --------------------


def run_matlab_simulation(status_obj):
    """Führt das MATLAB-Skript aus und aktualisiert das Status-Objekt."""
    status_obj.update(
        {
            "running": True,
            "progress": 10,
            "status_text": "MATLAB wird gestartet...",
        }
    )

    try:
        project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        matlab_command = "run('main.m'); exit;"

        status_obj.update(
            {
                "progress": 30,
                "status_text": "Simulation läuft...",
            }
        )

        process = subprocess.Popen(
            [MATLAB_EXECUTABLE, "-batch", matlab_command],
            cwd=project_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
        )

        process.wait()

        if process.returncode == 0:
            status_obj.update(
                {
                    "progress": 100,
                    "status_text": "Simulation erfolgreich abgeschlossen.",
                }
            )
        else:
            error_output = process.stderr.read()
            status_obj.update(
                {
                    "progress": 0,
                    "status_text": f"Simulationsfehler: {error_output}",
                }
            )

    except (IOError, OSError, subprocess.SubprocessError) as e:
        status_obj["status_text"] = f"Ein kritischer Fehler ist aufgetreten: {str(e)}"
    finally:
        status_obj["running"] = False


@simulation_bp.route("/start_new_simulation", methods=["POST"])
def start_new_simulation():
    """Startet die 5-Schritt-Simulation in einem Hintergrund-Thread."""
    if simulation_status["running"]:
        return jsonify({"error": "Eine Simulation läuft bereits."}), 409

    thread = threading.Thread(target=run_matlab_simulation, args=(simulation_status,))
    thread.start()

    return jsonify({"message": "Simulation gestartet."})


@simulation_bp.route("/simulation_status")
def get_simulation_status():
    """Gibt den aktuellen Status der Simulation zurück."""
    return jsonify(simulation_status)
