"""
Blueprint für die Steuerung von Simulationsläufen.
"""

import os
import subprocess
import threading
from flask import Blueprint, jsonify, current_app

simulation_bp = Blueprint("simulation_bp", __name__)


def run_matlab_script(app):
    """
    Führt das MATLAB-Skript in einem separaten Prozess aus, um die Webanwendung
    nicht zu blockieren.
    """
    with app.app_context():
        script_path = os.path.join(current_app.root_path, "main.m")
        command = ["matlab", "-batch", f"run('{script_path}')"]

        try:
            process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
            stdout, stderr = process.communicate()

            if process.returncode == 0:
                print("MATLAB-Skript erfolgreich ausgeführt.")
                print("Ausgabe:", stdout)
            else:
                print(
                    f"Fehler bei der Ausführung des MATLAB-Skripts "
                    f"(Exit Code: {process.returncode})."
                )
                print("Fehlermeldung:", stderr)

        except FileNotFoundError:
            print(
                "Fehler: 'matlab'-Befehl nicht gefunden. "
                "Stelle sicher, dass MATLAB im System-PATH ist."
            )
        except (subprocess.SubprocessError, OSError) as e:
            print(f"Ein Fehler im Subprozess ist aufgetreten: {e}")


@simulation_bp.route("/start_simulation", methods=["POST"])
def start_simulation():
    """
    Startet die MATLAB-Simulation in einem Hintergrund-Thread.
    """
    # KORREKTUR: Zustand wird über den App-Kontext verwaltet, nicht über 'global'
    simulation_thread = current_app.config.get("SIMULATION_THREAD")

    if simulation_thread and simulation_thread.is_alive():
        return (
            jsonify({"status": "error", "error": "Eine Simulation läuft bereits."}),
            409,
        )

    # pylint: disable=protected-access
    app_context = current_app._get_current_object()
    new_thread = threading.Thread(target=run_matlab_script, args=(app_context,))
    new_thread.start()

    # Speichere den neuen Thread im App-Kontext
    current_app.config["SIMULATION_THREAD"] = new_thread

    return jsonify(
        {
            "status": "success",
            "message": "Simulationsprozess wurde im Hintergrund gestartet.",
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
