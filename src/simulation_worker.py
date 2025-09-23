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
    materials_config = global_params.get("materials", [])
    freq = float(scenario_params.get("frequencyHz", 50))
    depth = float(scenario_params.get("problemDepthM", 30))
    core_perm = float(scenario_params.get("coreRelPermeability", 2500))

    femm.new_document(0)
    femm.prob_def(freq, "millimeters", "planar", 1e-8, depth, 30)

    for mat_props in materials_config:
        mat_name = mat_props.get("name")
        if not mat_name:
            continue

        if mat_props.get("is_nonlinear") and mat_props.get("bh_curve"):
            femm.add_material(mat_name, 1, 1)
            for b_val, h_val in mat_props["bh_curve"]:
                femm.add_bh_point(mat_name, b_val, h_val)
        else:
            if mat_name in ["Air", "Copper"]:
                femm.get_material(mat_name)
            else:
                mu_x = float(mat_props.get("mu_x", core_perm))
                mu_y = float(mat_props.get("mu_y", core_perm))
                femm.add_material(mat_name, mu_x=mu_x, mu_y=mu_y)

    for phase in electrical_system:
        inst_current = calculate_instantaneous_current(
            phase["peakCurrentA"], phase["phaseShiftDeg"], angle_deg
        )
        femm.add_circuit(phase["name"], inst_current)


