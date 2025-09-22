# server/configurations.py
"""
Blueprint für das Speichern und Laden von Simulationskonfigurationen.
"""
import os
import json
import re
from flask import Blueprint, jsonify, request

configurations_bp = Blueprint("configurations_bp", __name__)

# Pfade zu den relevanten Ordnern
CONFIG_DIR = os.path.join(os.path.dirname(__file__), "..", "configurations")
SIMULATIONS_DIR = os.path.join(os.path.dirname(__file__), "..", "simulations")

if not os.path.exists(CONFIG_DIR):
    os.makedirs(CONFIG_DIR)


def sanitize_filename(name):
    """Bereinigt einen String, um ihn als sicheren Dateinamen zu verwenden."""
    name = re.sub(r'[<>:"/\\|?*]', "", name)
    name = name.replace(" ", "_")
    return name


@configurations_bp.route("/configurations", methods=["GET"])
def list_configurations():
    """Listet alle gespeicherten .json Konfigurationen auf."""
    try:
        files = [
            f.replace(".json", "")
            for f in os.listdir(CONFIG_DIR)
            if f.endswith(".json")
        ]
        return jsonify(sorted(files))
    except OSError:
        return (
            jsonify({"error": "Konfigurationsordner konnte nicht gelesen werden."}),
            500,
        )


@configurations_bp.route("/simulation_runs", methods=["GET"])
def list_simulation_runs():
    """Durchsucht den 'simulations'-Ordner und listet alle abgeschlossenen Läufe auf."""
    runs = []
    if not os.path.exists(SIMULATIONS_DIR):
        return jsonify([])

    for date_folder in sorted(os.listdir(SIMULATIONS_DIR), reverse=True):
        date_path = os.path.join(SIMULATIONS_DIR, date_folder)
        if not os.path.isdir(date_path):
            continue

        for run_folder in sorted(os.listdir(date_path), reverse=True):
            run_path = os.path.join(date_path, run_folder)
            sim_run_json = os.path.join(run_path, "simulation_run.json")

            if os.path.isdir(run_path) and os.path.exists(sim_run_json):
                relative_path = os.path.join(date_folder, run_folder)
                display_name = relative_path.replace(os.path.sep, " / ")
                runs.append({"path": relative_path, "name": display_name})

    return jsonify(runs)


@configurations_bp.route("/configurations", methods=["POST"])
def save_configuration():
    """Speichert die aktuelle Konfiguration als JSON-Datei."""
    data = request.json
    name = data.get("name")
    config_data = data.get("data")

    if not name or not config_data:
        return jsonify({"error": "Name oder Konfigurationsdaten fehlen."}), 400

    filename = f"{sanitize_filename(name)}.json"
    filepath = os.path.join(CONFIG_DIR, filename)

    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(config_data, f, indent=4)
        return jsonify({"message": f"Konfiguration '{name}' erfolgreich gespeichert."})
    except IOError:
        return jsonify({"error": "Datei konnte nicht geschrieben werden."}), 500


@configurations_bp.route("/configurations/<filename>", methods=["GET"])
def load_configuration(filename):
    """Lädt eine spezifische Konfigurationsdatei."""
    sanitized_name = f"{sanitize_filename(filename)}.json"
    filepath = os.path.join(CONFIG_DIR, sanitized_name)

    if not os.path.exists(filepath):
        return jsonify({"error": "Konfiguration nicht gefunden."}), 404
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify(data)
    except (IOError, json.JSONDecodeError):
        return jsonify({"error": "Konfiguration konnte nicht gelesen werden."}), 500


@configurations_bp.route("/simulation_runs/<path:run_path>", methods=["GET"])
def load_simulation_run(run_path):
    """Lädt eine 'simulation_run.json' aus einem Unterordner."""
    safe_path = os.path.abspath(
        os.path.join(SIMULATIONS_DIR, run_path, "simulation_run.json")
    )
    if not safe_path.startswith(os.path.abspath(SIMULATIONS_DIR)):
        return jsonify({"error": "Ungültiger Pfad."}), 400

    if not os.path.exists(safe_path):
        return (
            jsonify({"error": "Konfiguration des Simulationslaufs nicht gefunden."}),
            404,
        )
    try:
        with open(safe_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify(data)
    except (IOError, json.JSONDecodeError):
        return (
            jsonify(
                {"error": "Simulationslauf-Konfiguration konnte nicht gelesen werden."}
            ),
            500,
        )
