% src/runFemmAnalysis.m - FINALE VERSION
function runFemmAnalysis(params, runIdentifier)
    % Baut das FEMM-Modell auf, führt die Analyse durch und speichert die Ergebnisse.

    % --- 1. Problemdefinition ---
    freq = params.frequencyHz;
    depth = str2double(params.problemDepthM);
    core_perm = params.coreRelPermability;
    newdocument(0);
    mi_probdef(freq, 'millimeters', 'planar', 1e-8, depth, 30);

    % --- 2. Materialdefinition ---
    mats = {'Air', 'Copper'};

    for i = 1:length(params.assemblies)
        asm = params.assemblies{i};

        for j = 1:length(asm.components)
            comp = asm.components{j};
            if isa(comp, 'ComponentGroup'), for k = 1:length(comp.components), mats{end + 1} = comp.components{k}.material; end
        else , mats{end + 1} = comp.material; end
        end

    end

    for i = 1:length(params.standAloneComponents), mats{end + 1} = params.standAloneComponents{i}.material; end
    mats = unique(mats);

    for i = 1:length(mats)
        matName = mats{i};

        if contains(matName, 'Steel'), mi_addmaterial(matName, core_perm, core_perm, 0);
        else , mi_getmaterial(matName); end
        end

        % --- 3. Stromkreisdefinition ---
        for i = 1:length(params.currents)
            params.currents{i}.defineInFemm(params.phaseAngleDeg);
        end

        % --- 4. Geometrieaufbau ---
        sim_L = params.simulationsraum.Laenge;
        sim_B = params.simulationsraum.Breite;

        mi_drawrectangle(-sim_L / 2, -sim_B / 2, sim_L / 2, sim_B / 2);

        % KORREKTUR: Platziert die INNERE LUFT an einer sicheren, leeren Position (obere rechte Ecke)
        label_x_inner_air = sim_L / 2 - 10;
        label_y_inner_air = sim_B / 2 - 10;
        mi_addblocklabel(label_x_inner_air, label_y_inner_air);
        mi_selectlabel(label_x_inner_air, label_y_inner_air);
        mi_setblockprop('Air', 1, 0, '<None>', 0, 0, 0);
        mi_clearselected();

        % Platziert die Baugruppen (die ihre eigenen Material-Labels korrekt setzen)
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

        % --- 5. Randbedingung und ÄUSSERE LUFT ---
        mi_makeABC(7, max(sim_L, sim_B) * 1.5, 0, 0, 0);

        % PLATZIERT DIE ÄUSSERE LUFT ebenfalls in der oberen rechten Ecke
        label_x_outer_air = sim_L / 2 + 10;
        label_y_outer_air = sim_B / 2 + 10;
        mi_addblocklabel(label_x_outer_air, label_y_outer_air);
        mi_selectlabel(label_x_outer_air, label_y_outer_air);
        mi_setblockprop('Air', 1, 0, '<None>', 0, 0, 0);
        mi_clearselected();

        mi_zoomnatural();

        % --- 6. Analyse ---
        femFile = fullfile(params.femmFilesPath, [runIdentifier, '.fem']);
        mi_saveas(femFile);
        mi_analyze(1);
        mi_loadsolution();
    end
