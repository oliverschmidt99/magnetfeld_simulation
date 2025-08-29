"""
Blueprint für die Admin-Oberfläche zum Bearbeiten von CSV-Dateien.

Enthält Routen zum Auflisten, Abrufen und Speichern von CSV-Dateien
als JSON-Daten.
"""

import os
import pandas as pd
from flask import Blueprint, jsonify, request, abort
from .measurement import get_all_visualization_data

data_editor_bp = Blueprint("data_editor_bp", __name__, url_prefix="/data")
DATA_DIR = "data"


def get_safe_filepath(filename):
    """Erstellt einen sicheren Dateipfad und verhindert Path-Traversal-Angriffe."""
    if ".." in filename or filename.startswith("/"):
        abort(400, "Ungültiger Dateiname.")
    return os.path.join(DATA_DIR, filename)


@data_editor_bp.route("/files", methods=["GET"])
def list_files():
    """Gibt eine Liste aller .csv-Dateien im data-Verzeichnis zurück."""
    try:
        files = [f for f in os.listdir(DATA_DIR) if f.endswith(".csv")]
        return jsonify(sorted(files))
    except FileNotFoundError:
        return jsonify({"error": "Das 'data'-Verzeichnis wurde nicht gefunden."}), 404


@data_editor_bp.route("/<string:filename>", methods=["GET"])
def get_csv_data(filename):
    """Liest eine CSV-Datei und gibt ihren Inhalt als JSON zurück."""
    filepath = get_safe_filepath(filename)

    if not os.path.exists(filepath):
        return jsonify({"error": f"Datei '{filename}' nicht gefunden."}), 404

    try:
        # Versuche zuerst die universelle UTF-8-Kodierung
        df = pd.read_csv(filepath, encoding="utf-8")
    except UnicodeDecodeError:
        try:
            # Wenn das fehlschlägt, versuche die ältere Windows-Kodierung
            df = pd.read_csv(filepath, encoding="cp1252")
        except (IOError, pd.errors.ParserError) as e:  # Spezifischere Exceptions
            return (
                jsonify({"error": f"Fehler beim Lesen der Datei mit cp1252: {str(e)}"}),
                500,
            )
    except (IOError, pd.errors.ParserError) as e:  # Spezifischere Exceptions
        return (
            jsonify({"error": f"Allgemeiner Fehler beim Lesen der Datei: {str(e)}"}),
            500,
        )

    # Ersetze NaN-Werte (leere Zellen) durch leere Strings für eine bessere JSON-Darstellung
    df.fillna("", inplace=True)

    preview_type = "none"
    if "1_startpositionen" in filename:
        preview_type = "startpositionen"
    elif "2_spielraum" in filename:
        preview_type = "spielraum"
    elif "3_bewegungen" in filename:
        preview_type = "bewegungen"
    elif "4_schrittweiten" in filename:
        preview_type = "schrittweiten"
    elif "5_wandler_abmessungen" in filename:
        preview_type = "wandler_abmessungen"

    return jsonify({"data": df.to_dict(orient="records"), "preview_type": preview_type})


@data_editor_bp.route("/<string:filename>", methods=["POST"])
def save_csv_data(filename):
    """Empfängt JSON-Daten und speichert sie als CSV-Datei."""
    filepath = get_safe_filepath(filename)

    if not request.is_json:
        return jsonify({"error": "Anfrage muss JSON enthalten."}), 400

    data = request.get_json()

    try:
        df = pd.DataFrame(data)
        # Speichere immer im universellen UTF-8-Format, ohne den DataFrame-Index
        df.to_csv(filepath, index=False, encoding="utf-8")
        return jsonify(
            {
                "status": "success",
                "message": f"Datei '{filename}' erfolgreich gespeichert.",
            }
        )
    except (IOError, ValueError) as e:  # Spezifischere Exceptions
        return jsonify({"error": f"Fehler beim Speichern der Datei: {str(e)}"}), 500


@data_editor_bp.route("/visualization_data", methods=["GET"])
def get_visualization_data():
    """Ruft die vollständigen Plot-Daten für die Visualisierung ab."""
    try:
        ergebnisse, grenzen = get_all_visualization_data()
        return jsonify({"ergebnisse": ergebnisse, "grenzen": grenzen})
    except Exception as e:
        return (
            jsonify({"error": f"Fehler beim Abrufen der Visualisierungsdaten: {e}"}),
            500,
        )
