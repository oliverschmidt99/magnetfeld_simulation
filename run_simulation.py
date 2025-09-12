# run_simulation.py (Finale Version, nutzt Labels aus JSON)

"""
Haupt-Skript zur Steuerung des FEMM-Simulations-Workflows.

Dieses Skript liest eine 'simulation_run.json' und eine 'library.json',
iteriert durch verschiedene Positionsschritte und Phasenwinkel und führt für
jeden Schritt eine FEMM-Simulation durch. Die Ergebnisse werden gesammelt
und in einer CSV-Datei im 'res'-Verzeichnis gespeichert.
"""

import json
import os
import shutil
from datetime import datetime
import numpy as np
import pandas as pd
import femm


def calculate_instantaneous_current(peak_current, phase_shift_deg, angle_deg):
    """Berechnet den Momentanstrom für einen gegebenen Phasenwinkel."""
    return peak_current * np.cos(np.deg2rad(angle_deg + phase_shift_deg))


def draw_rect_explicitly(center_x, center_y, width, height):
    """Zeichnet ein Rechteck explizit über Nodes und Segmente."""
    x1, y1 = center_x - width / 2, center_y - height / 2
    x2, y2 = center_x + width / 2, center_y + height / 2
    femm.mi_addnode(x1, y1)
    femm.mi_addnode(x2, y1)
    femm.mi_addnode(x2, y2)
    femm.mi_addnode(x1, y2)
    femm.mi_addsegment(x1, y1, x2, y1)
    femm.mi_addsegment(x2, y1, x2, y2)
    femm.mi_addsegment(x2, y2, x1, y2)
    femm.mi_addsegment(x1, y2, x1, y1)


def run_single_simulation(
    femm_path, step_config, library, params, angle_deg, run_identifier
):
    """Führt eine einzelne FEMM-Analyse für einen Phasenwinkel durch."""
    femm.openfemm(True)
    femm.newdocument(0)

    scenario_params = params.get("scenarioParams", {})
    freq = float(scenario_params.get("frequencyHz", 50))
    depth = float(scenario_params.get("problemDepthM", 30))
    core_perm = float(scenario_params.get("coreRelPermeability", 2500))
    femm.mi_probdef(freq, "millimeters", "planar", 1e-8, depth, 30)

    materials = {"Air", "Copper", "M-36 Steel"}
    for mat_name in materials:
        if "steel" in mat_name.lower():
            femm.mi_addmaterial(mat_name, core_perm, core_perm, 0)
        else:
            femm.mi_getmaterial(mat_name)

    for phase in step_config["electricalSystem"]:
        inst_current = calculate_instantaneous_current(
            phase["peakCurrentA"], phase["phaseShiftDeg"], angle_deg
        )
        femm.mi_addcircprop(phase["name"], inst_current, 1)

    sim_raum = step_config["simulation_meta"]["simulationsraum"]
    sim_length, sim_breadth = float(sim_raum["Laenge"]), float(sim_raum["Breite"])
    femm.mi_drawrectangle(
        -sim_length / 2, -sim_breadth / 2, sim_length / 2, sim_breadth / 2
    )

    # Nur noch die Geometrie der Bauteile zeichnen
    for asm in step_config["assemblies"]:
        pos = asm["position"]
        rail = next(
            r
            for r in library["components"]["copperRails"]
            if r["templateProductInformation"]["name"] == asm["copperRailName"]
        )
        trans = asm["transformer_details"]
        r_geo = rail["specificProductInformation"]["geometry"]
        t_geo = trans["specificProductInformation"]["geometry"]

        draw_rect_explicitly(
            pos["x"], pos["y"], t_geo["coreOuterWidth"], t_geo["coreOuterHeight"]
        )
        draw_rect_explicitly(
            pos["x"], pos["y"], t_geo["coreInnerWidth"], t_geo["coreInnerHeight"]
        )
        draw_rect_explicitly(pos["x"], pos["y"], r_geo["width"], r_geo["height"])

    # Labels exakt aus der JSON-Datei platzieren
    material_labels = step_config.get("simulation_meta", {}).get("material_labels", [])
    for label in material_labels:
        x, y, material = float(label["x"]), float(label["y"]), label["material"]
        circuit_name = "<None>"
        group_num = 0

        # Spezifische Zuweisungen für Kupfer und Stahl
        for i, asm in enumerate(step_config["assemblies"]):
            pos = asm["position"]
            if (
                material == "Copper"
                and abs(pos["x"] - x) < 1e-6
                and abs(pos["y"] - y) < 1e-6
            ):
                circuit_name = asm["phaseName"]
                group_num = i * 10 + 1
                break

            trans = asm["transformer_details"]
            t_geo = trans["specificProductInformation"]["geometry"]
            label_x_core_calc = (
                pos["x"] + (t_geo["coreOuterWidth"] + t_geo["coreInnerWidth"]) / 4
            )
            if (
                material == "M-36 Steel"
                and abs(label_x_core_calc - x) < 1e-6
                and abs(pos["y"] - y) < 1e-6
            ):
                group_num = i * 10 + 2
                break

        femm.mi_addblocklabel(x, y)
        femm.mi_selectlabel(x, y)
        femm.mi_setblockprop(material, 1, 0, circuit_name, 0, group_num, 0)
        femm.mi_clearselected()

    femm.mi_makeABC(7, max(sim_length, sim_breadth) * 1.5, 0, 0, 0)
    femm.mi_zoomnatural()

    fem_file = os.path.join(femm_path, f"{run_identifier}.fem")
    femm.mi_saveas(fem_file)
    femm.mi_analyze(1)
    femm.mi_loadsolution()

    results = []
    for i, asm in enumerate(step_config["assemblies"]):
        phase_name = asm["phaseName"]
        circuit_props = femm.mo_getcircuitproperties(phase_name)
        i_sec_complex = circuit_props[0] + 1j * circuit_props[1]
        group_num_core = i * 10 + 2
        femm.mo_groupselectblock(group_num_core)
        b_avg = femm.mo_blockintegral(18)
        h_avg = femm.mo_blockintegral(19)
        femm.mo_clearblock()
        phase_data = next(
            p for p in step_config["electricalSystem"] if p["name"] == phase_name
        )
        i_prim = calculate_instantaneous_current(
            phase_data["peakCurrentA"], phase_data["phaseShiftDeg"], angle_deg
        )
        results.append(
            {
                "phaseAngle": angle_deg,
                "conductor": phase_name,
                "iPrimA": i_prim,
                "iSecAbs_A": np.abs(i_sec_complex),
                "iSecReal_A": np.real(i_sec_complex),
                "iSecImag_A": np.imag(i_sec_complex),
                "bAvgMagnitude_T": b_avg,
                "hAvgMagnitude_A_m": h_avg,
            }
        )

    femm.closefemm()
    return results


