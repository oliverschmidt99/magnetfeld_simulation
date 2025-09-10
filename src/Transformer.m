classdef Transformer < ComponentGroup

    properties
        manufacturer
        productName
    end

    methods

        function obj = Transformer(config)
            obj@ComponentGroup(config.templateProductInformation.name, 0, 0);
            obj.manufacturer = config.templateProductInformation.manufacturer;
            obj.productName = config.templateProductInformation.productName;

            spi = config.specificProductInformation;
            geo_cfg = spi.geometry;

            if strcmp(geo_cfg.type, 'Rectangle')
                geoOuterAir = GeoObject.createRectangle(geo_cfg.outerAirWidth, geo_cfg.outerAirHeight);
                geoCore = GeoObject.createRectangle(geo_cfg.coreOuterWidth, geo_cfg.coreOuterHeight);
                geoInnerAir = GeoObject.createRectangle(geo_cfg.coreInnerWidth, geo_cfg.coreInnerHeight);
                geoGap = GeoObject.createRectangle(geo_cfg.innerWidth, geo_cfg.innerHeight);

                compOuterAir = Component('OuterAir', 0, 0, geoOuterAir, spi.gapMaterial);
                compCore = Component('SteelCore', 0, 0, geoCore, spi.coreMaterial);
                compInnerAir = Component('InnerAir', 0, 0, geoInnerAir, spi.gapMaterial);
                compGap = Component('AirGap', 0, 0, geoGap, spi.gapMaterial);
            else
                error('Unbekannter Geometrie-Typ im Wandler: %s', geo_cfg.type);
            end

            obj = obj.addComponent(compOuterAir);
            obj = obj.addComponent(compCore);
            obj = obj.addComponent(compInnerAir);
            obj = obj.addComponent(compGap);
        end

    end

end
