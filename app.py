# app.py
from flask import Flask, render_template
from server.api import api_bp
from server.analysis import analysis_bp
from server.simulation import simulation_bp

# --- HIER DIE ÄNDERUNG ---
from server.measurement import measurement_bp
from server.utils import load_data, LIBRARY_FILE

app = Flask(__name__)

# --- Blueprints registrieren ---
app.register_blueprint(api_bp)
app.register_blueprint(analysis_bp)
app.register_blueprint(simulation_bp)
# --- HIER DIE ÄNDERUNG ---
app.register_blueprint(measurement_bp)


# --- Seiten-Routen ---
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/configurator")
def configurator():
    library_data = load_data(LIBRARY_FILE, {})
    return render_template("configurator.html", library=library_data)


@app.route("/bauteile")
def bauteile():
    library_data = load_data(LIBRARY_FILE, {})
    return render_template("bauteile.html", library=library_data)


@app.route("/settings")
def settings():
    return render_template("settings.html")


@app.route("/simulation")
def simulation():
    return render_template("simulation.html")


@app.route("/analysis")
def analysis():
    return render_template("analysis.html")


@app.route("/measurement")
def measurement():
    return render_template("measurement.html")


if __name__ == "__main__":
    app.run(port=7070, debug=True)
