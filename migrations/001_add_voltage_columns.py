# migrations/001_add_voltage_columns.py
"""
Dieses Migrations-Skript fügt die Spalten für die Spannungs-Messwerte
zur 'measurements'-Tabelle hinzu.
"""
import sqlite3
import os

# Pfad zur Datenbankdatei im Hauptverzeichnis des Projekts
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE = os.path.join(BASE_DIR, "database.db")


def migrate():
    """Fügt die neuen Spalten sicher zur 'measurements'-Tabelle hinzu."""
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        print("Verbinde mit der Datenbank...")

        # Bestehende Spalten auslesen, um Fehler zu vermeiden
        cursor.execute("PRAGMA table_info(measurements)")
        existing_columns = [row[1] for row in cursor.fetchall()]

        new_columns = {
            "measured_primary_voltage": "REAL",
            "measured_secondary_voltage": "REAL",
        }

        for col_name, col_type in new_columns.items():
            if col_name not in existing_columns:
                print(f"Füge Spalte '{col_name}' zur Tabelle 'measurements' hinzu...")
                cursor.execute(
                    f"ALTER TABLE measurements ADD COLUMN {col_name} {col_type}"
                )
            else:
                print(f"Spalte '{col_name}' existiert bereits.")

        conn.commit()
        print("\n✅ Datenbank-Schema erfolgreich aktualisiert!")

    except sqlite3.Error as e:
        print(f"\n❌ Ein Fehler ist aufgetreten: {e}")
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    migrate()
