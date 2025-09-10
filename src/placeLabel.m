% src/placeLabel.m - FINALE VERSION
function placeLabel(absX, absY, circuitName, material, groupNum)
    % Platziert ein Material-Blocklabel an einer absoluten Koordinate.
    mi_addblocklabel(absX, absY);
    mi_selectlabel(absX, absY);
    mi_setblockprop(material, 1, 0, circuitName, 0, groupNum, 0);
    mi_clearselected();
end
