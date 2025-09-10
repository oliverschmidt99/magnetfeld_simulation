classdef GeoObject

    properties
        vertices
    end

    methods

        function obj = GeoObject(vertices)

            if nargin > 0
                obj.vertices = vertices;
            end

        end

        function drawInFemm(obj, centerX, centerY)
            absVertices = obj.vertices + [centerX, centerY];

            for i = 1:size(absVertices, 1)
                mi_addnode(absVertices(i, 1), absVertices(i, 2));
            end

            for i = 1:size(absVertices, 1)
                startNode = absVertices(i, :);
                endNode = absVertices(mod(i, size(absVertices, 1)) + 1, :);
                mi_addsegment(startNode(1), startNode(2), endNode(1), endNode(2));
            end

        end

    end

    methods (Static)

        function obj = createRectangle(width, height)
            halfW = width / 2;
            halfH = height / 2;
            vertices = [-halfW, -halfH; halfW, -halfH; halfW, halfH; -halfW, halfH];
            obj = GeoObject(vertices);
        end

    end

end
