function resultsTable = calculateResults(params)
    % Erweiterte Funktion zur Berechnung von Ergebnissen aus einer FEMM-Simulation.
    % Behebt Warnungen und extrahiert zusätzliche Werte.

    mu0 = 4 * pi * 1e-7; %#ok<NASGU>
    numPhases = length(params.currents);

    % Primärströme und Leiternamen initialisieren
    iPrimAll = zeros(numPhases, 1);
    conductorCol = cell(numPhases, 1);

    for i = 1:numPhases
        iPrimAll(i) = params.currents{i}.getValue(params.phaseAngleDeg);
        conductorCol{i} = params.currents{i}.name;
    end

    % Ergebnisvektoren initialisieren (erweitert)
    iSecComplex = zeros(numPhases, 1);
    iSecReal = zeros(numPhases, 1);
    iSecImag = zeros(numPhases, 1);
    iSecMag = zeros(numPhases, 1);
    bAvgMag = zeros(numPhases, 1);
    hAvgMag = zeros(numPhases, 1);
    eddyLossesW = zeros(numPhases, 1);
    coreLossesVA = zeros(numPhases, 1);
    storedEnergyJ = zeros(numPhases, 1);
    mu_r_real = zeros(numPhases, 1);
    mu_r_imag = zeros(numPhases, 1);

    problemDepthNum = str2double(params.problemDepthM);

    for i = 1:length(params.assemblies)
        asm = params.assemblies{i};
        transformer = asm.findComponentByClass('Transformer');
        steelCore = transformer.findComponentByName('SteelCore');
        innerAir = transformer.findComponentByName('InnerAir');

        % Geometrie des Stahlkerns berechnen
        coreW = steelCore.geoObject.vertices(2, 1) - steelCore.geoObject.vertices(1, 1);
        coreH = steelCore.geoObject.vertices(3, 2) - steelCore.geoObject.vertices(2, 2);
        innerW = innerAir.geoObject.vertices(2, 1) - innerAir.geoObject.vertices(1, 1);
        innerH = innerAir.geoObject.vertices(3, 2) - innerAir.geoObject.vertices(2, 2);
        steelAreaM2 = ((coreW * coreH) - (innerW * innerH)) / (1000 ^ 2);
        volumeM3 = steelAreaM2 * problemDepthNum;

        % Blockintegrale für Feldgrößen und Verluste aus dem Stahlkern holen
        groupNum = (i - 1) * 10 + 3;
        mo_groupselectblock(groupNum);

        bAvgMag(i) = mo_blockintegral(2) / steelAreaM2; % B magnitude
        hAvgMag(i) = mo_blockintegral(3) / steelAreaM2; % H magnitude
        eddyLossesW(i) = mo_blockintegral(10);
        coreLossesVA(i) = mo_blockintegral(23);
        storedEnergyJ(i) = mo_blockintegral(24);

        mu_x_complex = mo_blockintegral(25);
        mu_r_real(i) = real(mu_x_complex);
        mu_r_imag(i) = imag(mu_x_complex);

        mo_clearblock();

        sec_circuit_name = conductorCol{i};
        circuit_props = mo_getcircuitproperties(sec_circuit_name);
        iSecComplex(i) = circuit_props(1) + 1j * circuit_props(2);
        iSecReal(i) = real(iSecComplex(i));
        iSecImag(i) = imag(iSecComplex(i));
        iSecMag(i) = abs(iSecComplex(i));
    end

    phaseAngleCol = repmat(params.phaseAngleDeg, numPhases, 1);

    resultsTable = table(phaseAngleCol, conductorCol, iPrimAll, iSecMag, iSecReal, iSecImag, ...
        bAvgMag, hAvgMag, eddyLossesW, coreLossesVA, storedEnergyJ, mu_r_real, mu_r_imag, ...
        'VariableNames', {'phaseAngle', 'conductor', 'iPrimA', 'iSecAbs_A', 'iSecReal_A', 'iSecImag_A', ...
           'bAvgMagnitude_T', 'hAvgMagnitude_A_m', 'eddyLosses_W', 'coreLosses_VA', ...
           'storedEnergy_J', 'mu_r_real', 'mu_r_imag'});
end
