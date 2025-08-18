clear variables; close all; clc;
addpath('C:\femm42\mfiles'); addpath('src');

% --- 1. Load Configuration ---
library = jsondecode(fileread('library.json'));
simConfig = jsondecode(fileread('simulation.json'));
params = simConfig.simulationParams;

% --- 2. Setup Results Directory ---
simulationName = 'Standard_N_Phase_Core';
dateStr = datestr(now, 'yyyymmdd');
timeStr = datestr(now, 'HHMMSS');
resultsPath = fullfile('res', dateStr, [timeStr, '_', simulationName]);
femmFilesPath = fullfile(resultsPath, 'femm_files');

if ~exist(femmFilesPath, 'dir')
    mkdir(femmFilesPath);
    fprintf('Results folder created: %s\n', femmFilesPath);
end

params.resultsPath = resultsPath;
params.femmFilesPath = femmFilesPath;
params.baseFilename = [timeStr, '_', simulationName];

% --- 3. Create Current Objects ---
currents = {};

for i = 1:length(simConfig.electricalSystem)
    phase = simConfig.electricalSystem(i);
    currents{end + 1} = Current(phase.name, params.peakCurrentA, phase.phaseShiftDeg);
end

params.currents = currents;

% --- 4. Create Component Assemblies ---
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

% --- 5. Run Parametric Analysis ---
phaseAngleVector = 0:10:180;
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
    h = floor(totalDurationSec / 3600);
    m = floor(mod(totalDurationSec, 3600) / 60);
    s = floor(mod(totalDurationSec, 60));
    fprintf('\nTotal simulation time: %d h %d min %d sec\n', h, m, s);
    closefemm;
catch ME
    closefemm;
    rethrow(ME);
end

% --- 6. Save and Visualize Results ---
resultsCsvFile = fullfile(resultsPath, [params.baseFilename, '_summary.csv']);
writetable(masterResultsTable, resultsCsvFile);
fprintf('All results saved to "%s".\n', resultsCsvFile);

plotResults(resultsCsvFile, resultsPath, params.baseFilename);
disp('--- Simulation workflow completed successfully ---');
