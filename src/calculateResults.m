% Located in: src/calculateResults.m
function resultsTable = calculateResults(params)

    mu0 = 4 * pi * 1e-7;

    % Get instantaneous primary currents
    iPrimAll = zeros(3, 1);

    for i = 1:3
        iPrimAll(i) = params.currents{i}.getValue(params.phaseAngleDeg);
    end

    % Core group numbers are assumed to be 3, 13, 23
    coreGroups = [3, 13, 23];
    iSecResults = zeros(3, 1);
    bMeasuredResults = zeros(3, 1);

    % Find one conductor to get its dimensions for calculation
    conductor = params.assemblies{1}.components{1};
    core = params.assemblies{1}.components{3};
    airGap = params.assemblies{1}.components{2};
    coreThickness = (core.geoObject.vertices(2, 1) - airGap.geoObject.vertices(2, 1)); % width/2

    for i = 1:3
        mo_groupselectblock(coreGroups(i));
        avgBx = mo_blockintegral(10);
        avgBy = mo_blockintegral(11);
        bMeasured = sqrt(avgBx ^ 2 + avgBy ^ 2);
        mo_clearblock();

        meanPathLength = 2 * (conductor.geoObject.vertices(2, 1) * 2 + airGap.geoObject.vertices(2, 1) * 2 + coreThickness) + ...
            2 * (conductor.geoObject.vertices(3, 2) * 2 + airGap.geoObject.vertices(3, 2) * 2 + coreThickness);
        meanPathLengthM = meanPathLength / 1000;

        areaM2 = (coreThickness / 1000) * params.problemDepthM;
        turnsRatio = params.nominalPrimaryA / params.nominalSecondaryA;
        reluctance = meanPathLengthM / (mu0 * params.coreRelPermeability * areaM2);
        magneticFlux = bMeasured * areaM2;
        mmf = magneticFlux * reluctance;
        iSecondary = mmf / turnsRatio;

        iSecResults(i) = abs(iSecondary);
        bMeasuredResults(i) = bMeasured;
    end

    phaseAngleCol = repmat(params.phaseAngleDeg, 3, 1);
    conductorCol = {'L1'; 'L2'; 'L3'};

    resultsTable = table(phaseAngleCol, conductorCol, iPrimAll, iSecResults, bMeasuredResults, ...
        'VariableNames', {'phaseAngle', 'conductor', 'iPrimA', 'iSecFinalA', 'bMeasuredT'});
end
