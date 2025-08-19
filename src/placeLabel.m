function placeLabel(component, groupX, groupY, offsetX, offsetY, circuitName, material, groupNum)
    % Places a material block label at a specific offset from the component's center.
    absX = groupX + component.xPos + offsetX;
    absY = groupY + component.yPos + offsetY;
    mi_addblocklabel(absX, absY);
    mi_selectlabel(absX, absY);
    mi_setblockprop(material, 1, 0, circuitName, 0, groupNum, 0);
    mi_clearselected();
end
