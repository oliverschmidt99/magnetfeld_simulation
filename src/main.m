% =========================================================================
% HAUPTSKRIPT ZUR STEUERUNG DER FEMM-SIMULATION
% =========================================================================
% Dieses Skript orchestriert den gesamten Simulationsablauf.
% Finale Korrektur: Korrektes Indexing für Struct- vs. Cell-Arrays.
% =========================================================================

clear variables;
clc;

disp('--- Starte Simulations-Workflow ---');

addpath('c:/femm42/mfiles');

% --- 1. Konfiguration laden ---
config_path = '../simulation_config.json';
disp(['1/5: Lade Konfiguration von: ', config_path]);

try
    json_text = fileread(config_path);
    config = jsondecode(json_text);
    disp(['Projekt "', config.projectName, '" wurde geladen.']);
catch ME
    error('Fehler beim Laden der Konfiguration: %s', ME.message);
    return; %#ok<UNRCH>
end

% --- 2. FEMM-Modell aufbauen ---
disp('2/5: Baue FEMM-Modell auf...');
openfemm(1);
newdocument(0);

units_lowercase = lower(config.problemDefinition.lengthUnits);
type_lowercase = lower(config.problemDefinition.type);
mi_probdef(config.problemDefinition.frequency, units_lowercase, ...
    type_lowercase, config.problemDefinition.solverPrecision, ...
    config.problemDefinition.depth, config.problemDefinition.minAngle);

% Materialien hinzufügen (ist ein Cell Array, {} ist korrekt)
for i = 1:length(config.materials)
    mat = config.materials{i};
    mi_addmaterial(mat.name, mat.mu_x, mat.mu_y);
end

% Stromkreise (Circuits) hinzufügen (ist ein Struct Array, () ist korrekt)
for i = 1:length(config.circuits)
    % *** KORREKTUR HIER: () verwenden, da circuits konsistent ist ***
    circ = config.circuits(i);
    mi_addcircprop(circ.name, circ.current, 1);
end

% Geometrie zeichnen (ist ein Cell Array, {} ist korrekt)
for i = 1:length(config.geometry.components)
    comp = config.geometry.components{i};

    assigned_circuit_name = '<None>';
    % Auch hier muss der Zugriff auf das circuits-Array mit () erfolgen
    for j = 1:length(config.circuits)
        circ = config.circuits(j);

        if circ.assign_to_group == comp.group
            assigned_circuit_name = circ.name;
            break;
        end

    end

    if strcmp(comp.type, 'leiter') && strcmp(comp.shape, 'circle')
        mi_addnode(comp.position(1), comp.position(2));
        mi_selectnode(comp.position(1), comp.position(2));
        mi_setgroup(comp.group);
        mi_clearselected();
        mi_addblocklabel(comp.position(1), comp.position(2));
        mi_selectlabel(comp.position(1), comp.position(2));
        mi_setblockprop(comp.material, 1, 0, assigned_circuit_name, 0, comp.group, 0);
        mi_clearselected();
    end

    if strcmp(comp.type, 'wandler') && strcmp(comp.shape, 'ring')
        mi_addnode(comp.position(1) + comp.outer_radius, comp.position(2));
        mi_addnode(comp.position(1) - comp.outer_radius, comp.position(2));
        mi_addarc(comp.position(1) + comp.outer_radius, comp.position(2), comp.position(1) - comp.outer_radius, comp.position(2), 180, 5);
        mi_addarc(comp.position(1) - comp.outer_radius, comp.position(2), comp.position(1) + comp.outer_radius, comp.position(2), 180, 5);
        mi_addnode(comp.position(1) + comp.inner_radius, comp.position(2));
        mi_addnode(comp.position(1) - comp.inner_radius, comp.position(2));
        mi_addarc(comp.position(1) + comp.inner_radius, comp.position(2), comp.position(1) - comp.inner_radius, comp.position(2), 180, 5);
        mi_addarc(comp.position(1) - comp.inner_radius, comp.position(2), comp.position(1) + comp.outer_radius, comp.position(2), 180, 5);
        label_pos_x = comp.position(1) + (comp.inner_radius + comp.outer_radius) / 2;
        mi_addblocklabel(label_pos_x, comp.position(2));
        mi_selectlabel(label_pos_x, comp.position(2));
        mi_setblockprop(comp.material, 1, 0, '<None>', 0, comp.group, 0);
        mi_clearselected();
    end

end

% Randbedingung
bound = config.geometry.boundary;

if strcmp(bound.shape, 'circle')
    mi_addboundprop('Zero B', 0, 0, 0, 0, 0, 0, 0, 0, 0);
    mi_makeABC(7, bound.radius, 0, 0, 0);
end

% --- 3. Analyse durchführen ---
fem_filename = '../temp_modell.fem';
disp(['3/5: Speichere und analysiere Modell: ', fem_filename]);
mi_saveas(fem_filename);
mi_analyze(1);
mi_loadsolution();

% --- 4. Berechnungen durchführen ---
disp('4/5: Rufe Berechnungs-Skript auf...');
results = calculate_results(config);
disp('Berechnungen abgeschlossen.');
disp(results);

% --- 5. Ergebnisse visualisieren ---
disp('5/5: Rufe Visualisierungs-Skript auf...');
plot_results(config, results);
disp('Visualisierung gespeichert.');

% Aufräumen
closefemm;
disp('--- Simulations-Workflow erfolgreich beendet ---');
