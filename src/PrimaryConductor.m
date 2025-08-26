% src/PrimaryConductor.m
classdef PrimaryConductor < Component

    properties
        config
    end

    methods

        function obj = PrimaryConductor(config)
            obj@Component('PrimaryConductor', 0, 0, GeoObject(), config.material);
            obj.config = config;
        end

        function drawInFemm(obj, centerX, centerY, circuitName, groupNum)

            switch obj.config.type
                case 'Rectangle'
                    geo = GeoObject.createRectangle(obj.config.width, obj.config.height);
                    obj.drawAndLabelGeo(geo, centerX, centerY, circuitName, groupNum);

                case 'MultiRectangle'
                    numRects = obj.config.count;
                    width = obj.config.width;
                    height = obj.config.height;
                    spacing = obj.config.spacing;

                    totalWidth = numRects * width + (numRects - 1) * spacing;
                    startX = centerX - totalWidth / 2 + width / 2;

                    for i = 1:numRects
                        rectCenterX = startX + (i - 1) * (width + spacing);
                        geo = GeoObject.createRectangle(width, height);
                        obj.drawAndLabelGeo(geo, rectCenterX, centerY, circuitName, groupNum);
                    end

                case 'Circle'
                    radius = obj.config.diameter / 2;
                    geo = GeoObject.createRing(0, radius, 64);
                    obj.drawAndLabelGeo(geo, centerX, centerY, circuitName, groupNum);

                otherwise
                    error('Unbekannter Primärleiter-Typ: %s', obj.config.type);
            end

        end

        function drawAndLabelGeo(obj, geo, x, y, circuit, group)
            absVertices = geo.vertices + [x, y];
            mi_addpolygon(absVertices);
            mi_addblocklabel(x, y);
            mi_selectlabel(x, y);
            mi_setblockprop(obj.material, 1, 0, circuit, 0, group, 0);
            mi_clearselected();
        end

    end

end
