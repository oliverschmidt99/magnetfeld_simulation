% main_debug_air.m
% Testet NUR die Erstellung des Simulationsraums mit innerer und äußerer Luft.

clear variables; close all; clc;
addpath('C:\femm42\mfiles');
addpath('src');

fprintf('--- Starte DEBUG-Modus für Luft-Definition ---\n');

% --- 1. Konfiguration laden ---
runData = jsondecode(fileread('simulation_run.json'));
params = runData.scenarioParams;
params.simulationsraum = runData.simulation_meta.simulationsraum;

% --- 2. Debug-Verzeichnis ---
debugPath = fullfile('res', 'debug_air');
if ~exist(debugPath, 'dir'), mkdir(debugPath); end
params.femmFilesPath = debugPath;

% --- 3. Nur die Geometrie für die Luft erstellen ---
openfemm;
runIdentifier = 'debug_air_test';
runFemmAirOnly(params, runIdentifier); % Benutzt eine neue, simple Funktion

fprintf('\n--- Luft-Geometrie-Erstellung abgeschlossen ---\n');
fprintf('Die Datei "debug_air_test.fem" wurde im Ordner "res/debug_air" erstellt.\n');
fprintf('BITTE ÖFFNE DIESE DATEI JETZT im FEMM-Programm.\n');
fprintf('Klicke in FEMM auf den "Run Analyzer"-Button (das Zahnrad).\n');
fprintf('Wenn keine Fehlermeldung kommt, ist die Basis korrekt.\n');
