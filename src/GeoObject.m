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

<<<<<<< HEAD
=======
        % New method to draw the geometry in FEMM
        function drawInFemm(obj, absX, absY)
            if obj.isArc
                % Draw arcs
                % This GeoObject represents a full circle made of two arcs
                arc1 = obj.arcData.arc1;
                arc2 = obj.arcData.arc2;

                % Add nodes for the arc endpoints
                mi_addnode(absX + arc1.start(1), absY + arc1.start(2));
                mi_addnode(absX + arc1.end(1), absY + arc1.end(2));

                % Draw the arcs
                mi_addarc(absX + arc1.start(1), absY + arc1.start(2), ...
                          absX + arc1.end(1), absY + arc1.end(2), ...
                          arc1.angle, arc1.maxseg);
                mi_addarc(absX + arc2.start(1), absY + arc2.start(2), ...
                          absX + arc2.end(1), absY + arc2.end(2), ...
                          arc2.angle, arc2.maxseg);
            else
                % Draw segments for rectangles
                vertices = obj.vertices + [absX, absY]; %#ok<PROPLC>

                for i = 1:size(vertices, 1) %#ok<PROPLC>
                    mi_addnode(vertices(i, 1), vertices(i, 2)); %#ok<*PROPLC>
                end

                for i = 1:size(vertices, 1)
                    startNode = vertices(i, :);
                    endNode = vertices(mod(i, size(vertices, 1)) + 1, :);
                    mi_addsegment(startNode(1), startNode(2), endNode(1), endNode(2));
                end
            end
        end

>>>>>>> mein_alter_commit
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

<<<<<<< HEAD
        function ring = createRing(innerRadius, outerRadius, numSegments)

=======
        function ring = createRing(innerRadius, outerRadius, maxseg)
>>>>>>> mein_alter_commit
            if nargin < 3
                maxseg = 0; % Default to FEMM's default segment size
            end

<<<<<<< HEAD
            angles = linspace(0, 2 * pi, numSegments + 1)';
            angles(end) = [];

            innerPoints = [cos(angles) * innerRadius, sin(angles) * innerRadius];
            outerPoints = [cos(angles) * outerRadius, sin(angles) * outerRadius];

            ring.inner = GeoObject(innerPoints);
            ring.outer = GeoObject(outerPoints);
=======
            % Create a single GeoObject that represents the ring
            % It will store the arc data for both inner and outer circles
            ring.outer = GeoObject();
            ring.outer.isArc = true;
            ring.outer.arcData.arc1 = struct('start', [outerRadius, 0], 'end', [-outerRadius, 0], 'angle', 180, 'maxseg', maxseg);
            ring.outer.arcData.arc2 = struct('start', [-outerRadius, 0], 'end', [outerRadius, 0], 'angle', 180, 'maxseg', maxseg);

            ring.inner = GeoObject();
            ring.inner.isArc = true;
            ring.inner.arcData.arc1 = struct('start', [innerRadius, 0], 'end', [-innerRadius, 0], 'angle', 180, 'maxseg', maxseg);
            ring.inner.arcData.arc2 = struct('start', [-innerRadius, 0], 'end', [innerRadius, 0], 'angle', 180, 'maxseg', maxseg);
>>>>>>> mein_alter_commit
        end

    end

<<<<<<< HEAD
end
=======
end
>>>>>>> mein_alter_commit
