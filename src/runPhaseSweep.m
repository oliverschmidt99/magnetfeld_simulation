function resultsTable = runPhaseSweep(simConfig, library, baseParams, phaseAngleVector, scenarioVarName, scenarioVarValue)
    % This helper function runs a phase sweep for a given configuration.

    [currents, assemblies, standAloneComponents] = initializeComponents(simConfig, library);

    % Prepare a clean parameter struct for FEMM analysis
    stepParams = baseParams;

    % KORREKTUR: Werte als Zahlen (nicht als Text) definieren
    stepParams.frequencyHz = 50;
    stepParams.coreRelPermeability = 2500;

    stepParams.currents = currents;
    stepParams.assemblies = assemblies;
    stepParams.standAloneComponents = standAloneComponents;

    numAngles = length(phaseAngleVector);
    resultsCell = cell(numAngles, 1);

    parfor i = 1:numAngles
        openfemm(1);

        angle = phaseAngleVector(i);
        fprintf('--> Simulating for phase angle: %d°\n', angle);

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

        closefemm;
    end

    resultsTable = vertcat(resultsCell{:});
end
