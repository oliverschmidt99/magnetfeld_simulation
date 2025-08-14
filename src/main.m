function main(config_filename)
    clc;
    fprintf('MATLAB-Skript gestartet.\n');
    % Passe diesen Pfad bei Bedarf an deine FEMM-Installation an
    addpath('C:\femm42\mfiles');

    try
        sim_data = jsondecode(fileread(config_filename));
        run_flexible_analyse(sim_data.globals, sim_data.objects);
        fprintf('FEMM-Analyse abgeschlossen.\n');
    catch ME
        fprintf(2, 'FEHLER in main.m: %s\n', ME.message);
        fprintf(2, 'Fehler in Datei: %s, Zeile: %d\n', ME.stack(1).file, ME.stack(1).line);
        if ~isempty(which('closefemm')), closefemm; end
        rethrow(ME);
    end

    fprintf('MATLAB-Skript erfolgreich beendet.\n');
end
