% src/Transformer.m - VEREINFACHTE VERSION
classdef Transformer < ComponentGroup

    properties
        manufacturer
        productName
    end

    methods

        function obj = Transformer(config)
            % Ruft den Konstruktor der übergeordneten Klasse auf
            obj@ComponentGroup(config.templateProductInformation.name, 0, 0);
            obj.manufacturer = config.templateProductInformation.manufacturer;
            obj.productName = config.templateProductInformation.productName;

            spi = config.specificProductInformation;
            geo_cfg = spi.geometry;

            % Erstellt die Geometrie für den Stahlkern.
            % Die Außenmaße werden aus coreOuterWidth/Height genommen.
            geoCoreOuter = GeoObject.createRectangle(geo_cfg.coreOuterWidth, geo_cfg.coreOuterHeight);

            % Erstellt die Geometrie für das innere "Loch" (Luft).
            % Die Innenmaße werden aus coreInnerWidth/Height genommen.
            geoCoreInner = GeoObject.createRectangle(geo_cfg.coreInnerWidth, geo_cfg.coreInnerHeight);

            % Erstellt die beiden finalen Komponenten
            compCore = Component('SteelCore', 0, 0, geoCoreOuter, spi.coreMaterial);
            compInnerAir = Component('InnerAir', 0, 0, geoCoreInner, 'Air'); % Das innere Loch ist Luft

            % Fügt dem Transformer nur noch diese beiden Komponenten hinzu
            obj = obj.addComponent(compCore);
            obj = obj.addComponent(compInnerAir);
        end

    end

end
