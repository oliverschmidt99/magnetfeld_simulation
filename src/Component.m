% Represents a single physical component in the simulation.
classdef Component < PositionedObject

    properties
        name
        material
        circuit = '<None>';
        groupNum = 0;
    end

    methods

        function obj = Component(name, relX, relY, geoObject, material, circuit, groupNum)
            % The position is now relative to the parent group's center.
            obj@PositionedObject(relX, relY, geoObject);

            obj.name = name;
            obj.material = material;

            if nargin > 5 && ~isempty(circuit)
                obj.circuit = circuit;
            end

            if nargin > 6 && ~isempty(groupNum)
                obj.groupNum = groupNum;
            end

        end

        % Draws the shape at its absolute world position.
        function drawShapeInFemm(obj, groupX, groupY)
            absX = groupX + obj.xPos;
            absY = groupY + obj.yPos;
            vertices = obj.geoObject.vertices + [absX, absY];
            numVertices = size(vertices, 1);

            for i = 1:numVertices
                mi_addnode(vertices(i, 1), vertices(i, 2));
            end

            for i = 1:numVertices
                startNode = vertices(i, :);
                endNode = vertices(mod(i, numVertices) + 1, :);
                mi_addsegment(startNode(1), startNode(2), endNode(1), endNode(2));
            end

        end

        % Places the label at its absolute world position.
        function placeLabelInFemm(obj, groupX, groupY, labelX, labelY)
            absLabelX = groupX + labelX;
            absLabelY = groupY + labelY;
            mi_addblocklabel(absLabelX, absLabelY);
            mi_selectlabel(absLabelX, absLabelY);
            mi_setblockprop(obj.material, 1, 0, obj.circuit, 0, obj.groupNum, 0);
            mi_clearselected();
        end

    end

end
