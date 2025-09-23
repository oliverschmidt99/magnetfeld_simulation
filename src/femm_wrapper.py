# src/femm_wrapper.py
"""
Ein Wrapper für die pyfemm-Bibliothek, um die API zu kapseln und die
Testbarkeit sowie die zukünftige Wartung zu erleichtern.
"""
import femm
import pandas as pd

# Definition der Blockintegral-Typen mit Namen, Formelzeichen und Einheiten
BLOCK_INTEGRAL_TYPES = {
    0: {"name": "A·J-Integral", "symbol": "W_AJ", "unit": "J"},
    1: {"name": "A-Integral", "symbol": "A_int", "unit": "Wb·m"},
    2: {"name": "Magnetische Feldenergie", "symbol": "W_m", "unit": "J"},
    3: {"name": "Hysterese- und Blechverluste", "symbol": "P_h", "unit": "W"},
    4: {"name": "Ohmsche Verluste", "symbol": "P_R", "unit": "W"},
    5: {"name": "Blockquerschnittsfläche", "symbol": "A_Block", "unit": "m²"},
    6: {"name": "Gesamtverluste", "symbol": "P_ges", "unit": "W"},
    7: {"name": "Gesamtstrom", "symbol": "I_ges", "unit": "A"},
    8: {"name": "Integral von Bx über Block", "symbol": "Φx", "unit": "Wb"},
    9: {"name": "Integral von By über Block", "symbol": "Φy", "unit": "Wb"},
    10: {"name": "Blockvolumen", "symbol": "V_Block", "unit": "m³"},
    11: {
        "name": "x-Anteil der Lorentzkraft (stationär)",
        "symbol": "F_x,L,ss",
        "unit": "N",
    },
    12: {
        "name": "y-Anteil der Lorentzkraft (stationär)",
        "symbol": "F_y,L,ss",
        "unit": "N",
    },
    13: {"name": "x-Anteil der 2·Lorentzkraft", "symbol": "F_x,L,2x", "unit": "N"},
    14: {"name": "y-Anteil der 2·Lorentzkraft", "symbol": "F_y,L,2x", "unit": "N"},
    15: {"name": "Lorentz-Drehmoment (stationär)", "symbol": "M_L,ss", "unit": "N·m"},
    16: {
        "name": "2·Komponente des Lorentz-Drehmoments",
        "symbol": "M_L,2x",
        "unit": "N·m",
    },
    17: {"name": "Magnetische Koenergie", "symbol": "W_c", "unit": "J"},
    18: {
        "name": "x-Anteil der WST-Kraft (stationär)",
        "symbol": "F_x,WST,ss",
        "unit": "N",
    },
    19: {
        "name": "y-Anteil der WST-Kraft (stationär)",
        "symbol": "F_y,WST,ss",
        "unit": "N",
    },
    20: {"name": "x-Anteil der 2·WST-Kraft", "symbol": "F_x,WST,2x", "unit": "N"},
    21: {"name": "y-Anteil der 2·WST-Kraft", "symbol": "F_y,WST,2x", "unit": "N"},
    22: {"name": "WST-Drehmoment (stationär)", "symbol": "M_WST,ss", "unit": "N·m"},
    23: {
        "name": "2·Komponente des WST-Drehmoments",
        "symbol": "M_WST,2x",
        "unit": "N·m",
    },
    24: {"name": "R² (Trägheitsmoment / Dichte)", "symbol": "R²", "unit": "m⁴"},
    25: {"name": "x-Anteil der 1·WST-Kraft", "symbol": "F_x,WST,1x", "unit": "N"},
    26: {"name": "y-Anteil der 1·WST-Kraft", "symbol": "F_y,WST,1x", "unit": "N"},
    27: {
        "name": "1·Komponente des WST-Drehmoments",
        "symbol": "M_WST,1x",
        "unit": "N·m",
    },
    28: {"name": "x-Anteil der 1·Lorentzkraft", "symbol": "F_x,L,1x", "unit": "N"},
    29: {"name": "y-Anteil der 1·Lorentzkraft", "symbol": "F_y,L,1x", "unit": "N"},
    30: {
        "name": "1·Komponente des Lorentz-Drehmoments",
        "symbol": "M_L,1x",
        "unit": "N·m",
    },
}


