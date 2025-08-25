function resultsTable = calculateResults(params)
    % Verbesserte Funktion zur Berechnung von Ergebnissen aus einer FEMM-Simulation.
    % ÄNDERUNG: Der Sekundärstrom wird jetzt direkt aus den Circuit-Eigenschaften
    % ausgelesen, anstatt über den magnetischen Widerstand geschätzt zu werden.
    % Dies ist genauer und robuster.

    mu0 = 4 * pi * 1e-7; %#ok<NASGU>
    numPhases = length(params.currents);

    % Primärströme und Leiternamen initialisieren
    iPrimAll = zeros(numPhases, 1);
    conductorCol = cell(numPhases, 1);

    for i = 1:numPhases
        iPrimAll(i) = params.currents{i}.getValue(params.phaseAngleDeg);
        conductorCol{i} = params.currents{i}.name;
    end

    % Ergebnisvektoren initialisieren
    iSecResults = zeros(numPhases, 1);
    bAvgComplexX = zeros(numPhases, 1);
    bAvgComplexY = zeros(numPhases, 1);
    hAvgComplexX = zeros(numPhases, 1);
    hAvgComplexY = zeros(numPhases, 1);
    bAvgMag = zeros(numPhases, 1);
    hAvgMag = zeros(numPhases, 1);
    eddyLossesW = zeros(numPhases, 1);
    coreLossesVA = zeros(numPhases, 1);

    % KORRIGIERT: Konvertiere problemDepthM von String zu Zahl
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

        if steelAreaM2 <= 0
            warning('Stahlkernfläche für Baugruppe %s ist null oder negativ. Überprüfe die Wandler-Geometrie in library.json.', asm.name);
            volumeM3 = 0;
        else
            volumeM3 = steelAreaM2 * problemDepthNum; % KORRIGIERT: Numerischen Wert verwenden
        end

        % Blockintegrale für Feldgrößen und Verluste aus dem Stahlkern holen
        groupNum = (i - 1) * 10 + 3; % Annahme: SteelCore ist Gruppe 3 im Template
        mo_groupselectblock(groupNum);

        bIntegralX = mo_blockintegral(10);
        bIntegralY = mo_blockintegral(11);
        hIntegralX = mo_blockintegral(18);
        hIntegralY = mo_blockintegral(19);
        eddyIntegral = mo_blockintegral(22);
        coreIntegral = mo_blockintegral(23); % Hystereseverluste
        mo_clearblock();

        % Gemittelte Feldgrößen und Verluste berechnen
        if volumeM3 > 0
            bAvgComplexX(i) = bIntegralX / volumeM3;
            bAvgComplexY(i) = bIntegralY / volumeM3;
            hAvgComplexX(i) = hIntegralX / volumeM3;
            hAvgComplexY(i) = hIntegralY / volumeM3;
        end

        bAvgMag(i) = hypot(abs(bAvgComplexX(i)), abs(bAvgComplexY(i)));
        hAvgMag(i) = hypot(abs(hAvgComplexX(i)), abs(hAvgComplexY(i)));
        eddyLossesW(i) = eddyIntegral;
        coreLossesVA(i) = coreIntegral;

        % ====================================================================
        % === NEUE, VERBESSERTE METHODE ZUR BERECHNUNG DES SEKUNDÄRSTROMS ===
        % ====================================================================
        % Wir rufen den Strom direkt aus den "Circuit Properties" ab.
        sec_circuit_name = conductorCol{i};
        circuit_props = mo_getcircuitproperties(sec_circuit_name);
        iSecComplex = circuit_props(1) + 1j * circuit_props(2);
        iSecResults(i) = abs(iSecComplex);
    end

    phaseAngleCol = repmat(params.phaseAngleDeg, numPhases, 1);

    % finale Ergebnistabelle erstellen
    resultsTable = table(phaseAngleCol, conductorCol, iPrimAll, iSecResults, ...
        bAvgComplexX, bAvgComplexY, bAvgMag, ...
        hAvgComplexX, hAvgComplexY, hAvgMag, ...
        eddyLossesW, coreLossesVA, ...
        'VariableNames', {'phaseAngle', 'conductor', 'iPrimA', 'iSecFinalA', ...
           'bAvgX_T', 'bAvgY_T', 'bAvgMagnitude_T', ...
           'hAvgX_A_m', 'hAvgY_A_m', 'hAvgMagnitude_A_m', ...
           'eddyLosses_W', 'coreLosses_VA'});
end
