# src/utils.py
"""
Hilfsfunktionen für die Simulations-Logik.
"""
import numpy as np


def calculate_instantaneous_current(peak_current, phase_shift_deg, angle_deg):
    """Berechnet den Momentanstrom für einen gegebenen Phasenwinkel."""
    return peak_current * np.cos(np.deg2rad(angle_deg + phase_shift_deg))
