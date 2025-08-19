% oliverschmidt99/magnetfeld_simulation/magnetfeld_simulation-lab/src/GeoObject.m
classdef GeoObject

    properties
        vertices % Used for rectangles and polygon approximations of rings
        isArc = false;
        arcData
    end

    methods

        function obj = GeoObject(vertices)

            if nargin > 0
                obj.vertices = vertices;
            end

        end

        % NEUE METHODE: Zeichnet das Objekt in FEMM
        function drawInFemm(obj, centerX, centerY)
            % Verschiebt die lokalen Vertices an die globale Position und zeichnet sie
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
        % ... (der Rest deiner Static-Methoden bleibt unverändert)
        function geo = create(config)

            switch config.type
                case 'Rectangle'
                    geo = GeoObject.createRectangle(config.width, config.height);
                case 'Ring'
                    % createRing gibt jetzt direkt ein GeoObject zurück
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
                numSegments = 64; % Standardwert für eine glatte Kreis-Approximation
            end

            angles = linspace(0, 2 * pi, numSegments + 1)';

            % Äußere und innere Punkte in der richtigen Reihenfolge für eine einzige Polygondefeinition
            outerPoints = [cos(angles) * outerRadius, sin(angles) * outerRadius];
            innerPoints = [cos(angles) * innerRadius, sin(angles) * innerRadius];

            % Vertices für ein Polygon mit Loch
            vertices = [outerPoints; flipud(innerPoints)];
            obj = GeoObject(vertices);
        end

    end

end
