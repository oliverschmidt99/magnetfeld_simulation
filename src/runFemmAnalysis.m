function runFemmAnalysis(params, runIdentifier)
    % KORREKTUR: Alle String-Parameter, die Zahlen sein sollten, explizit umwandeln.
    freq = params.frequencyHz; % kommt jetzt als Zahl von runPhaseSweep
    depth = str2double(params.problemDepthM); % kommt als String von JSON
    core_perm = params.coreRelPermeability; % kommt jetzt als Zahl von runPhaseSweep

    newdocument(0);
    mi_probdef(freq, 'millimeters', 'planar', 1e-8, depth, 30);

    % Materialien dynamisch finden und definieren
    mats = {'Air', 'Copper'};

    for i = 1:length(params.assemblies)
        asm = params.assemblies{i};

        for j = 1:length(asm.components)
            comp = asm.components{j};

            if isa(comp, 'ComponentGroup')

                for k = 1:length(comp.components)
                    mats{end + 1} = comp.components{k}.material;
                end

            else
                mats{end + 1} = comp.material;
            end

        end

    end

    for i = 1:length(params.standAloneComponents)
        mats{end + 1} = params.standAloneComponents{i}.material;
    end

    mats = unique(mats);

    for i = 1:length(mats)
        matName = mats{i};

        if contains(matName, 'Steel')
            % Stellt sicher, dass das Material mit numerischen Werten hinzugefügt wird
            mi_addmaterial(matName, core_perm, core_perm, 0);
        else
            mi_getmaterial(matName);
        end

    end

    % Stromkreise definieren
    for i = 1:length(params.currents)
        params.currents{i}.defineInFemm(params.phaseAngleDeg);
    end

    % Baugruppen zeichnen
    for i = 1:length(params.assemblies)
        assembly = params.assemblies{i};
        circuitName = params.currents{i}.name;
        groupNumOffset = (i - 1) * 10;
        assembly.drawInFemm(circuitName, groupNumOffset);
    end

    % Eigenständige Komponenten zeichnen
    for i = 1:length(params.standAloneComponents)
        comp = params.standAloneComponents{i};
        comp.groupNum = 100 + i;
        drawBoundary(comp, 0, 0);
        placeLabel(comp, 0, 0, 0, 0, '<None>', comp.material, comp.groupNum);
    end

    % Umgebungsluft und Randbedingung
    mi_addblocklabel(0, 300);
    mi_selectlabel(0, 300);
    mi_setblockprop('Air', 1, 0, '<None>', 0, 0, 0);
    mi_clearselected();
    mi_makeABC(7, 1500, 0, 0, 0);
    mi_zoomnatural();

    % Speichern und Analyse
    femFile = fullfile(params.femmFilesPath, [runIdentifier, '.fem']);
    mi_saveas(femFile);
    mi_analyze(1);
    mi_loadsolution();
end
