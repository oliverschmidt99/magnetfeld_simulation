% Located in: src/runFemmAnalysis.m
function runFemmAnalysis(params, runIdentifier)

    newdocument(0);
    mi_probdef(params.frequencyHz, 'millimeters', 'planar', 1e-8, params.problemDepthM * 1000, 30);

    uniqueMaterials = {'Air', 'Copper'};

    for i = 1:length(params.assemblies)
        assembly = params.assemblies{i};

        for j = 1:length(assembly.components)
            component = assembly.components{j};

            if isa(component, 'ComponentGroup')

                for k = 1:length(component.components)
                    uniqueMaterials{end + 1} = component.components{k}.material;
                end

            else
                uniqueMaterials{end + 1} = component.material;
            end

        end

    end

    uniqueMaterials = unique(uniqueMaterials);

    for i = 1:length(uniqueMaterials)
        materialName = uniqueMaterials{i};

        if contains(materialName, 'Steel')
            mi_addmaterial(materialName, params.coreRelPermeability, params.coreRelPermeability);
        else
            mi_getmaterial(materialName);
        end

    end

    for i = 1:length(params.currents)
        params.currents{i}.defineInFemm(params.phaseAngleDeg);
    end

    for i = 1:length(params.assemblies)
        assembly = params.assemblies{i};
        circuitName = params.currents{i}.name;
        groupNumOffset = (i - 1) * 10;
        assembly.drawInFemm(circuitName, groupNumOffset);
    end

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
