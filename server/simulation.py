# server/simulation.py
"""
Blueprint für die Steuerung von Simulationsläufen.
Startet das Python-Simulationsskript im Hintergrund.
"""

import subprocess
import sys
import threading
from flask import Blueprint, jsonify, current_app

simulation_bp = Blueprint("simulation_bp", __name__)


def run_simulation_script(app):
    """
    Führt das Python-Simulationsskript in einem separaten Prozess aus,
    um die Webanwendung nicht zu blockieren.
    """
    with app.app_context():
        project_root = app.root_path
        python_executable = sys.executable

        command = [python_executable, "-m", "src.simulation_runner"]

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
                print("Ausgabe:", stdout)
            else:
                print(
                    f"Fehler bei der Ausführung des Python-Skripts "
                    f"(Exit Code: {process.returncode})."
                )
                print("Fehlermeldung:", stderr)

        except FileNotFoundError:
            print(
                f"Fehler: '{python_executable}' oder Modul 'src.simulation_runner' nicht gefunden."
            )
        except (subprocess.SubprocessError, OSError) as e:
            print(f"Ein Fehler im Subprozess ist aufgetreten: {e}")


@simulation_bp.route("/start_simulation", methods=["POST"])
def start_simulation():
    """
    Startet die Python-Simulation in einem Hintergrund-Thread.
    """
    simulation_thread = current_app.config.get("SIMULATION_THREAD")

    if simulation_thread and simulation_thread.is_alive():
        return (
            jsonify({"status": "error", "error": "Eine Simulation läuft bereits."}),
            409,
        )

    # KORREKTUR: Deaktiviert die Pylint-Warnung für den Zugriff auf das App-Objekt,
    # was für Hintergrund-Threads ein übliches Vorgehen ist.
    # pylint: disable=protected-access
    app_context = current_app._get_current_object()
    new_thread = threading.Thread(target=run_simulation_script, args=(app_context,))
    new_thread.start()

    current_app.config["SIMULATION_THREAD"] = new_thread

    return jsonify(
        {
            "status": "success",
            "message": "Simulationsprozess (Python) wurde im Hintergrund gestartet.",
        }
    )


@simulation_bp.route("/simulation_status")
def simulation_status():
    """
    Gibt den aktuellen Status des Simulations-Threads zurück.
    """
    simulation_thread = current_app.config.get("SIMULATION_THREAD")
    if simulation_thread and simulation_thread.is_alive():
        return jsonify({"status": "running"})
    return jsonify({"status": "idle"})
