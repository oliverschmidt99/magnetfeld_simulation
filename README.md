# Magnetfeld-Simulation für Niederspannungsanwendungen

Dieses Projekt bietet einen vollständigen, automatisierten Workflow zur Erstellung, Durchführung und Analyse von elektromagnetischen FEMM-Simulationen. Eine benutzerfreundliche, mit **Flask** erstellte Web-Oberfläche ermöglicht Ingenieuren und Studenten die effiziente Untersuchung von magnetischen Streufeldern, insbesondere in der Nähe von Stromschienen in Niederspannungssystemen.

**[Zum Git-Repository](https://github.com/oliverschmidt99/magnetfeld_simulation)**

## Die Anwendung in Bildern

Hier ist ein Überblick über die Hauptseiten der Anwendung.

**Startseite**
_Die Startseite bietet einen schnellen Überblick und Navigation zu den Kernbereichen der Anwendung._
![Startseite](grafik.png)

**Simulations-Konfigurator**
_Das Herzstück der Anwendung: ein detaillierter, visueller Editor zur Konfiguration aller Simulationsparameter, inklusive einer Live-Vorschau der Bauteil-Anordnung._
**Ergebnisseite**
_Nach einer Simulation können hier die Ergebnisse interaktiv analysiert und visualisiert werden._
**Bauteil-Bibliothek**
_Ein umfassender Editor zur Verwaltung aller Bauteile wie Stromwandler, Kupferschienen und Abschirmbleche._

---

## Funktionen

- **Automatisierter Simulations-Workflow**: Von der Bauteilerstellung in der Bibliothek über die Konfiguration bis zur Auswertung – alles in einer Anwendung.
- **Visueller Konfigurator**: Erstelle und bearbeite Simulationsszenarien bequem im Browser, ohne eine einzige Zeile Code schreiben zu müssen.
- **Interaktive Ergebnis-Visualisierung**: Analysiere Simulationsdaten direkt in der Web-Anwendung durch interaktive Diagramme.
- **Gegenüberstellung von Simulation & Realität**: Vergleiche Simulationsergebnisse mit realen Messdaten vom Prüfstand, um die Genauigkeit der Modelle zu validieren.
- **Umfassende Bauteil-Bibliothek**: Definiere und verwalte komplexe Geometrien und Materialeigenschaften für Stromwandler, Kupferschienen und Abschirmbleche.
- **Live-Vorschau**: Überprüfe die Anordnung deiner Bauteile in Echtzeit durch eine SVG-basierte Vorschau direkt auf der Konfigurationsseite.

---

## Technischer Stack

- **Backend**: Python, Flask
- **Simulation**: FEMM (Finite Element Method Magnetics)
- **Datenmanipulation**: Pandas, NumPy
- **Frontend**: HTML, CSS, JavaScript (mit Chart.js für Diagramme)
- **Datenbank**: SQLite für die Bauteil- und Materialbibliothek

---

## Erste Schritte

Folge diesen Schritten, um die Anwendung lokal auszuführen.

### Voraussetzungen

Stelle sicher, dass die folgende Software auf deinem System installiert ist:

1.  **FEMM 4.2**: Diese Anwendung ist für die **Windows-Version** von FEMM ausgelegt. FEMM muss separat installiert werden.
    - [Lade FEMM hier herunter](http://www.femm.info/wiki/HomePage)
2.  **Python**: Version 3.9 oder neuer.
3.  **Python-Bibliotheken**: Alle weiteren Abhängigkeiten sind in der `requirements.txt` Datei aufgeführt.

### Installation & Start

1.  **Klone das Repository:**

    ```bash
    git clone [https://github.com/oliverschmidt99/magnetfeld_simulation.git](https://github.com/oliverschmidt99/magnetfeld_simulation.git)
    cd magnetfeld_simulation
    ```

2.  **Installiere die Python-Abhängigkeiten:**

    ```bash
    pip install -r requirements.txt
    ```

3.  **Initialisiere die Datenbank:**
    (Nur beim ersten Mal oder nach dem Löschen der `database.db` notwendig)

    ```bash
    python init_db.py
    ```

4.  **Starte die Web-Anwendung:**

    ```bash
    python app.py
    ```

5.  **Öffne die Anwendung im Browser:**
    Navigiere zu `http://127.0.0.1:2020`.

---

## Typischer Workflow

Ein typischer Arbeitsablauf in der Anwendung sieht wie folgt aus:

1.  **Bibliothek füllen**: Navigiere zur **Verwaltung -> Bibliothek**, um neue Bauteile (Stromwandler, Schienen) mit ihren spezifischen geometrischen und elektrischen Eigenschaften anzulegen.
2.  **Simulation konfigurieren**: Gehe zu **Simulation -> Konfiguration & Start**. Hier stellst du dein Szenario zusammen, wählst Bauteile aus, positionierst sie und legst alle Simulationsparameter fest.
3.  **Simulation starten**: Erstelle zuerst die `simulation.json` und starte anschließend die FEMM-Berechnung direkt aus dem Browser. Der Fortschritt wird live angezeigt.
4.  **Ergebnisse ansehen**: Nach Abschluss der Simulation findest du die Ergebnisse unter **Simulation -> Simulationsergebnisse**. Lade die Daten, filtere sie und visualisiere sie interaktiv.
5.  **Messdaten erfassen**: Unter **Praxismessungen** kannst du reale Messwerte vom Prüfstand eingeben und speichern, um sie später mit den Simulationsergebnissen zu vergleichen.
