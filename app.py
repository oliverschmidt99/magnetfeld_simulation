"""
Hauptanwendung für die Magnetfeld-Simulation.
Initialisiert die Flask-App und registriert die Blueprints.
"""

from flask import Flask, render_template, send_from_directory
from server.api import api_bp
from server.simulation import simulation_bp
from server.measurement import measurement_bp

# Hinzugefügt: Import der Hilfsfunktionen zum Laden von Daten
from server.utils import load_data, LIBRARY_FILE

app = Flask(__name__)
app.register_blueprint(api_bp)
app.register_blueprint(simulation_bp)
app.register_blueprint(measurement_bp)


# Routen für die Hauptseiten
@app.route("/")
def index():
    """Startseite"""
    return render_template("index.html")


@app.route("/bauteile")
def bauteile():
    """Seite zur Verwaltung der Bauteil-Bibliothek."""
    # Hinzugefügt: Lade die Bibliotheksdaten für die Bauteil-Seite
    library_data = load_data(LIBRARY_FILE, {"components": {}})
    return render_template("bauteile.html", library=library_data)


@app.route("/configurator")
def configurator():
    """Konfigurator-Seite zum Erstellen von Szenarien."""
    # Hinzugefügt: Lade die Bibliotheksdaten und übergebe sie an das Template
    library_data = load_data(LIBRARY_FILE, {"components": {}})
    return render_template("configurator.html", library=library_data)


@app.route("/measurement")
def measurement():
    """Seite für die Mess-Konfiguration und den CSV-Editor."""
    return render_template("measurement.html")


@app.route("/simulation")
def simulation():
    """Simulations-Seite."""
    return render_template("simulation.html")


@app.route("/analysis")
def analysis():
    """Analyse-Seite."""
    return render_template("analysis.html")


@app.route("/settings")
def settings():
    """Einstellungs-Seite."""
    return render_template("settings.html")


@app.route("/favicon.ico")
def favicon():
    """Stellt das Favicon bereit."""
    return send_from_directory(
        app.static_folder, "favicon.ico", mimetype="image/vnd.microsoft.icon"
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7070, debug=True)
