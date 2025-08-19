classdef ComponentGroup

    properties
        name
        xPos
        yPos
        components = {}
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

        function drawInFemm(obj, circuitName, groupNumOffset)
            rail = obj.findComponentByClass('CopperRail');
            transformer = obj.findComponentByClass('Transformer');

            if isempty(rail) || isempty(transformer)
                error('Assembly "%s" missing rail or transformer.', obj.name);
            end

            core = transformer.findComponentByName('SteelCore');
            gap = transformer.findComponentByName('AirGap');

            rail.groupNum = groupNumOffset + 1;
            gap.groupNum = groupNumOffset + 2;
            core.groupNum = groupNumOffset + 3;

            % --- Draw all boundaries ---
            % The components are drawn centered on the same point, creating overlaps.
            % This is solved by placing labels in each of the resulting regions.
            drawBoundary(rail, obj.xPos, obj.yPos);
            drawBoundary(core, obj.xPos + transformer.xPos, obj.yPos + transformer.yPos);
            % Manually draw the inner circle of the transformer (air gap boundary)
            if gap.geoObject.isArc
                arc1 = gap.geoObject.arcData.arc1;
                arc2 = gap.geoObject.arcData.arc2;
                mi_addnode(obj.xPos + transformer.xPos + arc1.start(1), obj.yPos + transformer.yPos + arc1.start(2));
                mi_addnode(obj.xPos + transformer.xPos + arc1.end(1), obj.yPos + transformer.yPos + arc1.end(2));
                mi_addarc(obj.xPos + transformer.xPos + arc1.start(1), obj.yPos + transformer.yPos + arc1.start(2), ...
                          obj.xPos + transformer.xPos + arc1.end(1), obj.yPos + transformer.yPos + arc1.end(2), ...
                          arc1.angle, arc1.maxseg);
                mi_addarc(obj.xPos + transformer.xPos + arc2.start(1), obj.yPos + transformer.yPos + arc2.start(2), ...
                          obj.xPos + transformer.xPos + arc2.end(1), obj.yPos + transformer.yPos + arc2.end(2), ...
                          arc2.angle, arc2.maxseg);
            else
                % If not an arc, assume it's a rectangle and draw its boundary
                gap.geoObject.drawInFemm(obj.xPos + transformer.xPos, obj.yPos + transformer.yPos);
            end

            % --- Add all labels ---
            % 1. Rail Label (at the center of the rail)
            railAbsX = obj.xPos + rail.xPos;
            railAbsY = obj.yPos + rail.yPos;
            mi_addblocklabel(railAbsX, railAbsY);
            mi_selectlabel(railAbsX, railAbsY);
            mi_setblockprop(rail.material, 1, 0, circuitName, 0, rail.groupNum, 0);
            mi_clearselected();

            % 2. Core Label (between the transformer's outer and inner boundaries)
            % Approximates radii from the vertices of the circular boundaries.
            if core.geoObject.isArc
                outer_radius_approx = core.geoObject.arcData.arc1.start(1);
            else
                outer_radius_approx = norm(core.geoObject.vertices(1, :));
            end

            if gap.geoObject.isArc
                inner_radius_approx = gap.geoObject.arcData.arc1.start(1);
            else
                inner_radius_approx = norm(gap.geoObject.vertices(1, :));
            end
            label_radius_core = (outer_radius_approx + inner_radius_approx) / 2;
            coreLabelX = obj.xPos + label_radius_core;
            coreLabelY = obj.yPos;
            mi_addblocklabel(coreLabelX, coreLabelY);
            mi_selectlabel(coreLabelX, coreLabelY);
            mi_setblockprop(core.material, 1, 0, '<None>', 0, core.groupNum, 0);
            mi_clearselected();

            % 3. Air Gap Label (between the rail and the transformer's inner boundary)
            % This is the key fix: places a label in the actual air gap region.
            rail_half_width = rail.geoObject.vertices(2, 1); % Assumes rectangle
            if gap.geoObject.isArc
                gap_inner_radius_approx = gap.geoObject.arcData.arc1.start(1);
            else
                gap_inner_radius_approx = norm(gap.geoObject.vertices(1, :));
            end
            label_radius_air = (rail_half_width + gap_inner_radius_approx) / 2;
            airGapLabelX = obj.xPos + 75;
            airGapLabelY = obj.yPos;
            mi_addblocklabel(airGapLabelX, airGapLabelY);
            mi_selectlabel(airGapLabelX, airGapLabelY);
            mi_setblockprop(gap.material, 1, 0, '<None>', 0, gap.groupNum, 0);
            mi_clearselected();
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

function drawBoundary(component, groupX, groupY)
    absX = groupX + component.xPos;
    absY = groupY + component.yPos;
    component.geoObject.drawInFemm(absX, absY);
end

