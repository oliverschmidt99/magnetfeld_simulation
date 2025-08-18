% Located in: src/calculateResults.m
function resultsTable = calculateResults(params)
    mu0 = 4 * pi * 1e-7;
    numPhases = length(params.currents);

    iPrimAll = zeros(numPhases, 1);
    conductorCol = cell(numPhases, 1);

    for i = 1:numPhases
        iPrimAll(i) = params.currents{i}.getValue(params.phaseAngleDeg);
        conductorCol{i} = params.currents{i}.name;
    end

    iSecResults = zeros(numPhases, 1);
    bAvgComplexX = zeros(numPhases, 1);
    bAvgComplexY = zeros(numPhases, 1);
    hAvgComplexX = zeros(numPhases, 1);
    hAvgComplexY = zeros(numPhases, 1);
    bAvgMagnitude = zeros(numPhases, 1);
    hAvgMagnitude = zeros(numPhases, 1);
    eddyCurrentLossesW = zeros(numPhases, 1);
    coreLossesVA = zeros(numPhases, 1);

    for i = 1:length(params.assemblies)
        assembly = params.assemblies{i};
        transformer = assembly.findComponentByClass('Transformer');
        airGap = transformer.findComponentByName('AirGap');
        steelCore = transformer.findComponentByName('SteelCore');

        steelCoreWidth = steelCore.geoObject.vertices(2, 1) - steelCore.geoObject.vertices(1, 1);
        steelCoreHeight = steelCore.geoObject.vertices(3, 2) - steelCore.geoObject.vertices(2, 2);
        airGapWidth = airGap.geoObject.vertices(2, 1) - airGap.geoObject.vertices(1, 1);
        airGapHeight = airGap.geoObject.vertices(3, 2) - airGap.geoObject.vertices(2, 2);
        steelAreaMM2 = (steelCoreWidth * steelCoreHeight) - (airGapWidth * airGapHeight);
        steelAreaM2 = steelAreaMM2 / (1000 ^ 2);
        volumeM3 = steelAreaM2 * params.problemDepthM;

        mo_groupselectblock(groupNumOffset + 3); % Assuming SteelCore is always group 3
        bxIntegral = mo_blockintegral(10);
        byIntegral = mo_blockintegral(11);
        hxIntegral = mo_blockintegral(18);
        hyIntegral = mo_blockintegral(19);
        eddyCurrentIntegral = mo_blockintegral(22);
        coreLossIntegral = mo_blockintegral(23);
        mo_clearblock();

        bAvgComplexX(i) = bxIntegral / volumeM3;
        bAvgComplexY(i) = byIntegral / volumeM3;
        hAvgComplexX(i) = hxIntegral / volumeM3;
        hAvgComplexY(i) = hyIntegral / volumeM3;
        bAvgMagnitude(i) = hypot(abs(bAvgComplexX(i)), abs(bAvgComplexY(i)));
        hAvgMagnitude(i) = hypot(abs(hAvgComplexX(i)), abs(hAvgComplexY(i)));
        eddyCurrentLossesW(i) = eddyCurrentIntegral;
        coreLossesVA(i) = coreLossIntegral;

        magneticFlux = bAvgMagnitude(i) * steelAreaM2;
        coreThickness = (steelCoreWidth - airGapWidth) / 2;
        meanPathWidth = airGapWidth + coreThickness;
        meanPathHeight = airGapHeight + coreThickness;
        meanPathLengthM = (2 * meanPathWidth + 2 * meanPathHeight) / 1000;
        turnsRatio = params.nominalPrimaryA / params.nominalSecondaryA;
        reluctance = meanPathLengthM / (mu0 * params.coreRelPermeability * steelAreaM2);
        mmf = magneticFlux * reluctance;
        iSecondary = mmf / turnsRatio;
        iSecResults(i) = abs(iSecondary);
    end

    phaseAngleCol = repmat(params.phaseAngleDeg, numPhases, 1);

    resultsTable = table(phaseAngleCol, conductorCol, iPrimAll, iSecResults, ...
        bAvgComplexX, bAvgComplexY, bAvgMagnitude, ...
        hAvgComplexX, hAvgComplexY, hAvgMagnitude, ...
        eddyCurrentLossesW, coreLossesVA, ...
        'VariableNames', {'phaseAngle', 'conductor', 'iPrimA', 'iSecFinalA', ...
           'bAvgX_T', 'bAvgY_T', 'bAvgMagnitude_T', ...
           'hAvgX_A_m', 'hAvgY_A_m', 'hAvgMagnitude_A_m', ...
           'eddyLosses_W', 'coreLosses_VA'});
end
