"""
Blueprint für die API-Endpunkte zur Verwaltung von Daten.
Enthält Routen für Tags, die Bauteil-Bibliothek und Simulations-Szenarien.
"""

import os
from flask import Blueprint, jsonify, request
from server.utils import (
    load_data,
    save_data,
    generate_unique_id,
    CONFIG_DIR,
    LIBRARY_FILE,
    TAGS_FILE,
)

# Blueprint mit einem zentralen URL-Präfix für alle Routen in dieser Datei
api_bp = Blueprint("api_bp", __name__, url_prefix="/api")


@api_bp.route("/tags", methods=["GET", "POST"])
def handle_tags():
    """Verwaltet die Tags."""
    if request.method == "POST":
        try:
            tags_data = request.json
            save_data(TAGS_FILE, tags_data)
            return jsonify(
                {"message": "Tags erfolgreich aktualisiert.", "tags": tags_data}
            )
        except (IOError, TypeError) as e:
            return jsonify({"error": str(e)}), 500

    tags_data = load_data(TAGS_FILE, {"categories": []})
    return jsonify(tags_data)


@api_bp.route("/library", methods=["GET", "POST"])
def handle_library():
    """Verwaltet die Bauteil-Bibliothek."""
    library_data = load_data(LIBRARY_FILE, {"components": {}})

    if request.method == "GET":
        # KORREKTUR: Die Daten direkt zurückgeben, nicht in ein "library"-Objekt verpackt.
        # Das behebt den TypeError im Frontend.
        return jsonify(library_data)

    try:
        data = request.json
        comp_type = data.get("type")
        original_name = data.get("originalName")

        if comp_type not in library_data.get("components", {}):
            library_data["components"][comp_type] = []

        component_list = library_data["components"][comp_type]
        message = ""

        if data.get("action") == "save":
            component_data = data.get("component")
            idx = next(
                (
                    i
                    for i, item in enumerate(component_list)
                    if item.get("templateProductInformation", {}).get("name")
                    == original_name
                ),
                -1,
            )
            if idx != -1:
                uid = (
                    component_list[idx]
                    .get("templateProductInformation", {})
                    .get("uniqueNumber")
                    or generate_unique_id()
                )
                component_data["templateProductInformation"]["uniqueNumber"] = uid
                component_list[idx] = component_data
                message = "Bauteil aktualisiert."
            else:
                component_data["templateProductInformation"][
                    "uniqueNumber"
                ] = generate_unique_id()
                component_list.append(component_data)
                message = "Bauteil hinzugefügt."

        elif data.get("action") == "delete":
            library_data["components"][comp_type] = [
                item
                for item in component_list
                if item.get("templateProductInformation", {}).get("name")
                != original_name
            ]
            message = "Bauteil gelöscht."
        else:
            return jsonify({"error": "Unbekannte Aktion"}), 400

        save_data(LIBRARY_FILE, library_data)
        return jsonify({"message": message, "library": library_data})
    except (IOError, TypeError, KeyError) as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route("/scenarios", methods=["GET"])
def get_scenarios():
    """Gibt eine Liste aller Szenarien zurück."""
    try:
        files = [
            f.replace(".json", "")
            for f in os.listdir(CONFIG_DIR)
            if f.endswith(".json")
        ]
        return jsonify(sorted(files))
    except OSError as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route("/scenarios/<name>", methods=["GET", "POST", "DELETE"])
def handle_scenario(name):
    """Laden, Speichern und Löschen von Szenarien."""
    safe_name = "".join(c for c in name if c.isalnum() or c in ("-", "_")).rstrip()
    if not safe_name:
        return jsonify({"error": "Ungültiger Szenario-Name"}), 400
    filepath = os.path.join(CONFIG_DIR, f"{safe_name}.json")

    if request.method == "POST":
        try:
            save_data(filepath, request.json)
            return jsonify({"message": f"Szenario '{safe_name}' gespeichert."})
        except (IOError, TypeError) as e:
            return jsonify({"error": str(e)}), 500

    if request.method == "GET":
        try:
            return jsonify(load_data(filepath, {}))
        except FileNotFoundError:
            return jsonify({"error": "Szenario nicht gefunden"}), 404

    if request.method == "DELETE":
        try:
            os.remove(filepath)
            return jsonify({"message": f"Szenario '{safe_name}' gelöscht."})
        except FileNotFoundError:
            return jsonify({"error": "Szenario nicht gefunden"}), 404
        except OSError as e:
            return jsonify({"error": str(e)}), 500
