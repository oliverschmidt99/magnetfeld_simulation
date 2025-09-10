classdef TransformerSheet < Component

    methods

        function obj = TransformerSheet(config)
            geo_cfg = config.specificProductInformation.geometry;
            geo = GeoObject.createRectangle(geo_cfg.width, geo_cfg.height);
            obj@Component(config.templateProductInformation.name, 0, 0, geo, geo_cfg.material);
        end

    end

end
