function plotResults(csvFile, resultsPath, baseFilename)
    data = readtable(csvFile);

    uniqueConductors = unique(data.conductor);
    numConductors = length(uniqueConductors);

    colors = lines(numConductors);
    markers = {'-o', '-s', '-^', '-d', '-v', '-x', '-*'};

    fig = figure('Name', 'Simulation Results', 'NumberTitle', 'off', 'Visible', 'off');

    % Plot 1: Secondary Currents
    subplot(2, 1, 1);
    hold on;

    for i = 1:numConductors
        conductorName = uniqueConductors{i};
        conductorData = data(strcmp(data.conductor, conductorName), :);
        % KORRIGIERT: 'iSecFinalA' zu 'iSecAbs_A' geändert, um dem neuen Spaltennamen zu entsprechen.
        plot(conductorData.phaseAngle, abs(conductorData.iSecAbs_A), markers{mod(i - 1, length(markers)) + 1}, ...
            'LineWidth', 1.5, 'DisplayName', ['Isec ' conductorName], 'Color', colors(i, :));
    end

    hold off;
    title('Magnitude of Secondary Currents vs. Phase Angle');
    xlabel('Phase Angle [°]');
    ylabel('Magnitude |Isec| [A]');
    legend('show', 'Location', 'best');
    grid on;

    % Plot 2: Primary Currents
    subplot(2, 1, 2);
    hold on;

    for i = 1:numConductors
        conductorName = uniqueConductors{i};
        conductorData = data(strcmp(data.conductor, conductorName), :);
        plot(conductorData.phaseAngle, conductorData.iPrimA, markers{mod(i - 1, length(markers)) + 1}, ...
            'LineWidth', 1.5, 'DisplayName', ['Iprim ' conductorName], 'Color', colors(i, :));
    end

    hold off;
    title('Instantaneous Primary Currents vs. Phase Angle');
    xlabel('Phase Angle [°]');
    ylabel('Instantaneous Current Iprim [A]');
    legend('show', 'Location', 'best');
    grid on;

    plotFile = fullfile(resultsPath, [baseFilename, '.pdf']);
    print(fig, plotFile, '-dpdf', '-r300', '-bestfit');
    close(fig);

    fprintf('Plot has been saved to "%s".\n', plotFile);
end
