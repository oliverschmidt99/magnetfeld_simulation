"""
Dieses Modul verwaltet alle Operationen für die CSV-Dateien.
"""

import os
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_DIR = os.path.join(BASE_DIR, "..", "data")
BEWEGUNGEN_FILE = "bewegungen.csv"
BEWEGUNGEN_FILE_PATH = os.path.join(CSV_DIR, BEWEGUNGEN_FILE)


def list_csv_files():
    """Listet alle CSV-Dateien im data/csv-Verzeichnis auf, außer bewegungen.csv."""
    try:
        if not os.path.isdir(CSV_DIR):
            os.makedirs(CSV_DIR)
            return []
        files = [
            f
            for f in os.listdir(CSV_DIR)
            if f.endswith(".csv") and f != BEWEGUNGEN_FILE
        ]
        return sorted(files)
    except FileNotFoundError:
        return []


def get_csv_data(filename):
    """Liest eine CSV-Datei mit pandas und gibt Header und Zeilen zurück."""
    filepath = os.path.join(CSV_DIR, filename)
    if not os.path.exists(filepath):
        return None
    try:
        df = pd.read_csv(filepath, sep=None, engine="python", encoding="utf-8")
        df.columns = [col.strip() for col in df.columns]
        df = df.where(pd.notna(df), None)
        return {"headers": df.columns.tolist(), "rows": df.to_dict("records")}
    # KORREKTUR: Spezifischere Exceptions abfangen
    except (IOError, pd.errors.ParserError):
        return None


def save_csv_data(filename, data):
    """Speichert Daten in eine CSV-Datei."""
    filepath = os.path.join(CSV_DIR, filename)
    if not data:
        return False, "Keine Daten zum Speichern vorhanden."
    try:
        df = pd.DataFrame(data)
        df.to_csv(filepath, index=False, quoting=1)
        return True, f"Datei {filename} erfolgreich gespeichert."
    except (IOError, ValueError) as e:
        return False, f"Fehler beim Speichern der Datei: {str(e)}"


def get_bewegungen_options():
    """Gibt die festen Optionen für die Dropdowns des Bewegungen-Editors zurück."""
    return [
        "← Westen",
        "→ Osten",
        "↙ Südwesten",
        "↗ Nordosten",
        "↓ Süden",
        "↑ Norden",
        "↘ Südosten",
    ]


def get_bewegungen_data():
    """Liest die Datei bewegungen.csv."""
    if not os.path.exists(BEWEGUNGEN_FILE_PATH):
        return None
    df = pd.read_csv(BEWEGUNGEN_FILE_PATH, sep=None, engine="python", encoding="utf-8")
    df.columns = [col.strip() for col in df.columns]
    return df.to_dict("records")


def save_bewegungen_data(data):
    """Speichert Daten in die Datei bewegungen.csv."""
    if not data:
        return False, "Keine Daten zum Speichern vorhanden."
    try:
        df = pd.DataFrame(data)
        df = df[["L1", "L2", "L3", "PosGruppe"]]
        df.to_csv(BEWEGUNGEN_FILE_PATH, index=False, na_rep="", quoting=1)
        return True, f"Datei {BEWEGUNGEN_FILE} erfolgreich gespeichert."
    except (IOError, ValueError) as e:
        return False, f"Fehler beim Speichern der Bewegungsdaten: {str(e)}"
