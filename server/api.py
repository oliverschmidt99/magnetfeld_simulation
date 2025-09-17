"""
Dieses Modul stellt die API-Endpunkte für die Anwendung bereit.
"""

from flask import Blueprint, jsonify, request

from .utils import load_json, save_data, TAGS_FILE, LIBRARY_FILE
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
    tags_data = load_json(TAGS_FILE, {"categories": []})
    return jsonify(tags_data)


@api_bp.route("/tags", methods=["POST"])
def update_tags():
    """Speichert die gesamte Tag-Struktur."""
    data = request.json
    save_data(TAGS_FILE, data)
    return jsonify({"success": True, "message": "Tags gespeichert."})


# --- Library Management ---
@api_bp.route("/library", methods=["GET"])
def get_library():
    """Gibt die gesamte Bauteil-Bibliothek zurück."""
    library_data = load_json(LIBRARY_FILE, {"components": {}, "materials": []})
    return jsonify(library_data)


@api_bp.route("/library", methods=["POST"])
def update_library():
    """Aktualisiert oder löscht ein Bauteil oder Material in der Bibliothek."""
    data = request.json
    action = data.get("action")

    library = load_json(LIBRARY_FILE, {"components": {}, "materials": []})

    if action == "save":
        component_type = data.get("type")
        original_name = data.get("originalName")
        component_data = data.get("component")
        if component_type not in library["components"]:
            library["components"][component_type] = []
        components_list = library["components"][component_type]
        if original_name:
            found = False
            for i, comp in enumerate(components_list):
                if (
                    comp.get("templateProductInformation", {}).get("name")
                    == original_name
                ):
                    components_list[i] = component_data
                    found = True
                    break
            if not found:
                return (
                    jsonify({"message": f"Bauteil '{original_name}' nicht gefunden."}),
                    404,
                )
        else:
            components_list.append(component_data)
        save_data(LIBRARY_FILE, library)
        return jsonify({"message": "Bauteil erfolgreich gespeichert."}), 200

    elif action == "delete":
        component_type = data.get("type")
        original_name = data.get("originalName")
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
            else:
                return (
                    jsonify({"message": f"Bauteil '{original_name}' nicht gefunden."}),
                    404,
                )

    elif action == "save_material":
        material_data = data.get("material")
        original_name = data.get("originalName")
        if not library.get("materials"):
            library["materials"] = []

        if original_name:  # Material bearbeiten
            found = False
            for i, mat in enumerate(library["materials"]):
                if mat.get("name") == original_name:
                    library["materials"][i] = material_data
                    found = True
                    break
            if not found:
                return (
                    jsonify({"message": f"Material '{original_name}' nicht gefunden."}),
                    404,
                )
        else:  # Neues Material
            library["materials"].append(material_data)

        save_data(LIBRARY_FILE, library)
        return jsonify({"message": "Material erfolgreich gespeichert."}), 200

    elif action == "delete_material":
        original_name = data.get("originalName")
        if library.get("materials"):
            new_list = [
                m for m in library["materials"] if m.get("name") != original_name
            ]
            if len(new_list) < len(library["materials"]):
                library["materials"] = new_list
                save_data(LIBRARY_FILE, library)
                return (
                    jsonify({"message": f"Material '{original_name}' gelöscht."}),
                    200,
                )
            else:
                return (
                    jsonify({"message": f"Material '{original_name}' nicht gefunden."}),
                    404,
                )

    return jsonify({"message": "Aktion nicht erfolgreich oder ungültig."}), 400


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
