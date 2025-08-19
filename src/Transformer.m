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

            % Intelligente Geometrie-Erstellung
            switch config.geometry.type
                case 'Rectangle'
<<<<<<< HEAD
                    % Erster switch für die Hauptgeometrie des Luftspalts
                    geoGap = GeoObject.createRectangle(config.geometry.innerWidth, config.geometry.innerHeight);
                    % Zweiter switch für die spezifische Kerntypauswahl
                    switch config.geometry.coreGeometryType
                        case 'Rectangle'
                            geoCore = GeoObject.createRectangle(config.geometry.outerWidth, config.geometry.outerHeight);
                        case 'Ring'
                            ringGeo = GeoObject.createRing(config.geometry.innerRadius, config.geometry.outerRadius);
                            geoCore = ringGeo.outer;
                        otherwise
                            error('Unbekannter Kerntyp im Wandler: %s', config.geometry.coreGeometryType);
                    end

                case 'Ring'
                    ringGeo = GeoObject.createRing(config.geometry.innerRadius, config.geometry.outerRadius);
                    geoCore = ringGeo.outer;
                    geoGap = ringGeo.inner;
                otherwise
                    error('Unbekannter Geometrie-Typ im Wandler: %s', config.geometry.type);
            end

=======
                    geoCore = GeoObject.createRectangle(config.geometry.outerWidth, config.geometry.outerHeight);
                    geoGap = GeoObject.createRectangle(config.geometry.innerWidth, config.geometry.innerHeight);
                case 'Ring'
                    ringGeo = GeoObject.createRing(config.geometry.innerRadius, config.geometry.outerRadius);
                    geoCore = ringGeo.outer;
                    geoGap = ringGeo.inner;
                otherwise
                    error('Unbekannter Geometrie-Typ im Wandler: %s', config.geometry.type);
            end

>>>>>>> mein_alter_commit
            compCore = Component('SteelCore', 0, 0, geoCore, config.coreMaterial);
            compGap = Component('AirGap', 0, 0, geoGap, config.gapMaterial);

            obj = obj.addComponent(compCore);
            obj = obj.addComponent(compGap);
        end

    end

end
