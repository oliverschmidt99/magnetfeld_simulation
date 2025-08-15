from flask import Flask, render_template, jsonify, request
import subprocess
import os
import re

app = Flask(__name__)


def parse_matlib_dat(file_path):
    """
    Ein einfacher Parser für die matlib.dat-Datei von FEMM.
    Extrahiert Blocknamen und die Werte für mu_x.
    """
    materials = []
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            # Findet alle Blöcke, die mit <BeginBlock> anfangen und mit <EndBlock> aufhören
            blocks = re.findall(r"<BeginBlock>([\s\S]*?)<EndBlock>", content)
            for block in blocks:
                # Sucht nach dem Blocknamen innerhalb des Blocks
                name_match = re.search(
                    r'<BlockName>\s*=\s*"(.*?)"', block, re.IGNORECASE
                )
                # Sucht nach dem Mu_x-Wert
                mu_x_match = re.search(
                    r"<Mu_x>\s*=\s*([\d.eE+-]+)", block, re.IGNORECASE
                )

                if name_match and mu_x_match:
                    materials.append(
                        {
                            "name": name_match.group(1),
                            "mu_x": float(mu_x_match.group(1)),
                            # Hier können bei Bedarf weitere Materialparameter (mu_y, sigma, etc.)
                            # nach dem gleichen Muster geparst werden.
                        }
                    )
        return materials
    except FileNotFoundError:
        return None
    except Exception as e:
        # Gibt einen Fehler in der Konsole aus, wenn das Parsen fehlschlägt
        print(f"Fehler beim Parsen der matlib.dat: {e}")
        return []


@app.route("/")
def index():
    """Zeigt die Hauptseite der Anwendung an."""
    return render_template("index.html")


@app.route("/get-materials", methods=["GET"])
def get_materials():
    """
    Sucht die FEMM Materialbibliothek, parst sie und gibt die
    Materialien als JSON zurück.
    """
    # Standardpfad für eine typische Windows-Installation (entsprechend deiner Arbeitsumgebung)
    femm_path = "C:/femm42/bin/matlib.dat"

    # Fallback-Pfad für Linux-Systeme (wie dein privates Arch Linux)
    if not os.path.exists(femm_path):
        # Dieser Pfad ist ein Beispiel und muss ggf. angepasst werden
        femm_path = "/opt/femm42/bin/matlib.dat"

    materials = parse_matlib_dat(femm_path)

    if materials is not None:
        # Erfolgreich gefunden und geparst
        return jsonify(materials)
    else:
        # Datei wurde an keinem der Pfade gefunden
        error_message = f"Materialbibliothek 'matlib.dat' nicht gefunden. Überprüfte Pfade: C:/femm42/bin/matlib.dat und /opt/femm42/bin/matlib.dat"
        return jsonify({"error": error_message}), 404


@app.route("/run-simulation", methods=["POST"])
def run_simulation():
    """
    Nimmt Simulationsdaten entgegen und ruft das MATLAB-Skript auf.
    (Diese Funktion dient aktuell als Platzhalter).
    """
    try:
        # In Zukunft werden hier die Daten aus dem Frontend (z.B. die Canvas-Zeichnung als JSON)
        # entgegengenommen, in eine Konfigurationsdatei geschrieben und dann das MATLAB-Skript gestartet.

        # Beispielhafter Aufruf (aktuell auskommentiert)
        # config_data = request.json
        # with open('simulation_config.json', 'w') as f:
        #     json.dump(config_data, f)
        #
        # result = subprocess.run(['matlab', '-batch', 'simulation_main'], capture_output=True, text=True)
        # if result.returncode != 0:
        #    return jsonify({'error': result.stderr}), 500

        # Temporärer Dummy-Output für die UI-Entwicklung
        output = "Simulation erfolgreich abgeschlossen.\nErgebnis: 42"
        return jsonify({"output": output})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    # Startet den Flask-Entwicklungsserver
    # debug=True sorgt für automatisches Neuladen bei Code-Änderungen und zeigt detaillierte Fehlermeldungen an.
    app.run(debug=True)
