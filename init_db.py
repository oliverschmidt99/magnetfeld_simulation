# init_db.py
"""
Initialisiert die Datenbank und fügt alle benötigten Tabellen hinzu.
Dieses Skript sollte einmalig ausgeführt werden, um das Datenbankschema einzurichten.
"""
import sqlite3
import os

# Pfad zur Datenbankdatei im Hauptverzeichnis des Projekts
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_FILE = os.path.join(BASE_DIR, "database.db")

# SQL-Befehle zum Erstellen der Tabellen
# "IF NOT EXISTS" stellt sicher, dass der Befehl keinen Fehler wirft,
# falls die Tabellen schon existieren.

CREATE_MATERIALS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    is_nonlinear INTEGER DEFAULT 0,
    mu_x REAL DEFAULT 1.0,
    mu_y REAL DEFAULT 1.0,
    hc REAL DEFAULT 0.0,
    sigma REAL DEFAULT 0.0,
    j REAL DEFAULT 0.0,
    lamination_type INTEGER DEFAULT 0,
    lam_thickness REAL DEFAULT 0.0,
    lam_fill_factor REAL DEFAULT 1.0
);
"""

CREATE_BH_CURVE_POINTS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS bh_curve_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL,
    b_value REAL NOT NULL,
    h_value REAL NOT NULL,
    FOREIGN KEY (material_id) REFERENCES materials (id) ON DELETE CASCADE
);
"""

CREATE_COMPONENTS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS components (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    name TEXT UNIQUE NOT NULL,
    productName TEXT,
    manufacturer TEXT,
    manufacturerNumber TEXT,
    companyNumber TEXT,
    uniqueNumber TEXT,
    specificProductInformation TEXT -- JSON-Blob for geometry, electrical etc.
);
"""

CREATE_TAGS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    color TEXT,
    UNIQUE(name, category)
);
"""

CREATE_COMPONENT_TAGS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS component_tags (
    component_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (component_id, tag_id),
    FOREIGN KEY (component_id) REFERENCES components (id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
);
"""

CREATE_MEASUREMENTS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    component_id INTEGER NOT NULL,
    phase TEXT NOT NULL,
    percent_nominal INTEGER NOT NULL,
    position INTEGER NOT NULL,
    measured_primary REAL,
    measured_secondary REAL,
    burden_resistance REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    measured_primary_voltage REAL,   -- Added by migration 001
    measured_secondary_voltage REAL, -- Added by migration 001
    FOREIGN KEY (component_id) REFERENCES components (id) ON DELETE CASCADE
);
"""


def initialize_database():
    """Stellt eine Verbindung zur DB her und erstellt alle notwendigen Tabellen."""
    try:
        # Lösche die alte DB-Datei, falls vorhanden, um sauber zu starten
        if os.path.exists(DATABASE_FILE):
            print(f"Lösche existierende Datenbankdatei: {DATABASE_FILE}")
            os.remove(DATABASE_FILE)

        conn = sqlite3.connect(DATABASE_FILE)
        cursor = conn.cursor()
        print("Neue Datenbankverbindung hergestellt...")

        print("Erstelle Tabelle 'materials'...")
        cursor.execute(CREATE_MATERIALS_TABLE_SQL)

        print("Erstelle Tabelle 'bh_curve_points'...")
        cursor.execute(CREATE_BH_CURVE_POINTS_TABLE_SQL)

        print("Erstelle Tabelle 'components'...")
        cursor.execute(CREATE_COMPONENTS_TABLE_SQL)

        print("Erstelle Tabelle 'tags'...")
        cursor.execute(CREATE_TAGS_TABLE_SQL)

        print("Erstelle Tabelle 'component_tags'...")
        cursor.execute(CREATE_COMPONENT_TAGS_TABLE_SQL)

        print("Erstelle Tabelle 'measurements'...")
        cursor.execute(CREATE_MEASUREMENTS_TABLE_SQL)

        conn.commit()
        conn.close()

        print(
            "\n✅ Erfolgreich! Alle notwendigen Tabellen wurden zur Datenbank hinzugefügt."
        )
        print(
            "Du kannst dieses Skript jetzt schließen und deine Flask-Anwendung ('app.py') starten."
        )

    except sqlite3.Error as e:
        print(f"\n❌ Ein Datenbankfehler ist aufgetreten: {e}")
    except OSError as e:
        print(f"\n❌ Ein Dateisystemfehler ist aufgetreten: {e}")


if __name__ == "__main__":
    initialize_database()
