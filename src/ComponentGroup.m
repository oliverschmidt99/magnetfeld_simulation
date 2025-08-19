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
            rail = obj.findComponentByClass('CopperRail');
            transformer = obj.findComponentByClass('Transformer');
            transformerSheet = obj.findComponentByClass('TransformerSheet');

            if isempty(rail) || isempty(transformer)
                error('Assembly "%s" missing rail or transformer.', obj.name);
            end

            % Alle Wandler-Komponenten abrufen
            outerAir = transformer.findComponentByName('OuterAir');
            core = transformer.findComponentByName('SteelCore');
            innerAir = transformer.findComponentByName('InnerAir');
            gap = transformer.findComponentByName('AirGap');

            rail.groupNum = groupNumOffset + 1;
            gap.groupNum = groupNumOffset + 2;
            core.groupNum = groupNumOffset + 3;
            innerAir.groupNum = groupNumOffset + 4;
            outerAir.groupNum = groupNumOffset + 5;

            % Alle Komponenten mit den korrekten Materialien und Gruppennummern zeichnen
            drawBoundary(rail, obj.xPos, obj.yPos, circuitName, rail.material, rail.groupNum);
            drawBoundary(outerAir, obj.xPos + transformer.xPos, obj.yPos + transformer.yPos, '<None>', outerAir.material, outerAir.groupNum);
            drawBoundary(core, obj.xPos + transformer.xPos, obj.yPos + transformer.yPos, '<None>', core.material, core.groupNum);
            drawBoundary(innerAir, obj.xPos + transformer.xPos, obj.yPos + transformer.yPos, '<None>', innerAir.material, innerAir.groupNum);
            drawBoundary(gap, obj.xPos + transformer.xPos, obj.yPos + transformer.yPos, '<None>', gap.material, gap.groupNum);

            % Trafoblech hinzufügen und zeichnen, falls vorhanden
            if ~isempty(transformerSheet)
                transformerSheet.groupNum = groupNumOffset + 6;
                drawBoundary(transformerSheet, obj.xPos + transformerSheet.xPos, obj.yPos + transformerSheet.yPos, '<None>', transformerSheet.material, transformerSheet.groupNum);
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

% Diese Funktion ruft nun die drawInFemm-Methode des GeoObject auf
function drawBoundary(component, groupX, groupY, circuitName, material, groupNum)
    absX = groupX + component.xPos;
    absY = groupY + component.yPos;

    % HIER IST DIE KORREKTUR: Aufruf der neuen Methode
    component.geoObject.drawInFemm(absX, absY);

    % Label hinzufügen, um das Material zuzuweisen
    mi_addblocklabel(absX, absY);
    mi_selectlabel(absX, absY);
    mi_setblockprop(material, 1, 0, circuitName, 0, groupNum, 0);
    mi_clearselected();
end
