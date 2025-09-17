# Magnetfeld-Simulation für Niederspannungsanwendungen

Dieses Projekt bietet einen vollständigen, automatisierten Workflow zur Erstellung, Durchführung und Analyse von elektromagnetischen FEMM-Simulationen. Eine benutzerfreundliche, mit **Flask** erstellte Web-Oberfläche ermöglicht Ingenieuren und Studenten die effiziente Untersuchung von magnetischen Streufeldern, insbesondere in der Nähe von Stromschienen in Niederspannungssystemen.

## Die Anwendung in Bildern

Hier ist ein Überblick über die Hauptseiten der Anwendung.

**Startseite**
Die Startseite bietet einen schnellen Überblick und Navigation zu den Kernbereichen der Anwendung.
_Screenshot der Startseite hier einfügen_

**Simulations-Konfigurator**
Das Herzstück der Anwendung: ein detaillierter, visueller Editor zur Konfiguration aller Simulationsparameter, inklusive einer Live-Vorschau der Bauteil-Anordnung.

**Ergebnisseite**
Nach einer Simulation können hier die Ergebnisse interaktiv analysiert und visualisiert werden.
_Screenshot der Ergebnisseite mit einem Diagramm hier einfügen_

**Bauteil-Bibliothek**
Ein umfassender Editor zur Verwaltung aller Bauteile wie Stromwandler, Kupferschienen und Abschirmbleche.
_Screenshot des Bibliotheks-Editors hier einfügen_

---

## Funktionen

- **Automatisierter Simulations-Workflow**: Von der Bauteilerstellung in der Bibliothek über die Konfiguration bis zur Auswertung – alles in einer Anwendung.
- **Visueller Konfigurator**: Erstelle und bearbeite Simulationsszenarien bequem im Browser, ohne eine einzige Zeile Code schreiben zu müssen.
- **Interaktive Ergebnis-Visualisierung**: Analysiere Simulationsdaten direkt in der Web-Anwendung durch interaktive Diagramme, die mit **Plotly** erstellt werden.
- **Umfassende Bauteil-Bibliothek**: Definiere und verwalte komplexe Geometrien und Materialeigenschaften für Stromwandler, Kupferschienen und Abschirmbleche.
- **Live-Vorschau**: Überprüfe die Anordnung deiner Bauteile in Echtzeit durch eine SVG-basierte Vorschau direkt auf der Konfigurationsseite.

---

## Technischer Stack

- **Backend**: Python, Flask
- **Simulation**: FEMM (Finite Element Method Magnetics)
- **Datenmanipulation**: Pandas
- **Visualisierung**: Plotly
- **Frontend**: HTML, CSS, JavaScript

---

## Erste Schritte

Folge diesen Schritten, um die Anwendung lokal auszuführen.

### Voraussetzungen

Stelle sicher, dass die folgende Software auf deinem System installiert ist:

1.  **FEMM 4.2**: Diese Anwendung ist für die **Windows-Version** von FEMM ausgelegt. FEMM muss separat installiert werden, da es nicht über `pip` verfügbar ist.
    - [Lade FEMM hier herunter](http://www.femm.info/wiki/HomePage)
2.  **Python**: Version 3.9 oder neuer.
3.  **Python-Bibliotheken**: Alle weiteren Abhängigkeiten sind in der `requirements.txt` Datei aufgeführt.

### Installation & Start

1.  **Klone das Repository:**

    ```bash
    git clone <repository-url>
    cd magnetfeld_simulation
    ```

2.  **Installiere die Python-Abhängigkeiten:**

    ```bash
    pip install -r requirements.txt
    ```

3.  **Starte die Web-Anwendung:**

    ```bash
    python app.py
    ```

4.  **Öffne die Anwendung im Browser:**
    Navigiere zu `http://127.0.0.1:5000`.

---

## Typischer Workflow

Ein typischer Arbeitsablauf in der Anwendung sieht wie folgt aus:

1.  **Bibliothek füllen**: Navigiere zur **Bibliothek**, um neue Bauteile wie Stromwandler oder Kupferschienen mit ihren spezifischen geometrischen und elektrischen Eigenschaften anzulegen.
2.  **Simulation konfigurieren**: Gehe zur Seite **Simulation**. Hier stellst du dein Szenario zusammen, wählst Bauteile aus der Bibliothek aus, positionierst sie und legst alle Simulationsparameter fest.
3.  **Simulation starten**: Erstelle zuerst die `simulation.json` und starte anschließend die FEMM-Berechnung direkt aus dem Browser. Der Fortschritt wird live angezeigt.
4.  **Ergebnisse ansehen**: Nach Abschluss der Simulation findest du die Ergebnisse im **simulations**-Ordner. Auf der Seite **Ergebnisse** kannst du die Daten laden, filtern und interaktiv visualisieren.

---

## Zukunft & Mitwirkung

Dieses Projekt wird aktiv weiterentwickelt. Beiträge aus der Community sind herzlich willkommen\!

### Geplante Features

- **Vergleich mit Real-Messungen**: Eine neue Seite wird es ermöglichen, reale Messdaten hochzuladen und diese direkt mit den Simulationsergebnissen zu vergleichen. Dies wird durch visuelle Hilfestellungen zur Erstellung der Messungen unterstützt, inklusive der Darstellung aller Messpunkte mit den jeweiligen Strömen und Spannungen.
