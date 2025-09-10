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

Absolut! Gerne, hier ist eine Zusammenfassung der aktuellen Seiten und daran anknüpfend ein paar Vorschläge und Fragen, um die Struktur der Website zu optimieren und aufzuräumen.

### Zusammenfassung der bestehenden Seiten

- **`index.html` (Home):** Deine Startseite. Momentan dient sie als Willkommens- oder Übersichtsseite.
- **`configurator.html` (Konfigurator):** Das Herzstück deiner Anwendung. Hier stellst du eine Simulation detailliert zusammen, definierst Baugruppen und Parameter und erstellst die `simulation.json`.
- **`simulation.html` (Simulation):** Diese Seite scheint dafür gedacht zu sein, eine bereits erstellte `simulation.json` auszuführen und den Fortschritt der FEMM-Berechnungen zu verfolgen.
- **`analysis.html` (Analyse):** Dient zur Visualisierung und Auswertung der Ergebnisse (`.ans`-Dateien) einer abgeschlossenen Simulation.
- **`bauteile.html` (Bauteile):** Ein Editor, um die Haupt-Bauteilbibliothek (`library.json`) zu verwalten, also neue Transformatoren, Schienen etc. hinzuzufügen oder zu bearbeiten.
- **`admin.html` (Admin):** Ein Editor speziell für die CSV-Stammdaten (`startpositionen.csv`, `bewegungen.csv` etc.).
- **`settings.html` (Einstellungen):** Eine Platzhalter-Seite für zukünftige Anwendungseinstellungen.
- **`measurement.html` (Measurement):** Eine Seite, die aussieht, als sei sie für die Steuerung eines Messprozesses gedacht, eventuell zur Erfassung von realen Daten.
- **`simulation_v2.html` (Interaktiver Konfigurator):** Die Prototyp-Seite, deren Funktionalität wir in den Haupt-Konfigurator (`configurator.html`) integriert haben.

---

Hallo! Absolut. Gerne analysiere ich deine MATLAB-Skripte im Hinblick auf die neue `simulation_run.json`-Struktur und erstelle dir eine Übersicht der notwendigen Anpassungen.

Hier ist eine detaillierte Aufschlüsselung der Änderungen, die erforderlich sind, um deine Simulationen mit dem neuen, dynamischen Positions-Setup zum Laufen zu bringen.

---

Ja, das kann ich anpassen. Dein Bild zeigt sehr gut, wo die Materialien definiert werden müssen.

Bevor ich den Code anpasse, habe ich ein paar klärende Fragen. Das stellt sicher, dass ich die Änderung genau nach deinen Vorstellungen umsetze.

---

### Fragenkatalog

#### 1. Material im Zentrum der Wandler (die 3 linken Kreuze)

Die drei Kreuze befinden sich genau dort, wo die stromführenden Kupferschienen platziert sind. Aktuell wird an dieser Stelle das Material **"Copper"** zusammen mit dem jeweiligen Stromkreis (z.B. "L1") platziert.

- **Frage:** Soll ich das Material an dieser Stelle von "Copper" zu **"Air"** ändern?

  - **Falls ja:** Ein "Air"-Block kann in FEMM keinen Strom aus einem Stromkreis führen. Würde das bedeuten, dass du eine Simulation **ohne die primären Leiter** durchführen möchtest, um nur die magnetische Kopplung der Kerne zu sehen?
  - **Falls nein:** Ist die Beschriftung im Bild eventuell missverständlich und es soll dort bei "Copper" bleiben, so wie es aktuell implementiert ist?

  Nein alles nicht. Ich habe ein Bild im Anhang der etwas detaliert ist. Bei dem Wandler sind die Breiche ohne Material definition und müssen mit air gekennzeicht werden.

#### 2. Luft im Umgebungsraum (die 2 rechten Kreuze)

Die beiden Kreuze rechts im Bild (eins innerhalb und eins außerhalb des großen blauen Rechtecks) werden vom aktuellen Skript bereits korrekt mit "Air" befüllt.

- **Frage:** Kann ich davon ausgehen, dass diese Platzierungen korrekt sind und sich die gewünschte Änderung nur auf die drei Bereiche **innerhalb der Wandler** bezieht?

  Nein nämlich nicht! da wo die Kreuze sind fehlen die Materialeigenschaften. und müssen noch implementiert werden!

---

Sobald du mir diese Punkte beantwortet hast, kann ich die Anpassungen im Skript `ComponentGroup.m` präzise für dich vornehmen.
