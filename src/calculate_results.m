% =========================================================================
% BERECHNUNG DER PHYSIKALISCHEN ERGEBNISSE
% =========================================================================
% Diese Funktion wird von main.m aufgerufen, nachdem die Simulation
% abgeschlossen ist. Sie implementiert die Berechnung der Sekundärströme.
%
% Input:
%   config: Die geladene Konfigurationsstruktur.
% Output:
%   results: Eine Struktur, die alle berechneten Ergebnisse enthält.
% =========================================================================

function results = calculate_results(config)

    disp('  -> Beginne Ergebnisberechnung...');

    % Physikalische Konstanten
    mu0 = 4 * pi * 1e-7; % Magnetische Feldkonstante H/m

    % Initialisiere die Ergebnis-Struktur
    results = struct();
    results.projectName = config.projectName;
    results.analysisTimestamp = datetime('now');
    results.wandler_results = []; % Array für die Ergebnisse der einzelnen Wandler

    % Finde alle Wandler in der Konfiguration
    wandler_components = config.geometry.components(strcmp({config.geometry.components.type}, 'wandler'));

    % Iteriere durch jeden gefundenen Wandler und führe die Berechnungen durch
    for i = 1:length(wandler_components)
        wandler = wandler_components(i);
        disp(['     - Analysiere Wandler: ', wandler.id]);

        % Hole Materialeigenschaften des Wandlers aus der Materialliste
        material_props = config.materials(strcmp({config.materials.name}, wandler.material));
        mu_r = material_props.mu_x; % Annahme: mu_x = mu_y

        % --- Schritt 1: Parameter aus Simulation und Config holen ---

        % a) Ermittle die mittlere Flussdichte B_messung im Kern
        mo_groupselectblock(wandler.group);
        avg_Bx_Tesla = mo_blockintegral(10); % Mittleres Bx
        avg_By_Tesla = mo_blockintegral(11); % Mittleres By
        b_messung_Tesla = sqrt(avg_Bx_Tesla ^ 2 + avg_By_Tesla ^ 2);
        mo_clearblock();

        % b) Berechne die mittlere Länge des magnetischen Pfades (l_m)
        % Für einen Ring: l_m = 2 * pi * r_mittel
        r_mittel_mm = (wandler.inner_radius + wandler.outer_radius) / 2;
        l_m_meter = 2 * pi * r_mittel_mm / 1000; % Umrechnung in Meter

        % c) Hole weitere Parameter aus der Konfiguration
        A_mm2 = wandler.area; % Querschnittsfläche aus config
        A_m2 = A_mm2 / (1000 ^ 2); % Umrechnung in m^2
        w2 = wandler.secondary_windings_w2; % Sekundärwindungen aus config

        % --- Schritt 2: Theoretische Berechnungen durchführen ---

        % a) Magnetischer Widerstand (R_m)
        R_m = l_m_meter / (mu0 * mu_r * A_m2);

        % b) Magnetischer Fluss (Phi)
        Phi_Weber = b_messung_Tesla * A_m2;

        % c) Magnetische Durchflutung (Theta)
        Theta_Ampere = Phi_Weber * R_m;

        % d) Sekundärstrom (I_sek)
        I_sek_Ampere = Theta_Ampere / w2;

        % --- Schritt 3: Ergebnisse speichern ---
        wandler_result = struct();
        wandler_result.id = wandler.id;
        wandler_result.B_messung_T = b_messung_Tesla;
        wandler_result.l_m_m = l_m_meter;
        wandler_result.R_m_H_inv = R_m;
        wandler_result.Phi_Wb = Phi_Weber;
        wandler_result.Theta_A = Theta_Ampere;
        wandler_result.I_sek_A = I_sek_Ampere;

        % Füge das Ergebnis für diesen Wandler zum Gesamt-Ergebnisarray hinzu
        results.wandler_results = [results.wandler_results, wandler_result];

        disp(['       -> Berechneter Sekundärstrom: ', num2str(I_sek_Ampere), ' A']);
    end

    disp('  -> Ergebnisberechnung abgeschlossen.');
end
