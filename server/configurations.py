# server/configurations.py
"""
Blueprint für das Speichern und Laden von Simulationskonfigurationen.
"""
import os
import json
import re
from flask import Blueprint, jsonify, request

configurations_bp = Blueprint("configurations_bp", __name__)

# Pfad zum Ordner, in dem die Konfigurationen gespeichert werden
CONFIG_DIR = os.path.join(os.path.dirname(__file__), "..", "configurations")
if not os.path.exists(CONFIG_DIR):
    os.makedirs(CONFIG_DIR)


def sanitize_filename(name):
    """Bereinigt einen String, um ihn als sicheren Dateinamen zu verwenden."""
    # Entferne ungültige Zeichen
    name = re.sub(r'[<>:"/\\|?*]', "", name)
    # Ersetze Leerzeichen durch Unterstriche
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
        return (
            jsonify(
                {"error": "Konfiguration konnte nicht gelesen oder verarbeitet werden."}
            ),
            500,
        )
