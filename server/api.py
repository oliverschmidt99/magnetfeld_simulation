"""
Dieses Modul stellt die API-Endpunkte für die Anwendung bereit.
"""

from flask import Blueprint, jsonify, request
from .utils import load_data, save_data, TAGS_FILE, LIBRARY_FILE
from .csv_editor import (
    list_csv_files,
    get_csv_data,
    save_csv_data,
    get_bewegungen_data,
    save_bewegungen_data,
    get_bewegungen_options,
)

api_bp = Blueprint("api", __name__, url_prefix="/api")


# --- Tag Management ---
@api_bp.route("/tags", methods=["GET"])
def get_tags():
    """Gibt alle verfügbaren Tags zurück."""
    tags_data = load_data(TAGS_FILE, [])
    return jsonify(tags_data)


@api_bp.route("/tags", methods=["POST"])
def add_tag():
    """Fügt einen neuen Tag hinzu."""
    tags = load_data(TAGS_FILE, [])
    new_tag_name = request.json.get("name", "").strip()
    if not new_tag_name:
        return (
            jsonify({"success": False, "message": "Tag-Name darf nicht leer sein."}),
            400,
        )
    if any(tag["name"].lower() == new_tag_name.lower() for tag in tags):
        return (
            jsonify({"success": False, "message": "Dieser Tag existiert bereits."}),
            409,
        )

    new_id = max(tag["id"] for tag in tags) + 1 if tags else 1
    tags.append({"id": new_id, "name": new_tag_name})
    save_data(TAGS_FILE, tags)
    return jsonify({"success": True, "message": "Tag hinzugefügt."})


@api_bp.route("/tags/<int:tag_id>", methods=["DELETE"])
def delete_tag(tag_id):
    """Löscht einen Tag."""
    tags = load_data(TAGS_FILE, [])
    tags_before = len(tags)
    tags = [tag for tag in tags if tag["id"] != tag_id]

    if len(tags) < tags_before:
        save_data(TAGS_FILE, tags)
        return jsonify({"success": True, "message": "Tag gelöscht."})
    return jsonify({"success": False, "message": "Tag nicht gefunden."}), 404


# --- Library Management ---
@api_bp.route("/library", methods=["GET"])
def get_library():
    """Gibt die gesamte Bauteil-Bibliothek zurück."""
    library_data = load_data(LIBRARY_FILE, {"components": {}})
    return jsonify(library_data)


@api_bp.route("/library", methods=["POST"])
def update_library():
    """Aktualisiert oder löscht ein Bauteil in der Bibliothek."""
    data = request.json
    action = data.get("action")
    component_type = data.get("type")
    original_name = data.get("originalName")

    library = load_data(LIBRARY_FILE, {"components": {}})

    if action == "save":
        # Ungenutzte Variable entfernt
        # component_data = data.get("component")
        return jsonify({"message": "Bauteil gespeichert (Platzhalter)."}), 200

    elif action == "delete":
        if component_type in library["components"]:
            components_list = library["components"][component_type]
            new_list = [
                c
                for c in components_list
                if c.get("templateProductInformation", {}).get("name") != original_name
            ]
            if len(new_list) < len(components_list):
                library["components"][component_type] = new_list
                save_data(LIBRARY_FILE, library)
                return jsonify({"message": f"Bauteil '{original_name}' gelöscht."}), 200

    return jsonify({"message": "Aktion nicht erfolgreich."}), 400


# --- Routen für den CSV-Editor ---


@api_bp.route("/csv-files", methods=["GET"])
def get_csv_files():
    """Listet die verfügbaren CSV-Dateien auf."""
    return jsonify(list_csv_files())


@api_bp.route("/csv-data/<filename>", methods=["GET"])
def get_csv_file_data(filename):
    """Gibt den Inhalt einer bestimmten CSV-Datei zurück."""
    data = get_csv_data(filename)
    if data is None:
        return jsonify({"error": "Datei nicht gefunden."}), 404
    return jsonify(data)


@api_bp.route("/csv-data/<filename>", methods=["POST"])
def save_csv_file_data(filename):
    """Speichert Daten in eine bestimmte CSV-Datei."""
    data = request.json
    success, message = save_csv_data(filename, data)
    if not success:
        return jsonify({"message": message}), 500
    return jsonify({"message": message})


@api_bp.route("/bewegungen-data", methods=["GET"])
def get_bewegungen_file_data():
    """Gibt die Daten und Optionen für 3_bewegungen.csv zurück."""
    rows = get_bewegungen_data()
    options = get_bewegungen_options()
    if rows is None:
        return jsonify({"error": "Datei nicht gefunden."}), 404
    return jsonify({"rows": rows, "options": options})


@api_bp.route("/bewegungen-data", methods=["POST"])
def save_bewegungen_file_data():
    """Speichert Daten in die Datei 3_bewegungen.csv."""
    data = request.json
    success, message = save_bewegungen_data(data)
    if not success:
        return jsonify({"message": message}), 500
    return jsonify({"message": message})
