# final_cleanup.py
"""
Abschließendes Aufräumskript nach dem Refactoring.

Dieses Skript entfernt veraltete Konfigurationsdateien (.json),
überflüssige JavaScript-Dateien und einmalig genutzte Hilfsskripte,
um die Projektstruktur zu finalisieren.
"""
import os


def finalize_cleanup():
    """
    Identifiziert und entfernt veraltete Dateien nach dem Refactoring.
    Fragt vor dem Löschen um Bestätigung.
    """
    # Liste der zu löschenden Dateien.
    # Beinhaltet alte Daten-JSONs, das überflüssige JS-Bundle und Hilfsskripte.
    files_to_delete = [
        "library.json",
        "tags.json",
        "static/js/configurator.js",
        "json_to_sqlite.py",
        "cleanup.py",
    ]

    print("--- Finale Projekt-Bereinigung: Analyse ---")
    print("Die folgenden Dateien sind nach dem Refactoring überflüssig geworden:\n")

    # Finde alle Dateien, die tatsächlich existieren und gelöscht werden können.
    actual_files_to_delete = []
    for f in files_to_delete:
        if os.path.exists(f):
            print(f"[DATEI] {f}")
            actual_files_to_delete.append(f)
        else:
            print(f"[NICHT GEFUNDEN] {f}")

    print("\n-------------------------------------------")

    if not actual_files_to_delete:
        print("✅ Dein Projekt ist bereits vollständig aufgeräumt. Nichts zu tun.")
        return

    # Sicherheitsabfrage vor dem Löschen.
    try:
        confirm = input(
            "Sollen diese Dateien endgültig gelöscht werden, um das Refactoring abzuschließen? (ja/nein): "
        ).lower()
    except EOFError:
        print("\nAbbruch durch Benutzer.")
        return

    if confirm == "ja":
        print("\n--- Starte finalen Löschvorgang ---")
        deleted_count = 0
        for f in actual_files_to_delete:
            try:
                os.remove(f)
                print(f"[GELÖSCHT] {f}")
                deleted_count += 1
            except OSError as e:
                print(f"[FEHLER] Konnte '{f}' nicht löschen: {e}")

        print(
            f"\n✅ Bereinigung abgeschlossen! {deleted_count} Datei(en) wurden entfernt."
        )
        print(
            "Dein Projekt ist jetzt auf dem finalen Stand. Herzlichen Glückwunsch! 🚀"
        )
    else:
        print("\n❌ Abbruch. Es wurden keine Dateien gelöscht.")


if __name__ == "__main__":
    finalize_cleanup()
