# init_db.py
"""
Initialisiert die Datenbank und fügt benötigte Tabellen hinzu.
Dieses Skript sollte einmalig ausgeführt werden, um das Datenbankschema einzurichten.
"""
import sqlite3

DATABASE_FILE = "database.db"

# SQL-Befehl zum Erstellen der neuen Tabelle
# "IF NOT EXISTS" stellt sicher, dass der Befehl keinen Fehler wirft,
# falls die Tabelle schon existiert.
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
    FOREIGN KEY (component_id) REFERENCES components (id) ON DELETE CASCADE
);
"""


def initialize_database():
    """Stellt eine Verbindung zur DB her und erstellt die measurements-Tabelle."""
    try:
        conn = sqlite3.connect(DATABASE_FILE)
        cursor = conn.cursor()
        print("Datenbankverbindung hergestellt...")

        print("Erstelle die 'measurements'-Tabelle (falls sie nicht existiert)...")
        cursor.execute(CREATE_MEASUREMENTS_TABLE_SQL)

        conn.commit()
        conn.close()

        print(
            "\n✅ Erfolgreich! Die Tabelle 'measurements' wurde zur Datenbank hinzugefügt."
        )
        print(
            "Du kannst dieses Skript jetzt schließen und deine Flask-Anwendung starten."
        )

    except sqlite3.Error as e:
        print(f"\n❌ Ein Datenbankfehler ist aufgetreten: {e}")


if __name__ == "__main__":
    initialize_database()
