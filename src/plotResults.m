% Located in: src/plotResults.m
function plotResults(csvFile, resultsPath, baseFilename)
    data = readtable(csvFile);

    fig = figure('Name', 'Simulation Results', 'NumberTitle', 'off', 'Visible', 'off');

    % Plot 1: Secondary Currents
    subplot(2, 1, 1);
    l1Data = data(strcmp(data.conductor, 'L1'), :);
    l2Data = data(strcmp(data.conductor, 'L2'), :);
    l3Data = data(strcmp(data.conductor, 'L3'), :);

    plot(l1Data.phaseAngle, abs(l1Data.iSecFinalA), 'b-o', 'LineWidth', 1.5, 'DisplayName', 'Isec L1');
    hold on;
    plot(l2Data.phaseAngle, abs(l2Data.iSecFinalA), 'r-s', 'LineWidth', 1.5, 'DisplayName', 'Isec L2');
    plot(l3Data.phaseAngle, abs(l3Data.iSecFinalA), 'g-^', 'LineWidth', 1.5, 'DisplayName', 'Isec L3');
    hold off;

    title('Magnitude of Secondary Currents vs. Phase Angle');
    xlabel('Phase Angle [°]');
    ylabel('Magnitude |Isec| [A]');
    legend('show', 'Location', 'best');
    grid on;

    % Plot 2: Primary Currents
    subplot(2, 1, 2);
    plot(l1Data.phaseAngle, l1Data.iPrimA, 'b-o', 'LineWidth', 1.5, 'DisplayName', 'Iprim L1');
    hold on;
    plot(l2Data.phaseAngle, l2Data.iPrimA, 'r-s', 'LineWidth', 1.5, 'DisplayName', 'Iprim L2');
    plot(l3Data.phaseAngle, l3Data.iPrimA, 'g-^', 'LineWidth', 1.5, 'DisplayName', 'Iprim L3');
    hold off;

    title('Instantaneous Primary Currents vs. Phase Angle');
    xlabel('Phase Angle [°]');
    ylabel('Instantaneous Current Iprim [A]');
    legend('show', 'Location', 'best');
    grid on;

    % Speichere die Abbildung als PDF im neuen Ergebnisordner
    plotFile = fullfile(resultsPath, [baseFilename, '.pdf']);
    % Verwende 'print' für eine bessere PDF-Qualität
    print(fig, plotFile, '-dpdf', '-r300', '-bestfit');
    close(fig); % Schließe die unsichtbare Figur nach dem Speichern

    fprintf('Plot has been saved to "%s".\n', plotFile);
end
