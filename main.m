% main.m - FINALE VERSION
clear variables; close all; clc;
addpath('C:\femm42\mfiles');
addpath('src');

library = jsondecode(fileread('library.json'));
runData = jsondecode(fileread('simulation_run.json'));
simConfig = runData;
scenarioParams = runData.scenarioParams;
params = simConfig.scenarioParams;

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
masterResultsTable = table();
tic;
if isempty(gcp('nocreate')), parpool('local'); end

try
    phaseAngleVector = str2double(scenarioParams.phaseSweep.start):str2double(scenarioParams.phaseSweep.step):str2double(scenarioParams.phaseSweep.end);
    position_steps = runData.simulation_meta.bewegungspfade_alle_leiter.schritte_details;
    simRaum = simConfig.simulation_meta.simulationsraum;

    for i = 1:length(position_steps)
        fprintf('\n>> Positionsschritt %d/%d:\n', i, length(position_steps));
        stepConfig = simConfig;
        current_positions_step = position_steps(i);

        for j = 1:length(stepConfig.assemblies)
            phaseName = stepConfig.assemblies(j).phaseName;

            if isfield(current_positions_step, phaseName)
                stepConfig.assemblies(j).position = current_positions_step.(phaseName);
            end

        end

        scenarioVarNames = {'pos_x_L1_mm', 'pos_y_L1_mm', 'pos_x_L2_mm', 'pos_y_L2_mm', 'pos_x_L3_mm', 'pos_y_L3_mm'};
        scenarioVarValues = [current_positions_step.L1.x, current_positions_step.L1.y, current_positions_step.L2.x, current_positions_step.L2.y, current_positions_step.L3.x, current_positions_step.L3.y];

        stepResults = runPhaseSweep(stepConfig, library, params, phaseAngleVector, scenarioVarNames, scenarioVarValues, simRaum);
        masterResultsTable = [masterResultsTable; stepResults];
    end

    fprintf('\n--- Simulationsserie beendet. Gesamtzeit: %.2f Sekunden ---\n', toc);
catch ME, rethrow(ME); end

    if ~isempty(masterResultsTable)
        resultsCsvFile = fullfile(resultsPath, [timeStr, '_', simulationType, '_summary.csv']);
        writetable(masterResultsTable, resultsCsvFile);
        fprintf('Alle Ergebnisse gespeichert in "%s".\n', resultsCsvFile);
    end

    disp('--- Simulations-Workflow erfolgreich abgeschlossen ---');
