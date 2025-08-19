% oliverschmidt99/magnetfeld_simulation/magnetfeld_simulation-lab/src/Transformer.m
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

            % Erstellt die Geometrie basierend auf dem Typ (Ring oder Rechteck)
            switch config.geometry.type
                case 'Ring'
                    % Erzeugt vier konzentrische Kreise als Grenzen
                    geoOuterAir = GeoObject.createRing(config.geometry.coreOuterRadius, config.geometry.outerAirRadius);
                    geoCore = GeoObject.createRing(config.geometry.coreInnerRadius, config.geometry.coreOuterRadius);
                    geoInnerAir = GeoObject.createRing(config.geometry.gapRadius, config.geometry.coreInnerRadius);
                    geoGap = GeoObject.createRing(0, config.geometry.gapRadius); % Innenraum für Leiter

                    % Erstellt die vier Komponenten
                    compOuterAir = Component('OuterAir', 0, 0, geoOuterAir.outer, config.gapMaterial);
                    compCore = Component('SteelCore', 0, 0, geoCore.outer, config.coreMaterial);
                    compInnerAir = Component('InnerAir', 0, 0, geoInnerAir.outer, config.gapMaterial);
                    compGap = Component('AirGap', 0, 0, geoGap.outer, config.gapMaterial);

                case 'Rectangle'
                    % Erzeugt vier konzentrische Rechtecke als Grenzen
                    geoOuterAir = GeoObject.createRectangle(config.geometry.outerAirWidth, config.geometry.outerAirHeight);
                    geoCore = GeoObject.createRectangle(config.geometry.coreOuterWidth, config.geometry.coreOuterHeight);
                    geoInnerAir = GeoObject.createRectangle(config.geometry.coreInnerWidth, config.geometry.coreInnerHeight);
                    geoGap = GeoObject.createRectangle(config.geometry.innerWidth, config.geometry.innerHeight);

                    % Erstellt die vier Komponenten
                    compOuterAir = Component('OuterAir', 0, 0, geoOuterAir, config.gapMaterial);
                    compCore = Component('SteelCore', 0, 0, geoCore, config.coreMaterial);
                    compInnerAir = Component('InnerAir', 0, 0, geoInnerAir, config.gapMaterial);
                    compGap = Component('AirGap', 0, 0, geoGap, config.gapMaterial);
                otherwise
                    error('Unbekannter Geometrie-Typ im Wandler: %s', config.geometry.type);
            end

            % Fügt die Komponenten zur Gruppe hinzu (von außen nach innen)
            obj = obj.addComponent(compOuterAir);
            obj = obj.addComponent(compCore);
            obj = obj.addComponent(compInnerAir);
            obj = obj.addComponent(compGap);
        end

    end

end
