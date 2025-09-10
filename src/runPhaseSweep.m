% src/runPhaseSweep.m - FINALE VERSION (mit Debug-Änderung)
function resultsTable = runPhaseSweep(simConfig, library, baseParams, phaseAngleVector, scenarioVarName, scenarioVarValue, simRaum)
    [currents, assemblies, standAloneComponents] = initializeComponents(simConfig, library);
    stepParams = baseParams;
    stepParams.frequencyHz = 50;
    stepParams.coreRelPermeability = 2500;
    stepParams.currents = currents;
    stepParams.assemblies = assemblies;
    stepParams.standAloneComponents = standAloneComponents;
    stepParams.simulationsraum = simRaum;

    numAngles = length(phaseAngleVector);
    resultsCell = cell(numAngles, 1);

    % WICHTIG: Temporär auf eine normale for-Schleife umgestellt, um Parallelisierungs-Fehler auszuschließen
    for i = 1:numAngles
        openfemm(1);
        angle = phaseAngleVector(i);
        fprintf('--> Simuliere für Phasenwinkel: %d°\n', angle);
        workerParams = stepParams;
        workerParams.phaseAngleDeg = angle;
        runIdentifier = sprintf('%s_angle%d_pos%d', datestr(datetime('now'), 'HHMMSS'), angle, round(scenarioVarValue(1)));

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
