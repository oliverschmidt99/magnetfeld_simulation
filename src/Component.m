classdef Component < PositionedObject

    properties
        name
        material
        groupNum = 0;
    end

    methods

        function obj = Component(name, x, y, geoObject, material)
            obj@PositionedObject(x, y, geoObject);
            obj.name = name;
            obj.material = material;
        end

    end

end
