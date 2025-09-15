# src/femm_wrapper.py
"""
Ein Wrapper für die pyfemm-Bibliothek, um die API zu kapseln und die
Testbarkeit sowie die zukünftige Wartung zu erleichtern.
"""
import femm


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

    # NEU: Hinzugefügt für Linienintegrale
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

    def get_circuit_properties(self, circuit_name):
        """Gibt die Eigenschaften eines Stromkreises aus der Lösung zurück."""
        return femm.mo_getcircuitproperties(circuit_name)

    def group_select_block(self, group_id=None):
        """Wählt alle Blöcke einer Gruppe aus."""
        if group_id is not None:
            femm.mo_groupselectblock(group_id)
        else:
            femm.mo_selectblock(0, 0)

    def block_integral(self, integral_type):
        """Berechnet ein Integral über die ausgewählten Blöcke."""
        return femm.mo_blockintegral(integral_type)

    def clear_block_selection(self):
        """Hebt die Auswahl der Blöcke auf."""
        femm.mo_clearblock()

    # NEU: Hinzugefügt für Linienintegrale
    def add_contour(self, x, y):
        """Fügt einen Punkt zu einem Konturpfad hinzu."""
        femm.mo_addcontour(x, y)

    def line_integral(self, integral_type):
        """Berechnet ein Integral entlang des definierten Konturpfades."""
        return femm.mo_lineintegral(integral_type)

    def clear_contour(self):
        """Löscht den aktuellen Konturpfad."""
        femm.mo_clearcontour()
