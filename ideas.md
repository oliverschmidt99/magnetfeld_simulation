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

### Vorschläge & Fragen zur Vereinfachung

Basierend auf der Zusammenfassung habe ich ein paar Ideen, wie wir die Struktur klarer und logischer gestalten können. Bitte gib mir Feedback, welche dieser Vorschläge dir zusagen.

**1. Konfigurieren und Simulieren zusammenführen?**

Aktuell hast du eine Seite zum **Erstellen** der `simulation.json` (`configurator.html`) und eine separate Seite zum **Ausführen** (`simulation.html`).

- **Vorschlag:** Man könnte diese beiden Schritte auf einer einzigen Seite zusammenführen. Nachdem du auf "simulation.json erstellen" klickst, könnte auf derselben Seite ein neuer Bereich erscheinen mit einem "Simulation starten"-Button. Das würde den Workflow direkter machen.

**➡️ Frage:** Möchtest du die Seiten `configurator.html` und `simulation.html` zu einer einzigen, geführten "Simulations-Seite" zusammenlegen oder die Trennung beibehalten?

- [x] Ja, zusammenführen
- [ ] Nein

**2. Datenverwaltung bündeln?**

Du hast zwei Seiten zur Datenpflege: `bauteile.html` für die JSON-Bibliothek und `admin.html` für die CSV-Stammdaten. Thematisch gehören beide zur Vorbereitung der Simulationsgrundlagen.

- **Vorschlag:** Wir könnten `bauteile.html` und `admin.html` zu einer einzigen Seite namens "Datenverwaltung" oder "Bibliothek" zusammenfassen. Auf dieser Seite könnte man über Tabs oder Buttons zwischen dem "Bauteil-Editor (JSON)" und dem "Stammdaten-Editor (CSV)" wechseln. Das würde die Navigation unter "Werkzeuge" aufräumen.

**➡️ Frage:** Sollen wir die `admin`- und `bauteile`-Seite zu einer zentralen "Datenverwaltungs"-Seite zusammenlegen?

- [x] Ja, zu Bibliothek zusammenlegen
- [ ] Nein

**3. Die Rolle der "Measurement"-Seite**

Die Seite `measurement.html` wirkt im Vergleich zu den anderen etwas eigenständig.

**➡️ Frage:** Ist diese Seite Teil des Kern-Simulationsprozesses oder eher ein separates Werkzeug? Je nach Antwort könnten wir sie prominenter platzieren oder als spezialisiertes Werkzeug belassen.

- [ ] Ja
- [ ] Nein
- [x] Hier sollen die Messwerte aus der Simulation dargestellt werden in einem Plot.

**4. Überflüssige Seiten entfernen?**

- **`simulation_v2.html`:** Da die Funktionalität jetzt im Haupt-Konfigurator lebt, ist diese Seite überflüssig geworden.
- **`settings.html`:** Diese Seite hat aktuell keinen Inhalt.

**➡️ Frage:** Bist du einverstanden, dass wir `simulation_v2.html` (und die zugehörigen JS/CSS-Dateien) löschen? Können wir die `settings.html` vorerst auch entfernen, bis es konkrete Anwendungsfälle dafür gibt? Der Link in der Navigation würde dann ebenfalls verschwinden.

- [x] Ja, lösche simulation_v2.html und zugehörige Dateien
- [x] Nein, settings sollen nicht gelöscht werden


