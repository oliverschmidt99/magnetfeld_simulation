% oliverschmidt99/magnetfeld_simulation/magnetfeld_simulation-lab/src/Transformer.m
classdef Transformer < ComponentGroup

    properties
        manufacturer
        productName
    end

    methods

        function obj = Transformer(config)
            % KORRIGIERT: Zugriff auf die verschachtelte TPI-Struktur
            obj@ComponentGroup(config.templateProductInformation.name, 0, 0);
            obj.manufacturer = config.templateProductInformation.manufacturer;
            obj.productName = config.templateProductInformation.productName;

            % KORRIGIERT: Shortcuts für einfacheren Zugriff
            spi = config.specificProductInformation;
            geo_cfg = spi.geometry;

            % Erstellt die Geometrie basierend auf dem Typ (Ring oder Rechteck)
            switch geo_cfg.type
                case 'Ring'
                    % Erzeugt vier konzentrische Kreise als Grenzen
                    geoOuterAir = GeoObject.createRing(geo_cfg.coreOuterRadius, geo_cfg.outerAirRadius);
                    geoCore = GeoObject.createRing(geo_cfg.coreInnerRadius, geo_cfg.coreOuterRadius);
                    geoInnerAir = GeoObject.createRing(geo_cfg.gapRadius, geo_cfg.coreInnerRadius);
                    geoGap = GeoObject.createRing(0, geo_cfg.gapRadius); % Innenraum für Leiter

                    % Erstellt die vier Komponenten
                    compOuterAir = Component('OuterAir', 0, 0, geoOuterAir.outer, spi.gapMaterial);
                    compCore = Component('SteelCore', 0, 0, geoCore.outer, spi.coreMaterial);
                    compInnerAir = Component('InnerAir', 0, 0, geoInnerAir.outer, spi.gapMaterial);
                    compGap = Component('AirGap', 0, 0, geoGap.outer, spi.gapMaterial);

                case 'Rectangle'
                    % Erzeugt vier konzentrische Rechtecke als Grenzen
                    geoOuterAir = GeoObject.createRectangle(geo_cfg.outerAirWidth, geo_cfg.outerAirHeight);
                    geoCore = GeoObject.createRectangle(geo_cfg.coreOuterWidth, geo_cfg.coreOuterHeight);
                    geoInnerAir = GeoObject.createRectangle(geo_cfg.coreInnerWidth, geo_cfg.coreInnerHeight);
                    geoGap = GeoObject.createRectangle(geo_cfg.innerWidth, geo_cfg.innerHeight);

                    % Erstellt die vier Komponenten
                    compOuterAir = Component('OuterAir', 0, 0, geoOuterAir, spi.gapMaterial);
                    compCore = Component('SteelCore', 0, 0, geoCore, spi.coreMaterial);
                    compInnerAir = Component('InnerAir', 0, 0, geoInnerAir, spi.gapMaterial);
                    compGap = Component('AirGap', 0, 0, geoGap, spi.gapMaterial);
                otherwise
                    error('Unbekannter Geometrie-Typ im Wandler: %s', geo_cfg.type);
            end

            % Fügt die Komponenten zur Gruppe hinzu (von außen nach innen)
            obj = obj.addComponent(compOuterAir);
            obj = obj.addComponent(compCore);
            obj = obj.addComponent(compInnerAir);
            obj = obj.addComponent(compGap);
        end

    end

end
