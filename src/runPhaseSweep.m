function resultsTable = runPhaseSweep(simConfig, library, baseParams, phaseAngleVector, scenarioVarName, scenarioVarValue)
    % This helper function runs a phase sweep for a given configuration.

    [currents, assemblies, standAloneComponents] = initializeComponents(simConfig, library);

    stepParams = baseParams;
    stepParams.currents = currents;
    stepParams.assemblies = assemblies;
    stepParams.standAloneComponents = standAloneComponents;

    resultsTable = table();

    for i = 1:length(phaseAngleVector)
        angle = phaseAngleVector(i);
        fprintf('--> Simulating for phase angle: %d°\n', angle);
        stepParams.phaseAngleDeg = angle;

        % Use a fresh timestamp for each FEMM file to ensure uniqueness
        runIdentifier = sprintf('%s_angle%d', datestr(datetime('now'), 'HHMMSS'), angle);

        if ~isempty(scenarioVarValue) && ~isempty(scenarioVarName)
            runIdentifier = [runIdentifier, sprintf('_%s%.2f', scenarioVarName{1}, scenarioVarValue(1))];
        end

        runFemmAnalysis(stepParams, runIdentifier);
        singleRunResults = calculateResults(stepParams);

        % Add scenario variable(s) to the results table
        if ~isempty(scenarioVarName)

            for v = 1:length(scenarioVarName)
                singleRunResults.(scenarioVarName{v}) = repmat(scenarioVarValue(v), height(singleRunResults), 1);
            end

        end

        resultsTable = [resultsTable; singleRunResults]; %#ok<AGROW>
    end

end
