# cleanup.py
import os
import shutil


def cleanup_project():
    """
    Entfernt veraltete MATLAB-Skripte, Konfigurationen und
    andere nicht mehr benötigte Dateien aus dem Projekt.
    """
    # Liste der zu löschenden Dateien und Ordner
    files_to_delete = [
        "main.m",
        "main_debug.m",
        "main_debug_air.m",
        "conf/Test.json",
        "template_bauteile.json",
        "doc/nicht_beachten_Idee_fuer_website.md",
    ]

    dirs_to_delete = [
        "src",
    ]

    print("--- Projekt-Bereinigung: Trockenlauf ---")
    print("Die folgenden Dateien und Ordner werden zum Löschen vorgemerkt:\n")

    # Sammle alle existierenden Pfade, die gelöscht werden sollen
    actual_files_to_delete = []
    for f in files_to_delete:
        if os.path.exists(f):
            print(f"[DATEI] {f}")
            actual_files_to_delete.append(f)
        else:
            print(f"[NICHT GEFUNDEN] {f}")

    actual_dirs_to_delete = []
    for d in dirs_to_delete:
        if os.path.isdir(d):
            print(f"[ORDNER] {d}")
            actual_dirs_to_delete.append(d)
        else:
            print(f"[NICHT GEFUNDEN] {d}")

    print("\n-------------------------------------------")

    if not actual_files_to_delete and not actual_dirs_to_delete:
        print("✅ Alles bereits sauber! Nichts zu tun.")
        return

    # Bestätigung vom Benutzer einholen
    try:
        confirm = input(
            "Sollen diese Dateien und Ordner endgültig gelöscht werden? (ja/nein): "
        ).lower()
    except EOFError:
        print("\nAbbruch durch Benutzer.")
        return

    if confirm == "ja":
        print("\n--- Starte Löschvorgang ---")

        # Dateien löschen
        for f in actual_files_to_delete:
            try:
                os.remove(f)
                print(f"[GELÖSCHT] {f}")
            except OSError as e:
                print(f"[FEHLER] Konnte {f} nicht löschen: {e}")

        # Ordner löschen
        for d in actual_dirs_to_delete:
            try:
                shutil.rmtree(d)
                print(f"[GELÖSCHT] {d}")
            except OSError as e:
                print(f"[FEHLER] Konnte Ordner {d} nicht löschen: {e}")

        print("\n✅ Bereinigung abgeschlossen!")
    else:
        print("\n❌ Abbruch. Es wurden keine Dateien gelöscht.")


if __name__ == "__main__":
    cleanup_project()
