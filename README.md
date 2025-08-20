Na klar, hier ist ein Entwurf für eine `README.md`-Datei für dein Repository. Ich habe alle deine Anmerkungen und die besprochenen Punkte berücksichtigt. Du kannst den Text einfach kopieren und in eine neue Datei namens `README.md` in deinem Projektverzeichnis einfügen.

---

# Magnetfeld-Simulation für Stromwandler-Systeme

Dieses Projekt dient zur Simulation und Analyse von magnetischen Feldern in 3-Phasen-Systemen, die aus Stromschienen und Stromwandlern bestehen. Die Simulation wird durch **MATLAB** gesteuert, das seinerseits die Open-Source-Software **FEMM (Finite Element Method Magnetics)** für die eigentliche Feld-Berechnung nutzt.

Eine benutzerfreundliche Weboberfläche, die mit **Flask** (Python) erstellt wurde, ermöglicht die einfache Konfiguration der Simulationsparameter, der elektrischen Eigenschaften und der geometrischen Anordnung der Bauteile.

## Funktionen

- **Webbasierter Konfigurator**: Erstelle und bearbeite Simulationsszenarien bequem im Browser.
- **Dynamische Geometrie**: Definiere die Anordnung von Stromschienen, Wandlern und Abschirmblechen.
- **Parametrische Analyse**: Führe Simulationen über einen Bereich von Phasenwinkeln durch, um das Systemverhalten unter verschiedenen Bedingungen zu analysieren.
- **Objektorientiertes MATLAB-Setup**: Eine modulare und erweiterbare Codebasis in MATLAB zur Steuerung der Simulation.
- **Automatisierte Auswertung**: Generiert automatisch Plots und eine CSV-Datei mit den wichtigsten Ergebnissen (Sekundärströme, Flussdichten, Verluste).
- **Live-Visualisierung**: Eine SVG-basierte Vorschau zeigt die Anordnung der Bauteile direkt auf der Webseite an.

---

## Voraussetzungen

Stelle sicher, dass die folgende Software auf deinem System installiert ist:

1.  **MATLAB**: Getestet mit Version R2023b oder neuer.
2.  **FEMM 4.2**: Die MATLAB-Skripte sind auf die `m-files` dieser Version angewiesen.
    - Stelle sicher, dass der Pfad zu den `m-files` in `main.m` korrekt eingetragen ist (z.B. `addpath('C:\femm42\mfiles');`).
3.  **Python**: Getestet mit Version 3.9 oder neuer.
4.  **Python-Bibliotheken**: Installiere die benötigten Pakete mit dem folgenden Befehl:
    ```bash
    pip install -r requirements.txt
    ```

---

## So startest du die Simulation

Die Simulation wird in drei Schritten gestartet:

### Schritt 1: Web-Konfigurator starten

1.  Öffne ein Terminal im Hauptverzeichnis des Projekts.
2.  Starte die Flask-Anwendung:
    ```bash
    python app.py
    ```
3.  Öffne deinen Webbrowser und gehe zu `http://127.0.0.1:5000`.

### Schritt 2: Simulation konfigurieren

1.  Passe im Tab **"Konfigurator"** alle Parameter an:
    - Allgemeine Simulations-Parameter (Frequenz, Permeabilität etc.).
    - Füge Phasen hinzu und konfiguriere deren Spitzenstrom und Phasenverschiebung.
    - Erstelle Baugruppen aus den in `library.json` definierten Bauteilen und positioniere sie.
    - Füge bei Bedarf eigenständige Bauteile (z.B. Abschirmbleche) hinzu.
2.  Wechsle zum Tab **"Visualisierung"** und klicke auf "Visualisierung aktualisieren", um eine Vorschau deiner Anordnung zu sehen.
3.  Wenn alles passt, klicke auf **"simulation.json erstellen"**. Dies speichert deine Konfiguration in der `simulation.json`-Datei im Hauptverzeichnis.

### Schritt 3: MATLAB-Skript ausführen

1.  Öffne MATLAB.
2.  **WICHTIG**: Starte eine FEMM-Instanz aus MATLAB heraus, damit die Skripte sich verbinden können. Gib dazu in der MATLAB-Konsole ein:
    ```matlab
    openfemm
    ```
    Es sollte sich ein leeres FEMM-Fenster öffnen. Du kannst es minimieren, aber nicht schließen.
3.  Führe das Hauptskript `main.m` in MATLAB aus.

Das Skript liest nun die `simulation.json`, baut das Modell in FEMM auf, führt die Analyse für alle Phasenwinkel durch und speichert die Ergebnisse (CSV-Datei und PDF-Plot) im `res`-Verzeichnis.

---

## To-Do-Liste & Zukünftige Erweiterungen

Hier sind die nächsten geplanten Schritte zur Verbesserung des Projekts:

- **Verbesserung der Web-Visualisierung**:

  - https://github.com/oliverschmidt99/philipshue-day_routine aus dem Repository die Grafische oberfläche hinzufügen.
  - https://github.com/oliverschmidt99/weihnachtspost_rj/ aus dem Repository die struktur übernehmen, dass es mehrere HTML seiten gibt.

  - Zoom- und Pan-Funktionalität in der SVG-Grafik implementieren.
  - Detailliertere Informationen zu den Bauteilen bei Mouse-Over anzeigen.
  - Einblendung eines Koordinatengitters zur besseren Orientierung.

- **Bauteil-Bibliothek erweitern**:

  - Weitere Stromschienen und Wandler zur `library.json` hinzufügen aus der Excelliste.
  - Unterstützung für Ringkernwandler (`RingTransformer.m`) in der Web-UI und Simulation integrieren.
  - Eine eigene Oberfläche zur Erstellung und Bearbeitung von Bauteilen direkt im Web-UI schaffen.

- **Konfigurator anpassen**

  - Ein Elektrisches System (Phasen) soll einer Kupferschiene hinzugefügt werden.
    - Erstellen individuelle Phasen mit spezifischen Parametern (z.B. Name:, Phasenverschiebung (°), Spitzenstrom (A), Effektivstrom (A)).
    - Das Elektischesystem soll dann einer Kupferschiene zugeordnet werden.

- **Auswertung der Simulationen**:

  - Einen neuen Reiter "Ergebnisse" auf der Webseite hinzufügen.
  - Die generierten Plots und CSV-Daten direkt auf der Webseite anzeigen.
  - Interaktive Diagramme (z.B. mit Plotly.js) zur Analyse der Ergebnisse.
  - Aus den .ans Dateien von Femm eine Visualisierung der Ergebnisse darstellen.

- **Simulationsszenarien verwalten**:

  - Eine Funktion zum Speichern und Laden von verschiedenen Konfigurationen (Szenarien) implementieren.
  - Ein Dropdown-Menü auf der Startseite, um gespeicherte Szenarien schnell zu laden.
