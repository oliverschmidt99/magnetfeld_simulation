% Represents a simple transformer sheet metal piece.
classdef TransformerSheet < Component

    methods

        function obj = TransformerSheet(config)
            geo = GeoObject.createRectangle(config.width, config.height);
            obj@Component(config.name, 0, 0, geo, config.material);
        end

        % Concrete implementation of the abstract draw method.
        function drawInFemm(obj, groupX, groupY, circuitName, groupNum)
            absX = groupX + obj.xPos;
            absY = groupY + obj.yPos;

            vertices = obj.geoObject.vertices + [absX, absY];
            mi_addpolygon(vertices);

            mi_addblocklabel(absX, absY);
            mi_selectlabel(absX, absY);
            mi_setblockprop(obj.material, 1, 0, circuitName, 0, groupNum, 0);
            mi_clearselected();
        end

    end

end
