import json
import subprocess
import os
import sys


def run_matlab_simulation(config_path):
    """
    Liest eine Konfigurationsdatei ein und startet das MATLAB-Simulationsskript.

    Args:
        config_path (str): Der Pfad zur JSON-Konfigurationsdatei.
    """
    if not os.path.exists(config_path):
        print(f"Fehler: Konfigurationsdatei nicht gefunden unter '{config_path}'")
        return

    print(f"Lese Konfiguration von: {config_path}")
    with open(config_path, "r") as f:
        config = json.load(f)

    project_name = config.get("projectName", "default_project")
    print(f"Starte Simulation für Projekt: '{project_name}'...")

    # *** HIER IST DIE ÄNDERUNG ***
    # Der Pfad zeigt jetzt auf dein gewünschtes Hauptskript.
    matlab_script_path = os.path.join("src", "main.m")

    if not os.path.exists(matlab_script_path):
        print(f"Fehler: MATLAB-Skript nicht gefunden unter '{matlab_script_path}'")
        return

    command = ["matlab", "-batch", f"run('{matlab_script_path}')"]

    print(f"Führe Befehl aus: {' '.join(command)}")

    try:
        process = subprocess.run(
            command, capture_output=True, text=True, check=True, encoding="utf-8"
        )
        print("\n--- MATLAB Output ---")
        print(process.stdout)
        print("--- Simulation erfolgreich abgeschlossen ---")

    except FileNotFoundError:
        print("\nFehler: Der Befehl 'matlab' wurde nicht gefunden.")
        print(
            "Stelle sicher, dass MATLAB installiert und der 'PATH' korrekt gesetzt ist."
        )
    except subprocess.CalledProcessError as e:
        print("\n--- Fehler bei der MATLAB-Ausführung ---")
        print("Return Code:", e.returncode)
        print("\n--- MATLAB Standard Output ---")
        print(e.stdout)
        print("\n--- MATLAB Error Output ---")
        print(e.stderr)
        print("-----------------------------------------")


if __name__ == "__main__":
    config_file = sys.argv[1] if len(sys.argv) > 1 else "simulation_config.json"
    run_matlab_simulation(config_file)
