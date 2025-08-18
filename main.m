% =========================================================================
% Main script to orchestrate the FEMM simulation series.
% =========================================================================
clear variables; close all; clc;

% Add paths to FEMM and local source files
addpath('C:\femm42\mfiles');
addpath('src');

%% 1. Define Simulation Name and Create Results Directory
simulationName = 'Standard_3_Phase_Core'; % Name für diesen Simulationslauf

% Erzeuge Zeitstempel für die Ordnerstruktur
dateStr = datestr(now, 'yyyymmdd');
timeStr = datestr(now, 'HHMMSS');

% Baue den finalen Pfad zusammen
resultsPath = fullfile('res', dateStr, [timeStr, '_', simulationName]);
baseFilename = [timeStr, '_', simulationName];

% Erstelle die Ordnerstruktur, falls sie nicht existiert
if ~exist(resultsPath, 'dir')
    mkdir(resultsPath);
    fprintf('Ergebnisordner erstellt: %s\n', resultsPath);
end

params.resultsPath = resultsPath;
params.baseFilename = baseFilename;

%% 2. Load Parameters, Geometry Template, and Currents
params.frequencyHz = 50;
params.problemDepthM = 0.1;
params.peakCurrentA = 4000;
params.nominalPrimaryA = 4000;
params.nominalSecondaryA = 5;
params.coreMaterial = 'M-36 Steel';
params.coreRelPermeability = 2500;

geoTemplate = jsondecode(fileread('geometry.json'));
assemblySpacing = 220;

%% 3. Create Current Objects
% ... (Dieser Abschnitt bleibt unverändert) ...
currents = {
            Current('L1', params.peakCurrentA, 0), ...
                Current('L2', params.peakCurrentA, -120), ...
                Current('L3', params.peakCurrentA, 120)
            };
params.currents = currents;

%% 4. Create Component Assemblies
% ... (Dieser Abschnitt bleibt unverändert) ...
assemblies = {};
conductorWidth = geoTemplate.components(1).geoParams.width;
positions = [- (conductorWidth + assemblySpacing), 0, (conductorWidth + assemblySpacing)];

for i = 1:3
    group = ComponentGroup(sprintf('Transformer_L%d', i));

    for j = 1:length(geoTemplate.components)
        cfg = geoTemplate.components(j);
        geo = GeoObject.createRectangle(cfg.geoParams.width, cfg.geoParams.height);

        circuitName = '';

        if strcmp(cfg.circuit, 'L')
            circuitName = currents{i}.name;
        end

        groupNum = (i - 1) * 10 + cfg.groupNum;
        comp = Component(cfg.name, 0, 0, geo, cfg.material, circuitName, groupNum);
        group = group.addComponent(comp);
    end

    group = group.translate(positions(i), 0);
    assemblies{end + 1} = group;
end

params.assemblies = assemblies;

%% 5. Run Parametric Analysis
phaseAngleVector = 0:45:90;
openfemm;

try
    masterResultsTable = table();
    fprintf('Starting simulation series for %d phase angles...\n', length(phaseAngleVector));

    for i = 1:length(phaseAngleVector)
        params.phaseAngleDeg = phaseAngleVector(i);
        fprintf('--> Simulating for phase angle: %d°\n', params.phaseAngleDeg);

        runFemmAnalysis(params);
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
resultsCsvFile = fullfile(resultsPath, [baseFilename, '.csv']);
writetable(masterResultsTable, resultsCsvFile);
fprintf('All results have been saved to "%s".\n', resultsCsvFile);

plotResults(resultsCsvFile, resultsPath, baseFilename);
disp('--- Simulation workflow completed successfully ---');
