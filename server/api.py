"""
Blueprint für die API-Endpunkte zur Verwaltung von Daten.

Enthält Routen für Tags, die Bauteil-Bibliothek und Simulations-Szenarien.
"""

import os
from flask import Blueprint, jsonify, request
from .utils import (
    load_data,
    save_data,
    generate_unique_id,
    CONFIG_DIR,
    LIBRARY_FILE,
    TAGS_FILE,
)

# KORREKTUR: Blueprint mit einem zentralen URL-Präfix für alle Routen
api_bp = Blueprint("api_bp", __name__, url_prefix="/api")


@api_bp.route("/tags", methods=["GET", "POST"])
def handle_tags():
    """Verwaltet die Tags."""
    if request.method == "POST":
        try:
            tags_data = request.json
            action = tags_data.get("action")

            if action == "save":
                # Standard-Speicherlogik, um Tags hinzuzufügen/aktualisieren
                save_data(TAGS_FILE, tags_data.get("tags"))
                return jsonify(
                    {"message": "Tags erfolgreich aktualisiert.", "tags": tags_data}
                )
            elif action == "delete_category":
                category_name = tags_data.get("categoryName")
                current_tags = load_data(TAGS_FILE, {"categories": []})
                current_tags["categories"] = [
                    cat
                    for cat in current_tags["categories"]
                    if cat["name"] != category_name
                ]
                save_data(TAGS_FILE, current_tags)
                return jsonify({"message": f"Kategorie '{category_name}' gelöscht."})
            elif action == "edit_category":
                original_name = tags_data.get("originalName")
                new_name = tags_data.get("newName")
                current_tags = load_data(TAGS_FILE, {"categories": []})
                for cat in current_tags["categories"]:
                    if cat["name"] == original_name:
                        cat["name"] = new_name
                        break
                save_data(TAGS_FILE, current_tags)
                return jsonify(
                    {
                        "message": f"Kategorie '{original_name}' zu '{new_name}' umbenannt."
                    }
                )
            else:
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
        return jsonify(library_data)

    try:
        data = request.json
        comp_type = data.get("type")
        original_name = data.get("originalName")
        message = ""

        if comp_type not in library_data.get("components", {}):
            library_data["components"][comp_type] = []
        component_list = library_data["components"][comp_type]

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
        if not os.path.exists(CONFIG_DIR):
            return jsonify([])  # Leere Liste, wenn der Ordner nicht existiert
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
