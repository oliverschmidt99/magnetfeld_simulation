# server/new_simulation.py
"""
Blueprint for the new 5-step simulation.
"""
import time
import threading
from flask import Blueprint, jsonify

# In-memory store for simulation state with a lock for thread safety
simulation_state = {
    "running": False,
    "progress": 0,
    "status_text": "No active simulation."
}
simulation_lock = threading.Lock()

new_simulation_bp = Blueprint("new_simulation", __name__)

def run_mock_simulation():
    """A mock simulation that updates the state in a thread-safe manner."""
    with simulation_lock:
        simulation_state["running"] = True
        simulation_state["progress"] = 0
        simulation_state["status_text"] = "Simulation wird initialisiert..."

    # Simulate work in a simple loop.
    for i in range(1, 11):
        time.sleep(0.5) # Simulate work being done
        with simulation_lock:
            simulation_state["progress"] = i * 10
            simulation_state["status_text"] = f"Schritt {i} von 10 wird ausgeführt..."

    with simulation_lock:
        simulation_state["status_text"] = "Simulation erfolgreich abgeschlossen!"
        simulation_state["running"] = False

@new_simulation_bp.route("/start_new_simulation", methods=["POST"])
def start_new_simulation():
    """Starts the new 5-step simulation in a background thread."""
    with simulation_lock:
        if simulation_state["running"]:
            return jsonify({"message": "A simulation is already in progress."}), 409

    # Start the simulation in a background thread
    thread = threading.Thread(target=run_mock_simulation)
    thread.start()

    return jsonify({"message": "Simulation started in the background."})


@new_simulation_bp.route("/simulation_status", methods=["GET"])
def get_simulation_status():
    """Returns the current status of the simulation in a thread-safe manner."""
    with simulation_lock:
        return jsonify(simulation_state)
