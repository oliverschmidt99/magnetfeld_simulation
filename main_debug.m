% main_debug.m
% Ein Skript zur schrittweisen Fehlersuche beim Geometrieaufbau.
% Es wird nur der erste Positionsschritt und ein Phasenwinkel (0°) aufgebaut.
% Die Analyse wird NICHT gestartet, damit die .fem-Datei inspiziert werden kann.

clear variables; close all; clc;
addpath('C:\femm42\mfiles');
addpath('src');

fprintf('--- Starte DEBUG-Modus für Geometrie-Erstellung ---\n');

% --- 1. Konfiguration laden ---
fprintf('Lade Konfigurationsdateien...\n');
library = jsondecode(fileread('library.json'));
runData = jsondecode(fileread('simulation_run.json'));
simConfig = runData;
params = simConfig.scenarioParams;

% --- 2. Ergebnis-Verzeichnis einrichten (temporär) ---
debugPath = fullfile('res', 'debug');
if ~exist(debugPath, 'dir'), mkdir(debugPath); end
params.femmFilesPath = debugPath;
fprintf('Die Test-Geometrie wird gespeichert in: %s\n', debugPath);

% --- 3. Nur den ersten Schritt und einen Winkel auswählen ---
position_steps = runData.simulation_meta.bewegungspfade_alle_leiter.schritte_details;
first_position_step = position_steps(1);
simRaum = simConfig.simulation_meta.simulationsraum;
phaseAngleVector = 0; % Nur für 0 Grad testen

fprintf('\n>> Baue Geometrie für Positionsschritt 1:\n');

% --- 4. Geometrie für diesen einen Schritt aufbauen ---
stepConfig = simConfig;

for j = 1:length(stepConfig.assemblies)
    phaseName = stepConfig.assemblies(j).phaseName;

    if isfield(first_position_step, phaseName)
        currentPos = first_position_step.(phaseName);
        stepConfig.assemblies(j).position = currentPos;
        fprintf('   Baugruppe "%s" an Position (X: %.2f, Y: %.2f) mm\n', ...
            stepConfig.assemblies(j).name, currentPos.x, currentPos.y);
    end

end

[currents, assemblies, standAloneComponents] = initializeComponents(stepConfig, library);

% Parameter für den einzelnen Lauf vorbereiten
debugParams = params;
debugParams.frequencyHz = 50;
debugParams.coreRelPermeability = 2500;
debugParams.currents = currents;
debugParams.assemblies = assemblies;
debugParams.standAloneComponents = standAloneComponents;
debugParams.simulationsraum = simRaum;
debugParams.phaseAngleDeg = phaseAngleVector; % Setze den Winkel auf 0

% --- 5. FEMM-Datei erstellen, OHNE Analyse ---
openfemm;
runIdentifier = 'debug_geometry_test';
runFemmGeometryOnly(debugParams, runIdentifier); % Benutzt eine spezielle Debug-Funktion

fprintf('\n--- Geometrie-Erstellung abgeschlossen ---\n');
fprintf('Die Datei "debug_geometry_test.fem" wurde im Ordner "res/debug" erstellt.\n');
fprintf('BITTE ÖFFNE DIESE DATEI JETZT im FEMM-Programm, um die Platzierung der Material-Labels zu überprüfen.\n');
% Das FEMM-Fenster bleibt zur Inspektion geöffnet.
