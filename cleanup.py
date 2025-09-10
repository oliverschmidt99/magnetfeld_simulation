import os

# --- Zu löschende Dateien ---
files_to_delete = [
    # Veraltete Seiten und Skripte des interaktiven Konfigurators
    os.path.join("templates", "simulation_v2.html"),
    os.path.join("static", "js", "simulation_v2.js"),
    os.path.join("static", "css", "simulation_v2.css"),
    # Testdateien, die wahrscheinlich nicht mehr benötigt werden
    os.path.join("conf", "new.json"),
    "test.drawio",
]


# --- Haupt-Logik ---
def cleanup_project():
    """Löscht die definierten, nicht mehr benötigten Dateien."""
    print("Starte Projekt-Aufräumaktion...")

    deleted_count = 0

    for file_path in files_to_delete:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                print(f"🗑️ Datei gelöscht: {file_path}")
                deleted_count += 1
            else:
                print(
                    f"⚠️ Datei nicht gefunden (vielleicht schon gelöscht?): {file_path}"
                )
        except OSError as e:
            print(f"❌ Fehler beim Löschen von {file_path}: {e}")

    print(f"\nAufräumen abgeschlossen. {deleted_count} Datei(en) wurden entfernt.")


if __name__ == "__main__":
    # Sicherheitsabfrage vor dem Löschen
    confirm = input(
        "Sollen die oben definierten, veralteten Dateien wirklich gelöscht werden? (j/n): "
    )
    if confirm.lower() == "j":
        cleanup_project()
    else:
        print("Aktion abgebrochen.")