class FEMMSession:
    """Eine Klasse, die eine einzelne FEMM-Sitzung verwaltet."""

    def __init__(self, visible=False):
        """
        Initialisiert eine neue FEMM-Sitzung.

        Args:
            visible (bool): Ob das FEMM-GUI-Fenster angezeigt werden soll.
        """
        femm.openfemm(visible)

    def close(self):
        """Schließt die FEMM-Sitzung."""
        femm.closefemm()

    def new_document(self, doc_type=0):
        """
        Erstellt ein neues Dokument.
        0 = Magnetics, 1 = Electrostatics, 2 = Heat Flow, 3 = Current Flow
        """
        femm.newdocument(doc_type)

    def prob_def(self, frequency, units, prob_type, precision, depth, min_angle=30):
        """Definiert die Problem-Eigenschaften."""
        femm.mi_probdef(frequency, units, prob_type, precision, depth, min_angle)

    def add_material(self, mat_name, mu_x=1, mu_y=1, h_c=0, j=0, c=0, d=0):
        """Fügt ein neues Material hinzu."""
        femm.mi_addmaterial(mat_name, mu_x, mu_y, h_c, j, c, d)

    def add_bh_point(self, mat_name, b, h):
        """Fügt einen Punkt zur B-H Kurve eines Materials hinzu."""
        femm.mi_addbhpoint(mat_name, b, h)

    def get_material(self, mat_name):
        """Lädt ein Material aus der Standard-Bibliothek."""
        femm.mi_getmaterial(mat_name)

    def add_circuit(self, circuit_name, current, circuit_type=1):
        """Fügt eine neue Stromquelle (Circuit) hinzu."""
        femm.mi_addcircprop(circuit_name, current, circuit_type)

    def draw_rectangle(self, x1, y1, x2, y2):
        """Zeichnet ein Rechteck."""
        femm.mi_drawrectangle(x1, y1, x2, y2)

    def add_node(self, x, y):
        """Fügt einen Knoten hinzu."""
        femm.mi_addnode(x, y)

    def add_segment(self, x1, y1, x2, y2):
        """Fügt ein Liniensegment hinzu."""
        femm.mi_addsegment(x1, y1, x2, y2)

    def add_arc(self, x1, y1, x2, y2, angle, max_seg):
        """Fügt einen Bogen hinzu."""
        femm.mi_addarc(x1, y1, x2, y2, angle, max_seg)

    def add_block_label(self, x, y):
        """Setzt ein Material-Label."""
        femm.mi_addblocklabel(x, y)

    def select_label(self, x, y):
        """Wählt ein Label aus."""
        femm.mi_selectlabel(x, y)

    def set_block_prop(
        self, mat_name, automesh, mesh_size, circuit, mag_dir, group, turns
    ):
        """Weist einem Label Materialeigenschaften zu."""
        femm.mi_setblockprop(
            mat_name, automesh, mesh_size, circuit, mag_dir, group, turns
        )

    def clear_selected(self):
        """Hebt die aktuelle Auswahl auf."""
        femm.mi_clearselected()

    def make_abc(
        self, num_layers=7, radius=500, center_x=0, center_y=0, boundary_type=0
    ):
        """Erstellt absorbierende Randbedingungen."""
        femm.mi_makeABC(num_layers, radius, center_x, center_y, boundary_type)

    def save_as(self, filename):
        """Speichert die .fem-Datei."""
        return femm.mi_saveas(filename)

    def analyze(self, flag=1):
        """Startet die Analyse."""
        return femm.mi_analyze(flag)

    def load_solution(self):
        """Lädt die Lösungsdatei (.ans)."""
        femm.mi_loadsolution()

    # --- Post-processing (mo_*) Befehle ---

    def save_bitmap(self, filename):
        """Speichert die aktuelle Ansicht als Bitmap-Datei."""
        femm.mo_savebitmap(filename)

    def show_density_plot(self, legend, gscale, upper_b, lower_b, plot_type="bmag"):
        """Zeigt einen Dichte-Plot an."""
        femm.mo_showdensityplot(legend, gscale, upper_b, lower_b, plot_type)

    def show_vector_plot(self, plot_type, scale_factor):
        """Zeigt einen Vektor-Plot an."""
        femm.mo_showvectorplot(plot_type, scale_factor)

    def show_contour_plot(self, num_contours, lower_bound, upper_bound, plot_type="A"):
        """Zeigt die Kontur-Linien (Feldlinien) an."""
        femm.mo_showcontourplot(num_contours, lower_bound, upper_bound, plot_type)

    def zoom_natural(self):
        """Zoomt auf die natürliche Größe des Problems."""
        femm.mo_zoomnatural()

    def get_circuit_properties(self, circuit_name):
        """Gibt die Eigenschaften eines Stromkreises aus der Lösung zurück."""
        return femm.mo_getcircuitproperties(circuit_name)

    def group_select_block(self, group_id=None):
        """Wählt alle Blöcke einer Gruppe aus."""
        if group_id is not None:
            femm.mo_groupselectblock(group_id)
        else:
            femm.mo_selectblock(0, 0)

    def get_group_block_integral(self, integral_type, group_id):
        """Wählt eine Gruppe, berechnet das Integral und hebt die Auswahl wieder auf."""
        self.group_select_block(group_id)
        value = femm.mo_blockintegral(integral_type)
        femm.mo_clearblock()
        return value

    def block_integral(self, integral_type):
        """Berechnet ein Integral über die aktuell ausgewählten Blöcke."""
        return femm.mo_blockintegral(integral_type)

    def clear_block_selection(self):
        """Hebt die Auswahl der Blöcke auf."""
        femm.mo_clearblock()

    def add_contour(self, x, y):
        """Fügt einen Punkt zu einem Konturpfad hinzu."""
        femm.mo_addcontour(x, y)

    def line_integral(self, integral_type):
        """Berechnet ein Integral entlang des definierten Konturpfades."""
        return femm.mo_lineintegral(integral_type)

    def clear_contour(self):
        """Löscht den aktuellen Konturpfad."""
        femm.mo_clearcontour()

    def get_all_block_integrals_for_group(self, group_id, as_dataframe=False):
        """
        Ruft alle Blockintegral-Typen (0-30) für eine gegebene group_id ab.

        Args:
            group_id (int): Die ID der Gruppe, die analysiert werden soll.
            as_dataframe (bool): Wenn True, wird das Ergebnis als Pandas DataFrame zurückgegeben.

        Returns:
            dict or pd.DataFrame: Ein Dictionary oder DataFrame mit allen Integral-Ergebnissen.
        """
        results = {"group_id": group_id, "integrals": {}}

        for int_type, data in BLOCK_INTEGRAL_TYPES.items():
            value = self.get_group_block_integral(int_type, group_id)
            # Kopiere die Daten, um das Original-Dictionary nicht zu verändern
            result_data = data.copy()
            result_data["value"] = value
            results["integrals"][int_type] = result_data

        if as_dataframe:
            df = pd.DataFrame.from_dict(results["integrals"], orient="index")
            df.index.name = "type_id"
            return df

        return results
