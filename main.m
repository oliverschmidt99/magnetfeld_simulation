clear variables; close all; clc;
addpath('C:\femm42\mfiles'); addpath('src');

% --- 1. Load Configuration ---
library = jsondecode(fileread('library.json'));
simConfig = jsondecode(fileread('simulation.json'));
params = simConfig.simulationParams;

% --- 2. Setup Results Directory ---
simulationName = 'Standard_N_Phase_Core';
dateStr = datestr(now, 'yyyymmdd'); %#ok<DATST>
timeStr = datestr(now, 'HHMMSS'); %#ok<DATST>
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
    % KORREKTUR: Liest den Spitzenstrom jetzt aus jedem Phasen-Objekt
    currents{end + 1} = Current(phase.name, phase.peakCurrentA, phase.phaseShiftDeg); %#ok<SAGROW>
end

params.currents = currents;

% --- 4. Create Component Assemblies ---
assemblies = {};

for i = 1:length(simConfig.assemblies)
    asmCfg = simConfig.assemblies(i);

    % --- Robuste Suche für Kupferschiene ---
    railIdx = strcmp({library.copperRails.name}, asmCfg.copperRailName);

    if ~any(railIdx)
        error('Kupferschiene "%s" wurde in der library.json nicht gefunden.', asmCfg.copperRailName);
    end

    railCfg = library.copperRails(railIdx);

    % --- Robuste Suche für Wandler ---
    transformerNames = cellfun(@(x) x.name, library.transformers, 'UniformOutput', false);
    transformerIdx = strcmp(transformerNames, asmCfg.transformerName);

    if ~any(transformerIdx)
        error('Wandler "%s" wurde in der library.json nicht gefunden.', asmCfg.transformerName);
    end

    transformerCfg = library.transformers{transformerIdx};

    % Erstelle die Matlab-Objekte
    copperRail = CopperRail(railCfg);
    transformer = Transformer(transformerCfg);

    assemblyGroup = ComponentGroup(asmCfg.name, asmCfg.position.x, asmCfg.position.y);
    assemblyGroup = assemblyGroup.addComponent(copperRail);
    assemblyGroup = assemblyGroup.addComponent(transformer);

    assemblies{end + 1} = assemblyGroup; %#ok<SAGROW>
end

params.assemblies = assemblies;

% --- 5. Eigenständige Komponenten erstellen ---
standAloneComponents = {};

if isfield(simConfig, 'standAloneComponents')

    for i = 1:length(simConfig.standAloneComponents)
        compCfg = simConfig.standAloneComponents(i);

        sheetIdx = strcmp({library.transformerSheets.name}, compCfg.name);

        if ~any(sheetIdx)
            error('Eigenständiges Bauteil "%s" wurde in der library.json nicht gefunden.', compCfg.name);
        end

        sheetCfg = library.transformerSheets(sheetIdx);

        sheet = TransformerSheet(sheetCfg);
        sheet.xPos = compCfg.position.x;
        sheet.yPos = compCfg.position.y;

        standAloneComponents{end + 1} = sheet; %#ok<SAGROW>
    end

end

params.standAloneComponents = standAloneComponents;

% --- 6. Run Parametric Analysis ---
phaseAngleVector = 0:15:90;
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
        masterResultsTable = [masterResultsTable; singleRunResults]; %#ok<AGROW>
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

% --- 7. Save and Visualize Results ---
resultsCsvFile = fullfile(resultsPath, [params.baseFilename, '_summary.csv']);
writetable(masterResultsTable, resultsCsvFile);
fprintf('All results saved to "%s".\n', resultsCsvFile);

plotResults(resultsCsvFile, resultsPath, params.baseFilename);
disp('--- Simulation workflow completed successfully ---');
