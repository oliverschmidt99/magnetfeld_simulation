# src/simulation_worker.py
"""
Worker-Funktionen für die parallele FEMM-Simulation.
"""
import os
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
            step_config["assemblies"],
            angle_deg,
            step_positions,
            run_identifier,
            pos_name,
            current_name,
            femm_files_dir,
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

    femm.add_material("Kunststoff", mu_x=1, mu_y=1)

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

        if s_geo.get("type") == "SheetPackage":
            create_sheet_package(femm, s_pos, s_geo, comp.get("rotation", 0), 100 + i)
        else:
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
    femm,
    assemblies,
    angle_deg,
    step_positions,
    run_identifier,
    pos_name,
    current_name,
    femm_files_dir,
):
    """
    Führt die Analyse durch, sammelt die Roh-Ergebnisse und speichert Plots.
    """
    femm.analyze(1)
    femm.load_solution()

    # KORREKTUR: Grafische Plots werden jetzt für JEDEN Phasenwinkel erstellt
    run_base_dir = os.path.dirname(os.path.dirname(femm_files_dir))
    plots_dir = os.path.join(run_base_dir, "femm_plots")
    os.makedirs(plots_dir, exist_ok=True)

    # Dichte-Plot für |H| erstellen und speichern
    femm.zoom_natural()
    femm.show_density_plot(legend=1, gscale=0, upper_b=0, lower_b=0, plot_type="h")
    # KORREKTUR: Dateiname enthält jetzt den Phasenwinkel
    density_plot_path = os.path.join(plots_dir, f"{run_identifier}_density_H.png")
    femm.save_bitmap(density_plot_path)

    # Vektor-Plot für H erstellen und speichern
    femm.zoom_natural()
    femm.show_vector_plot(plot_type=1, scale_factor=2)
    # KORREKTUR: Dateiname enthält jetzt den Phasenwinkel
    vector_plot_path = os.path.join(plots_dir, f"{run_identifier}_vector_H.png")
    femm.save_bitmap(vector_plot_path)

    results = []
    for i, asm in enumerate(assemblies):
        phase_name = asm["phaseName"]

        conductor_group_id = i * 10 + 1
        i_prim_sim_complex = femm.get_group_block_integral(7, conductor_group_id)

        (
            i_sec_real_a,
            i_sec_imag_a,
            circuit_voltage_complex,
        ) = femm.get_circuit_properties(phase_name)

        core_group_id = i * 10 + 2
        b_avg_t = femm.get_group_block_integral(18, core_group_id)
        p_joule_w = femm.get_group_block_integral(5, core_group_id)
        w_mag_j = femm.get_group_block_integral(6, core_group_id)
        flux_wb_complex = femm.get_group_block_integral(8, core_group_id)

        res = {
            "pos_name": pos_name,
            "current_name": current_name,
            "run_identifier": run_identifier,
            "conductor": phase_name,
            "phaseAngle_deg": angle_deg,
            "Iprim_sim_real_A": i_prim_sim_complex.real,
            "Iprim_sim_imag_A": i_prim_sim_complex.imag,
            "Isec_real_A": i_sec_real_a,
            "Isec_imag_A": i_sec_imag_a,
            "circuit_voltage_real_V": circuit_voltage_complex.real,
            "circuit_voltage_imag_V": circuit_voltage_complex.imag,
            "B_avg_T": b_avg_t,
            "P_joule_W": p_joule_w,
            "W_mag_J": w_mag_j,
            "Flux_real_Wb": flux_wb_complex.real,
            "Flux_imag_Wb": flux_wb_complex.imag,
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


def create_sheet_package(femm_session, center_pos, geo, rotation_deg, group_id_start):
    """
    Zeichnet ein ganzes Paket aus Abschirmblechen mit optionaler Isolierung.
    """
    center_x, center_y = float(center_pos["x"]), float(center_pos["y"])
    height = float(geo.get("height", 100))
    sheet_count = int(geo.get("sheetCount", 1))
    sheet_thickness = float(geo.get("sheetThickness", 1))
    with_insulation = geo.get("withInsulation", False)
    insulation_thickness = (
        float(geo.get("insulationThickness", 0)) if with_insulation else 0
    )

    total_width = (sheet_count * sheet_thickness) + (2 * insulation_thickness)

    components = []
    current_offset = -total_width / 2

    if with_insulation:
        components.append(
            {
                "width": insulation_thickness,
                "height": height,
                "offset_x": current_offset + insulation_thickness / 2,
                "material": "Kunststoff",
            }
        )
        current_offset += insulation_thickness

    for _ in range(sheet_count):
        components.append(
            {
                "width": sheet_thickness,
                "height": height,
                "offset_x": current_offset + sheet_thickness / 2,
                "material": geo.get("material", "M-36 Steel"),
            }
        )
        current_offset += sheet_thickness

    if with_insulation:
        components.append(
            {
                "width": insulation_thickness,
                "height": height,
                "offset_x": current_offset + insulation_thickness / 2,
                "material": "Kunststoff",
            }
        )

    for i, comp_props in enumerate(components):
        rad = np.deg2rad(rotation_deg)
        cos_a, sin_a = np.cos(rad), np.sin(rad)

        rotated_offset_x = comp_props["offset_x"] * cos_a
        rotated_offset_y = comp_props["offset_x"] * sin_a

        final_center_x = center_x + rotated_offset_x
        final_center_y = center_y + rotated_offset_y

        create_standalone_object(
            femm_session,
            final_center_x,
            final_center_y,
            comp_props["width"],
            comp_props["height"],
            rotation_deg,
            comp_props["material"],
            "<None>",
            group_id_start * 10 + i,
        )


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
    """Zeichnet ein einzelnes, rotiertes Rechteck."""
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
