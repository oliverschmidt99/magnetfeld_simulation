% src/ComponentGroup.m - FINALE VERSION
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
            if isempty(rail) || isempty(transformer), error('Assembly "%s" fehlt die Kupferschiene oder der Wandler.', obj.name); end

            outerAir = transformer.findComponentByName('OuterAir');
            core = transformer.findComponentByName('SteelCore');
            innerAir = transformer.findComponentByName('InnerAir');
            gap = transformer.findComponentByName('AirGap');
            if isempty(outerAir) || isempty(core) || isempty(innerAir) || isempty(gap), error('Subkomponenten des Wandlers nicht gefunden.'); end

            % --- Gruppennummern zuweisen ---
            rail.groupNum = groupNumOffset + 1;
            core.groupNum = groupNumOffset + 3;
            innerAir.groupNum = groupNumOffset + 4;
            outerAir.groupNum = groupNumOffset + 5;
            gap.groupNum = groupNumOffset + 6;

            % --- Absolute Position des Wandlers berechnen ---
            transformerAbsX = obj.xPos + transformer.xPos;
            transformerAbsY = obj.yPos + transformer.yPos;

            % --- 1. Alle Grenzen zeichnen ---
            drawBoundary(outerAir, transformerAbsX, transformerAbsY);
            drawBoundary(core, transformerAbsX, transformerAbsY);
            drawBoundary(innerAir, transformerAbsX, transformerAbsY);
            drawBoundary(gap, transformerAbsX, transformerAbsY);
            drawBoundary(rail, obj.xPos, obj.yPos);

            % --- 2. Alle Material-Labels an korrekten absoluten Positionen platzieren ---

            % KUPFER im Zentrum der Baugruppe (xPos, yPos)
            placeLabel(obj.xPos, obj.yPos, circuitName, rail.material, rail.groupNum);

            % LUFT IM SPALT (zwischen Schiene und innerer Wandlerkante)
            labelX_offset_gap = (gap.geoObject.vertices(2, 1) + rail.geoObject.vertices(2, 1)) / 2;
            placeLabel(transformerAbsX + labelX_offset_gap, transformerAbsY, '<None>', gap.material, gap.groupNum);

            % INNERE LUFTSCHICHT
            labelX_offset_innerAir = (innerAir.geoObject.vertices(2, 1) + gap.geoObject.vertices(2, 1)) / 2;
            placeLabel(transformerAbsX + labelX_offset_innerAir, transformerAbsY, '<None>', innerAir.material, innerAir.groupNum);

            % STAHLKERN
            labelX_offset_core = (core.geoObject.vertices(2, 1) + innerAir.geoObject.vertices(2, 1)) / 2;
            placeLabel(transformerAbsX + labelX_offset_core, transformerAbsY, '<None>', core.material, core.groupNum);

            % ÄUSSERE LUFTSCHICHT
            labelX_offset_outer = (outerAir.geoObject.vertices(2, 1) + core.geoObject.vertices(2, 1)) / 2;
            placeLabel(transformerAbsX + labelX_offset_outer, transformerAbsY, '<None>', outerAir.material, outerAir.groupNum);
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
                if strcmp(comp.name, name), component = comp; return; end

                if isa(comp, 'ComponentGroup')
                    component = comp.findComponentByName(name);
                    if ~isempty(component), return; end
                end

            end

        end

    end

end
