% Represents a ring-core (toroidal) transformer.
classdef RingTransformer < ComponentGroup

    properties
        manufacturer
        productName
    end

    methods

        function obj = RingTransformer(config)
            obj@ComponentGroup(config.name, 0, 0);
            obj.manufacturer = config.manufacturer;
            obj.productName = config.productName;

            % Erstelle die Ring-Geometrie
            ringGeo = GeoObject.createRing(config.innerRadius, config.outerRadius);

            % Erstelle die internen "Komponenten" für die Grenzen
            compCore = Component('RingCore', 0, 0, ringGeo.outer, config.coreMaterial);
            compGap = Component('RingGap', 0, 0, ringGeo.inner, config.gapMaterial);

            obj = obj.addComponent(compCore);
            obj = obj.addComponent(compGap);
        end

    end

end
