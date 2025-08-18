% Located in: src/calculateResults.m
function resultsTable = calculateResults(params)

    mu0 = 4 * pi * 1e-7;
    numPhases = length(params.currents); % Dynamische Anzahl der Phasen

    % Get instantaneous primary currents
    iPrimAll = zeros(numPhases, 1);
    conductorCol = cell(numPhases, 1);

    for i = 1:numPhases
        iPrimAll(i) = params.currents{i}.getValue(params.phaseAngleDeg);
        conductorCol{i} = params.currents{i}.name;
    end

    iSecResults = zeros(numPhases, 1);
    bMeasuredResults = zeros(numPhases, 1);

    % Schleife läuft über die Anzahl der Baugruppen
    for i = 1:length(params.assemblies)
        assembly = params.assemblies{i};
        conductor = assembly.findComponentByName('CopperConductor');
        airGap = assembly.findComponentByName('AirGap');
        steelCore = assembly.findComponentByName('SteelCore');

        if isempty(conductor) || isempty(airGap) || isempty(steelCore)
            error('Could not find all required components in assembly %s.', assembly.name);
        end

        mo_groupselectblock(steelCore.groupNum);
        avgBx = mo_blockintegral(10);
        avgBy = mo_blockintegral(11);
        bMeasured = sqrt(avgBx ^ 2 + avgBy ^ 2);
        mo_clearblock();

        coreThickness = (steelCore.geoObject.vertices(2, 1) - airGap.geoObject.vertices(2, 1));
        meanPathWidth = airGap.geoObject.vertices(2, 1) * 2 + coreThickness;
        meanPathHeight = airGap.geoObject.vertices(3, 2) * 2 + coreThickness;
        meanPathLengthM = (2 * meanPathWidth + 2 * meanPathHeight) / 1000;
        areaM2 = (coreThickness / 1000) * params.problemDepthM;

        turnsRatio = params.nominalPrimaryA / params.nominalSecondaryA;
        reluctance = meanPathLengthM / (mu0 * params.coreRelPermeability * areaM2);
        magneticFlux = bMeasured * areaM2;
        mmf = magneticFlux * reluctance;
        iSecondary = mmf / turnsRatio;

        iSecResults(i) = abs(iSecondary);
        bMeasuredResults(i) = bMeasured;
    end

    phaseAngleCol = repmat(params.phaseAngleDeg, numPhases, 1);

    resultsTable = table(phaseAngleCol, conductorCol, iPrimAll, iSecResults, bMeasuredResults, ...
        'VariableNames', {'phaseAngle', 'conductor', 'iPrimA', 'iSecFinalA', 'bMeasuredT'});
end
