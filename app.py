from flask import Flask, render_template
from server.api import api_bp
from server.utils import load_data, LIBRARY_FILE

app = Flask(__name__)
app.register_blueprint(api_bp)


# Routen für die Hauptseiten
@app.route("/")
def index():
    """Startseite"""
    return render_template("index.html")


@app.route("/admin")
def admin():
    """Admin-Seite zum Verwalten von Tags und Bibliothek."""
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


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7070, debug=True)
