% src/initializeComponents.m
function [currents, assemblies, standAloneComponents] = initializeComponents(simConfig, library)
    % Initialisiert alle Komponenten-Objekte aus der Konfiguration für einen einzelnen Simulationsschritt.

    % Erstellt eine Map für die Stromkreise
    currentsMap = containers.Map;

    for i = 1:length(simConfig.electricalSystem)
        phase = simConfig.electricalSystem(i);
        currentsMap(phase.name) = Current(phase.name, phase.peakCurrentA, phase.phaseShiftDeg);
    end

    currents = values(currentsMap);

    assemblies = {};

    for i = 1:length(simConfig.assemblies)
        asmCfg = simConfig.assemblies(i);

        % Stellt sicher, dass die Komponentenlisten immer Zell-Arrays sind
        rails = library.components.copperRails;
        if isstruct(rails), rails = num2cell(rails); end

        % Findet die passende Kupferschiene in der Bibliothek
        railCfg = rails{strcmp(cellfun(@(x) x.templateProductInformation.name, rails, 'UniformOutput', false), asmCfg.copperRailName)};

        % Lese die Wandler-Details direkt aus der übergebenen Konfiguration
        transformerCfg = asmCfg.transformer_details;

        % --- WICHTIGSTE ÄNDERUNG ---
        % Liest die Position aus dem dynamisch gesetzten '.position'-Feld.
        if ~isfield(asmCfg, 'position')
            error('Fehler in Schritt-Konfiguration: Das ".position"-Feld fehlt für Baugruppe "%s".', asmCfg.name);
        end

        currentPosition = asmCfg.position;

        % Erstellt die Baugruppen-Objekte an der korrekten Position
        assemblyGroup = ComponentGroup(asmCfg.name, currentPosition.x, currentPosition.y);
        assemblyGroup = assemblyGroup.addComponent(CopperRail(railCfg));
        assemblyGroup = assemblyGroup.addComponent(Transformer(transformerCfg));
        assemblyGroup.assignedCurrent = currentsMap(asmCfg.phaseName);
        assemblies{end + 1} = assemblyGroup; %#ok<AGROW>
    end

    % Initialisiert die eigenständigen Komponenten (z.B. Abschirmbleche)
    standAloneComponents = {};

    if isfield(simConfig, 'standAloneComponents') && ~isempty(simConfig.standAloneComponents)
        sheets = library.components.transformerSheets;
        if isstruct(sheets), sheets = num2cell(sheets); end

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
