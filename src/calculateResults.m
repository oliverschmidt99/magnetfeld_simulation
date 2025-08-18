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
    bAvgMag = zeros(numPhases, 1);
    hAvgMag = zeros(numPhases, 1);
    eddyLossesW = zeros(numPhases, 1);
    coreLossesVA = zeros(numPhases, 1);

    for i = 1:length(params.assemblies)
        asm = params.assemblies{i};
        transformer = asm.findComponentByClass('Transformer');
        airGap = transformer.findComponentByName('AirGap');
        steelCore = transformer.findComponentByName('SteelCore');

        coreW = steelCore.geoObject.vertices(2, 1) - steelCore.geoObject.vertices(1, 1);
        coreH = steelCore.geoObject.vertices(3, 2) - steelCore.geoObject.vertices(2, 2);
        gapW = airGap.geoObject.vertices(2, 1) - airGap.geoObject.vertices(1, 1);
        gapH = airGap.geoObject.vertices(3, 2) - airGap.geoObject.vertices(2, 2);

        steelAreaM2 = ((coreW * coreH) - (gapW * gapH)) / (1000 ^ 2);
        volumeM3 = steelAreaM2 * params.problemDepthM;

        groupNum = (i - 1) * 10 + 3; % SteelCore is group 3 in its template
        mo_groupselectblock(groupNum);

        bIntegralX = mo_blockintegral(10);
        bIntegralY = mo_blockintegral(11);
        hIntegralX = mo_blockintegral(18);
        hIntegralY = mo_blockintegral(19);
        eddyIntegral = mo_blockintegral(22);
        coreIntegral = mo_blockintegral(23);
        mo_clearblock();

        bAvgComplexX(i) = bIntegralX / volumeM3;
        bAvgComplexY(i) = bIntegralY / volumeM3;
        hAvgComplexX(i) = hIntegralX / volumeM3;
        hAvgComplexY(i) = hIntegralY / volumeM3;
        bAvgMag(i) = hypot(abs(bAvgComplexX(i)), abs(bAvgComplexY(i)));
        hAvgMag(i) = hypot(abs(hAvgComplexX(i)), abs(hAvgComplexY(i)));
        eddyLossesW(i) = eddyIntegral;
        coreLossesVA(i) = coreIntegral;

        flux = bAvgMag(i) * steelAreaM2;
        coreThick = (coreW - gapW) / 2;
        meanPathW = gapW + coreThick;
        meanPathH = gapH + coreThick;
        meanPathM = (2 * meanPathW + 2 * meanPathH) / 1000;
        turnsRatio = params.nominalPrimaryA / params.nominalSecondaryA;
        reluctance = meanPathM / (mu0 * params.coreRelPermeability * steelAreaM2);
        mmf = flux * reluctance;
        iSec = mmf / turnsRatio;
        iSecResults(i) = abs(iSec);
    end

    phaseAngleCol = repmat(params.phaseAngleDeg, numPhases, 1);

    resultsTable = table(phaseAngleCol, conductorCol, iPrimAll, iSecResults, ...
        bAvgComplexX, bAvgComplexY, bAvgMag, ...
        hAvgComplexX, hAvgComplexY, hAvgMag, ...
        eddyLossesW, coreLossesVA, ...
        'VariableNames', {'phaseAngle', 'conductor', 'iPrimA', 'iSecFinalA', ...
           'bAvgX_T', 'bAvgY_T', 'bAvgMagnitude_T', ...
           'hAvgX_A_m', 'hAvgY_A_m', 'hAvgMagnitude_A_m', ...
           'eddyLosses_W', 'coreLosses_VA'});
end
