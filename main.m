% main.m - FINALE VERSION
clear variables; close all; clc;
addpath('C:\femm42\mfiles');
addpath('src');

% --- 1. Konfiguration und Bibliothek laden ---
library = jsondecode(fileread('library.json'));
runData = jsondecode(fileread('simulation_run.json'));
simConfig = runData; % simConfig ist jetzt die gesamte JSON-Struktur
params = simConfig.scenarioParams; % Allgemeine Parameter

% --- 2. Ergebnis-Verzeichnis einrichten ---
currentTime = datetime('now');
dateStr = datestr(currentTime, 'yyyymmdd');
timeStr = datestr(currentTime, 'HHMMSS');
simulationType = 'position_sweep'; % Typ der Simulation
resultsPath = fullfile('res', dateStr, [timeStr, '_', simulationType]);
femmFilesPath = fullfile(resultsPath, 'femm_files');
if ~exist(femmFilesPath, 'dir'), mkdir(femmFilesPath); end
copyfile('simulation_run.json', fullfile(resultsPath, 'simulation_run.json')); % Kopiert die genutzte Konfiguration
params.femmFilesPath = femmFilesPath;

fprintf('--- Starte Simulation: %s ---\n', simulationType);
masterResultsTable = table();
tic; % Startet die Zeitmessung

% --- NEU: Parallelen Pool starten (optional, beschleunigt die Berechnung) ---
if isempty(gcp('nocreate')), parpool('local'); end

try
    % --- 3. Schleife über alle Positionsschritte ---
    % Liest die Phasenwinkel und Positionsschritte direkt aus der JSON-Struktur
    phaseAngleVector = str2double(params.phaseSweep.start):str2double(params.phaseSweep.step):str2double(params.phaseSweep.end);
    position_steps = runData.simulation_meta.bewegungspfade_alle_leiter.schritte_details;
    simRaum = simConfig.simulation_meta.simulationsraum;

    for i = 1:length(position_steps)
        fprintf('\n>> Positionsschritt %d/%d:\n', i, length(position_steps));

        % Erstellt eine spezifische Konfiguration für diesen einen Schritt
        stepConfig = simConfig;
        current_positions_step = position_steps(i);

        % --- WICHTIG: Setzt die Position für jede Baugruppe dynamisch ---
        for j = 1:length(stepConfig.assemblies)
            phaseName = stepConfig.assemblies(j).phaseName;

            if isfield(current_positions_step, phaseName)
                % Das '.position'-Feld wird zur Laufzeit hinzugefügt/überschrieben
                stepConfig.assemblies(j).position = current_positions_step.(phaseName);
            end

        end

        % Definiert die Namen und Werte der Variablen für diesen Szenario-Schritt
        scenarioVarNames = {'pos_x_L1_mm', 'pos_y_L1_mm', 'pos_x_L2_mm', 'pos_y_L2_mm', 'pos_x_L3_mm', 'pos_y_L3_mm'};
        scenarioVarValues = [current_positions_step.L1.x, current_positions_step.L1.y, current_positions_step.L2.x, current_positions_step.L2.y, current_positions_step.L3.x, current_positions_step.L3.y];

        % Führt die Simulation für alle Phasenwinkel bei dieser festen Position durch
        stepResults = runPhaseSweep(stepConfig, library, params, phaseAngleVector, scenarioVarNames, scenarioVarValues, simRaum);

        % Fügt die Ergebnisse dieses Schritts zur Master-Tabelle hinzu
        masterResultsTable = [masterResultsTable; stepResults];
    end

    fprintf('\n--- Simulationsserie beendet. Gesamtzeit: %.2f Sekunden ---\n', toc);

catch ME
    rethrow(ME);
end

% --- 4. Ergebnisse speichern ---
if ~isempty(masterResultsTable)
    resultsCsvFile = fullfile(resultsPath, [timeStr, '_', simulationType, '_summary.csv']);
    writetable(masterResultsTable, resultsCsvFile);
    fprintf('Alle Ergebnisse gespeichert in "%s".\n', resultsCsvFile);
end

disp('--- Simulations-Workflow erfolgreich abgeschlossen ---');
