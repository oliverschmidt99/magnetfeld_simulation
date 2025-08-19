function drawBoundary(component, groupX, groupY)
    % Draws the geometric boundaries of a component at its absolute position.
    absX = groupX + component.xPos;
    absY = groupY + component.yPos;
    component.geoObject.drawInFemm(absX, absY);
end
