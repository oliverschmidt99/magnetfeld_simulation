1. Die UI-Elemente des Templates sollen in die bestehende Struktur integriert werden, nicht als kompletter Ersatz.
2. Der Editor für die CSV-Dateien soll direkt über eine bearbeitbare Tabelle auf der Website umgesetzt werden. Dafür benötigen wir die Drag-&-Drop-Funktionalität.
3. Der neue 5-Schritte-Ablauf dient ausschließlich der Simulation. Der bestehende Konfigurator für Bauteile usw. soll unverändert bestehen bleiben. (In dieser [Version im Repository](https://github.com/oliverschmidt99/magnetfeld_simulation/tree/7f644c99567493e7676b6e2d4cd26b1aa71d5e1d) ist der Bauteileditor vollständig enthalten.)
4. Die benötigten CSV-Dateien liegen im Projektverzeichnis unter

   ```
   …\magnetfeld_simulation\data
   ```

   Dort befinden sich u. a. folgende Dateien:

   - `1_startpositionen.csv`
   - `2_spielraum.csv`
   - `3_bewegungen.csv`
   - `4_schrittweiten.csv`
   - `5_wandler_abmessungen.csv`

   Sie enthalten die Konfigurationsdaten zu unterschiedlichen Stromstärken.

5. Mit _I1_, _I2_ und _I3_ sind die verschiedenen Messströme gemeint, die für jede Position durchlaufen werden.
6. Für die Simulation ist eine einfache Fortschrittsanzeige vorgesehen, die den Fortschritt in Prozent (0 % bis 100 %) darstellt.
