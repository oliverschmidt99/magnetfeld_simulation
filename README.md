# Magnetfeld-Simulation für Stromwandler-Systeme

Dieses Projekt dient zur Simulation und Analyse von magnetischen Feldern in 3-Phasen-Systemen, die aus Stromschienen und Stromwandlern bestehen. Die Anwendung basiert vollständig auf **Python**.

Eine benutzerfreundliche Weboberfläche, die mit **Flask** erstellt wurde, ermöglicht die einfache Konfiguration der Simulationsparameter. Das Backend steuert die Open-Source-Software **FEMM (Finite Element Method Magnetics)** für die eigentliche Feld-Berechnung.

## Funktionen

- **Webbasierter Konfigurator**: Erstelle und bearbeite Simulationsszenarien bequem im Browser.
- **Dynamische Geometrie**: Definiere die Anordnung von Stromschienen, Wandlern und Abschirmblechen.
- **Parametrische Analyse**: Führe Simulationen über einen Bereich von Phasenwinkeln und für verschiedene Positionen der Bauteile durch.
- **Automatisierte Auswertung**: Generiert automatisch eine CSV-Datei mit den wichtigsten Ergebnissen (Sekundärströme, Flussdichten etc.).
- **Live-Visualisierung**: Eine SVG-basierte Vorschau auf der Webseite zeigt die Anordnung der Bauteile in Echtzeit an.

---

## Voraussetzungen

Stelle sicher, dass die folgende Software auf deinem System installiert ist:

1.  **FEMM 4.2**: Die Python-Skripte sind auf diese Version ausgelegt.
    - Stelle sicher, dass FEMM korrekt installiert ist und über die Kommandozeile gestartet werden könnte.
2.  **Python**: Getestet mit Version 3.9 oder neuer.
3.  **Python-Bibliotheken**: Installiere alle benötigten Pakete mit dem folgenden Befehl in deinem Terminal:
    ```bash
    pip install -r requirements.txt
    ```

---

## So startest du die Simulation

Der gesamte Prozess wird nun über die Weboberfläche gesteuert:

### Schritt 1: Web-Anwendung starten

1.  Öffne ein Terminal im Hauptverzeichnis des Projekts.
2.  Starte die Flask-Anwendung:
    ```bash
    python app.py
    ```
3.  Öffne deinen Webbrowser und gehe zu `http://127.0.0.1:5000`.

### Schritt 2: Simulation im Browser konfigurieren

1.  Navigiere zur Seite **"Simulation"**.
2.  Passe alle Parameter nach deinen Wünschen an:
    - Allgemeine Parameter (Nennstrom, Problem-Tiefe etc.).
    - Definiere das elektrische System (Phasen, Ströme).
    - Stelle Baugruppen und eigenständige Bauteile zusammen und positioniere sie.
    - Kontrolliere deine Eingaben in der visuellen Vorschau im Tab "Übersicht & Vorschau".
3.  Wenn alles passt, klicke auf den Knopf **"1. simulation.json erstellen"**. Dies speichert deine Konfiguration und schaltet den nächsten Schritt frei.

### Schritt 3: Simulation aus dem Browser starten

1.  Nachdem die `simulation.json` erstellt wurde, erscheint der Bereich "Simulation durchführen".
2.  Klicke auf den Knopf **"2. Simulation starten"**.
3.  Die Web-Anwendung startet nun im Hintergrund das Python-Skript `run_simulation.py`, welches FEMM automatisch öffnet, die Modelle aufbaut, die Analyse durchführt und die Ergebnisse speichert.
4.  Der Fortschritt wird im Ausgabefenster auf der Webseite angezeigt. Nach Abschluss findest du die Ergebnisse (CSV-Datei und FEM-Dateien) in einem neu erstellten Ordner im `res`-Verzeichnis.
