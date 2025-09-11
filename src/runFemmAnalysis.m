% src/runFemmAnalysis.m - ANGEPASSTE LUFT-LABELS
function runFemmAnalysis(params, runIdentifier)
    % Baut das FEMM-Modell auf, führt die Analyse durch und speichert die Ergebnisse.

    % --- 1. Problemdefinition ---
    freq = params.frequencyHz;
    depth = str2double(params.problemDepthM);
    core_perm = params.coreRelPermability;
    newdocument(0);
    mi_probdef(freq, 'millimeters', 'planar', 1e-8, depth, 30);

    % --- 2. Materialdefinition ---
    mats = {'Air', 'Copper', 'M-36 Steel'}; % Vereinfachte Materialliste
    % KORREKTUR: ALIGN-Warnung durch korrekte Einrückung behoben
    for i = 1:length(mats)
        matName = mats{i};

        if contains(matName, 'Steel')
            mi_addmaterial(matName, core_perm, core_perm, 0);
        else
            mi_getmaterial(matName);
        end

    end

    % --- 3. Stromkreisdefinition ---
    for i = 1:length(params.currents)
        params.currents{i}.defineInFemm(params.phaseAngleDeg);
    end

    % --- 4. Geometrieaufbau ---
    sim_L = params.simulationsraum.Laenge;
    sim_B = params.simulationsraum.Breite;

    mi_drawrectangle(-sim_L / 2, -sim_B / 2, sim_L / 2, sim_B / 2);

    % Platziert die Baugruppen
    for i = 1:length(params.assemblies)
        assembly = params.assemblies{i};
        circuitName = params.currents{i}.name;
        groupNumOffset = (i - 1) * 10;
        assembly.drawInFemm(circuitName, groupNumOffset);
    end

    % Platziert eigenständige Komponenten
    for i = 1:length(params.standAloneComponents)
        comp = params.standAloneComponents{i};
        comp.groupNum = 100 + i;
        drawBoundary(comp, 0, 0);
        placeLabel(comp.xPos, comp.yPos, '<None>', comp.material, comp.groupNum);
    end

    % Roter Punkt 4 & 5: LUFT im umgebenden Raum
    % Ein Label innerhalb des Simulationsrechtecks, aber weit weg von den Bauteilen
    mi_addblocklabel(0, sim_B / 4);
    mi_selectlabel(0, sim_B / 4);
    mi_setblockprop('Air', 1, 0, '<None>', 0, 0, 0);
    mi_clearselected();

    % --- 5. Randbedingung und ÄUSSERE LUFT ---
    mi_makeABC(7, max(sim_L, sim_B) * 1.5, 0, 0, 0);

    % Roter Punkt 6 & 7: LUFT außerhalb des Simulationsrechtecks für die Randbedingung
    label_x_outer_air = sim_L / 2 + 10;
    mi_addblocklabel(label_x_outer_air, 0);
    mi_selectlabel(label_x_outer_air, 0);
    mi_setblockprop('Air', 1, 0, '<None>', 0, 0, 0);
    mi_clearselected();

    mi_zoomnatural();

    % --- 6. Analyse ---
    femFile = fullfile(params.femmFilesPath, [runIdentifier, '.fem']);
    mi_saveas(femFile);
    mi_analyze(1);
    mi_loadsolution();
end
