# Ideen für das Projekt

## Aufbau und struktur der Webseite

- **Home**: Auf der Seite soll die Website vorgestellt werden und eine kurze Beschreibung des Projekts geben.
- **Simulation**: Auf der Seite soll die Simulation von FEMM gestarte werden.
  - **Konfigurieren**
    - Hier sollen die Konfiguration von den CSV-Dateien bearbeitet werden.
    - Es soll zudem die Werte für jede Stromstärke angezigt werden in einem Diagram.
- **Benutzerverwaltung**: Verwaltung der Benutzerkonten, einschließlich Erstellung, Bearbeitung und Löschung von Benutzern.
- **Tag-Verwaltung**: Verwaltung der Tags, die in der Anwendung verwendet werden.
- **Statistiken**: Anzeige von Statistiken und Analysen zur Nutzung der Anwendung.
- **Einstellungen**: Anpassung der Anwendungseinstellungen durch den Administrator.

---

Absolut! Gerne formuliere ich deine Aufgabenstellung präziser und strukturierter. Das hilft nicht nur, das Ziel klarer zu definieren, sondern auch bei der späteren Umsetzung in Code.

Basierend auf deinen Punkten habe ich das Ganze in Form einer Anforderungsbeschreibung aufbereitet.

---

### **Anforderungsbeschreibung: Interaktiver Konfigurator für FEMM-Simulationsdateien**

#### **1. Ziel des Projekts**

Ziel ist die Erstellung eines interaktiven Skripts oder Programms (Konfigurator), das einen Benutzer schrittweise durch die Konfiguration einer FEMM-Simulation führt. Das Endergebnis dieses Prozesses ist eine einzige, in sich geschlossene Konfigurationsdatei im JSON-Format (`simulation.json`). Diese Datei enthält **alle** für eine spezifische Simulationsreihe notwendigen Parameter, Geometrien und Einstellungen, sodass sie portabel und ohne externe Abhängigkeiten (wie eine separate `library.json`) von einem MATLAB-Skript ausgeführt werden kann.

#### **2. Der Konfigurationsprozess (Ablauf für den Benutzer)**

Der Konfigurator führt den Benutzer durch die folgenden, aufeinander aufbauenden Schritte:

**Schritt 1: Auswahl des Nennstroms**

- Der Benutzer wählt einen primären Nennstrom aus einer vordefinierten Liste aus.
- **Vordefinierte Werte:** `600 A, 800 A, 1000 A, 1250 A, 1600 A, 2000 A, 2500 A, 3000 A, 4000 A, 5000 A`.
- Dieser Wert dient als Filterkriterium für den nächsten Schritt.

**Schritt 2: Auswahl des Stromwandlers**

- **Filtern:** Das Programm durchsucht eine zentrale Bauteilbibliothek (z.B. `library.json`) und zeigt dem Benutzer alle Stromwandler an, die für den in Schritt 1 gewählten Nennstrom ausgelegt sind.
- **Auswahl:** Der Benutzer wählt einen der angezeigten Stromwandler für die Simulation aus.
- **Datenübernahme:** Die vollständigen geometrischen und materialspezifischen Daten des **ausgewählten** Wandlers werden direkt in die zu erstellende `simulation.json` kopiert.

**Schritt 3: Definition der Leiterposition und Bewegung**

- **Laden der Startgeometrie:** Die initialen (x,y)-Koordinaten der drei Kupferleiter (L1, L2, L3) sowie die Geometrie des Simulationsraums (der "Spielraum") werden aus einer Stammdaten-Datei geladen.
- **Auswahl der Bewegungsgruppe:** Der Benutzer wählt eine vordefinierte Bewegungsgruppe aus der Datei `bewegung.csv`. Jede Gruppe definiert eine Bewegungsrichtung oder -muster (z.B. "Pos11: ← Westen, , → Osten").
- **Berechnung der Positionsschritte:** Anhand der gewählten Bewegungsgruppe und der dazugehörigen Schrittweiten aus `schrittweite.csv` berechnet das Programm alle diskreten Positionen der Leiter für den gesamten Simulationsverlauf. Diese berechneten Koordinatenreihen werden in der `simulation.json` gespeichert.

**Schritt 4: Festlegung der Simulationsparameter**

- **Eingabe der Simulationsströme:** Der Benutzer gibt drei konkrete Stromstärken an (z.B. `2000 A, 2500 A, 3000 A`), die im Rahmen der Simulation untersucht werden sollen. Dies sind die tatsächlichen Werte für die drei separaten Simulationsläufe.
- **Definition des Phasenwinkels:** Für jede der drei Stromstärken wird ein Phasenwinkel-Sweep durchgeführt. Diese Parameter sind fest definiert:
  - Startwinkel (`varphi_start`): $0°$
  - Endwinkel (`varphi_end`): $180°$
  - Schrittweite (`varphi_step`): $5°$

#### **3. Das Ergebnis: Die `simulation.json` Datei**

Die erzeugte `simulation.json` ist eine vollständige und unabhängige "Blaupause" für die Simulation. Sie enthält:

- **Bauteildaten:** Die vollständigen Geometrie- und Materialdaten des ausgewählten Stromwandlers.
- **Geometriedaten:** Die Startpositionen und alle berechneten Positionsschritte der Leiter L1, L2 und L3.
- **Simulationsparameter:** Die drei zu simulierenden Stromstärken und die Parameter für den Phasenwinkel-Sweep.
- **Simulationsraum:** Die Abmessungen des umgebenden Raumes.

#### **4. Begründung des Konzepts (Das "Warum")**

- **Stabilität und Reproduzierbarkeit:** Jede `simulation.json` ist eine exakte, unveränderliche Aufzeichnung einer Konfiguration. Sie kann archiviert und zu einem späteren Zeitpunkt erneut ausgeführt werden, um exakt die gleichen Ergebnisse zu erzielen. Das Versenden an Kollegen wird trivial – eine Datei genügt.
- **Entkopplung und Einfachheit:** Das MATLAB-Simulationsskript (z.B. `main.m`) wird stark vereinfacht. Seine einzige Aufgabe ist das Parsen **einer einzigen** `simulation.json` und das Ausführen der darin definierten Berechnungen. Es benötigt keine Logik, um externe Bibliotheken zu durchsuchen oder Referenzen aufzulösen. Dies reduziert die Komplexität und Fehleranfälligkeit des MATLAB-Codes erheblich.

---
