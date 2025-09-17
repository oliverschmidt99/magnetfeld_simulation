# server/simulation.py
"""
Blueprint für die Steuerung von Simulationsläufen.
Startet das Python-Simulationsskript im Hintergrund.
"""
import json
import os
import subprocess
import sys
import threading
from datetime import datetime
from flask import Blueprint, jsonify, current_app

simulation_bp = Blueprint("simulation_bp", __name__)


def run_simulation_script(app, run_path):
    """
    Führt das Python-Simulationsskript in einem separaten Prozess aus.
    """
    with app.app_context():
        project_root = app.root_path
        python_executable = sys.executable
        command = [python_executable, "-m", "src.simulation_runner", run_path]

        try:
            process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=project_root,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
            stdout, stderr = process.communicate()

            if process.returncode == 0:
                print("Python-Simulationsskript erfolgreich ausgeführt.")
                if stdout:
                    print("Ausgabe (stdout):", stdout)
                if stderr:
                    print("Log-Ausgabe (stderr):", stderr)
            else:
                print(
                    f"Fehler bei der Ausführung des Python-Skripts "
                    f"(Exit Code: {process.returncode})."
                )
                print("Fehlermeldung:", stderr)

        except FileNotFoundError:
            print(
                f"Fehler: '{python_executable}' oder "
                f"Modul 'src.simulation_runner' nicht gefunden."
            )
        except (subprocess.SubprocessError, OSError) as e:
            print(f"Ein Fehler im Subprozess ist aufgetreten: {e}")
        # KORREKTUR: Der "finally"-Block wurde entfernt, um das Zurücksetzen
        # des aktiven Pfades dem Main-Thread zu überlassen.


@simulation_bp.route("/start_simulation", methods=["POST"])
def start_simulation():
    """
    Startet die Python-Simulation in einem Hintergrund-Thread.
    """
    if (
        current_app.config.get("SIMULATION_THREAD")
        and current_app.config.get("SIMULATION_THREAD").is_alive()
    ):
        return (
            jsonify({"status": "error", "error": "Eine Simulation läuft bereits."}),
            409,
        )

    now = datetime.now()
    date_str, time_str = now.strftime("%Y%m%d"), now.strftime("%H%M%S")
    run_path = os.path.join("simulations", date_str, f"{time_str}_parallel_sweep")
    current_app.config["ACTIVE_SIMULATION_PATH"] = run_path

    # pylint: disable=protected-access
    app_context = current_app._get_current_object()
    new_thread = threading.Thread(
        target=run_simulation_script, args=(app_context, run_path)
    )
    new_thread.start()
    current_app.config["SIMULATION_THREAD"] = new_thread

    return jsonify(
        {
            "status": "success",
            "message": "Simulationsprozess wurde im Hintergrund gestartet.",
        }
    )


@simulation_bp.route("/simulation_progress")
def simulation_progress():
    """
    Gibt den aktuellen Fortschritt der aktiven Simulation zurück.
    """
    active_run_path = current_app.config.get("ACTIVE_SIMULATION_PATH")

    if not active_run_path:
        return jsonify({"status": "idle"})

    try:
        status_file = os.path.join(
            current_app.root_path, active_run_path, "simulation_status.json"
        )
        with open(status_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        if data.get("status") == "complete":
            # Setze den Pfad zurück, nachdem der "complete"-Status gesendet wurde.
            current_app.config["ACTIVE_SIMULATION_PATH"] = None

        return jsonify(data)

    except (FileNotFoundError, json.JSONDecodeError):
        return jsonify({"status": "starting"})
