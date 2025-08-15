% =========================================================================
% run_wandler_analyse.m - Baut das FEMM-Modell auf und führt die Analyse aus
% (KORRIGIERTE VERSION MIT ALLEN MATERIAL-LABELS)
% =========================================================================
function run_wandler_analyse(params)
    % --- 1. Parameter vorbereiten ---
    I_prim_all = [
                  params.spitzenstrom_prim_A * cosd(params.phasenWinkel_deg + 0);
                  params.spitzenstrom_prim_A * cosd(params.phasenWinkel_deg - 120);
                  params.spitzenstrom_prim_A * cosd(params.phasenWinkel_deg + 120)
                  ];
    x_pos = [- (params.leiter_breite + params.abstand), 0, (params.leiter_breite + params.abstand)];
    y_pos = 0;

    % --- 2. FEMM Modell aufbauen ---
    newdocument(0);
    mi_probdef(params.frequenz_hz, 'millimeters', 'planar', 1e-8, params.problem_tiefe_m * 1000, 30);

    % Materialien definieren
    mi_getmaterial('Air');
    mi_getmaterial('Copper');
    mi_addmaterial(params.wandler_material, params.mu_r_wandler, params.mu_r_wandler);

    % Stromkreise definieren
    mi_addcircprop('I_L1', I_prim_all(1), 1);
    mi_addcircprop('I_L2', I_prim_all(2), 1);
    mi_addcircprop('I_L3', I_prim_all(3), 1);

    % Geometrie erstellen
    for i = 1:3
        % Leiter
        mi_drawrectangle(x_pos(i), y_pos, x_pos(i) + params.leiter_breite, y_pos + params.leiter_hoehe);
        % Wandler
        mi_drawrectangle(x_pos(i) - params.wandler_luftspalt, y_pos - params.wandler_luftspalt, ...
            x_pos(i) + params.leiter_breite + params.wandler_luftspalt, y_pos + params.leiter_hoehe + params.wandler_luftspalt);
    end

    % --- KORREKTUR: Alle Block Labels setzen ---

    % 1. Labels für die Leiter (war bereits korrekt)
    mi_addblocklabel(x_pos(1) + params.leiter_breite / 2, y_pos + params.leiter_hoehe / 2);
    mi_selectlabel(x_pos(1) + params.leiter_breite / 2, y_pos + params.leiter_hoehe / 2);
    mi_setblockprop('Copper', 1, 0, 'I_L1', 0, 1, 0); mi_clearselected();

    mi_addblocklabel(x_pos(2) + params.leiter_breite / 2, y_pos + params.leiter_hoehe / 2);
    mi_selectlabel(x_pos(2) + params.leiter_breite / 2, y_pos + params.leiter_hoehe / 2);
    mi_setblockprop('Copper', 1, 0, 'I_L2', 0, 2, 0); mi_clearselected();

    mi_addblocklabel(x_pos(3) + params.leiter_breite / 2, y_pos + params.leiter_hoehe / 2);
    mi_selectlabel(x_pos(3) + params.leiter_breite / 2, y_pos + params.leiter_hoehe / 2);
    mi_setblockprop('Copper', 1, 0, 'I_L3', 0, 3, 0); mi_clearselected();

    % 2. NEU: Labels für die Wandlerkerne
    % Wir platzieren das Label in der Mitte des oberen Kernteils
    mi_addblocklabel(x_pos(1) + params.leiter_breite / 2, y_pos + params.leiter_hoehe + params.wandler_luftspalt / 2);
    mi_selectlabel(x_pos(1) + params.leiter_breite / 2, y_pos + params.leiter_hoehe + params.wandler_luftspalt / 2);
    mi_setblockprop(params.wandler_material, 1, 0, '<None>', 0, 4, 0); mi_clearselected();

    mi_addblocklabel(x_pos(2) + params.leiter_breite / 2, y_pos + params.leiter_hoehe + params.wandler_luftspalt / 2);
    mi_selectlabel(x_pos(2) + params.leiter_breite / 2, y_pos + params.leiter_hoehe + params.wandler_luftspalt / 2);
    mi_setblockprop(params.wandler_material, 1, 0, '<None>', 0, 5, 0); mi_clearselected();

    mi_addblocklabel(x_pos(3) + params.leiter_breite / 2, y_pos + params.leiter_hoehe + params.wandler_luftspalt / 2);
    mi_selectlabel(x_pos(3) + params.leiter_breite / 2, y_pos + params.leiter_hoehe + params.wandler_luftspalt / 2);
    mi_setblockprop(params.wandler_material, 1, 0, '<None>', 0, 6, 0); mi_clearselected();

    % 3. NEU: Label für die umgebende Luft
    % Wir platzieren das Label weit außerhalb der Bauteile, aber innerhalb der Randbedingung.
    mi_addblocklabel(0, 200);
    mi_selectlabel(0, 200);
    mi_setblockprop('Air', 1, 0, '<None>', 0, 0, 0); mi_clearselected();

    % Randbedingung
    mi_makeABC(7, 500, 0, 0, 0);

    % --- 3. Analyse durchführen ---
    mi_saveas('temp_modell.fem');
    mi_analyze(1);
end
