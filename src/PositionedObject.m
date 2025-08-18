classdef PositionedObject

    properties
        xPos
        yPos
        geoObject
    end

    methods

        function obj = PositionedObject(x, y, geoObject)
            obj.xPos = x;
            obj.yPos = y;
            obj.geoObject = geoObject;
        end

    end

end
