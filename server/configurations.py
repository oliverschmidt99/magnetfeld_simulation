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
    """Listet alle gespeicherten .json Konfigurationen aus dem 'configurations'-Ordner auf."""
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
    """Durchsucht den 'simulations'-Ordner und listet alle 'simulation_run.json' auf."""
    runs = []
    if not os.path.exists(SIMULATIONS_DIR):
        return jsonify([])
    for root, _, files in os.walk(SIMULATIONS_DIR):
        if "simulation_run.json" in files:
            # Erstelle einen relativen Pfad für die Anzeige und die API
            relative_path = os.path.relpath(root, SIMULATIONS_DIR)
            # Formatieren des Namens für eine schönere Anzeige
            display_name = relative_path.replace(os.path.sep, " / ")
            runs.append({"path": relative_path, "name": display_name})
    return jsonify(sorted(runs, key=lambda x: x["name"], reverse=True))


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
    """Lädt eine spezifische Konfigurationsdatei aus dem 'configurations'-Ordner."""
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
    """Lädt eine 'simulation_run.json' aus einem Unterordner des 'simulations'-Ordners."""
    # Der Pfad wird sicher zusammengesetzt, um Directory Traversal zu vermeiden
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
