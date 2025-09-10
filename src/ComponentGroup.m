% oliverschmidt99/magnetfeld_simulation/magnetfeld_simulation-lab/src/ComponentGroup.m
classdef ComponentGroup

    properties
        name
        xPos
        yPos
        components = {}
        assignedCurrent
    end

    methods

        function obj = ComponentGroup(name, x, y)
            obj.name = name;
            obj.xPos = x;
            obj.yPos = y;
        end

        function obj = addComponent(obj, component)
            obj.components{end + 1} = component;
        end

        function drawInFemm(obj, circuitName, groupNumOffset)
            % --- Komponenten abrufen ---
            rail = obj.findComponentByClass('CopperRail');
            transformer = obj.findComponentByClass('Transformer');

            if isempty(rail) || isempty(transformer)
                error('Assembly "%s" fehlt die Kupferschiene oder der Wandler.', obj.name);
            end

            % --- Alle 4 Wandler-Subkomponenten abrufen ---
            outerAir = transformer.findComponentByName('OuterAir');
            core = transformer.findComponentByName('SteelCore');
            innerAir = transformer.findComponentByName('InnerAir');
            gap = transformer.findComponentByName('AirGap'); % Das innerste Loch

            if isempty(outerAir) || isempty(core) || isempty(innerAir) || isempty(gap)
                error('Eine oder mehrere Subkomponenten des Wandlers wurden nicht gefunden.');
            end

            % --- Gruppennummern zuweisen ---
            rail.groupNum = groupNumOffset + 1;
            core.groupNum = groupNumOffset + 3;
            innerAir.groupNum = groupNumOffset + 4;
            outerAir.groupNum = groupNumOffset + 5;
            % Auch die Luft im Spalt um den Leiter braucht eine Materialeigenschaft
            gap.groupNum = groupNumOffset + 6;

            % --- 1. Alle Grenzen zeichnen (von außen nach innen) ---
            % Die Position des Transformers (transformer.xPos/yPos) ist relativ zur Baugruppe,
            % normalerweise (0,0), aber wir addieren sie für die Korrektheit.
            transformerAbsX = obj.xPos + transformer.xPos;
            transformerAbsY = obj.yPos + transformer.yPos;

            drawBoundary(outerAir, transformerAbsX, transformerAbsY);
            drawBoundary(core, transformerAbsX, transformerAbsY);
            drawBoundary(innerAir, transformerAbsX, transformerAbsY);
            drawBoundary(gap, transformerAbsX, transformerAbsY); % KORREKTUR: Fehlende Grenze hinzugefügt
            drawBoundary(rail, obj.xPos, obj.yPos);

            % --- 2. Alle Material-Labels gezielt platzieren ---

            % KUPFER im Zentrum der Baugruppe
            placeLabel(rail, obj.xPos, obj.yPos, 0, 0, circuitName, rail.material, rail.groupNum);

            % LUFT IM SPALT (zwischen der 'gap'-Grenze und der Schiene)
            % Wir platzieren das Label auf halbem Weg zwischen der Schienenkante und der 'gap'-Kante.
            labelX_gap_air = (gap.geoObject.vertices(2, 1) + rail.geoObject.vertices(2, 1)) / 2;
            placeLabel(gap, obj.xPos, obj.yPos, labelX_gap_air, 0, '<None>', gap.material, gap.groupNum);

            % INNERE LUFTSCHICHT (zwischen 'innerAir'-Grenze und 'gap'-Grenze)
            labelX_innerAir = (innerAir.geoObject.vertices(2, 1) + gap.geoObject.vertices(2, 1)) / 2;
            placeLabel(innerAir, transformerAbsX, transformerAbsY, labelX_innerAir, 0, '<None>', innerAir.material, innerAir.groupNum);

            % STAHLKERN (zwischen 'core'-Grenze und 'innerAir'-Grenze)
            labelX_core = (core.geoObject.vertices(2, 1) + innerAir.geoObject.vertices(2, 1)) / 2;
            placeLabel(core, transformerAbsX, transformerAbsY, labelX_core, 0, '<None>', core.material, core.groupNum);

            % ÄUSSERE LUFTSCHICHT (zwischen 'outerAir'-Grenze und 'core'-Grenze)
            labelX_outer = (outerAir.geoObject.vertices(2, 1) + core.geoObject.vertices(2, 1)) / 2;
            placeLabel(outerAir, transformerAbsX, transformerAbsY, labelX_outer, 0, '<None>', outerAir.material, outerAir.groupNum);
        end

        function component = findComponentByClass(obj, className)
            component = [];

            for i = 1:length(obj.components)

                if isa(obj.components{i}, className)
                    component = obj.components{i};
                    return;
                end

            end

        end

        function component = findComponentByName(obj, name)
            component = [];

            for i = 1:length(obj.components)
                comp = obj.components{i};

                if strcmp(comp.name, name)
                    component = comp;
                    return;
                end

                if isa(comp, 'ComponentGroup')
                    component = comp.findComponentByName(name);

                    if ~isempty(component)
                        return;
                    end

                end

            end

        end

    end

end
