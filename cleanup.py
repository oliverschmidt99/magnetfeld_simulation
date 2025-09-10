import os

# Liste der zu löschenden Dateien basierend auf der neuen Struktur
files_to_delete = [
    # Zusammengelegte und umbenannte Seiten
    os.path.join(
        "templates", "simulation.html"
    ),  # Wird durch umbenannten Konfigurator ersetzt
    os.path.join("templates", "bauteile.html"),  # In library.html integriert
    os.path.join("templates", "admin.html"),  # In library.html integriert
    os.path.join("templates", "analysis.html"),  # Umbenannt in ergebnisse.html
    os.path.join("templates", "measurement.html"),  # Wird durch ergebnisse.html ersetzt
    # Veraltete V2-Dateien
    os.path.join("templates", "simulation_v2.html"),
    os.path.join("static", "js", "simulation_v2.js"),
    os.path.join("static", "css", "simulation_v2.css"),
    # Zugehörige, nun überflüssige JS- und CSS-Dateien
    os.path.join("static", "js", "simulation.js"),
    os.path.join("static", "js", "bauteile.js"),
    os.path.join("static", "js", "admin.js"),
    os.path.join("static", "js", "analysis.js"),
    os.path.join("static", "js", "measurement.js"),
    os.path.join("static", "css", "simulation.css"),
    os.path.join("static", "css", "admin.css"),
    os.path.join("static", "css", "measurement.css"),
]


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
                print(f"⚠️ Datei nicht gefunden: {file_path}")
        except OSError as e:
            print(f"❌ Fehler beim Löschen von {file_path}: {e}")
    print(f"\nAufräumen abgeschlossen. {deleted_count} Datei(en) wurden entfernt.")


if __name__ == "__main__":
    confirm = input(
        "Sollen alle veralteten HTML-, JS- und CSS-Dateien gelöscht werden? (j/n): "
    )
    if confirm.lower() == "j":
        cleanup_project()
    else:
        print("Aktion abgebrochen.")
