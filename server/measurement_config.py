"""
Dieses Modul verwaltet die Konfiguration für die Mess-Seite,
indem es die CSV-Dateien ausliest und die relevanten Daten extrahiert.
"""

import os
import pandas as pd
from server.utils import load_data, save_data, CONFIG_DIR

# Globale Konstanten für Dateipfade
MEASUREMENT_CONFIG_FILE = os.path.join(CONFIG_DIR, "measurement_config.json")
DATA_DIR = "data"  # KORREKTUR: Fehlende Definition hinzugefügt


def get_config():
    """Lädt die aktuelle Mess-Konfiguration und reichert sie mit Daten aus CSVs an."""
    config = load_data(MEASUREMENT_CONFIG_FILE, {})
    config["csv_data"] = get_all_csv_data()
    return config


def save_config(data):
    """Speichert die Mess-Konfiguration."""
    # Speichere nur die Konfigurationsdaten, nicht die CSV-Daten
    config_to_save = {k: v for k, v in data.items() if k != "csv_data"}
    save_data(MEASUREMENT_CONFIG_FILE, config_to_save)


def get_all_csv_data():
    """Liest alle relevanten CSV-Dateien und gibt deren Inhalte zurück."""
    csv_files = {
        "startpositionen": os.path.join(DATA_DIR, "1_startpositionen.csv"),
        "spielraum": os.path.join(DATA_DIR, "2_spielraum.csv"),
        "bewegungen": os.path.join(DATA_DIR, "3_bewegungen.csv"),
        "schrittweiten": os.path.join(DATA_DIR, "4_schrittweiten.csv"),
    }
    all_data = {}
    for name, path in csv_files.items():
        try:
            # Versuche, die CSV-Dateien mit verschiedenen Kodierungen zu lesen
            try:
                df = pd.read_csv(path, encoding="utf-8")
            except UnicodeDecodeError:
                df = pd.read_csv(path, encoding="cp1252")

            # Konvertiere alle Daten in ein Dictionary
            all_data[name] = df.to_dict(orient="records")
        except (IOError, pd.errors.ParserError) as e:
            # Gib eine leere Liste zurück, wenn eine Datei nicht gelesen werden kann
            print(f"Warnung: Konnte '{path}' nicht laden. Fehler: {e}")
            all_data[name] = []

    # Extrahiere die eindeutigen Stromstärken
    all_data["stromstaerken"] = extract_unique_currents(
        all_data.get("startpositionen", [])
    )
    return all_data


def extract_unique_currents(startpositionen_data):
    """Extrahiert eine sortierte Liste eindeutiger Stromstärken."""
    if not startpositionen_data:
        return []
    try:
        # KORREKTUR: Variable mit ASCII-konformem Namen
        currents = sorted(list(set(item["Strom"] for item in startpositionen_data)))
        return currents
    except KeyError:
        # Fehler abfangen, falls die Spalte 'Strom' nicht existiert
        return []
