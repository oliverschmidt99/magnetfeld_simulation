% src/runFemmGeometryOnly.m
% Eine spezielle Version von runFemmAnalysis, die nur die Geometrie zeichnet
% und die Datei speichert, OHNE die Analyse zu starten.

function runFemmGeometryOnly(params, runIdentifier)
    % --- 1. Problemdefinition ---
    freq = params.frequencyHz;
    depth = str2double(params.problemDepthM);
    core_perm = params.coreRelPermeability;
    newdocument(0);
    mi_probdef(freq, 'millimeters', 'planar', 1e-8, depth, 30);

    % --- 2. Materialdefinition ---
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

    mats = unique(mats);

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
    mi_addblocklabel(0, 0);
    mi_selectlabel(0, 0);
    mi_setblockprop('Air', 1, 0, '<None>', 0, 0, 0);
    mi_clearselected();

    for i = 1:length(params.assemblies)
        assembly = params.assemblies{i};
        circuitName = params.currents{i}.name;
        groupNumOffset = (i - 1) * 10;
        assembly.drawInFemm(circuitName, groupNumOffset);
    end

    % --- 5. Randbedingung & Speichern ---
    mi_makeABC(7, max(sim_L, sim_B), 0, 0, 0);
    mi_zoomnatural();

    femFile = fullfile(params.femmFilesPath, [runIdentifier, '.fem']);
    mi_saveas(femFile);

    % mi_analyze(1); % BEWUSST AUSKOMMENTIERT
    % mi_loadsolution(); % BEWUSST AUSKOMMENTIERT
end
