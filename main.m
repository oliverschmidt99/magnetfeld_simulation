clear variables; close all; clc;
addpath('C:\femm42\mfiles'); addpath('src');

% --- 1. Load Configuration ---
library = jsondecode(fileread('library.json'));
runData = jsondecode(fileread('simulation_run.json'));
simConfig = runData;
scenarioParams = runData.scenarioParams;
params = simConfig.simulationParams;

% --- 2. Setup Results Directory ---
currentTime = datetime('now');
dateStr = datestr(currentTime, 'yyyymmdd');
timeStr = datestr(currentTime, 'HHMMSS');
resultsPath = fullfile('res', dateStr, [timeStr, '_', scenarioParams.type]);
femmFilesPath = fullfile(resultsPath, 'femm_files');
if ~exist(femmFilesPath, 'dir'), mkdir(femmFilesPath); end
copyfile('simulation_run.json', fullfile(resultsPath, 'simulation_run.json'));
params.femmFilesPath = femmFilesPath;

fprintf('--- Starting Simulation: %s ---\n', scenarioParams.type);
fprintf('Results will be saved to: %s\n', resultsPath);

% --- 3. Master Result Table ---
masterResultsTable = table();
tic;

% --- 4. Open FEMM ---
openfemm(1);

try
    % --- 5. Main Simulation Logic ---
    phaseAngleVector = scenarioParams.phaseStart:scenarioParams.phaseStepSize:scenarioParams.phaseEnd;

    switch scenarioParams.type
        case 'none'
            fprintf('Running simple phase sweep...\n');
            masterResultsTable = runPhaseSweep(simConfig, library, params, phaseAngleVector, '', []);

        case 'current'
            fprintf('Running current variation...\n');
            currentVector = scenarioParams.start:scenarioParams.stepSize:scenarioParams.end;

            for i = 1:length(currentVector)
                current = currentVector(i);
                fprintf('\n>> Current Step %d/%d: %.2f A\n', i, length(currentVector), current);

                stepConfig = simConfig;

                for j = 1:length(stepConfig.electricalSystem)
                    stepConfig.electricalSystem(j).peakCurrentA = current;
                end

                stepResults = runPhaseSweep(stepConfig, library, params, phaseAngleVector, {'current_A'}, current);
                masterResultsTable = [masterResultsTable; stepResults]; %#ok<AGROW>
            end

        case {'distance', 'shielding'}

            if strcmp(scenarioParams.type, 'distance')
                fprintf('Running distance variation...\n');
            else
                fprintf('Running shielding variation...\n');
            end

            startX = scenarioParams.x_start;
            startY = scenarioParams.y_start;
            endX = scenarioParams.x_end;
            endY = scenarioParams.y_end;
            totalDist = sqrt((endX - startX) ^ 2 + (endY - startY) ^ 2);
            numSteps = floor(totalDist / scenarioParams.stepSize) + 1;

            xVector = linspace(startX, endX, numSteps);
            yVector = linspace(startY, endY, numSteps);

            for i = 1:numSteps
                posX = xVector(i);
                posY = yVector(i);
                fprintf('\n>> Position Step %d/%d: (%.2f, %.2f) mm\n', i, numSteps, posX, posY);

                stepConfig = simConfig;

                if strcmp(scenarioParams.type, 'distance')
                    idx = scenarioParams.assemblyIndex + 1;
                    stepConfig.assemblies(idx).position.x = posX;
                    stepConfig.assemblies(idx).position.y = posY;
                else % shielding
                    sheetName = scenarioParams.sheetName;

                    compNames = cellfun(@(x) x.name, stepConfig.standAloneComponents, 'UniformOutput', false);
                    sheetIdx = find(strcmp(compNames, sheetName));

                    if isempty(sheetIdx)
                        newSheet = struct('name', sheetName, 'position', struct('x', posX, 'y', posY));

                        if isempty(stepConfig.standAloneComponents)
                            stepConfig.standAloneComponents = newSheet;
                        else
                            stepConfig.standAloneComponents(end + 1) = newSheet;
                        end

                    else
                        stepConfig.standAloneComponents(sheetIdx).position.x = posX;
                        stepConfig.standAloneComponents(sheetIdx).position.y = posY;
                    end

                end

                stepResults = runPhaseSweep(stepConfig, library, params, phaseAngleVector, {'position_x_mm', 'position_y_mm'}, [posX, posY]);
                masterResultsTable = [masterResultsTable; stepResults]; %#ok<AGROW>
            end

    end

    % --- 6. Cleanup and Save ---
    totalDurationSec = toc;
    fprintf('\n--- Simulation series finished. Total time: %.2f seconds ---\n', totalDurationSec);
    closefemm;
catch ME
    closefemm;
    rethrow(ME);
end

% --- 7. Save and Visualize Results ---
if ~isempty(masterResultsTable)
    resultsCsvFile = fullfile(resultsPath, [timeStr, '_', scenarioParams.type, '_summary.csv']);
    writetable(masterResultsTable, resultsCsvFile);
    fprintf('All results saved to "%s".\n', resultsCsvFile);
    plotResults(resultsCsvFile, resultsPath, [timeStr, '_', scenarioParams.type]);
else
    fprintf('Warning: No results were generated.\n');
end

disp('--- Simulation workflow completed successfully ---');
