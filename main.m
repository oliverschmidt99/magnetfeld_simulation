% =========================================================================
% Main script using a fully dynamic, data-driven approach.
% =========================================================================
clear variables; close all; clc;
addpath('C:\femm42\mfiles'); addpath('src');

%% 1. Load Full Configuration from JSON
config = jsondecode(fileread('geometry.json'));
params = config.simulationParams;

%% 2. Setup Results Directory
% ... (Dieser Abschnitt ist bereits dynamisch) ...
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

%% 3. Create Current Objects Dynamically
currents = {};

for i = 1:length(config.electricalSystem)
    phase = config.electricalSystem(i);
    currents{end + 1} = Current(phase.name, params.peakCurrentA, phase.phaseShiftDeg);
end

params.currents = currents;

%% 4. Create Component Assemblies Dynamically
assemblies = {};
% Die Schleife läuft jetzt über die Anzahl der Baugruppen in der JSON
for i = 1:length(config.assemblies)
    assemblyConfig = config.assemblies(i);
    group = ComponentGroup(assemblyConfig.name, assemblyConfig.position.x, assemblyConfig.position.y);

    for j = 1:length(assemblyConfig.components)
        cfg = assemblyConfig.components(j);
        geo = GeoObject.createRectangle(cfg.geoParams.width, cfg.geoParams.height);

        circuitName = '';

        if strcmp(cfg.circuit, 'L')
            circuitName = currents{i}.name;
        end

        groupNum = (i - 1) * 10 + cfg.groupNum;
        comp = Component(cfg.name, 0, 0, geo, cfg.material, circuitName, groupNum);
        group = group.addComponent(comp);
    end

    assemblies{end + 1} = group;
end

params.assemblies = assemblies;

%% 5. Run Parametric Analysis
% ... (Dieser Abschnitt ist bereits dynamisch) ...
phaseAngleVector = 0:45:90;
openfemm;

try
    masterResultsTable = table();
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
    closefemm;
catch ME
    closefemm;
    rethrow(ME);
end

%% 6. Save and Visualize Results
% ... (Dieser Abschnitt ist bereits dynamisch) ...
resultsCsvFile = fullfile(resultsPath, [baseFilename, '_summary.csv']);
writetable(masterResultsTable, resultsCsvFile);
fprintf('All results have been saved to "%s".\n', resultsCsvFile);
plotResults(resultsCsvFile, resultsPath, baseFilename);
disp('--- Simulation workflow completed successfully ---');
