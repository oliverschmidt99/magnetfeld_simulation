classdef GeoObject

    properties
        vertices % Used for rectangles
        isArc = false; % New property
        arcData % Struct to hold arc-specific data: startCoords, endCoords, angle, maxseg
    end

    methods

        function obj = GeoObject(vertices)
            if nargin > 0
                obj.vertices = vertices;
            end
        end

    end

    methods (Static)
        % Zentrale Factory-Methode
        function geo = create(config)

            switch config.type
                case 'Rectangle'
                    geo = GeoObject.createRectangle(config.width, config.height);
                case 'Ring'
                    geo = GeoObject.createRing(config.innerRadius, config.outerRadius);
                otherwise
                    error('Unbekannter Geometrie-Typ: %s', config.type);
            end

        end

        function obj = createRectangle(width, height)
            halfW = width / 2;
            halfH = height / 2;
            vertices = [-halfW, -halfH; halfW, -halfH; halfW, halfH; -halfW, halfH];
            obj = GeoObject(vertices);
        end

        function ring = createRing(innerRadius, outerRadius, numSegments)

            if nargin < 3
                maxseg = 0; % Default to FEMM's default segment size
            end

            angles = linspace(0, 2 * pi, numSegments + 1)';
            angles(end) = [];

            innerPoints = [cos(angles) * innerRadius, sin(angles) * innerRadius];
            outerPoints = [cos(angles) * outerRadius, sin(angles) * outerRadius];

            ring.inner = GeoObject(innerPoints);
            ring.outer = GeoObject(outerPoints);
        end

    end

end
