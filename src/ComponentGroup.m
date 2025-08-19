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

            core = transformer.findComponentByName('SteelCore');
            gap = transformer.findComponentByName('AirGap');

            rail.groupNum = groupNumOffset + 1;
            gap.groupNum = groupNumOffset + 2;
            core.groupNum = groupNumOffset + 3;

            % Geänderte Aufrufe der drawBoundary-Funktion, um sicherzustellen, dass die Materialeigenschaften zugewiesen werden.
            drawBoundary(rail, obj.xPos, obj.yPos, circuitName, rail.material, rail.groupNum);
            drawBoundary(core, obj.xPos + transformer.xPos, obj.yPos + transformer.yPos, '<None>', core.material, core.groupNum);
            drawBoundary(gap, obj.xPos + transformer.xPos, obj.yPos + transformer.yPos, '<None>', gap.material, gap.groupNum);

            % Hinzufügen der TransformerSheet-Komponente
            if ~isempty(transformerSheet)
                transformerSheet.groupNum = groupNumOffset + 4;
                drawBoundary(transformerSheet, obj.xPos, obj.yPos, '<None>', transformerSheet.material, transformerSheet.groupNum);
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

% Die Funktion drawBoundary wurde geändert, um immer die Materialeigenschaften zu setzen.
function drawBoundary(component, groupX, groupY, circuitName, material, groupNum)
    absX = groupX + component.xPos;
    absY = groupY + component.yPos;
    vertices = component.geoObject.vertices + [absX, absY];

    for i = 1:size(vertices, 1)
        mi_addnode(vertices(i, 1), vertices(i, 2));
    end

    for i = 1:size(vertices, 1)
        startNode = vertices(i, :);
        endNode = vertices(mod(i, size(vertices, 1)) + 1, :);
        mi_addsegment(startNode(1), startNode(2), endNode(1), endNode(2));
    end

    mi_addblocklabel(absX, absY);
    mi_selectlabel(absX, absY);
    mi_setblockprop(material, 1, 0, circuitName, 0, groupNum, 0);
    mi_clearselected();
end
