# src/simulation_runner.py
"""
Haupt-Skript zur Steuerung des FEMM-Simulations-Workflows.
Nutzt eine klassenbasierte Struktur, Logging und Multiprocessing.
"""

import json
import os
import shutil
import multiprocessing
import logging
import time
from datetime import datetime
import numpy as np
import pandas as pd
from src.femm_wrapper import FEMMSession

# ### Logging-Konfiguration ###
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)

# NEU: Pfad zur Status-Datei
STATUS_FILE = "simulation_status.json"


class SimulationRunner:
    """
    Orchestriert den gesamten FEMM-Simulations-Workflow.
    """

    def __init__(self, config_path="simulation_run.json"):
        self.run_data = self._load_config(config_path)
        if not self.run_data:
            raise ValueError("Konfigurationsdatei konnte nicht geladen werden.")

        self.base_results_path = self._create_results_directory()
        self._setup_logging_file_handler()

        shutil.copy(
            config_path, os.path.join(self.base_results_path, "simulation_run.json")
        )
        logging.info("Ergebnisse werden in '%s' gespeichert.", self.base_results_path)

    def _update_status(self, status, completed=0, total=0, duration=None):
        """Schreibt den aktuellen Status in die JSON-Datei."""
        status_data = {
            "status": status,
            "completed": completed,
            "total": total,
            "duration": duration,
        }
        with open(STATUS_FILE, "w", encoding="utf-8") as f:
            json.dump(status_data, f)

    def _load_config(self, path):
        """Lädt die JSON-Konfigurationsdatei."""
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            logging.error("Fehler beim Laden der Konfigurationsdatei: %s", e)
            return None

    def _create_results_directory(self):
        """Erstellt ein eindeutiges Verzeichnis für die Ergebnisse."""
        now = datetime.now()
        date_str, time_str = now.strftime("%Y%m%d"), now.strftime("%H%M%S")
        output_dir = "simulations"
        path = os.path.join(output_dir, date_str, f"{time_str}_parallel_sweep")
        os.makedirs(path, exist_ok=True)
        return path

    def _setup_logging_file_handler(self):
        """Fügt einen File-Handler zum Logger hinzu."""
        log_file_path = os.path.join(self.base_results_path, "simulation.log")
        file_handler = logging.FileHandler(log_file_path)
        file_handler.setFormatter(
            logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
        )
        logging.getLogger().addHandler(file_handler)

    def run(self):
        """Startet und verwaltet den gesamten Simulationsprozess."""
        logging.info("--- Starte parallelen Python-Simulations-Workflow ---")
        start_time = time.time()

        tasks = self._prepare_all_tasks()
        total_tasks = len(tasks)

        if total_tasks == 0:
            logging.warning(
                "Keine Simulationsaufgaben gefunden. Workflow wird beendet."
            )
            self._update_status("complete", 0, 0, 0)
            return

        logging.info("Insgesamt %d Simulationsaufgaben zu erledigen.", total_tasks)
        self._update_status("running", 0, total_tasks)

        num_processes = os.cpu_count()
        logging.info("Nutze %d Prozessorkerne für die Parallelisierung.", num_processes)

        all_results = []
        completed_tasks = 0

        with multiprocessing.Pool(processes=num_processes) as pool:
            for result_chunk in pool.imap_unordered(run_single_simulation, tasks):
                completed_tasks += 1
                all_results.extend(result_chunk)

                if (
                    completed_tasks % (max(1, total_tasks // 20)) == 0
                    or completed_tasks == total_tasks
                ):
                    self._update_status("running", completed_tasks, total_tasks)

        if all_results:
            self._save_results_to_csv(all_results)

        end_time = time.time()
        duration = round(end_time - start_time, 2)
        logging.info(
            "--- Simulations-Workflow nach %.2f Sekunden erfolgreich abgeschlossen. ---",
            duration,
        )
        self._update_status("complete", total_tasks, total_tasks, duration)

    def _prepare_all_tasks(self):
        """Erstellt eine flache Liste aller zu erledigenden Simulationsaufgaben."""
        all_tasks = []
        position_steps = self.run_data["simulation_meta"]["bewegungspfade_alle_leiter"][
            "schritte_details"
        ]
        measured_currents = {
            "I_1_mes": float(self.run_data["scenarioParams"].get("I_1_mes", 0)),
            "I_2_mes": float(self.run_data["scenarioParams"].get("I_2_mes", 0)),
            "I_3_mes": float(self.run_data["scenarioParams"].get("I_3_mes", 0)),
        }
        phase_sweep = self.run_data["scenarioParams"]["phaseSweep"]
        phase_angles = np.arange(
            float(phase_sweep["start"]),
            float(phase_sweep["end"]) + float(phase_sweep["step"]),
            float(phase_sweep["step"]),
        )

        for i, step in enumerate(position_steps):
            pos_name = f"pos_{i+1}"
            for current_name, current_value in measured_currents.items():
                if current_value == 0:
                    continue

                femm_files_path = os.path.join(
                    self.base_results_path, "femm_files", f"{pos_name}_{current_name}"
                )
                os.makedirs(femm_files_path, exist_ok=True)

                for angle in phase_angles:
                    run_identifier = f"{pos_name}_{current_name}_angle{int(angle)}"

                    step_config = self.run_data.copy()
                    step_config["electricalSystem"] = [
                        p.copy() for p in self.run_data["electricalSystem"]
                    ]
                    for phase in step_config["electricalSystem"]:
                        phase["peakCurrentA"] = current_value * np.sqrt(2)

                    step_config["assemblies"] = [
                        asm.copy() for asm in self.run_data["assemblies"]
                    ]
                    for asm_cfg in step_config["assemblies"]:
                        phase_name = asm_cfg["phaseName"]
                        if phase_name in step:
                            asm_cfg["position"] = step[phase_name]

                    task = (
                        femm_files_path,
                        step_config,
                        self.run_data,
                        angle,
                        run_identifier,
                        step,
                    )
                    all_tasks.append(task)
        return all_tasks

    def _save_results_to_csv(self, results):
        """Speichert eine Liste von Ergebnis-Dictionaries in gruppierten CSV-Dateien."""
        df = pd.DataFrame(results)
        df[["pos_name", "current_name", "angle"]] = df["run_identifier"].str.split(
            "_", expand=True
        )[:, [0, 2, 4]]

        for (pos, current), group in df.groupby(["pos_name", "current_name"]):
            csv_filename = f"{pos}_{current}_summary.csv"
            csv_path = os.path.join(self.base_results_path, csv_filename)
            group.drop(columns=["pos_name", "current_name", "angle"]).to_csv(
                csv_path, index=False
            )
            logging.info("   -> Ergebnisse in '%s' gespeichert.", csv_filename)


# ###################################################################
# WORKER-FUNKTION
# ###################################################################


def run_single_simulation(task_params):
    """
    Führt eine einzelne FEMM-Analyse durch.
    """
    (
        femm_files_dir,
        step_config,
        global_params,
        angle_deg,
        run_identifier,
        step_positions,
    ) = task_params

    femm = FEMMSession(visible=False)
    try:
        setup_femm_problem(
            femm, global_params, step_config["electricalSystem"], angle_deg
        )
        build_femm_geometry(femm, step_config)
        fem_file = os.path.join(femm_files_dir, f"{run_identifier}.fem")
        femm.save_as(fem_file)
        results = run_analysis_and_collect_results(
            femm, step_config, angle_deg, step_positions, run_identifier
        )
    finally:
        femm.close()
    return results


# ###################################################################
# MODULARE HILFSFUNKTIONEN
# ###################################################################


def setup_femm_problem(femm, global_params, electrical_system, angle_deg):
    """
    Konfiguriert die Grundeinstellungen des FEMM-Problems, die Materialien
    und die elektrischen Stromkreise.
    """
    scenario_params = global_params.get("scenarioParams", {})
    materials_config = global_params.get("materials", {})
    freq = float(scenario_params.get("frequencyHz", 50))
    depth = float(scenario_params.get("problemDepthM", 30))
    core_perm = float(scenario_params.get("coreRelPermeability", 2500))

    femm.new_document(0)
    femm.prob_def(freq, "millimeters", "planar", 1e-8, depth, 30)

    for mat_props in materials_config.values():
        mat_name = mat_props.get("name")
        if not mat_name:
            continue

        if mat_props.get("is_steel", False):
            femm.add_material(mat_name, mu_x=core_perm, mu_y=core_perm)
        else:
            femm.get_material(mat_name)

    for phase in electrical_system:
        inst_current = calculate_instantaneous_current(
            phase["peakCurrentA"], phase["phaseShiftDeg"], angle_deg
        )
        femm.add_circuit(phase["name"], inst_current)


def build_femm_geometry(femm, step_config):
    """
    Zeichnet die gesamte Geometrie und platziert alle Material-Labels.
    """
    materials = step_config.get("materials", {})
    air = materials.get("air", {}).get("name", "Air")
    copper = materials.get("copper", {}).get("name", "Copper")
    steel = materials.get("steel", {}).get("name", "M-36 Steel")

    sim_raum = step_config["simulation_meta"]["simulationsraum"]
    sim_length = float(sim_raum["Laenge"])
    sim_breadth = float(sim_raum["Breite"])
    femm.draw_rectangle(
        -sim_length / 2, -sim_breadth / 2, sim_length / 2, sim_breadth / 2
    )

    for i, asm in enumerate(step_config["assemblies"]):
        pos = asm["position"]
        t_geo = asm["transformer_details"]["specificProductInformation"]["geometry"]
        r_geo = asm["copperRail_details"]["specificProductInformation"]["geometry"]

        draw_rect_explicitly(
            femm, pos["x"], pos["y"], t_geo["coreOuterWidth"], t_geo["coreOuterHeight"]
        )
        draw_rect_explicitly(
            femm, pos["x"], pos["y"], t_geo["coreInnerWidth"], t_geo["coreInnerHeight"]
        )
        draw_rect_explicitly(femm, pos["x"], pos["y"], r_geo["width"], r_geo["height"])

        label_x_core = (
            pos["x"] + (t_geo["coreOuterWidth"] + t_geo["coreInnerWidth"]) / 4
        )
        femm.add_block_label(label_x_core, pos["y"])
        femm.select_label(label_x_core, pos["y"])
        femm.set_block_prop(steel, 1, 0, "<None>", 0, i * 10 + 2, 0)
        femm.clear_selected()

        label_x_air_gap = pos["x"] + (t_geo["coreInnerWidth"] + r_geo["width"]) / 4
        femm.add_block_label(label_x_air_gap, pos["y"])
        femm.select_label(label_x_air_gap, pos["y"])
        femm.set_block_prop(air, 1, 0, "<None>", 0, 0, 0)
        femm.clear_selected()

        femm.add_block_label(pos["x"], pos["y"])
        femm.select_label(pos["x"], pos["y"])
        femm.set_block_prop(copper, 1, 0, asm["phaseName"], 0, i * 10 + 1, 0)
        femm.clear_selected()

    for i, comp in enumerate(step_config.get("standAloneComponents", [])):
        s_geo = comp["component_details"]["specificProductInformation"]["geometry"]
        s_pos = comp["position"]
        shield_material = s_geo.get("material", steel)
        create_standalone_object(
            femm,
            float(s_pos["x"]),
            float(s_pos["y"]),
            float(s_geo["width"]),
            float(s_geo["height"]),
            float(comp.get("rotation", 0)),
            shield_material,
            "<None>",
            100 + i,
        )

    femm.add_block_label(sim_length / 2 - 5, sim_breadth / 2 - 5)
    femm.select_label(sim_length / 2 - 5, sim_breadth / 2 - 5)
    femm.set_block_prop(air, 1, 0, "<None>", 0, 0, 0)
    femm.clear_selected()

    femm.add_block_label(sim_length / 2 + 5, 0)
    femm.select_label(sim_length / 2 + 5, 0)
    femm.set_block_prop(air, 1, 0, "<None>", 0, 0, 0)
    femm.clear_selected()

    femm.make_abc(7, max(sim_length, sim_breadth) * 1.5, 0, 0, 0)


def run_analysis_and_collect_results(
    femm, step_config, angle_deg, step_positions, run_identifier
):
    """
    Führt die Analyse durch und sammelt die Ergebnisse.
    """
    femm.analyze(1)
    femm.load_solution()

    results = []
    for i, asm in enumerate(step_config["assemblies"]):
        phase_name = asm["phaseName"]
        i_sec_real, i_sec_imag, _ = femm.get_circuit_properties(phase_name)
        i_sec_complex = i_sec_real + 1j * i_sec_imag

        femm.group_select_block(i * 10 + 2)
        b_avg = femm.block_integral(18)
        femm.clear_block_selection()

        phase_data = next(
            p for p in step_config["electricalSystem"] if p["name"] == phase_name
        )
        i_prim = calculate_instantaneous_current(
            phase_data["peakCurrentA"], phase_data["phaseShiftDeg"], angle_deg
        )

        res = {
            "run_identifier": run_identifier,
            "phaseAngle": angle_deg,
            "conductor": phase_name,
            "iPrimA": i_prim,
            "iSecAbs_A": abs(i_sec_complex),
            "iSecReal_A": i_sec_real,
            "iSecImag_A": i_sec_imag,
            "bAvgMagnitude_T": b_avg,
        }
        flat_positions = {
            f"pos_{p}_{ax}": val
            for p, coords in step_positions.items()
            for ax, val in coords.items()
        }
        res.update(flat_positions)
        results.append(res)
    return results


def calculate_instantaneous_current(peak_current, phase_shift_deg, angle_deg):
    """Berechnet den Momentanstrom."""
    return peak_current * np.cos(np.deg2rad(angle_deg + phase_shift_deg))


def draw_rect_explicitly(femm_session, center_x, center_y, width, height):
    """Zeichnet ein Rechteck."""
    x1, y1 = center_x - width / 2, center_y - height / 2
    x2, y2 = center_x + width / 2, center_y + height / 2
    femm_session.add_node(x1, y1)
    femm_session.add_node(x2, y1)
    femm_session.add_node(x2, y2)
    femm_session.add_node(x1, y2)
    femm_session.add_segment(x1, y1, x2, y1)
    femm_session.add_segment(x2, y1, x2, y2)
    femm_session.add_segment(x2, y2, x1, y2)
    femm_session.add_segment(x1, y2, x1, y1)


def create_standalone_object(
    femm_session,
    center_x,
    center_y,
    width,
    height,
    rotation_deg,
    material,
    circuit,
    group_id,
):
    """Zeichnet ein rotiertes Rechteck."""
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
        femm_session.add_node(corner_x, corner_y)
    for k in range(4):
        p1, p2 = rotated_corners[k], rotated_corners[(k + 1) % 4]
        femm_session.add_segment(p1[0], p1[1], p2[0], p2[1])

    femm_session.add_block_label(center_x, center_y)
    femm_session.select_label(center_x, center_y)
    femm_session.set_block_prop(material, 1, 0, circuit, 0, group_id, 0)
    femm_session.clear_selected()


# ###################################################################
# SCRIPT-EINSTIEGSPUNKT
# ###################################################################

if __name__ == "__main__":
    multiprocessing.freeze_support()
    runner = SimulationRunner()
    runner.run()
