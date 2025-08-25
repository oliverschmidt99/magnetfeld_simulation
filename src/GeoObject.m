classdef GeoObject

    properties
        vertices
        isArc = false;
        arcData
    end

    methods

        function obj = GeoObject(vertices)

            if nargin > 0
                obj.vertices = vertices;
            end

        end

        function drawInFemm(obj, centerX, centerY)
            % KORRIGIERT: Vereinfachte Addition durch MATLABs automatische Expansion
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

        function obj = createRing(innerRadius, outerRadius, numSegments)

            if nargin < 3
                numSegments = 64;
            end

            angles = linspace(0, 2 * pi, numSegments + 1)';
            outerPoints = [cos(angles) * outerRadius, sin(angles) * outerRadius];
            innerPoints = [cos(angles) * innerRadius, sin(angles) * innerRadius];
            vertices = [outerPoints; flipud(innerPoints)];
            obj = GeoObject(vertices);
        end

    end

end
