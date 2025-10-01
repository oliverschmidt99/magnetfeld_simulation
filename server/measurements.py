# server/measurements.py
"""
Dieses Modul stellt die API-Endpunkte für die Erfassung und Verwaltung von Messdaten bereit.
"""
import os
import pandas as pd
from flask import Blueprint, jsonify, request, current_app

from server.db import get_db
from server.utils import sanitize_filename

measurements_bp = Blueprint("measurements_bp", __name__)

# Pfad zum Hauptverzeichnis des Projekts
BASE_DIR = os.path.join(os.path.dirname(__file__), "..")
MEASUREMENTS_DIR = os.path.join(BASE_DIR, "messungen")


@measurements_bp.route("/api/measurements/save_csv", methods=["POST"])
def save_measurements_to_csv():
    """
    Nimmt alle Messdaten entgegen und speichert sie in strukturierten CSV-Dateien.
    """
    data = request.json
    transformer_name = data.get("transformerName")
    strom_gruppe = data.get("stromGruppe")

    if not transformer_name or not strom_gruppe:
        return jsonify({"error": "Wandlername oder Stromgruppe fehlt."}), 400

    db_conn = get_db()
    comp_row = db_conn.execute(
        "SELECT uniqueNumber FROM components WHERE name = ?", (transformer_name,)
    ).fetchone()
    unique_number = comp_row["uniqueNumber"] if comp_row else ""

    folder_name = f"{unique_number}_{transformer_name}"
    safe_folder_name = sanitize_filename(folder_name)

    transformer_dir = os.path.join(
        MEASUREMENTS_DIR, f"Gruppe_{strom_gruppe.lower()}", safe_folder_name
    )
    os.makedirs(transformer_dir, exist_ok=True)

    try:
        # Speichere jede Datensektion in eine eigene CSV-Datei
        for key, records in data.items():
            if (
                key not in ["transformerName", "stromGruppe"]
                and isinstance(records, list)
                and records
            ):
                df = pd.DataFrame(records)
                filename = f"{key.replace('_', ' ').title().replace(' ', '_')}.csv"
                df.to_csv(os.path.join(transformer_dir, filename), index=False)

        return jsonify({"message": "Daten erfolgreich gespeichert."})
    except (IOError, pd.errors.ParserError) as e:
        current_app.logger.error(f"Fehler beim Speichern der CSV-Dateien: {e}")
        return jsonify({"error": "Serverseitiger Fehler beim Speichern der CSVs."}), 500


@measurements_bp.route(
    "/api/measurements/load_csv/<strom_gruppe>/<transformer_name>", methods=["GET"]
)
def load_measurements_from_csv(strom_gruppe, transformer_name):
    """
    Lädt alle Messdaten-CSVs für einen gegebenen Wandler und eine Stromgruppe.
    """
    if not strom_gruppe or not transformer_name:
        return jsonify({"error": "Wandlername oder Stromgruppe fehlt."}), 400

    db_conn = get_db()
    comp_row = db_conn.execute(
        "SELECT uniqueNumber FROM components WHERE name = ?", (transformer_name,)
    ).fetchone()
    unique_number = comp_row["uniqueNumber"] if comp_row else ""

    folder_name = f"{unique_number}_{transformer_name}"
    safe_folder_name = sanitize_filename(folder_name)

    transformer_dir = os.path.join(
        MEASUREMENTS_DIR, f"Gruppe_{strom_gruppe.lower()}", safe_folder_name
    )

    if not os.path.isdir(transformer_dir):
        return jsonify({}), 200  # Kein Fehler, nur keine Daten

    all_data = {}
    try:
        for filename in os.listdir(transformer_dir):
            if filename.endswith(".csv"):
                key = (
                    os.path.splitext(filename)[0]
                    .lower()
                    .replace(" ", "_")
                    .replace("und", "_")
                )
                df = pd.read_csv(os.path.join(transformer_dir, filename))
                all_data[key] = df.where(pd.notna(df), None).to_dict("records")

        return jsonify(all_data)
    except (IOError, pd.errors.ParserError) as e:
        current_app.logger.error(f"Fehler beim Laden der CSV-Dateien: {e}")
        return jsonify({"error": "Fehler beim Lesen der CSV-Dateien."}), 500
