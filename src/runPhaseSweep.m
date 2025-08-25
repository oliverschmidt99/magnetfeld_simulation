function resultsTable = runPhaseSweep(simConfig, library, baseParams, phaseAngleVector, scenarioVarName, scenarioVarValue)
    % This helper function runs a phase sweep for a given configuration.

    [currents, assemblies, standAloneComponents] = initializeComponents(simConfig, library);

    stepParams = baseParams;
    stepParams.currents = currents;
    stepParams.assemblies = assemblies;
    stepParams.standAloneComponents = standAloneComponents;

    % Create a cell array to hold the results from each parallel iteration
    numAngles = length(phaseAngleVector);
    resultsCell = cell(numAngles, 1);

    % KORRIGIERT: parfor für parallele Ausführung
    parfor i = 1:numAngles
        % Jede Iteration muss eine eigene FEMM-Instanz öffnen
        openfemm(1); % (1) für unsichtbar

        angle = phaseAngleVector(i);
        fprintf('--> Simulating for phase angle: %d°\n', angle);

        % Eine Kopie der Parameter für diesen Worker erstellen
        workerParams = stepParams;
        workerParams.phaseAngleDeg = angle;

        runIdentifier = sprintf('%s_angle%d', datestr(datetime('now'), 'HHMMSS'), angle);

        if ~isempty(scenarioVarValue) && ~isempty(scenarioVarName)
            runIdentifier = [runIdentifier, sprintf('_%s%.2f', scenarioVarName{1}, scenarioVarValue(1))];
        end

        runFemmAnalysis(workerParams, runIdentifier);
        singleRunResults = calculateResults(workerParams);

        if ~isempty(scenarioVarName)

            for v = 1:length(scenarioVarName)
                singleRunResults.(scenarioVarName{v}) = repmat(scenarioVarValue(v), height(singleRunResults), 1);
            end

        end

        resultsCell{i} = singleRunResults;

        % FEMM-Instanz für diesen Worker schließen
        closefemm;
    end

    % Ergebnisse aus allen Workern zu einer Tabelle zusammenfügen
    resultsTable = vertcat(resultsCell{:});
end
