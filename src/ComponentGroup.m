% Groups multiple components into a logical assembly.
classdef ComponentGroup

    properties
        name
        components = {}
    end

    methods

        function obj = ComponentGroup(name)
            obj.name = name;
        end

        function obj = addComponent(obj, component)
            obj.components{end + 1} = component;
        end

        function obj = translate(obj, dx, dy)

            for i = 1:length(obj.components)
                obj.components{i}.xPos = obj.components{i}.xPos + dx;
                obj.components{i}.yPos = obj.components{i}.yPos + dy;
            end

        end

        function drawInFemm(obj)

            for i = 1:length(obj.components)
                obj.components{i}.drawInFemm();
            end

        end

    end

end
