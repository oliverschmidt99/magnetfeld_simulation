# src/simulation_runner.py
"""
Haupt-Skript zur Steuerung des FEMM-Simulations-Workflows.
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

from src.simulation_worker import run_single_simulation

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
                        pos_name,
                        current_name,
                    )
                    all_tasks.append(task)
        return all_tasks

    def _save_results_to_csv(self, results):
        """Speichert eine Liste von Ergebnis-Dictionaries in gruppierten und sortierten CSV-Dateien."""
        if not results:
            return

        df = pd.DataFrame(results)

        for (pos, current), group in df.groupby(["pos_name", "current_name"]):
            csv_filename = f"{pos}_{current}_summary.csv"
            csv_path = os.path.join(self.base_results_path, csv_filename)

            # KORREKTUR: Sortiert die Daten vor dem Speichern
            sorted_group = group.sort_values(by=["phaseAngle", "conductor"])

            # Entferne die Hilfsspalten vor dem Speichern
            sorted_group.drop(
                columns=["pos_name", "current_name", "run_identifier"]
            ).to_csv(csv_path, index=False)
            logging.info("   -> Ergebnisse in '%s' gespeichert.", csv_filename)


if __name__ == "__main__":
    multiprocessing.freeze_support()
    runner = SimulationRunner()
    runner.run()
