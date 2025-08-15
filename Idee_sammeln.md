# Ideen für die Simulation

---

## UI - Aufbau

- **Hauptmenü** mit den Optionen: "Neues Projekt", "Projekt laden", "Bauteile erstellen", "Einstellungen" und "Beenden". Bei Auswahl eines Buttons soll ein Tab geöffnet werden, um die entsprechenden Funktionen anzuzeigen.

  - **_Neues Projekt_**:

    - Eingabefelder für Projektnamen und Beschreibung
    - Auswahlmöglichkeiten für Art der Simulation
      - 3 Leiter (L1 L2 L3)
      - 4 Leiter (L1 L2 L3 N)
      - 5 Leiter (L1 L2 L3 N PE)
      - 2 Leiter (L1 N)
        - Stromstärke für L1 L2 L3 angeben.
        - Auswahl welcher Leiter ein Wandler bekommt.
          - Auswahl von Wandler Maßen (Muss definiert werden) Innendurchmesser und Aussendurchmesser
      - Sandbox
        - Leiter, Wandler, Trafoblech, Leiter + Wandler (siehe Editor später)
      - Speicherort auswählen
        - Pfad für das Projektverzeichnis angeben
    - Schaltfläche "Projekt erstellen"

  - **_Projekt laden_**:

    - Auswahl des Projekts aus einer Liste
    - Schaltfläche "Projekt laden"

  - **_Bauteile erstellen_**:

    - Auswahl des Bauteiltyps (z.B. Wandler, Trafoblech, Leiter)
    - Eingabefelder für Bauteilparameter (z.B. Maße, Material, Name)
      - Für einfache Bauteile
        - Aussenmaße (Breite und Höhe)
        - Innenmaße (Breite und Höhe)
        - Tiefe
      - Für Komplexere Bauteile soll es ein Bauteil-Zeichen-Editor geben
        - In dem Editor soll man die Bauteile zeichnen und anpassen können
        - So wie bei Freecad aber etwas vereinfacht (Nur 2D)
          - Wenn man den Wandler mit einem Leiter verbindet, soll eine Verbindungspunkt für die Kupferschine angezeigt werden.
    - Schaltfläche "Bauteil erstellen"
    - Baustellenübersicht (Liste aller erstellten Bauteile)
    - Schaltfläche "Bauteil bearbeiten"
    - Schaltfläche "Bauteil löschen"
    - Schaltfläche "Bauteil duplizieren"
    - Schaltfläche "Bauteil anzeigen"

  - **_Einstellungen_**:

    - **Problem Definition**
      - Problem Type: Planar oder Axisymmetric
      - Length Units: Millimeters, Centimeters, Meters, Mils, Micrometers
      - Frequency (Hz): Variable Zahl (50)
      - Depth: Variable Zahl (30)
      - Solver Precision: Variable Zahl (1e-008)
      - Min Angle: Variable Zahl (30)
      - Smart Mesh: On oder off
      - AC Solver: Succ. Approx oder Newton
      - Comment: Variable Text (Hier Kommentar eingeben)
    - **Materialien**

      - **Materialdatenbank:**
        - Materialien werden aus der Datei "C:\femm42\bin\matlib.dat" geladen.
      - **Materialverwaltung:**

        - Neue Materialien können definiert oder bestehende bearbeitet werden.
        - **Standardmaterialien:**
          - Air
          - Copper
          - Iron
        - **Parameter für jedes Material:**

          - Mu_x (relative Permeabilität in X-Richtung)
          - Mu_y (relative Permeabilität in Y-Richtung)
          - H_c (Koerzitivfeldstärke)
          - H_cAngle (Winkel der Koerzitivfeldstärke)
          - J_re (reale Stromdichte)
          - J_im (imaginäre Stromdichte)
          - Sigma (Leitfähigkeit)
          - d_lam (Laminierungsdicke)
          - Phi_h (Hysterese-Winkel)
          - Phi_hx (Hysterese-Winkel in X-Richtung)
          - Phi_hy (Hysterese-Winkel in Y-Richtung)
          - LamType (Laminierungstyp)
          - LamFill (Laminierungsfüllfaktor)
          - NStrands (Anzahl der Stränge)
          - WireD (Drahtdurchmesser)
          - BHPoints (Anzahl der BH-Kurvenpunkte)
          - ```
            <BeginBlock>
            <BlockName> = "Air"
            <Mu_x> = 1
            <Mu_y> = 1
            <H_c> = 0
            <H_cAngle> = 0
            <J_re> = 0
            <J_im> = 0
            <Sigma> = 0
            <d_lam> = 0
            <Phi_h> = 0
            <Phi_hx> = 0
            <Phi_hy> = 0
            <LamType> = 0
            <LamFill> = 1
            <NStrands> = 0
            <WireD> = 0
            <BHPoints> = 0
            <EndBlock>
            ```

        - Boundary Conditions: Variable Text (Hier Randbedingungen eingeben)
        -

    - **_Grid_**
      - Grid Size: Variable Zahl (10)
      - Grid Type: Rectangular, Hexagonal, Punkte, leer usw.
      - Am Grid ausrichten: Ja oder Nein

- **Projekt XY** Wenn ein Projekt geöffnet ist, soll die Werkzeugleiste die verfügbaren Werkzeuge für dieses Projekt anzeigen.

  - **_Werkzeugbar_**

    - Editor (Werkezuge sollen hier Gruppiert angezeigt werden, wie bei Word)
      - Werkzeuge, wie Textwerkzeuge, Zeichenwerkzeuge, Bearbeitungswerkzeuge
      - Farbauswahl
      - Formenwerkzeuge
      - Bauteil einfügen (z.B. Leiter, Wandler, Trafoblech)
      - Größenänderungswerkzeuge
      - Kopierwerkzeug
      - Verschieben Werkzeug
      - Drehen Werkzeug
      - Spiegeln Werkzeug
      - Gruppieren/Entgruppieren Werkzeug
      - Ausrichten Werkzeug
      - Anordnen Werkzeug (Ebene nach vorne/hinten)
      - Bemaßungswerkzeug
      - Messwerkzeug (Abstände, Winkel)
      - Gitterfang/Ausrichtungshilfen
      - Ebenenverwaltung (Sichtbarkeit, Sperren)
      - Undo/Redo
    - Simulieren

      - Parameterauswahl
      - Strom von I_start bis I_end in I_step Schritten simulieren oder Konstant
      - Leiter und Wandler von einem Punkt zu einem andern Punkt wander lassen oder Konstant
        - Mit einem Vektorpfeil reinzeichnen.
      - Phasenwinkel phi_start bis phi_end in phi_step Schritten simulieren oder Konstant
      -

    - Analysieren
      - Ergebnisse der Simulation anzeigen (z.B. Magnetfeldlinien, Flussdichte, Induktivität)
      - Exportoptionen (z.B. als Bild, CSV, PDF)
      - Diagramme und Plots (z.B. B-H-Kurven, Stromverläufe)
    - Dokumentation
      - Ein text feld damit man sich notzien machen kann
    - Hilfe

---
