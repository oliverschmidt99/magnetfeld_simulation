% Represents a single physical component in the simulation.
classdef Component < PositionedObject

    properties
        name
        material
        circuit = '<None>';
        groupNum = 0;
    end

    methods

        function obj = Component(name, x, y, geoObject, material, circuit, groupNum)
            % The superclass constructor call is now the first, unconditional line.
            obj@PositionedObject(x, y, geoObject);

            % The rest of the properties are set afterwards.
            obj.name = name;
            obj.material = material;

            if nargin > 5 && ~isempty(circuit)
                obj.circuit = circuit;
            end

            if nargin > 6 && ~isempty(groupNum)
                obj.groupNum = groupNum;
            end

        end

        % ... (drawShapeInFemm and placeLabelInFemm methods are unchanged) ...
        function drawShapeInFemm(obj)
            vertices = obj.geoObject.vertices + [obj.xPos, obj.yPos];
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

        function placeLabelInFemm(obj, labelX, labelY)
            mi_addblocklabel(labelX, labelY);
            mi_selectlabel(labelX, labelY);
            mi_setblockprop(obj.material, 1, 0, obj.circuit, 0, obj.groupNum, 0);
            mi_clearselected();
        end

    end

end
