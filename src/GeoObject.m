% Defines a pure geometric shape through a list of vertices.
classdef GeoObject

    properties
        vertices % Relative corner points of the shape, centered around (0,0)
    end

    methods

        function obj = GeoObject(vertices)
            obj.vertices = vertices;
        end

    end

    methods (Static)
        % Factory method to create a rectangle
        function obj = createRectangle(width, height)
            halfW = width / 2;
            halfH = height / 2;
            vertices = [-halfW, -halfH; halfW, -halfH; halfW, halfH; -halfW, halfH];
            obj = GeoObject(vertices);
        end

    end

end
