% main.m - Finale Version
% Hauptskript zur Steuerung der FEMM-Simulation basierend auf Positions-Sweeps.

clear variables; close all; clc;
addpath('C:\femm42\mfiles');
addpath('src');

% --- 1. Konfiguration laden ---
fprintf('Lade Konfigurationsdateien...\n');
library = jsondecode(fileread('library.json'));
runData = jsondecode(fileread('simulation_run.json'));
simConfig = runData;
scenarioParams = runData.scenarioParams;
params = simConfig.scenarioParams;

% --- 2. Ergebnis-Verzeichnis einrichten ---
currentTime = datetime('now');
dateStr = datestr(currentTime, 'yyyymmdd');
timeStr = datestr(currentTime, 'HHMMSS');
simulationType = 'position_sweep';

resultsPath = fullfile('res', dateStr, [timeStr, '_', simulationType]);
femmFilesPath = fullfile(resultsPath, 'femm_files');
if ~exist(femmFilesPath, 'dir'), mkdir(femmFilesPath); end
copyfile('simulation_run.json', fullfile(resultsPath, 'simulation_run.json'));
params.femmFilesPath = femmFilesPath;

fprintf('--- Starte Simulation: %s ---\n', simulationType);
fprintf('Ergebnisse werden gespeichert in: %s\n', resultsPath);

% --- 3. Master-Ergebnistabelle & Parallel-Pool ---
masterResultsTable = table();
tic;

if isempty(gcp('nocreate'))
    parpool('local');
end

try
    % --- 4. Haupt-Simulationslogik ---
    phaseStartNum = str2double(scenarioParams.phaseSweep.start);
    phaseEndNum = str2double(scenarioParams.phaseSweep.end);
    phaseStepNum = str2double(scenarioParams.phaseSweep.step);
    phaseAngleVector = phaseStartNum:phaseStepNum:phaseEndNum;

    fprintf('Starte Position-Sweep...\n');
    position_steps = runData.simulation_meta.bewegungspfade_alle_leiter.schritte_details;
    numPositionSteps = length(position_steps);

    if numPositionSteps == 0
        error('Keine Positionsschritte in "bewegungspfade_alle_leiter" gefunden.');
    end

    % Lese die Daten des Simulationsraums
    simRaum = simConfig.simulation_meta.simulationsraum;

    for i = 1:numPositionSteps
        fprintf('\n>> Positionsschritt %d/%d:\n', i, numPositionSteps);
        stepConfig = simConfig;
        current_positions_step = position_steps(i);

        for j = 1:length(stepConfig.assemblies)
            phaseName = stepConfig.assemblies(j).phaseName;

            if isfield(current_positions_step, phaseName)
                currentPos = current_positions_step.(phaseName);
                stepConfig.assemblies(j).position = currentPos;
                fprintf('   Baugruppe "%s" an Position (X: %.2f, Y: %.2f) mm\n', ...
                    stepConfig.assemblies(j).name, currentPos.x, currentPos.y);
            end

        end

        posX_L1 = current_positions_step.L1.x; posY_L1 = current_positions_step.L1.y;
        posX_L2 = current_positions_step.L2.x; posY_L2 = current_positions_step.L2.y;
        posX_L3 = current_positions_step.L3.x; posY_L3 = current_positions_step.L3.y;

        scenarioVarNames = {'pos_x_L1_mm', 'pos_y_L1_mm', 'pos_x_L2_mm', 'pos_y_L2_mm', 'pos_x_L3_mm', 'pos_y_L3_mm'};
        scenarioVarValues = [posX_L1, posY_L1, posX_L2, posY_L2, posX_L3, posY_L3];

        % Übergib 'simRaum' an die Funktion
        stepResults = runPhaseSweep(stepConfig, library, params, phaseAngleVector, scenarioVarNames, scenarioVarValues, simRaum);

        masterResultsTable = [masterResultsTable; stepResults]; %#ok<AGROW>
    end

    totalDurationSec = toc;
    fprintf('\n--- Simulationsserie beendet. Gesamtzeit: %.2f Sekunden ---\n', totalDurationSec);

catch ME
    rethrow(ME);
end

% --- 6. Ergebnisse speichern ---
if ~isempty(masterResultsTable)
    resultsCsvFile = fullfile(resultsPath, [timeStr, '_', simulationType, '_summary.csv']);
    writetable(masterResultsTable, resultsCsvFile);
    fprintf('Alle Ergebnisse gespeichert in "%s".\n', resultsCsvFile);
else
    fprintf('Warnung: Keine Ergebnisse generiert.\n');
end

disp('--- Simulations-Workflow erfolgreich abgeschlossen ---');
