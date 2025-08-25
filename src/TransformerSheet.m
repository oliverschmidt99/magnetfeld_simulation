classdef TransformerSheet < Component

    methods

        function obj = TransformerSheet(config)
            geo_cfg = config.specificProductInformation.geometry;
            geo = GeoObject.createRectangle(geo_cfg.width, geo_cfg.height);
            obj@Component(config.templateProductInformation.name, 0, 0, geo, geo_cfg.material);
        end

        function drawInFemm(obj, groupX, groupY, circuitName, groupNum)
            absX = groupX + obj.xPos;
            absY = groupY + obj.yPos;

            vertices = obj.geoObject.vertices + [absX, absY];
            mi_addpolygon(vertices);

            mi_addblocklabel(absX, absY);
            mi_selectlabel(absX, absY);
            mi_setblockprop(obj.material, 1, 0, circuitName, 0, groupNum, 0);
            mi_clearselected();
        end

    end

end
