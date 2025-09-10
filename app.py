"""
Hauptanwendung für die Magnetfeld-Simulation.
Initialisiert die Flask-App und registriert die Blueprints.
"""

from flask import Flask, render_template, send_from_directory
from server.api import api_bp
from server.measurement import measurement_bp

# Korrigiert: Importiert den aktualisierten simulation_bp
from server.simulation import simulation_bp
from server.utils import load_data, LIBRARY_FILE

app = Flask(__name__)
app.register_blueprint(api_bp)
app.register_blueprint(measurement_bp)
# Korrigiert: Registriert den aktualisierten simulation_bp
app.register_blueprint(simulation_bp)


# Routen für die Hauptseiten
@app.route("/")
def index():
    """Startseite"""
    return render_template("index.html")


@app.route("/admin")
def admin():
    """Admin-Seite."""
    return render_template("admin.html")


@app.route("/bauteile")
def bauteile():
    """Seite zur Verwaltung der Bauteil-Bibliothek."""
    library_data = load_data(LIBRARY_FILE, {"components": {}})
    return render_template("bauteile.html", library=library_data)


@app.route("/configurator")
def configurator():
    """Konfigurator-Seite zum Erstellen von Szenarien."""
    library_data = load_data(LIBRARY_FILE, {"components": {}})
    return render_template("configurator.html", library=library_data)


@app.route("/simulation")
def simulation():
    """Simulations-Seite mit dem neuen 5-Schritte-Assistenten."""
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
