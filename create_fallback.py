import subprocess
from datetime import date


def run(cmd):
    """Hilfsfunktion: führe einen Befehl aus und gib die Ausgabe zurück."""
    print(f"$ {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout.strip())
    return result.returncode
    if result.stderr:
        print(result.stderr.strip())
    return result.returncode


def create_fallback():
    # Aktuelles Datum für den Branchnamen
    today = date.today().strftime("%Y-%m-%d")
    branch_name = f"fallback-{today}"

    # Sicherstellen, dass wir auf main sind und alles aktuell ist
    run("git checkout main")
    run("git pull origin main")

    # Neuen Fallback-Branch erstellen
    run(f"git checkout -b {branch_name}")

    # Nach GitHub pushen
    run(f"git push origin {branch_name}")

    # Zurück auf main wechseln
    run("git checkout main")

    print(
        f"\n✅ Fallback-Branch '{branch_name}' wurde erstellt und nach GitHub gepusht."
    )


if __name__ == "__main__":
    create_fallback()
