% Represents an object with a position and checks for collisions.
classdef PositionedObject

    properties
        xPos
        yPos
        geoObject % Holds the shape information
    end

    methods

        function obj = PositionedObject(x, y, geoObject)
            % The constructor now requires arguments and is no longer conditional.
            obj.xPos = x;
            obj.yPos = y;
            obj.geoObject = geoObject;
        end

        % ... (rest of the methods are unchanged) ...
        function bbox = getBoundingBox(obj)
            minP = min(obj.geoObject.vertices, [], 1);
            maxP = max(obj.geoObject.vertices, [], 1);
            bbox = [minP(1) + obj.xPos, minP(2) + obj.yPos, ...
                        maxP(1) + obj.xPos, maxP(2) + obj.yPos];
        end

        function doesCollide = collisionDetection(obj, otherObject)
            bbox1 = obj.getBoundingBox();
            bbox2 = otherObject.getBoundingBox();

            if (bbox1(3) < bbox2(1) || bbox1(1) > bbox2(3) || ...
                    bbox1(4) < bbox2(2) || bbox1(2) > bbox2(4))
                doesCollide = false;
            else
                doesCollide = true;
            end

        end

    end

end
