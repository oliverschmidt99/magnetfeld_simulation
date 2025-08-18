classdef Transformer < ComponentGroup

    properties
        manufacturer
        productName
    end

    methods

        function obj = Transformer(config)
            obj@ComponentGroup(config.name, 0, 0);
            obj.manufacturer = config.manufacturer;
            obj.productName = config.productName;

            geoCore = GeoObject.createRectangle(config.outerWidth, config.outerHeight);
            compCore = Component('SteelCore', 0, 0, geoCore, config.coreMaterial);

            geoGap = GeoObject.createRectangle(config.innerWidth, config.innerHeight);
            compGap = Component('AirGap', 0, 0, geoGap, config.gapMaterial);

            obj = obj.addComponent(compCore);
            obj = obj.addComponent(compGap);
        end

    end

end
