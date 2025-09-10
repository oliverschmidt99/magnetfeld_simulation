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

        % KORRIGIERT: Nimmt die Wandler-Details direkt aus der run.json statt aus der Bibliothek
        railCfg = rails{strcmp(cellfun(@(x) x.templateProductInformation.name, rails, 'UniformOutput', false), asmCfg.copperRailName)};
        transformerCfg = asmCfg.transformer_details;

        % Die Position wird jetzt aus dem dynamisch gesetzten 'position'-Feld gelesen,
        % das von der Hauptschleife in main.m für jeden Schritt aktualisiert wird.
        currentPosition = asmCfg.position;

        assemblyGroup = ComponentGroup(asmCfg.name, currentPosition.x, currentPosition.y);
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
