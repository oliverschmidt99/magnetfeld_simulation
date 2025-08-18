% Located in: src/runFemmAnalysis.m
function runFemmAnalysis(params, runIdentifier)

    newdocument(0);
    mi_probdef(params.frequencyHz, 'millimeters', 'planar', 1e-8, params.problemDepthM * 1000, 30);

    % Define materials and circuits
    mi_getmaterial('Air');
    mi_getmaterial('Copper');
    mi_addmaterial(params.coreMaterial, params.coreRelPermeability, params.coreRelPermeability);

    for i = 1:length(params.currents)
        params.currents{i}.defineInFemm(params.phaseAngleDeg);
    end

    % Draw the Geometry Shapes
    for i = 1:length(params.assemblies)
        assembly = params.assemblies{i};

        for j = 1:length(assembly.components)
            assembly.components{j}.drawShapeInFemm();
        end

    end

    % Place Block Labels Intelligently
    for i = 1:length(params.assemblies)
        assembly = params.assemblies{i};

        % --- ROBUST COMPONENT IDENTIFICATION (NEW) ---
        % Find each component by its name instead of relying on index
        for j = 1:length(assembly.components)
            comp = assembly.components{j};

            switch comp.name
                case 'SteelCore'
                    steelCore = comp;
                case 'AirGap'
                    airGap = comp;
                case 'CopperConductor'
                    conductor = comp;
            end

        end

        % Calculate label positions based on the correctly identified components
        coreWidth = steelCore.geoObject.vertices(2, 1); % half-width
        airGapWidth = airGap.geoObject.vertices(2, 1);
        conductorWidth = conductor.geoObject.vertices(2, 1);

        % 1. Label for the Steel Core region
        labelXCore = (coreWidth + airGapWidth) / 2 + steelCore.xPos;
        steelCore.placeLabelInFemm(labelXCore, steelCore.yPos);

        % 2. Label for the Air Gap region
        labelXAir = (airGapWidth + conductorWidth) / 2 + airGap.xPos;
        airGap.placeLabelInFemm(labelXAir, airGap.yPos);

        % 3. Label for the Copper Conductor region
        conductor.placeLabelInFemm(conductor.xPos, conductor.yPos);
    end

    % Define surrounding air and boundary condition
    mi_addblocklabel(0, 300);
    mi_selectlabel(0, 300);
    mi_setblockprop('Air', 1, 0, '<None>', 0, 0, 0);
    mi_clearselected();

    mi_makeABC(7, 500, 0, 0, 0);

    mi_zoomnatural();

    femFile = fullfile(params.femmFilesPath, [runIdentifier, '.fem']);
    mi_saveas(femFile);

    mi_analyze(1);
    mi_loadsolution();
end
