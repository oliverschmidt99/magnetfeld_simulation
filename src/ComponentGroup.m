% oliverschmidt99/magnetfeld_simulation/magnetfeld_simulation-lab/src/ComponentGroup.m
classdef ComponentGroup

    properties
        name
        xPos
        yPos
        components = {}
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
            transformerSheet = obj.findComponentByClass('TransformerSheet');

            if isempty(rail) || isempty(transformer)
                error('Assembly "%s" missing rail or transformer.', obj.name);
            end

            % --- Wandler-Subkomponenten abrufen ---
            outerAir = transformer.findComponentByName('OuterAir');
            core = transformer.findComponentByName('SteelCore');
            innerAir = transformer.findComponentByName('InnerAir');
            gap = transformer.findComponentByName('AirGap');

            % --- Gruppennummern zuweisen ---
            rail.groupNum = groupNumOffset + 1;
            gap.groupNum = groupNumOffset + 2;
            core.groupNum = groupNumOffset + 3;
            innerAir.groupNum = groupNumOffset + 4;
            outerAir.groupNum = groupNumOffset + 5;

            if ~isempty(transformerSheet)
                transformerSheet.groupNum = groupNumOffset + 6;
            end

            % --- 1. Alle Grenzen zeichnen ---
            drawBoundary(rail, obj.xPos, obj.yPos);
            drawBoundary(outerAir, obj.xPos + transformer.xPos, obj.yPos + transformer.yPos);
            drawBoundary(core, obj.xPos + transformer.xPos, obj.yPos + transformer.yPos);
            drawBoundary(innerAir, obj.xPos + transformer.xPos, obj.yPos + transformer.yPos);
            drawBoundary(gap, obj.xPos + transformer.xPos, obj.yPos + transformer.yPos);

            if ~isempty(transformerSheet)
                drawBoundary(transformerSheet, obj.xPos + transformerSheet.xPos, obj.yPos + transformerSheet.yPos);
            end

            % --- 2. Alle Material-Labels gezielt platzieren ---
            placeLabel(rail, obj.xPos, obj.yPos, 0, 0, circuitName, rail.material, rail.groupNum);

            labelX = (outerAir.geoObject.vertices(2, 1) + core.geoObject.vertices(2, 1)) / 2;
            placeLabel(outerAir, obj.xPos, obj.yPos, labelX, 0, '<None>', outerAir.material, outerAir.groupNum);

            labelX = (core.geoObject.vertices(2, 1) + innerAir.geoObject.vertices(2, 1)) / 2;
            placeLabel(core, obj.xPos, obj.yPos, labelX, 0, '<None>', core.material, core.groupNum);

            labelX = (innerAir.geoObject.vertices(2, 1) + gap.geoObject.vertices(2, 1)) / 2;
            placeLabel(innerAir, obj.xPos, obj.yPos, labelX, 0, '<None>', innerAir.material, innerAir.groupNum);

            if ~isempty(transformerSheet)
                placeLabel(transformerSheet, obj.xPos, obj.yPos, 0, 0, '<None>', transformerSheet.material, transformerSheet.groupNum);
            end

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

function drawBoundary(component, groupX, groupY)
    absX = groupX + component.xPos;
    absY = groupY + component.yPos;
    component.geoObject.drawInFemm(absX, absY);
end

function placeLabel(component, groupX, groupY, offsetX, offsetY, circuitName, material, groupNum)
    absX = groupX + component.xPos + offsetX;
    absY = groupY + component.yPos + offsetY;
    mi_addblocklabel(absX, absY);
    mi_selectlabel(absX, absY);
    mi_setblockprop(material, 1, 0, circuitName, 0, groupNum, 0);
    mi_clearselected();
end
