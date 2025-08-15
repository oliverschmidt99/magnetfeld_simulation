% =========================================================================
% calculate_results.m - Lädt die Lösung und berechnet die physikalischen Größen
% (Finale Version: Verwendet mo_blockintegral für eine robuste B_messung)
% =========================================================================
function ergebnis_tabelle = calculate_results(params)
    % Lädt die Lösungsdatei der zuletzt durchgeführten Simulation
    mi_loadsolution();

    % --- 1. Parameter vorbereiten ---
    mu0 = 4 * pi * 1e-7;

    I_prim_all = [
                  params.spitzenstrom_prim_A * cosd(params.phasenWinkel_deg + 0);
                  params.spitzenstrom_prim_A * cosd(params.phasenWinkel_deg - 120);
                  params.spitzenstrom_prim_A * cosd(params.phasenWinkel_deg + 120)
                  ];

    % Die Gruppennummern für die Wandlerkerne, wie in run_wandler_analyse.m definiert
    wandler_groups = [4, 5, 6];

    % --- 2. Berechnungen für jeden der drei Wandler ---
    isek_results = zeros(3, 1);
    bmess_results = zeros(3, 1);

    for i = 1:3
        % a) Wähle den Block des jeweiligen Wandlerkerns über seine Gruppe aus
        mo_groupselectblock(wandler_groups(i));

        % b) Berechne die durchschnittliche Flussdichte im Kern
        avg_Bx = mo_blockintegral(10); % Durchschnittliches Bx
        avg_By = mo_blockintegral(11); % Durchschnittliches By
        B_messung = sqrt(avg_Bx ^ 2 + avg_By ^ 2); % Betrag des durchschnittlichen B-Vektors
        mo_clearblock(); % Auswahl aufheben

        % c) Theoretische Berechnung
        % l_m: Mittlere Pfadlänge eines rechteckigen Kerns
        l_m = (2 * (params.leiter_breite + 2 * params.wandler_luftspalt + params.wandler_dicke) + ...
            2 * (params.leiter_hoehe + 2 * params.wandler_luftspalt + params.wandler_dicke)) / 1000;

        A = (params.wandler_dicke / 1000) * params.problem_tiefe_m;
        w2 = params.nenn_prim_A / params.nenn_sek_A;
        Rm = l_m / (mu0 * params.mu_r_wandler * A);
        Phi = B_messung * A;
        Theta = Phi * Rm;
        I_sek = Theta / w2;

        % d) Ergebnisse in Vektoren speichern
        isek_results(i) = abs(I_sek);
        bmess_results(i) = B_messung;
    end

    % --- 3. Ergebnisse in Tabelle formatieren ---
    phasenwinkel_col = repmat(params.phasenWinkel_deg, 3, 1);
    leiter_col = {'L1'; 'L2'; 'L3'};

    ergebnis_tabelle = table(phasenwinkel_col, leiter_col, I_prim_all, isek_results, bmess_results, ...
        'VariableNames', {'Phasenwinkel', 'Leiter', 'I_prim_A', 'I_sek_final_A', 'B_messung_T'});
end
