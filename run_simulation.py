# run_simulation.py (Aktualisiert – Speichert alle FEMM-Dateien)
"""
Haupt-Skript zur Steuerung des FEMM-Simulations-Workflows.
Nutzt Multiprocessing und speichert alle generierten .fem- und .ans-Dateien.
"""

import json
import os
import shutil
import multiprocessing
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


def create_standalone_object(
    center_x, center_y, width, height, rotation_deg, material, circuit, group_id
):
    """
    Zeichnet ein einzelnes, rotiertes Rechteck und platziert das Material-Label.
    """
    corners = [
        (-width / 2, -height / 2),
        (width / 2, -height / 2),
        (width / 2, height / 2),
        (-width / 2, height / 2),
    ]
    rad = np.deg2rad(rotation_deg)
    cos_a, sin_a = np.cos(rad), np.sin(rad)

    rotated_corners = [
        (px * cos_a - py * sin_a + center_x, px * sin_a + py * cos_a + center_y)
        for px, py in corners
    ]

    for corner_x, corner_y in rotated_corners:
        femm.mi_addnode(corner_x, corner_y)

    for k in range(4):
        p1, p2 = rotated_corners[k], rotated_corners[(k + 1) % 4]
        femm.mi_addsegment(p1[0], p1[1], p2[0], p2[1])

    femm.mi_addblocklabel(center_x, center_y)
    femm.mi_selectlabel(center_x, center_y)
    femm.mi_setblockprop(material, 1, 0, circuit, 0, group_id, 0)
    femm.mi_clearselected()


def run_single_simulation(task_params):
    """
    Führt eine einzelne FEMM-Analyse durch.
    Diese Funktion dient als Worker für den Multiprocessing-Pool.
    """
    (
        femm_files_dir,
        step_config,
        global_params,
        angle_deg,
        run_identifier,
        step_positions,
    ) = task_params

    femm.openfemm(True)
    femm.newdocument(0)

    scenario_params = global_params.get("scenarioParams", {})
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

    for i, asm in enumerate(step_config["assemblies"]):
        pos = asm["position"]
        t_geo = asm["transformer_details"]["specificProductInformation"]["geometry"]
        r_geo = asm["copperRail_details"]["specificProductInformation"]["geometry"]

        draw_rect_explicitly(
            pos["x"], pos["y"], t_geo["coreOuterWidth"], t_geo["coreOuterHeight"]
        )
        draw_rect_explicitly(
            pos["x"], pos["y"], t_geo["coreInnerWidth"], t_geo["coreInnerHeight"]
        )
        draw_rect_explicitly(pos["x"], pos["y"], r_geo["width"], r_geo["height"])

        femm.mi_addblocklabel(pos["x"], pos["y"])
        femm.mi_selectlabel(pos["x"], pos["y"])
        femm.mi_setblockprop("Copper", 1, 0, asm["phaseName"], 0, i * 10 + 1, 0)
        femm.mi_clearselected()

        label_x_core = (
            pos["x"] + (t_geo["coreOuterWidth"] + t_geo["coreInnerWidth"]) / 4
        )
        femm.mi_addblocklabel(label_x_core, pos["y"])
        femm.mi_selectlabel(label_x_core, pos["y"])
        femm.mi_setblockprop("M-36 Steel", 1, 0, "<None>", 0, i * 10 + 2, 0)
        femm.mi_clearselected()

        label_x_air_gap = pos["x"] + (t_geo["coreInnerWidth"] + r_geo["width"]) / 4
        femm.mi_addblocklabel(label_x_air_gap, pos["y"])
        femm.mi_selectlabel(label_x_air_gap, pos["y"])
        femm.mi_setblockprop("Air", 1, 0, "<None>", 0, 0, 0)
        femm.mi_clearselected()

    for i, comp in enumerate(step_config.get("standAloneComponents", [])):
        s_geo = comp["component_details"]["specificProductInformation"]["geometry"]
        s_pos = comp["position"]
        create_standalone_object(
            float(s_pos["x"]),
            float(s_pos["y"]),
            float(s_geo["width"]),
            float(s_geo["height"]),
            float(comp.get("rotation", 0)),
            s_geo.get("material", "M-36 Steel"),
            "<None>",
            100 + i,
        )

    femm.mi_addblocklabel(sim_length / 2 - 5, sim_breadth / 2 - 5)
    femm.mi_selectlabel(sim_length / 2 - 5, sim_breadth / 2 - 5)
    femm.mi_setblockprop("Air", 1, 0, "<None>", 0, 0, 0)
    femm.mi_clearselected()

    femm.mi_addblocklabel(sim_length / 2 + 5, 0)
    femm.mi_selectlabel(sim_length / 2 + 5, 0)
    femm.mi_setblockprop("Air", 1, 0, "<None>", 0, 0, 0)
    femm.mi_clearselected()

    femm.mi_makeABC(7, max(sim_length, sim_breadth) * 1.5, 0, 0, 0)
    # KORREKTUR: Speichert die Datei im dafür vorgesehenen Ordner
    fem_file = os.path.join(femm_files_dir, f"{run_identifier}.fem")
    femm.mi_saveas(fem_file)
    femm.mi_analyze(1)
    femm.mi_loadsolution()

    results = []
    for i, asm in enumerate(step_config["assemblies"]):
        phase_name = asm["phaseName"]
        i_sec_real, i_sec_imag, _ = femm.mo_getcircuitproperties(phase_name)
        i_sec_complex = i_sec_real + 1j * i_sec_imag

        femm.mo_groupselectblock(i * 10 + 2)
        b_avg = femm.mo_blockintegral(18)
        femm.mo_clearblock()

        phase_data = next(
            p for p in step_config["electricalSystem"] if p["name"] == phase_name
        )
        i_prim = calculate_instantaneous_current(
            phase_data["peakCurrentA"], phase_data["phaseShiftDeg"], angle_deg
        )

        res = {
            "phaseAngle": angle_deg,
            "conductor": phase_name,
            "iPrimA": i_prim,
            "iSecAbs_A": abs(i_sec_complex),
            "iSecReal_A": i_sec_real,
            "iSecImag_A": i_sec_imag,
            "bAvgMagnitude_T": b_avg,
        }
        res.update({f"pos_{k.lower()}_mm": v for k, v in step_positions.items()})
        results.append(res)

    femm.closefemm()
    return results


