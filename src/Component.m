% Base class for all physical components.
classdef Component < PositionedObject

    properties
        name
        material
        groupNum = 0; % NEU: Eigenschaft für die FEMM-Gruppennummer
    end

    methods

        function obj = Component(name, x, y, geoObject, material)
            obj@PositionedObject(x, y, geoObject);
            obj.name = name;
            obj.material = material;
        end

    end

end