def build_femm_geometry(femm, step_config):
    """
    Zeichnet die gesamte Geometrie und platziert alle Material-Labels.
    """
    materials_list = step_config.get("materials", [])
    air = next((m.get("name") for m in materials_list if m.get("name") == "Air"), "Air")
    copper = next(
        (m.get("name") for m in materials_list if m.get("name") == "Copper"), "Copper"
    )

    sim_raum = step_config["simulation_meta"]["simulationsraum"]
    sim_length = float(sim_raum["Laenge"])
    sim_breadth = float(sim_raum["Breite"])
    femm.draw_rectangle(
        -sim_length / 2, -sim_breadth / 2, sim_length / 2, sim_breadth / 2
    )

    for i, asm in enumerate(step_config["assemblies"]):
        pos = asm["position"]
        r_geo = asm["copperRail_details"]["specificProductInformation"]["geometry"]
        has_transformer = "transformer_details" in asm and asm["transformer_details"]

        # Zeichne immer die Kupferschiene
        draw_rect_explicitly(femm, pos["x"], pos["y"], r_geo["width"], r_geo["height"])

        if has_transformer:
            t_geo = asm["transformer_details"]["specificProductInformation"]["geometry"]
            core_material = t_geo.get("coreMaterial", "M-36 Steel")

            # Zeichne Wandler-Teile
            draw_rect_explicitly(
                femm,
                pos["x"],
                pos["y"],
                t_geo["coreOuterWidth"],
                t_geo["coreOuterHeight"],
            )
            draw_rect_explicitly(
                femm,
                pos["x"],
                pos["y"],
                t_geo["coreInnerWidth"],
                t_geo["coreInnerHeight"],
            )

            # Label für den Kern
            label_x_core = (
                pos["x"] + (t_geo["coreOuterWidth"] + t_geo["coreInnerWidth"]) / 4
            )
            femm.add_block_label(label_x_core, pos["y"])
            femm.select_label(label_x_core, pos["y"])
            femm.set_block_prop(core_material, 1, 0, "<None>", 0, i * 10 + 2, 0)
            femm.clear_selected()

            # Label für den Luftspalt im Wandler
            label_x_air_gap = pos["x"] + (t_geo["coreInnerWidth"] + r_geo["width"]) / 4
            femm.add_block_label(label_x_air_gap, pos["y"])
            femm.select_label(label_x_air_gap, pos["y"])
            femm.set_block_prop(air, 1, 0, "<None>", 0, 0, 0)
            femm.clear_selected()

        # Label für die Kupferschiene
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
            sheet_material = s_geo.get("material", "M-36 Steel")
            create_standalone_object(
                femm,
                float(s_pos["x"]),
                float(s_pos["y"]),
                float(s_geo["width"]),
                float(s_geo["height"]),
                float(comp.get("rotation", 0)),
                sheet_material,
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
    Führt die Analyse durch, sammelt die korrigierten Ergebnisse und speichert Plots.
    """
    femm.analyze(1)
    femm.load_solution()

    run_base_dir = os.path.dirname(os.path.dirname(femm_files_dir))
    plots_dir = os.path.join(run_base_dir, "femm_plots")
    os.makedirs(plots_dir, exist_ok=True)

    femm.zoom_natural()
    femm.show_density_plot(legend=1, gscale=0, upper_b=0, lower_b=0, plot_type="h")
    density_plot_path = os.path.join(plots_dir, f"{run_identifier}_density_H.png")
    femm.save_bitmap(density_plot_path)

    femm.zoom_natural()
    femm.show_vector_plot(plot_type=1, scale_factor=2)
    vector_plot_path = os.path.join(plots_dir, f"{run_identifier}_vector_H.png")
    femm.save_bitmap(vector_plot_path)

    results = []
    for i, asm in enumerate(assemblies):
        phase_name = asm["phaseName"]
        has_transformer = "transformer_details" in asm and asm["transformer_details"]

        conductor_group_id = i * 10 + 1
        i_prim_sim_complex = femm.get_group_block_integral(7, conductor_group_id)

        i_sec_real_a, i_sec_imag_a = 0, 0
        circuit_voltage_complex = 0 + 0j
        b_avg_t, h_avg_complex, p_joule_w, w_mag_j = 0, 0 + 0j, 0, 0
        flux_wb_complex = 0 + 0j

        if has_transformer:
            (
                i_sec_real_a,
                i_sec_imag_a,
                circuit_voltage_complex,
            ) = femm.get_circuit_properties(phase_name)

            core_group_id = i * 10 + 2

            # --- KORREKTUR START ---

            # 1. Komplexen Vektor für mittlere Flussdichte B (Bx + j*By) holen
            b_avg_complex = femm.get_group_block_integral(18, core_group_id)
            # 2. Korrekt den Betrag (Magnitude) berechnen
            b_avg_t = np.abs(b_avg_complex)

            # Komplexen Vektor für mittlere Feldstärke H holen (war bereits korrekt)
            h_avg_complex = femm.get_group_block_integral(19, core_group_id)

            # 3. Korrekte Integral-Typen für Verluste und Energie verwenden
            p_joule_w = femm.get_group_block_integral(
                6, core_group_id
            )  # Typ 6 für Joule'sche Verluste
            w_mag_j = femm.get_group_block_integral(
                5, core_group_id
            )  # Typ 5 für gespeicherte Energie

            # 4. Magnetischen Fluss korrekt berechnen
            # Holt die Querschnittsfläche des Kerns in mm^2 (Integral-Typ 4)
            core_area_mm2 = femm.get_group_block_integral(4, core_group_id)
            # Konvertiere die Fläche in m^2
            core_area_m2 = core_area_mm2 * 1e-6
            # Berechne den komplexen Fluss (Φx + j*Φy) in Wb durch Multiplikation
            flux_wb_complex = b_avg_complex * core_area_m2

            # --- KORREKTUR ENDE ---

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
            "H_avg_real_Am": h_avg_complex.real,
            "H_avg_imag_Am": h_avg_complex.imag,
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
    sheet_material = geo.get("material", "M-36 Steel")
    insulation_material = geo.get("insulationMaterial", "Kunststoff")

    total_width = (sheet_count * sheet_thickness) + (2 * insulation_thickness)
    components = []
    current_offset = -total_width / 2

    if with_insulation:
        components.append(
            {
                "width": insulation_thickness,
                "height": height,
                "offset_x": current_offset + insulation_thickness / 2,
                "material": insulation_material,
            }
        )
        current_offset += insulation_thickness

    for _ in range(sheet_count):
        components.append(
            {
                "width": sheet_thickness,
                "height": height,
                "offset_x": current_offset + sheet_thickness / 2,
                "material": sheet_material,
            }
        )
        current_offset += sheet_thickness

    if with_insulation:
        components.append(
            {
                "width": insulation_thickness,
                "height": height,
                "offset_x": current_offset + insulation_thickness / 2,
                "material": insulation_material,
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
