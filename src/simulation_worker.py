# src/simulation_worker.py
"""
Worker-Funktionen für die parallele FEMM-Simulation.
"""
import os
import re
import numpy as np
from src.femm_wrapper import FEMMSession
from src.utils import calculate_instantaneous_current


def run_single_simulation(task_params):
    """
    Führt eine einzelne FEMM-Analyse durch (wird parallel ausgeführt).
    """
    (
        femm_files_dir,
        step_config,
        global_params,
        angle_deg,
        run_identifier,
        step_positions,
        pos_name,
        current_name,
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
            femm,
            step_config,
            angle_deg,
            step_positions,
            run_identifier,
            pos_name,
            current_name,
        )
    finally:
        femm.close()
    return results


def setup_femm_problem(femm, global_params, electrical_system, angle_deg):
    """
    Konfiguriert die Grundeinstellungen des FEMM-Problems.
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
    femm, step_config, angle_deg, step_positions, run_identifier, pos_name, current_name
):
    """
    Führt die Analyse durch und sammelt die Ergebnisse gemäß der Aufgabenstellung.
    """
    femm.analyze(1)
    femm.load_solution()

    results = []
    for i, asm in enumerate(step_config["assemblies"]):
        phase_name = asm["phaseName"]

        phase_data = next(
            p for p in step_config["electricalSystem"] if p["name"] == phase_name
        )
        i_prim_soll_abs = phase_data["peakCurrentA"] / np.sqrt(2)

        conductor_group_id = i * 10 + 1
        i_prim_sim_complex = femm.get_group_block_integral(19, conductor_group_id)
        i_prim_sim_abs = abs(i_prim_sim_complex)

        transformer_data = asm["transformer_details"]["specificProductInformation"][
            "electrical"
        ]
        ratio_str = transformer_data.get("ratio", "1/1")
        try:
            prim, sec = map(float, re.split(r"[/:]", ratio_str))
            ratio = prim / sec if sec != 0 else 1.0
        except (ValueError, ZeroDivisionError):
            ratio = 1.0

        i_sec_abs_A = i_prim_sim_abs / ratio

        _, _, circuit_voltage = femm.get_circuit_properties(phase_name)

        core_group_id = i * 10 + 2
        b_avg_t = femm.get_group_block_integral(18, core_group_id)
        p_joule_w = femm.get_group_block_integral(5, core_group_id)
        w_mag_j = femm.get_group_block_integral(6, core_group_id)
        flux_wb = femm.get_group_block_integral(8, core_group_id)
        torque_nm = femm.get_group_block_integral(22, core_group_id)

        pos = asm["position"]
        rail_geo = asm["copperRail_details"]["specificProductInformation"]["geometry"]
        radius = max(rail_geo["width"], rail_geo["height"])

        femm.add_contour(pos["x"] + radius, pos["y"])
        femm.add_arc(pos["x"] + radius, pos["y"], pos["x"] - radius, pos["y"], 180, 5)
        femm.add_arc(pos["x"] - radius, pos["y"], pos["x"] + radius, pos["y"], 180, 5)

        flux_linkage_wb_turns = femm.line_integral(1)[0]
        v_drop_v = femm.line_integral(2)[0]
        femm.clear_contour()

        l_h = flux_linkage_wb_turns / i_prim_sim_abs if i_prim_sim_abs > 1e-9 else 0

        res = {
            "pos_name": pos_name,
            "current_name": current_name,
            "run_identifier": run_identifier,
            "conductor": phase_name,
            "phaseAngle": angle_deg,
            "IprimAbs_A": i_prim_soll_abs,
            "Iprim_sim_A": i_prim_sim_abs,
            "IsecAbs_A": i_sec_abs_A,
            "circuitVoltage_V": circuit_voltage,
            "B_avg_T": b_avg_t,
            "P_joule_W": p_joule_w,
            "W_mag_J": w_mag_j,
            "Flux_Wb": flux_wb,
            "Torque_Nm": torque_nm,
            "FluxLinkage_WbTurns": flux_linkage_wb_turns,
            "V_drop_V": v_drop_v,
            "L_H": l_h,
        }

        flat_positions = {
            f"pos_{p}_{ax}": val
            for p, coords in step_positions.items()
            for ax, val in coords.items()
        }
        res.update(flat_positions)
        results.append(res)

    return results


def draw_rect_explicitly(femm_session, center_x, center_y, width, height):
    """Zeichnet ein Rechteck über Knoten und Segmente."""
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
