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

    % Draw the Geometry by telling each assembly to draw itself
    for i = 1:length(params.assemblies)
        params.assemblies{i}.drawInFemm();
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
