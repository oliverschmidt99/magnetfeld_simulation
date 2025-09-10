classdef CopperRail < Component

    properties
        manufacturer
        format
        ratedCurrentA
    end

    methods

        function obj = CopperRail(config)
            spi = config.specificProductInformation;
            geo_cfg = spi.geometry;
            geo = GeoObject.createRectangle(geo_cfg.width, geo_cfg.height);
            obj@Component(config.templateProductInformation.name, 0, 0, geo, geo_cfg.material);
            obj.manufacturer = config.templateProductInformation.manufacturer;
            obj.format = '';

            if isfield(spi, 'ratedCurrentA')
                obj.ratedCurrentA = spi.ratedCurrentA;
            end

        end

    end

end
