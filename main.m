% =========================================================================
% Main script using a separate library and simulation setup file.
% =========================================================================
clear variables; close all; clc;
addpath('C:\femm42\mfiles'); addpath('src');

%% 1. Load Library and Simulation Configuration
library = jsondecode(fileread('library.json'));
simConfig = jsondecode(fileread('simulation.json'));
params = simConfig.simulationParams;

%% 2. Setup Results Directory
simulationName = 'Standard_N_Phase_Core';
dateStr = datestr(now, 'yyyymmdd');
timeStr = datestr(now, 'HHMMSS');
resultsPath = fullfile('res', dateStr, [timeStr, '_', simulationName]);
baseFilename = [timeStr, '_', simulationName];
femmFilesPath = fullfile(resultsPath, 'femm_files');

if ~exist(femmFilesPath, 'dir')
    mkdir(femmFilesPath);
    fprintf('Ergebnisordner erstellt: %s\n', femmFilesPath);
end

params.resultsPath = resultsPath;
params.femmFilesPath = femmFilesPath;
params.baseFilename = baseFilename;

%% 3. Create Current Objects
currents = {};

for i = 1:length(simConfig.electricalSystem)
    phase = simConfig.electricalSystem(i);
    currents{end + 1} = Current(phase.name, params.peakCurrentA, phase.phaseShiftDeg);
end

params.currents = currents;

%% 4. Create Component Assemblies
assemblies = {};

for i = 1:length(simConfig.assemblies)
    asmCfg = simConfig.assemblies(i);
    railCfg = library.copperRails(strcmp({library.copperRails.name}, asmCfg.copperRailName));
    transformerCfg = library.transformers(strcmp({library.transformers.name}, asmCfg.transformerName));

    copperRail = CopperRail(railCfg);
    transformer = Transformer(transformerCfg);

    assemblyGroup = ComponentGroup(asmCfg.name, asmCfg.position.x, asmCfg.position.y);
    assemblyGroup = assemblyGroup.addComponent(copperRail);
    assemblyGroup = assemblyGroup.addComponent(transformer);

    assemblies{end + 1} = assemblyGroup;
end

params.assemblies = assemblies;

%% 5. Run Parametric Analysis
phaseAngleVector = 0:45:90;
openfemm;

try
    masterResultsTable = table();
    tic;
    fprintf('Starting simulation series for %d phase angles...\n', length(phaseAngleVector));

    for i = 1:length(phaseAngleVector)
        params.phaseAngleDeg = phaseAngleVector(i);
        fprintf('--> Simulating for phase angle: %d°\n', params.phaseAngleDeg);
        runIdentifier = sprintf('%s_angle%ddeg', params.baseFilename, params.phaseAngleDeg);
        runFemmAnalysis(params, runIdentifier);
        singleRunResults = calculateResults(params);
        masterResultsTable = [masterResultsTable; singleRunResults];
    end

    fprintf('Simulation series finished.\n');
    totalDurationSec = toc;
    hours = floor(totalDurationSec / 3600);
    minutes = floor(mod(totalDurationSec, 3600) / 60);
    seconds = floor(mod(totalDurationSec, 60));
    fprintf('\nGesamte Simulationsdauer: %d h %d min %d sec\n', hours, minutes, seconds);
    closefemm;
catch ME
    closefemm;
    rethrow(ME);
end

%% 6. Save and Visualize Results
resultsCsvFile = fullfile(resultsPath, [baseFilename, '_summary.csv']);
writetable(masterResultsTable, resultsCsvFile);
fprintf('All results have been saved to "%s".\n', resultsCsvFile);
plotResults(resultsCsvFile, resultsPath, baseFilename);
disp('--- Simulation workflow completed successfully ---');
