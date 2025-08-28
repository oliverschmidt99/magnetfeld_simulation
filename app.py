# app.py
from flask import Flask, render_template, request, jsonify
from server.api import api_bp
from server.analysis import analysis_bp
from server.simulation import simulation_bp
from server.measurement import measurement_bp
from server.utils import load_data, LIBRARY_FILE
from server.measurement_config import get_config, save_config

app = Flask(__name__)

# --- Blueprints registrieren ---
app.register_blueprint(api_bp)
app.register_blueprint(analysis_bp)
app.register_blueprint(simulation_bp)
app.register_blueprint(measurement_bp)


# --- API-Routen für die Messungs-Konfiguration ---
@app.route("/measurement/config", methods=["GET"])
def get_measurement_config():
    return jsonify(get_config())


@app.route("/measurement/config", methods=["POST"])
def save_measurement_config():
    config_data = request.json
    save_config(config_data)
    return jsonify({"status": "success", "message": "Konfiguration gespeichert."})


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
