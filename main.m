clear variables; close all; clc;
addpath('C:\femm42\mfiles'); addpath('src');

% --- 1. Load Configuration ---
library = jsondecode(fileread('library.json'));
runData = jsondecode(fileread('simulation_run.json'));
simConfig = runData;
scenarioParams = runData.scenarioParams;
params = simConfig.scenarioParams;

% --- 2. Setup Results Directory ---
currentTime = datetime('now');
dateStr = datestr(currentTime, 'yyyymmdd');
timeStr = datestr(currentTime, 'HHMMSS');
simulationType = scenarioParams.type;

if strcmp(simulationType, 'none') && isfield(simConfig, 'assemblies') && ~isempty(simConfig.assemblies)
    simulationType = 'position_sweep';
end

resultsPath = fullfile('res', dateStr, [timeStr, '_', simulationType]);
femmFilesPath = fullfile(resultsPath, 'femm_files');
if ~exist(femmFilesPath, 'dir'), mkdir(femmFilesPath); end
copyfile('simulation_run.json', fullfile(resultsPath, 'simulation_run.json'));
params.femmFilesPath = femmFilesPath;

fprintf('--- Starting Simulation: %s ---\n', simulationType);
fprintf('Results will be saved to: %s\n', resultsPath);

% --- 3. Master Result Table & Parallel Pool ---
masterResultsTable = table();
tic;

if isempty(gcp('nocreate'))
    parpool('local');
end

try
    % --- 5. Main Simulation Logic ---
    phaseStartNum = str2double(scenarioParams.phaseSweep.start);
    phaseEndNum = str2double(scenarioParams.phaseSweep.end);
    phaseStepNum = str2double(scenarioParams.phaseSweep.step);
    phaseAngleVector = phaseStartNum:phaseStepNum:phaseEndNum;

    switch scenarioParams.type
        case 'none'
            fprintf('Running position sweep based on calculated positions...\n');

            if ~isfield(simConfig, 'assemblies') || isempty(simConfig.assemblies)
                error('No assemblies found in simulation_run.json for position sweep.');
            end

            numPositionSteps = length(simConfig.assemblies(1).calculated_positions);

            for i = 1:numPositionSteps
                fprintf('\n>> Position Step %d/%d:\n', i, numPositionSteps);

                stepConfig = simConfig; % Start with the base config for each step

                % Update the position of each assembly for the current step
                for j = 1:length(stepConfig.assemblies)
                    currentPos = stepConfig.assemblies(j).calculated_positions(i);
                    % This 'position' field will now be read by initializeComponents
                    stepConfig.assemblies(j).position = currentPos;
                    fprintf('   Assembly "%s" at (%.2f, %.2f) mm\n', stepConfig.assemblies(j).name, currentPos.x, currentPos.y);
                end

                % Define the variables that change in this step for logging
                % We can take the position of the first assembly as representative for the step
                posX = stepConfig.assemblies(1).position.x;
                posY = stepConfig.assemblies(1).position.y;

                % Run the full phase sweep for the current configuration
                stepResults = runPhaseSweep(stepConfig, library, params, phaseAngleVector, {'position_x_mm', 'position_y_mm'}, [posX, posY]);
                masterResultsTable = [masterResultsTable; stepResults]; %#ok<AGROW>
            end

            % Other cases can be re-enabled here when needed
        case 'current'
            fprintf('Error: "current" scenario not yet adapted for this script version.\n');

        case {'distance', 'shielding'}
            fprintf('Error: "distance/shielding" scenario not yet adapted for this script version.\n');

    end

    % --- 6. Cleanup ---
    totalDurationSec = toc;
    fprintf('\n--- Simulation series finished. Total time: %.2f seconds ---\n', totalDurationSec);

catch ME
    rethrow(ME);
end

% --- 7. Save and Visualize Results ---
if ~isempty(masterResultsTable)
    resultsCsvFile = fullfile(resultsPath, [timeStr, '_', simulationType, '_summary.csv']);
    writetable(masterResultsTable, resultsCsvFile);
    fprintf('All results saved to "%s".\n', resultsCsvFile);
    plotResults(resultsCsvFile, resultsPath, [timeStr, '_', simulationType]);
else
    fprintf('Warning: No results were generated. Plotting skipped.\n');
end

% --- 8. Post-Processing: Calculate RMS Values ---
if ~isempty(masterResultsTable) && width(masterResultsTable) > 1
    fprintf('Calculating RMS values...\n');

    metricsToProcess = {'iSecAbs_A', 'bAvgMagnitude_T', 'hAvgMagnitude_A_m', 'storedEnergy_J'};
    allVars = masterResultsTable.Properties.VariableNames;
    nonMetricVars = {'phaseAngle', 'conductor', 'iPrimA', 'iSecReal_A', 'iSecImag_A', 'mu_r_real', 'mu_r_imag'};
    scenarioVars = allVars(~ismember(allVars, [metricsToProcess, nonMetricVars]));
    groupingVars = ['conductor', scenarioVars];

    rmsResults = table();

    for i = 1:length(metricsToProcess)
        metric = metricsToProcess{i};

        if ismember(metric, allVars)
            tempTable = groupsummary(masterResultsTable, groupingVars, @(x) sqrt(mean(x .^ 2)), metric);

            oldVarName = ['fun1_', metric];
            newVarName = [metric, '_RMS'];

            if ismember(oldVarName, tempTable.Properties.VariableNames)
                tempTable = renamevars(tempTable, oldVarName, newVarName);
            end

            if isempty(rmsResults)
                rmsResults = tempTable;
            else
                rmsResults = outerjoin(rmsResults, tempTable, 'Keys', groupingVars, 'MergeKeys', true);
            end

        end

    end

    if ~isempty(rmsResults)
        rmsCsvFile = fullfile(resultsPath, [timeStr, '_', simulationType, '_summary_rms.csv']);
        writetable(rmsResults, rmsCsvFile);
        fprintf('RMS results saved to "%s".\n', rmsCsvFile);
    end

end

disp('--- Simulation workflow completed successfully ---');
