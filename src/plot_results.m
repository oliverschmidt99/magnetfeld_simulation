% =========================================================================
% plot_results.m - Liest die Ergebnis-CSV-Datei und plottet die Daten
% (Finale, robuste Version mit Fallback für Spaltennamen)
% =========================================================================
function plot_results(csv_filename)
    % Lese die in main.m erstellte CSV-Datei ein
    data = readtable(csv_filename);

    % --- Intelligente Spaltenauswahl mit Fallback ---
    if ismember('I_sek_final_A', data.Properties.VariableNames)
        sek_strom_col_name = 'I_sek_final_A';
    elseif ismember('I_sek_final_A_1', data.Properties.VariableNames)
        sek_strom_col_name = 'I_sek_final_A_1';
        fprintf('Hinweis: Veralteter Spaltenname "%s" wird für den Plot verwendet.\n', sek_strom_col_name);
    else
        fprintf('FEHLER: Konnte keine passende Spalte für den Sekundärstrom in der CSV-Datei finden.\n');
        fprintf('Verfügbare Spalten sind:\n');
        disp(data.Properties.VariableNames');
        error('Bitte die schreibende Funktion (calculate_results.m) überprüfen.');
    end

    % Erstelle eine neue Abbildung
    figure('Name', 'Simulationsergebnisse: Ströme vs. Phasenwinkel', 'NumberTitle', 'off');

    % Teile die Daten nach Leitern auf
    L1_data = data(strcmp(data.Leiter, 'L1'), :);
    L2_data = data(strcmp(data.Leiter, 'L2'), :);
    L3_data = data(strcmp(data.Leiter, 'L3'), :);

    % --- Plot 1: Betrag der Sekundärströme ---
    subplot(2, 1, 1);

    plot(L1_data.Phasenwinkel, abs(L1_data.(sek_strom_col_name)), 'b-o', 'LineWidth', 1.5, 'DisplayName', 'Isek L1');
    hold on;
    plot(L2_data.Phasenwinkel, abs(L2_data.(sek_strom_col_name)), 'r-s', 'LineWidth', 1.5, 'DisplayName', 'Isek L2');
    plot(L3_data.Phasenwinkel, abs(L3_data.(sek_strom_col_name)), 'g-^', 'LineWidth', 1.5, 'DisplayName', 'Isek L3');
    hold off;

    title('Betrag der Sekundärströme vs. Phasenwinkel');
    xlabel('Phasenwinkel [°]');
    ylabel('Betrag |Isek| [A]');
    legend('show', 'Location', 'best');
    grid on;

    % --- Plot 2: Primärströme (zur Kontrolle) ---
    subplot(2, 1, 2);

    plot(L1_data.Phasenwinkel, L1_data.I_prim_A, 'b-o', 'LineWidth', 1.5, 'DisplayName', 'Iprim L1');
    hold on;
    plot(L2_data.Phasenwinkel, L2_data.I_prim_A, 'r-s', 'LineWidth', 1.5, 'DisplayName', 'Iprim L2');
    plot(L3_data.Phasenwinkel, L3_data.I_prim_A, 'g-^', 'LineWidth', 1.5, 'DisplayName', 'Iprim L3');
    hold off;

    title('Momentane Primärströme vs. Phasenwinkel (Kontrollplot)');
    xlabel('Phasenwinkel [°]');
    ylabel('Momentanstrom Iprim [A]');
    legend('show', 'Location', 'best');
    grid on;

    % Speichert die Abbildung als PNG-Datei
    plot_filename = 'ergebnis_plot.png';
    saveas(gcf, plot_filename);
    fprintf('Plot wurde erfolgreich als "%s" gespeichert.\n', plot_filename);
end
