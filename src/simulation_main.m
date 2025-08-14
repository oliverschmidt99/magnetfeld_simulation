% =========================================================================
% FINALE, KORREKTE VERSION - simulation_main.m
% Stand: 15.08.2025 - mit komplettem Material-Labeling
% =========================================================================
function simulation_main()
    % --- Pfade und Initialisierung ---
    project_dir = fileparts(fileparts(mfilename('fullpath')));
    addpath('C:\femm42\mfiles');
    disp(['Projekt-Stammverzeichnis: ', project_dir]);

    % --- Lade die standardisierte Parameter-JSON ---
    try
        json_filepath = fullfile(project_dir, 'simulation_config.json');
        json_text = fileread(json_filepath);
        params = jsondecode(json_text);
        disp('Konfiguration erfolgreich geladen.');
    catch ME
        fprintf('FEHLER: Konnte simulation_config.json nicht lesen.\n');
        rethrow(ME);
    end

    % --- Starte die FEMM-Simulation ---
    openfemm;

    try
        % Parameter entpacken
        spitzenstrom = params.spitzenstrom;
        abstand = params.abstand;
        leiter_hoehe = params.leiter_hoehe;
        leiter_breite = params.leiter_breite;
        wandler_luftspalt = params.wandler_luftspalt;
        wandler_dicke = params.wandler_dicke;
        wandler_material = params.wandler_material;
        problem_tiefe = params.problem_tiefe;

        I_prim_all = [spitzenstrom * cosd(0); spitzenstrom * cosd(-120); spitzenstrom * cosd(+120)];

        newdocument(0);
        mi_probdef(0, 'millimeters', 'planar', 1e-8, problem_tiefe, 30);

        % Materialien und Stromkreise
        mi_getmaterial('Air');
        mi_getmaterial('Copper');
        mi_getmaterial(wandler_material);
        mi_addcircprop('Strom_L1', I_prim_all(1), 1);
        mi_addcircprop('Strom_L2', I_prim_all(2), 1);
        mi_addcircprop('Strom_L3', I_prim_all(3), 1);

        % Geometrie für das komplette Drei-Phasen-System
        y_pos = -leiter_hoehe / 2;
        x_pos = [-abstand, 0, abstand];
        stromkreise = {'Strom_L1', 'Strom_L2', 'Strom_L3'};

        for i = 1:3
            x_center = x_pos(i);
            % Leiter
            mi_drawrectangle(x_center - leiter_breite / 2, y_pos, x_center + leiter_breite / 2, y_pos + leiter_hoehe);
            mi_addblocklabel(x_center, y_pos + leiter_hoehe / 2);
            mi_selectlabel(x_center, y_pos + leiter_hoehe / 2);
            mi_setblockprop('Copper', 1, 0, stromkreise{i}, 0, 0, 1);
            mi_clearselected();

            % Wandler
            k_in_x1 = x_center - leiter_breite / 2 - wandler_luftspalt; k_in_y1 = y_pos - wandler_luftspalt;
            k_in_x2 = x_center + leiter_breite / 2 + wandler_luftspalt; k_in_y2 = y_pos + leiter_hoehe + wandler_luftspalt;
            mi_drawrectangle(k_in_x1 - wandler_dicke, k_in_y1 - wandler_dicke, k_in_x2 + wandler_dicke, k_in_y2 + wandler_dicke);
            mi_drawrectangle(k_in_x1, k_in_y1, k_in_x2, k_in_y2);

            % KORREKTUR: Fehlende Material-Labels hinzufügen
            labelX_kern = x_center + leiter_breite / 2 + wandler_luftspalt + wandler_dicke / 2;
            mi_addblocklabel(labelX_kern, y_pos + leiter_hoehe / 2);
            mi_selectlabel(labelX_kern, y_pos + leiter_hoehe / 2);
            mi_setblockprop(wandler_material, 1, 0, '<None>', 0, 0, 0);
            mi_clearselected();

            % KORREKTUR: Label für die Luft im Wandler-Fenster
            mi_addblocklabel(x_center, y_pos + leiter_hoehe + wandler_luftspalt / 2);
            mi_selectlabel(x_center, y_pos + leiter_hoehe + wandler_luftspalt / 2);
            mi_setblockprop('Air', 1, 0, '<None>', 0, 0, 0);
            mi_clearselected();
        end

        % KORREKTUR: Label für die umgebende Luft
        mi_addblocklabel(0, 250);
        mi_selectlabel(0, 250);
        mi_setblockprop('Air', 1, 0, '<None>', 0, 0, 0);
        mi_clearselected();

        % Randbedingung und Analyse
        mi_makeABC();
        fem_path = fullfile(project_dir, 'temp_modell.fem');
        mi_saveas(fem_path);
        mi_analyze(1);
        mi_loadsolution();

        disp('Analyse erfolgreich.');

    catch ME
        closefemm;
        fprintf('FEHLER während der FEMM-Analyse.\n');
        rethrow(ME);
    end

    closefemm;
    fprintf('\nSkript erfolgreich beendet.\n');
    exit(0);
end
