function plot_results(csv_filename, szenario)
    % =========================================================================
    % plot_results.m - Liest CSV und plottet szenario-basiert
    % =========================================================================
    data = readtable(csv_filename);

    % Erstelle eine neue Abbildung und speichere sie
    fig = figure('Name', ['Ergebnisse für Szenario: ' szenario], 'Position', [100, 100, 1200, 800], 'Visible', 'off');

    L1_data = data(strcmp(data.Leiter, 'L1'), :);
    L2_data = data(strcmp(data.Leiter, 'L2'), :);
    L3_data = data(strcmp(data.Leiter, 'L3'), :);

    switch szenario
        case 'Phasenwinkel_Sweep'
            x_data = L1_data.Sweep_Parameter;
            x_label = 'Phasenwinkel [°]';
        case 'Leiter_Verschiebung'
            x_data = L1_data.Sweep_Parameter;
            x_label = 'Y-Offset von Leiter L2 [mm]';
        case 'Metallblech_Analyse'
            x_data = L1_data.Sweep_Parameter;
            x_label = 'Phasenwinkel [°]';
        otherwise
            error('Unbekanntes Szenario für Plot!');
    end

    % Plot 1: Betrag der Sekundärströme
    subplot(2, 2, 1);
    plot(x_data, L1_data.I_sek_final_A, 'b-o', 'LineWidth', 1.5, 'DisplayName', 'I_sek L1');
    hold on;
    plot(x_data, L2_data.I_sek_final_A, 'r-s', 'LineWidth', 1.5, 'DisplayName', 'I_sek L2');
    plot(x_data, L3_data.I_sek_final_A, 'g-^', 'LineWidth', 1.5, 'DisplayName', 'I_sek L3');
    hold off;
    title('Betrag der Sekundärströme |I_sek|');
    xlabel(x_label);
    ylabel('Strom [A]');
    legend('show'); grid on;

    % Plot 2: Gemitteltes Magnetfeld B im Kern
    subplot(2, 2, 2);
    plot(x_data, L1_data.B_avg_T, 'b-o', 'LineWidth', 1.5, 'DisplayName', 'B_avg L1');
    hold on;
    plot(x_data, L2_data.B_avg_T, 'r-s', 'LineWidth', 1.5, 'DisplayName', 'B_avg L2');
    plot(x_data, L3_data.B_avg_T, 'g-^', 'LineWidth', 1.5, 'DisplayName', 'B_avg L3');
    hold off;
    title('Mittlere magnetische Flussdichte im Kern');
    xlabel(x_label);
    ylabel('Flussdichte [T]');
    legend('show'); grid on;

    % Plot 3: Primärströme
    subplot(2, 2, 3);
    plot(x_data, L1_data.I_prim_A, 'b-o', 'LineWidth', 1.5, 'DisplayName', 'I_prim L1');
    hold on;
    plot(x_data, L2_data.I_prim_A, 'r-s', 'LineWidth', 1.5, 'DisplayName', 'I_prim L2');
    plot(x_data, L3_data.I_prim_A, 'g-^', 'LineWidth', 1.5, 'DisplayName', 'I_prim L3');
    hold off;
    title('Primärströme (Momentanwerte)');
    xlabel(x_label);
    ylabel('Strom [A]');
    legend('show'); grid on;

    % Plot 4: Magnetisierungsstrom
    subplot(2, 2, 4);
    plot(x_data, L1_data.I_mag_sek_A, 'b-o', 'LineWidth', 1.5, 'DisplayName', 'I_mag L1');
    hold on;
    plot(x_data, L2_data.I_mag_sek_A, 'r-s', 'LineWidth', 1.5, 'DisplayName', 'I_mag L2');
    plot(x_data, L3_data.I_mag_sek_A, 'g-^', 'LineWidth', 1.5, 'DisplayName', 'I_mag L3');
    hold off;
    title('Betrag des Magnetisierungsstroms (sekundärseitig)');
    xlabel(x_label);
    ylabel('Strom [A]');
    legend('show'); grid on;

    sgtitle(['Analyseergebnisse für Szenario: ' strrep(szenario, '_', ' ')], 'FontSize', 16, 'FontWeight', 'bold');

    % Speichere die Abbildung als PNG
    plot_ordner_pfad = fullfile(fileparts(mfilename('fullpath')), 'ergebnis_plots');

    if ~exist(plot_ordner_pfad, 'dir')
        mkdir(plot_ordner_pfad);
    end

    plot_dateiname = fullfile(plot_ordner_pfad, ['plot_' szenario '.png']);
    saveas(fig, plot_dateiname);
    fprintf('Plot wurde gespeichert unter: %s\n', plot_dateiname);
end
