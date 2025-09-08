"""
Dieses Modul verwaltet alle Operationen für die CSV-Dateien.
"""

import os
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_DIR = os.path.join(BASE_DIR, "..", "data", "csv")
BEWEGUNGEN_FILE = "3_bewegungen.csv"
BEWEGUNGEN_FILE_PATH = os.path.join(CSV_DIR, BEWEGUNGEN_FILE)


def list_csv_files():
    """Listet alle CSV-Dateien im data/csv-Verzeichnis auf, außer 3_bewegungen.csv."""
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
    """Liest eine CSV-Datei und gibt Header und Zeilen zurück."""
    filepath = os.path.join(CSV_DIR, filename)
    if not os.path.exists(filepath):
        return None
    df = pd.read_csv(filepath)
    cols = df.columns.tolist()
    new_order = cols.copy()
    if "ID" in new_order:
        new_order.remove("ID")
        new_order.insert(0, "ID")
    if "Strom" in new_order:
        new_order.remove("Strom")
        if len(new_order) > 0:
            new_order.insert(1, "Strom")
        else:
            new_order.append("Strom")
    df = df[new_order]
    return {"headers": df.columns.tolist(), "rows": df.to_dict("records")}


def save_csv_data(filename, data):
    """Speichert Daten in eine CSV-Datei."""
    filepath = os.path.join(CSV_DIR, filename)
    if not data:
        return False, "Keine Daten zum Speichern vorhanden."
    try:
        df = pd.DataFrame(data)
        df.to_csv(filepath, index=False, quoting=1)
        return True, f"Datei {filename} erfolgreich gespeichert."
    except (IOError, ValueError, pd.errors.ParserError) as e:
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
    """Liest die Datei 3_bewegungen.csv."""
    if not os.path.exists(BEWEGUNGEN_FILE_PATH):
        return None
    df = pd.read_csv(BEWEGUNGEN_FILE_PATH)
    return df.to_dict("records")


def save_bewegungen_data(data):
    """Speichert Daten in die Datei 3_bewegungen.csv."""
    if not data:
        return False, "Keine Daten zum Speichern vorhanden."
    try:
        df = pd.DataFrame(data)
        df = df[["L1", "L2", "L3", "PosGruppe"]]
        df.to_csv(BEWEGUNGEN_FILE_PATH, index=False, na_rep="", quoting=1)
        return True, f"Datei {BEWEGUNGEN_FILE} erfolgreich gespeichert."
    except (IOError, ValueError, pd.errors.ParserError) as e:
        return False, f"Fehler beim Speichern der Bewegungsdaten: {str(e)}"
