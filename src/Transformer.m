% src/Transformer.m - FINALE KORRIGIERTE VERSION
classdef Transformer < ComponentGroup

    properties
        manufacturer
    end

    methods

        function obj = Transformer(config)
            % Ruft den Konstruktor der übergeordneten Klasse auf
            obj@ComponentGroup(config.templateProductInformation.name, 0, 0);
            obj.manufacturer = config.templateProductInformation.manufacturer;

            spi = config.specificProductInformation;
            geo_cfg = spi.geometry;

            % Erstellt die Geometrie für den Stahlkern.
            geoCoreOuter = GeoObject.createRectangle(geo_cfg.coreOuterWidth, geo_cfg.coreOuterHeight);

            % Erstellt die Geometrie für das innere "Loch" (Luft).
            geoCoreInner = GeoObject.createRectangle(geo_cfg.coreInnerWidth, geo_cfg.coreInnerHeight);

            % --- KORREKTUR ---
            % Das Kernmaterial wird hier fest auf 'M-36 Steel' gesetzt,
            % da es in der JSON-Datei fehlt.
            coreMaterial = 'M-36 Steel';

            % Erstellt die beiden finalen Komponenten
            compCore = Component('SteelCore', 0, 0, geoCoreOuter, coreMaterial);
            compInnerAir = Component('InnerAir', 0, 0, geoCoreInner, 'Air');

            % Fügt dem Transformer nur noch diese beiden Komponenten hinzu
            obj = obj.addComponent(compCore);
            obj = obj.addComponent(compInnerAir);
        end

    end

end
