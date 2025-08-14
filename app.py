import os
import json
import subprocess
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/run-simulation", methods=["POST"])
def run_simulation():
    try:
        params = request.get_json()
        config_filepath = os.path.join(os.getcwd(), "simulation_config.json")
        with open(config_filepath, "w") as f:
            json.dump(params, f, indent=4)
        print(f"Standardisierte Parameter in {config_filepath} gespeichert.")

        # FINALE KORREKTUR: Der Pfad zeigt jetzt auf den korrekten 'src'-Ordner.
        # Falls du den Ordner anders genannt hast, passe 'src' hier an.
        matlab_script_path = os.path.join(os.getcwd(), "src", "simulation_main.m")

        # Der Befehl ruft das Skript über seinen vollen Pfad auf.
        matlab_command = f"run('{matlab_script_path}');"

        print("Starte Matlab-Prozess mit standardisierter Analyse...")
        process = subprocess.run(
            ["matlab", "-nodesktop", "-nosplash", "-batch", matlab_command],
            capture_output=True,
            text=True,
            check=True,
            encoding="latin-1",
        )
        print("Matlab stdout:", process.stdout)
        return jsonify(
            {"status": "success", "message": "Simulation erfolgreich abgeschlossen!"}
        )

    except Exception as e:
        error_message = str(e)
        if isinstance(e, subprocess.CalledProcessError):
            # Zeigt die detaillierte Matlab-Fehlermeldung an
            error_message = e.stdout + "\n" + e.stderr
        print(f"FEHLER: {error_message}")
        return jsonify({"status": "error", "message": error_message}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
