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

        function obj = translate(obj, dx, dy)
            obj.xPos = obj.xPos + dx;
            obj.yPos = obj.yPos + dy;
        end

        % Tells all its components to draw themselves relative to the group's position.
        function drawInFemm(obj)
            % --- Draw Shapes First ---
            for i = 1:length(obj.components)
                % Pass the group's position to the component
                obj.components{i}.drawShapeInFemm(obj.xPos, obj.yPos);
            end

            % --- Place Labels Intelligently After All Shapes Are Drawn ---
            steelCore = obj.findComponentByName('SteelCore');
            airGap = obj.findComponentByName('AirGap');
            conductor = obj.findComponentByName('CopperConductor');

            if ~isempty(steelCore) && ~isempty(airGap) && ~isempty(conductor)
                coreWidth = steelCore.geoObject.vertices(2, 1); % half-width
                airGapWidth = airGap.geoObject.vertices(2, 1);
                conductorWidth = conductor.geoObject.vertices(2, 1);

                labelXCore = (coreWidth + airGapWidth) / 2 + steelCore.xPos;
                steelCore.placeLabelInFemm(obj.xPos, obj.yPos, labelXCore, steelCore.yPos);

                labelXAir = (airGapWidth + conductorWidth) / 2 + airGap.xPos;
                airGap.placeLabelInFemm(obj.xPos, obj.yPos, labelXAir, airGap.yPos);

                conductor.placeLabelInFemm(obj.xPos, obj.yPos, conductor.xPos, conductor.yPos);
            end

        end

        % Helper method to find a component within the group
        function component = findComponentByName(obj, name)
            component = [];

            for i = 1:length(obj.components)

                if strcmp(obj.components{i}.name, name)
                    component = obj.components{i};
                    return;
                end

            end

        end

    end

end
