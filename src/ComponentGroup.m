% Groups multiple components into a logical assembly with its own position.
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
            copperRail = obj.findComponentByClass('CopperRail');
            transformer = obj.findComponentByClass('Transformer');

            if isempty(copperRail) || isempty(transformer)
                error('Assembly "%s" must contain one CopperRail and one Transformer object.', obj.name);
            end

            steelCore = transformer.findComponentByName('SteelCore');
            airGap = transformer.findComponentByName('AirGap');

            drawBoundary(copperRail, obj.xPos, obj.yPos);
            drawBoundary(steelCore, obj.xPos + transformer.xPos, obj.yPos + transformer.yPos);
            drawBoundary(airGap, obj.xPos + transformer.xPos, obj.yPos + transformer.yPos);

            railWidth = copperRail.geoObject.vertices(2, 1);
            airGapWidth = airGap.geoObject.vertices(2, 1);
            coreWidth = steelCore.geoObject.vertices(2, 1);

            mi_addblocklabel(obj.xPos + copperRail.xPos, obj.yPos + copperRail.yPos);
            mi_selectlabel(obj.xPos + copperRail.xPos, obj.yPos + copperRail.yPos);
            mi_setblockprop(copperRail.material, 1, 0, circuitName, 0, groupNumOffset + 1, 0);
            mi_clearselected();

            labelXAir = obj.xPos + (airGapWidth + railWidth) / 2;
            mi_addblocklabel(labelXAir, obj.yPos);
            mi_selectlabel(labelXAir, obj.yPos);
            mi_setblockprop(airGap.material, 1, 0, '<None>', 0, groupNumOffset + 2, 0);
            mi_clearselected();

            labelXCore = obj.xPos + (coreWidth + airGapWidth) / 2;
            mi_addblocklabel(labelXCore, obj.yPos);
            mi_selectlabel(labelXCore, obj.yPos);
            mi_setblockprop(steelCore.material, 1, 0, '<None>', 0, groupNumOffset + 3, 0);
            mi_clearselected();
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
    vertices = component.geoObject.vertices + [absX, absY];

    for i = 1:size(vertices, 1)
        mi_addnode(vertices(i, 1), vertices(i, 2));
    end

    for i = 1:size(vertices, 1)
        startNode = vertices(i, :);
        endNode = vertices(mod(i, size(vertices, 1)) + 1, :);
        mi_addsegment(startNode(1), startNode(2), endNode(1), endNode(2));
    end

end
