% Represents a copper busbar.
classdef CopperRail < Component

    properties
        manufacturer
        format
    end

    methods

        function obj = CopperRail(config)
            geo = GeoObject.createRectangle(config.width, config.height);
            obj@Component(config.name, 0, 0, geo, config.material);
            obj.manufacturer = config.manufacturer;
            obj.format = config.format;
        end

    end

end
