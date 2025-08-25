function [currents, assemblies, standAloneComponents] = initializeComponents(simConfig, library)
    % This helper function initializes all component objects from the config.

    currentsMap = containers.Map;

    for i = 1:length(simConfig.electricalSystem)
        phase = simConfig.electricalSystem(i);
        currentsMap(phase.name) = Current(phase.name, phase.peakCurrentA, phase.phaseShiftDeg);
    end

    currents = values(currentsMap);

    assemblies = {};

    for i = 1:length(simConfig.assemblies)
        asmCfg = simConfig.assemblies(i);

        % FIX: Ensure component lists are always cell arrays
        rails = library.components.copperRails;

        if isstruct(rails)
            rails = num2cell(rails);
        end

        transformers = library.components.transformers;

        if isstruct(transformers)
            transformers = num2cell(transformers);
        end

        railCfg = rails{strcmp(cellfun(@(x) x.templateProductInformation.name, rails, 'UniformOutput', false), asmCfg.copperRailName)};
        transformerCfg = transformers{strcmp(cellfun(@(x) x.templateProductInformation.name, transformers, 'UniformOutput', false), asmCfg.transformerName)};

        assemblyGroup = ComponentGroup(asmCfg.name, asmCfg.position.x, asmCfg.position.y);
        assemblyGroup = assemblyGroup.addComponent(CopperRail(railCfg));
        assemblyGroup = assemblyGroup.addComponent(Transformer(transformerCfg));
        assemblyGroup.assignedCurrent = currentsMap(asmCfg.phaseName);
        assemblies{end + 1} = assemblyGroup; %#ok<AGROW>
    end

    standAloneComponents = {};

    if isfield(simConfig, 'standAloneComponents') && ~isempty(simConfig.standAloneComponents)

        sheets = library.components.transformerSheets;

        if isstruct(sheets)
            sheets = num2cell(sheets);
        end

        for i = 1:length(simConfig.standAloneComponents)
            compCfg = simConfig.standAloneComponents(i);
            sheetCfg = sheets{strcmp(cellfun(@(x) x.templateProductInformation.name, sheets, 'UniformOutput', false), compCfg.name)};
            sheet = TransformerSheet(sheetCfg);
            sheet.xPos = compCfg.position.x;
            sheet.yPos = compCfg.position.y;
            standAloneComponents{end + 1} = sheet; %#ok<AGROW>
        end

    end

end
