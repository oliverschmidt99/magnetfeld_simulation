% Manages an electrical circuit and its value.
classdef Current

    properties
        name
        peakValue
        phaseShiftDeg
    end

    methods

        function obj = Current(name, peakValue, phaseShiftDeg)
            obj.name = name;
            obj.peakValue = peakValue;
            obj.phaseShiftDeg = phaseShiftDeg;
        end

        function instantValue = getValue(obj, phaseAngleDeg)
            instantValue = obj.peakValue * cosd(phaseAngleDeg + obj.phaseShiftDeg);
        end

        function defineInFemm(obj, phaseAngleDeg)
            value = obj.getValue(phaseAngleDeg);
            mi_addcircprop(obj.name, value, 1);
        end

    end

end
