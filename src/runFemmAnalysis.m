% Located in: src/runFemmAnalysis.m
function runFemmAnalysis(params)

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
        steelCore = assembly.components{1};
        airGap = assembly.components{2};
        conductor = assembly.components{3};

        coreWidth = steelCore.geoObject.vertices(2, 1);
        airGapWidth = airGap.geoObject.vertices(2, 1);
        conductorWidth = conductor.geoObject.vertices(2, 1);

        labelXCore = (coreWidth + airGapWidth) / 2 + steelCore.xPos;
        steelCore.placeLabelInFemm(labelXCore, steelCore.yPos);

        labelXAir = (airGapWidth + conductorWidth) / 2 + airGap.xPos;
        airGap.placeLabelInFemm(labelXAir, airGap.yPos);

        conductor.placeLabelInFemm(conductor.xPos, conductor.yPos);
    end

    % Define surrounding air and boundary condition
    mi_addblocklabel(0, 300);
    mi_selectlabel(0, 300);
    mi_setblockprop('Air', 1, 0, '<None>', 0, 0, 0);
    mi_clearselected();

    mi_makeABC(7, 500, 0, 0, 0);

    mi_zoomnatural();

    % Speichere die .fem Datei im neuen Ergebnisordner
    femFile = fullfile(params.resultsPath, [params.baseFilename, '.fem']);
    mi_saveas(femFile);

    % Die Analyse erzeugt die .ans Datei automatisch am selben Ort
    mi_analyze(1);
    mi_loadsolution();
end
