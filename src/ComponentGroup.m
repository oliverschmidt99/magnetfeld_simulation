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

            if isempty(rail) || isempty(transformer)
                error('Assembly "%s" missing rail or transformer.', obj.name);
            end

            core = transformer.findComponentByName('SteelCore');
            gap = transformer.findComponentByName('AirGap');

            rail.groupNum = groupNumOffset + 1;
            gap.groupNum = groupNumOffset + 2;
            core.groupNum = groupNumOffset + 3;

            drawBoundary(rail, obj.xPos, obj.yPos, circuitName);
            drawBoundary(core, obj.xPos + transformer.xPos, obj.yPos + transformer.yPos);
            drawBoundary(gap, obj.xPos + transformer.xPos, obj.yPos + transformer.yPos);

            labelXAir = obj.xPos + (gap.geoObject.vertices(2, 1) + rail.geoObject.vertices(2, 1)) / 2;
            mi_addblocklabel(labelXAir, obj.yPos);
            mi_selectlabel(labelXAir, obj.yPos);
            mi_setblockprop(gap.material, 1, 0, '<None>', 0, gap.groupNum, 0);
            mi_clearselected();

            labelXCore = obj.xPos + (core.geoObject.vertices(2, 1) + gap.geoObject.vertices(2, 1)) / 2;
            mi_addblocklabel(labelXCore, obj.yPos);
            mi_selectlabel(labelXCore, obj.yPos);
            mi_setblockprop(core.material, 1, 0, '<None>', 0, core.groupNum, 0);
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

function drawBoundary(component, groupX, groupY, varargin)
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

    if ~isempty(varargin)
        circuitName = varargin{1};
        mi_addblocklabel(absX, absY);
        mi_selectlabel(absX, absY);
        mi_setblockprop(component.material, 1, 0, circuitName, 0, component.groupNum, 0);
        mi_clearselected();
    end

end
