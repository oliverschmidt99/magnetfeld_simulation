% Base class for all physical components.
classdef Component < PositionedObject

    properties
        name
        material
    end

    methods

        function obj = Component(name, x, y, geoObject, material)
            obj@PositionedObject(x, y, geoObject);
            obj.name = name;
            obj.material = material;
        end

    end

end
