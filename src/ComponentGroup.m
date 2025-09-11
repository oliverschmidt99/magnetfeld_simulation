% src/ComponentGroup.m - NEUE ZEICHNUNGS-LOGIK
classdef ComponentGroup

    properties
        name
        xPos
        yPos
        components = {}
        assignedCurrent
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
            % --- Komponenten abrufen ---
            rail = obj.findComponentByClass('CopperRail');
            transformer = obj.findComponentByClass('Transformer');
            if isempty(rail) || isempty(transformer), error('Assembly "%s" fehlt die Kupferschiene oder der Wandler.', obj.name); end

            core = transformer.findComponentByName('SteelCore');
            innerAir = transformer.findComponentByName('InnerAir');
            if isempty(core) || isempty(innerAir), error('Subkomponenten des vereinfachten Wandlers nicht gefunden.'); end

            % --- Gruppennummern zuweisen ---
            rail.groupNum = groupNumOffset + 1;
            core.groupNum = groupNumOffset + 2; % Nur noch eine Gruppe für den Kern

            % --- Absolute Position der Baugruppe ---
            assemblyAbsX = obj.xPos;
            assemblyAbsY = obj.yPos;

            % --- 1. Alle geometrischen Grenzen zeichnen ---
            drawBoundary(rail, assemblyAbsX, assemblyAbsY);
            drawBoundary(core, assemblyAbsX, assemblyAbsY);
            drawBoundary(innerAir, assemblyAbsX, assemblyAbsY); % Zeichnet das "Loch"

            % --- 2. Material-Labels genau nach deiner Grafik platzieren ---

            % Roter Punkt 1: KUPFER (im Zentrum der Schiene, mit Strom)
            placeLabel(assemblyAbsX, assemblyAbsY, circuitName, rail.material, rail.groupNum);

            % Roter Punkt 2: STAHL (im Zentrum des Kernmaterials)
            % Berechnet die Mitte zwischen Innen- und Außenkante des Kerns
            label_x_core = assemblyAbsX + (core.geoObject.vertices(2, 1) + innerAir.geoObject.vertices(2, 1)) / 2;
            placeLabel(label_x_core, assemblyAbsY, '<None>', core.material, core.groupNum);

            % Roter Punkt 3: LUFT (zwischen Schiene und Innenkante des Kerns)
            label_x_air_gap = assemblyAbsX + (innerAir.geoObject.vertices(2, 1) + rail.geoObject.vertices(2, 1)) / 2;
            placeLabel(label_x_air_gap, assemblyAbsY, '<None>', 'Air', 0); % Keine Gruppe nötig
        end

        % --- Hilfsfunktionen ---
        function component = findComponentByClass(obj, className)
            component = [];

            for i = 1:length(obj.components)

                if isa(obj.components{i}, className)
                    component = obj.components{i}; return;
                end

            end

        end

        function component = findComponentByName(obj, name)
            component = [];

            for i = 1:length(obj.components)
                comp = obj.components{i};
                if strcmp(comp.name, name), component = comp; return; end

                if isa(comp, 'ComponentGroup')
                    component = comp.findComponentByName(name);
                    if ~isempty(component), return; end
                end

            end

        end

    end

end
