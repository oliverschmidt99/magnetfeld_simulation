% src/runPhaseSweep.m - FINALE VERSION (mit Debug-Änderung)
function resultsTable = runPhaseSweep(simConfig, library, baseParams, phaseAngleVector, scenarioVarName, scenarioVarValue, simRaum)
    % Initialisiert die Komponenten für den aktuellen Positionsschritt
    [currents, assemblies, standAloneComponents] = initializeComponents(simConfig, library);

    % Bereitet die Parameter für die einzelnen Winkel-Schritte vor
    stepParams = baseParams;
    stepParams.frequencyHz = 50; % Feste Frequenz
    stepParams.coreRelPermeability = str2double(baseParams.coreRelPermeability); % KORREKTUR: Wert aus baseParams lesen
    stepParams.currents = currents;
    stepParams.assemblies = assemblies;
    stepParams.standAloneComponents = standAloneComponents;
    stepParams.simulationsraum = simRaum;

    numAngles = length(phaseAngleVector);
    resultsCell = cell(numAngles, 1);

    % WICHTIG: Temporär auf eine normale for-Schleife umgestellt, um Parallelisierungs-Fehler auszuschließen
    % Für schnellere Simulationen kann dies zu einer parfor-Schleife gemacht werden.
    for i = 1:numAngles
        openfemm(1); % Öffnet eine FEMM-Instanz
        angle = phaseAngleVector(i);
        fprintf('--> Simuliere für Phasenwinkel: %d°\n', angle);

        workerParams = stepParams;
        workerParams.phaseAngleDeg = angle;

        % Eindeutiger Name für die .fem-Datei
        runIdentifier = sprintf('%s_angle%d_pos%d', datestr(datetime('now'), 'HHMMSS'), angle, round(scenarioVarValue(1)));

        % Führt die eigentliche FEMM-Analyse durch
        runFemmAnalysis(workerParams, runIdentifier);

        % Berechnet die Ergebnisse aus der .ans-Datei
        singleRunResults = calculateResults(workerParams);

        % Fügt die Szenario-Variablen (Positionen) zur Ergebnistabelle hinzu
        if ~isempty(scenarioVarName)

            for v = 1:length(scenarioVarName)
                singleRunResults.(scenarioVarName{v}) = repmat(scenarioVarValue(v), height(singleRunResults), 1);
            end

        end

        resultsCell{i} = singleRunResults;
        closefemm; % Schließt die FEMM-Instanz
    end

    % Kombiniert die Ergebnisse aller Winkel zu einer Tabelle
    resultsTable = vertcat(resultsCell{:});
end