def main():
    """Hauptfunktion zur Steuerung des Simulationslaufs."""
    print("--- Starte parallelen Python-Simulations-Workflow ---")

    try:
        with open("simulation_run.json", "r", encoding="utf-8") as f:
            run_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Fehler beim Laden der Konfigurationsdatei: {e}")
        return

    now = datetime.now()
    date_str, time_str = now.strftime("%Y%m%d"), now.strftime("%H%M%S")
    base_results_path = os.path.join("res", date_str, f"{time_str}_parallel_sweep")
    os.makedirs(base_results_path, exist_ok=True)
    shutil.copy(
        "simulation_run.json", os.path.join(base_results_path, "simulation_run.json")
    )
    print(f"Ergebnisse werden in '{base_results_path}' gespeichert.")

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
    measured_currents = {
        "I_1_mes": float(params["scenarioParams"]["I_1_mes"]),
        "I_2_mes": float(params["scenarioParams"]["I_2_mes"]),
        "I_3_mes": float(params["scenarioParams"]["I_3_mes"]),
    }

    num_processes = os.cpu_count()
    print(f"Nutze {num_processes} Prozessorkerne für die Parallelisierung.")

    for i, step in enumerate(position_steps):
        pos_name = f"pos_{i+1}"
        print(f"\n>> Verarbeite {pos_name}")

        for current_name, current_value in measured_currents.items():
            print(
                f"--> Bereite Simulation für {current_name} = {current_value}A vor..."
            )

            # KORREKTUR: Strukturiertes Verzeichnis für die .fem/.ans Dateien
            femm_files_path = os.path.join(
                base_results_path, "femm_files", f"{pos_name}_{current_name}"
            )
            os.makedirs(femm_files_path, exist_ok=True)

            step_config = run_data.copy()
            step_config["electricalSystem"] = [
                p.copy() for p in run_data["electricalSystem"]
            ]
            for phase in step_config["electricalSystem"]:
                phase["peakCurrentA"] = current_value * np.sqrt(2)

            step_config["assemblies"] = [asm.copy() for asm in run_data["assemblies"]]
            for asm_cfg in step_config["assemblies"]:
                if asm_cfg["phaseName"] in step:
                    asm_cfg["position"] = step[asm_cfg["phaseName"]]

            tasks = []
            for angle in phase_angles:
                run_identifier = f"{pos_name}_{current_name}_angle{int(angle)}"
                flat_positions = {
                    f"{p}_{ax}": val
                    for p, coords in step.items()
                    for ax, val in coords.items()
                }
                task = (
                    femm_files_path,
                    step_config,
                    params,
                    angle,
                    run_identifier,
                    flat_positions,
                )
                tasks.append(task)

            with multiprocessing.Pool(processes=num_processes) as pool:
                results_list = pool.map(run_single_simulation, tasks)

            master_results = [item for sublist in results_list for item in sublist]
            if master_results:
                df = pd.DataFrame(master_results)
                csv_filename = f"{pos_name}_{current_name}_summary.csv"
                csv_path = os.path.join(base_results_path, csv_filename)
                df.to_csv(csv_path, index=False)
                print(f"   -> Ergebnisse in '{csv_filename}' gespeichert.")

            # KORREKTUR: Temporäre Verzeichnisse werden nicht mehr erstellt und müssen daher nicht gelöscht werden.

    print("\n--- Simulations-Workflow erfolgreich abgeschlossen. ---")


if __name__ == "__main__":
    multiprocessing.freeze_support()
    main()
