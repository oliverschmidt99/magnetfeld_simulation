# migrate_db.py
import sqlite3

DATABASE = "database.db"


def migrate_db():
    """
    Fügt die neuen Spalten sicher zur 'materials'-Tabelle hinzu,
    ohne bestehende Daten zu löschen.
    """
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        print("Verbinde mit der Datenbank...")

        # Liste der Spalten, die hinzugefügt werden sollen
        columns_to_add = {
            "hc": "REAL",
            "sigma": "REAL",
            "j": "REAL",
            "lamination_type": "INTEGER",
            "lam_thickness": "REAL",
            "lam_fill_factor": "REAL",
        }

        # Bestehende Spalten auslesen, um Fehler zu vermeiden
        cursor.execute("PRAGMA table_info(materials)")
        existing_columns = [row[1] for row in cursor.fetchall()]

        print(f"Bestehende Spalten: {existing_columns}")

        for col_name, col_type in columns_to_add.items():
            if col_name not in existing_columns:
                print(f"Füge Spalte '{col_name}' zur Tabelle 'materials' hinzu...")
                cursor.execute(
                    f"ALTER TABLE materials ADD COLUMN {col_name} {col_type}"
                )
            else:
                print(f"Spalte '{col_name}' existiert bereits.")

        conn.commit()
        print("\nDatenbank-Schema erfolgreich aktualisiert!")
        print("Du kannst die Anwendung jetzt sicher starten.")

    except sqlite3.Error as e:
        print(f"\nEin Fehler ist aufgetreten: {e}")
        print("Stelle sicher, dass die Datei 'database.db' im selben Ordner liegt.")
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    migrate_db()