def main():
    """Hauptfunktion zur Steuerung des Simulationslaufs."""
    print("--- Starte Python-Simulations-Workflow ---")

    try:
        with open("simulation_run.json", "r", encoding="utf-8") as f:
            run_data = json.load(f)
        with open("library.json", "r", encoding="utf-8") as f:
            library = json.load(f)
    except FileNotFoundError as e:
        print(f"Fehler: Konfigurationsdatei nicht gefunden - {e}")
        return
    except json.JSONDecodeError as e:
        print(f"Fehler: JSON-Datei ist fehlerhaft - {e}")
        return

    now = datetime.now()
    date_str, time_str = now.strftime("%Y%m%d"), now.strftime("%H%M%S")
    results_path = os.path.join("res", date_str, f"{time_str}_position_sweep")
    femm_files_path = os.path.join(results_path, "femm_files")
    os.makedirs(femm_files_path, exist_ok=True)
    shutil.copy(
        "simulation_run.json", os.path.join(results_path, "simulation_run.json")
    )
    print(f"Ergebnisse werden in '{results_path}' gespeichert.")

    master_results = []
    params = run_data
    phase_sweep = params["scenarioParams"]["phaseSweep"]
    phase_angles = np.arange(
        float(phase_sweep["start"]),
        float(phase_sweep["end"]) + float(phase_sweep["step"]),
        float(phase_sweep["step"]),
    )
    position_steps = run_data["simulation_meta"]["bewegungspfade_alle_leiter"][
        "schritte_details"
    ]

    for i, step in enumerate(position_steps):
        print(f"\n>> Verarbeite Positionsschritt {i+1}/{len(position_steps)}")
        step_config = run_data.copy()
        step_config["assemblies"] = [asm.copy() for asm in run_data["assemblies"]]

        for asm_cfg in step_config["assemblies"]:
            phase_name = asm_cfg["phaseName"]
            if phase_name in step:
                asm_cfg["position"] = step[phase_name]

        for angle in phase_angles:
            print(f"--> Simuliere für Phasenwinkel: {angle}°")
            run_identifier = f"step{i}_angle{int(angle)}"

            try:
                single_run_results = run_single_simulation(
                    femm_files_path, step_config, library, params, angle, run_identifier
                )
                for res in single_run_results:
                    res.update(
                        {
                            "pos_x_L1_mm": step.get("L1", {}).get("x"),
                            "pos_y_L1_mm": step.get("L1", {}).get("y"),
                            "pos_x_L2_mm": step.get("L2", {}).get("x"),
                            "pos_y_L2_mm": step.get("L2", {}).get("y"),
                            "pos_x_L3_mm": step.get("L3", {}).get("x"),
                            "pos_y_L3_mm": step.get("L3", {}).get("y"),
                        }
                    )
                master_results.extend(single_run_results)
            except (RuntimeError, OSError, FileNotFoundError) as e:
                print(f"!!!! Fehler bei der Simulation für Winkel {angle}°: {e}")
                femm.closefemm()

    if master_results:
        df = pd.DataFrame(master_results)
        csv_path = os.path.join(results_path, f"{time_str}_summary.csv")
        df.to_csv(csv_path, index=False)
        print(f"\n--- Alle Ergebnisse wurden in '{csv_path}' gespeichert. ---")

    print("--- Simulations-Workflow erfolgreich abgeschlossen. ---")


if __name__ == "__main__":
    main()
