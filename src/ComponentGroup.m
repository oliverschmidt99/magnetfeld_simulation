% src/ComponentGroup.m
classdef ComponentGroup

    properties
        name
        xPos
        yPos
        components = {}
        assignedCurrent
        primaryConductor
    end

    methods

        function obj = ComponentGroup(name, x, y)
            obj.name = name;
            obj.xPos = x;
            obj.yPos = y;
        end

        function obj = addComponent(obj, component)
            obj.components{end + 1} = component;
        end

        function obj = setPrimaryConductor(obj, conductor)
            obj.primaryConductor = conductor;
        end

        function drawInFemm(obj, circuitName, groupNumOffset)
            transformer = obj.findComponentByClass('Transformer');

            if isempty(transformer)
                error('Assembly "%s" fehlt der Wandler.', obj.name);
            end

            if isempty(obj.primaryConductor)
                error('Assembly "%s" fehlt die Definition des Primärleiters.', obj.name);
            end

            outerAir = transformer.findComponentByName('OuterAir');
            core = transformer.findComponentByName('SteelCore');
            innerAir = transformer.findComponentByName('InnerAir');

            outerAir.groupNum = groupNumOffset + 5;
            core.groupNum = groupNumOffset + 3;
            innerAir.groupNum = groupNumOffset + 4;

            mi_addpolygon(outerAir.geoObject.vertices + [obj.xPos, obj.yPos]);
            mi_addpolygon(core.geoObject.vertices + [obj.xPos, obj.yPos]);
            mi_addpolygon(innerAir.geoObject.vertices + [obj.xPos, obj.yPos]);

            conductorGroupNum = groupNumOffset + 1;
            obj.primaryConductor.drawInFemm(obj.xPos, obj.yPos, circuitName, conductorGroupNum);

            labelX_outer = (outerAir.geoObject.vertices(2, 1) + core.geoObject.vertices(2, 1)) / 2;
            placeLabel(outerAir, obj.xPos, obj.yPos, labelX_outer, 0, '<None>', outerAir.material, outerAir.groupNum);

            labelX_core = (core.geoObject.vertices(2, 1) + innerAir.geoObject.vertices(2, 1)) / 2;
            placeLabel(core, obj.xPos, obj.yPos, labelX_core, 0, '<None>', core.material, core.groupNum);

            conductor_config = obj.primaryConductor.config;

            if any(strcmp(conductor_config.type, {'Rectangle', 'MultiRectangle'}))
                labelX_inner = (innerAir.geoObject.vertices(2, 1) + conductor_config.width) / 2;
                placeLabel(innerAir, obj.xPos, obj.yPos, labelX_inner, 0, '<None>', innerAir.material, innerAir.groupNum);
            end

        end

        function component = findComponentByClass(obj, className)
            component = [];

            for i = 1:length(obj.components)

                if isa(obj.components{i}, className)
                    component = obj.components{i};
                    return;
                end

            end

        end

        function component = findComponentByName(obj, name)
            component = [];

            for i = 1:length(obj.components)
                comp = obj.components{i};

                if strcmp(comp.name, name)
                    component = comp;
                    return;
                end

                if isa(comp, 'ComponentGroup')
                    component = comp.findComponentByName(name);

                    if ~isempty(component)
                        return;
                    end

                end

            end

        end

    end

end
