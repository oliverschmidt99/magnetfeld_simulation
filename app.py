"""
Hauptanwendungsdatei für den Flask-Server der Magnetfeld-Simulation.

Diese Datei initialisiert die Flask-Anwendung, registriert alle Blueprints
(für API, Analyse, Simulation, Messung und den CSV-Editor) und definiert
die Hauptrouten für die HTML-Seiten.
"""

from flask import Flask, render_template, request, jsonify
from server.api import api_bp
from server.analysis import analysis_bp
from server.simulation import simulation_bp
from server.measurement import measurement_bp
from server.data_editor import data_editor_bp

# --- KORREKTUR: Fehlenden Import für Konfigurations-Funktionen hinzufügen ---
from server.measurement_config import get_config, save_config
from server.utils import load_data, LIBRARY_FILE

app = Flask(__name__)

# --- Blueprints registrieren ---
app.register_blueprint(api_bp)
app.register_blueprint(analysis_bp)
app.register_blueprint(simulation_bp)
app.register_blueprint(measurement_bp)
app.register_blueprint(data_editor_bp)


# --- API-Routen für die Messungs-Konfiguration ---
@app.route("/measurement/config", methods=["GET"])
def get_measurement_config():
    """Gibt die Konfigurationsdaten für die Messung als JSON zurück."""
    return jsonify(get_config())


@app.route("/measurement/config", methods=["POST"])
def save_measurement_config():
    """Speichert die übermittelten Konfigurationsdaten für die Messung."""
    config_data = request.json
    save_config(config_data)
    return jsonify({"status": "success", "message": "Konfiguration gespeichert."})


# --- Seiten-Routen ---
@app.route("/")
def index():
    """Rendert die Startseite."""
    return render_template("index.html")


@app.route("/configurator")
def configurator():
    """Rendert die Konfigurator-Seite für Simulationen."""
    library_data = load_data(LIBRARY_FILE, {})
    return render_template("configurator.html", library=library_data)


@app.route("/bauteile")
def bauteile():
    """Rendert die Bauteil-Bibliothek-Seite."""
    library_data = load_data(LIBRARY_FILE, {})
    return render_template("bauteile.html", library=library_data)


@app.route("/settings")
def settings():
    """Rendert die Einstellungsseite."""
    return render_template("settings.html")


@app.route("/simulation")
def simulation():
    """Rendert die Simulations-Seite."""
    return render_template("simulation.html")


@app.route("/analysis")
def analysis():
    """Rendert die Analyse-Seite."""
    return render_template("analysis.html")


@app.route("/measurement")
def measurement():
    """Rendert die Messungs-Seite."""
    return render_template("measurement.html")


@app.route("/admin")
def admin_page():
    """Rendert die Admin-Oberfläche zum Bearbeiten der CSV-Dateien."""
    return render_template("admin.html")


if __name__ == "__main__":
    app.run(port=7070, debug=True)
