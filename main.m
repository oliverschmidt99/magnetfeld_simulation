% =========================================================================
% main.m - Steuerzentrale für die FEMM-Simulationsreihe
% (Befindet sich im Hauptverzeichnis des Projekts)
% =========================================================================
clear variables; close all; clc;

% Pfade zu den benötigten Toolboxen und Skripten hinzufügen
addpath('C:\femm42\mfiles'); % Pfad zur FEMM-Toolbox
addpath('src'); % Pfad zu unseren eigenen Skripten

disp('--- Starte parametrische Simulationsreihe ---');

%% 1. Simulationsparameter definieren
params.problem_tiefe_m = 0.1;
params.frequenz_hz = 50;
params.leiter_hoehe = 40;
params.leiter_breite = 100;
params.abstand = 220;
params.wandler_luftspalt = 10;
params.wandler_dicke = 20;
params.spitzenstrom_prim_A = 4000;
params.nenn_prim_A = 4000;
params.nenn_sek_A = 5;
params.wandler_material = 'M-36 Steel';
params.mu_r_wandler = 2500;

%% 2. Parametrische Analyse (Schleife)
phasenWinkel_vektor = 0:45:90;

openfemm;

try
    master_results_table = table();
    fprintf('Starte Messreihe für %d Phasenwinkel...\n', length(phasenWinkel_vektor));

    for i = 1:length(phasenWinkel_vektor)
        params.phasenWinkel_deg = phasenWinkel_vektor(i);
        fprintf('--> Simuliere & berechne für Phasenwinkel: %d°\n', params.phasenWinkel_deg);

        % Schritt A: Führt die FEMM-Analyse durch
        run_wandler_analyse(params);

        % Schritt B: Lädt die Ergebnisse und führt die Berechnungen durch
        single_run_results = calculate_results(params);

        master_results_table = [master_results_table; single_run_results];
    end

    fprintf('Messreihe abgeschlossen.\n');
    closefemm;
catch ME
    closefemm;
    rethrow(ME);
end

%% 3. Ergebnisse speichern und visualisieren
ergebnis_dateiname_csv = 'simulations_ergebnisse.csv';
writetable(master_results_table, ergebnis_dateiname_csv);
fprintf('Alle Ergebnisse wurden erfolgreich in "%s" gespeichert.\n', ergebnis_dateiname_csv);

plot_results(ergebnis_dateiname_csv);
disp('--- Simulations-Workflow erfolgreich beendet ---');
