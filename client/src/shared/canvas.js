/**
 * Draw a half diamond (top or bottom) for a node
 * @param {CanvasRenderingContext2D} ctx - The canvas context
 * @param {number} triangleSize - The width of the half diamond
 * @param {number} triangleHeight - The height of the half diamond
 * @param {number} nodeX - The x-coordinate of the node center
 * @param {number} nodeY - The y-coordinate of the node center
 * @param {number} nodeSize - The radius of the node
 * @param {boolean} isTop - Whether to draw the top half of the diamond
 * @param {string} strokeColor - The color of the diamond outline
 * @param {string} fillColor - The color of the diamond fill
 * @param {number} strokeLineWidth - The width of the outline stroke
 */
export const drawNodeDiamondHalf = (
  ctx,
  triangleSize,
  triangleHeight,
  nodeX,
  nodeY,
  nodeSize,
  isTop,
  strokeColor,
  fillColor,
  strokeLineWidth
) => {
  ctx.beginPath();
  if (isTop) {
    ctx.moveTo(
      nodeX + nodeSize + triangleSize / 2,
      nodeY - nodeSize - triangleHeight - strokeLineWidth / 2
    ); // top vertex
    ctx.lineTo(nodeX + nodeSize, nodeY - nodeSize - strokeLineWidth / 2); // bottom left vertex
    ctx.lineTo(
      nodeX + nodeSize + triangleSize,
      nodeY - nodeSize - strokeLineWidth / 2
    ); // bottom right vertex
  } else {
    ctx.moveTo(
      nodeX + nodeSize + triangleSize / 2,
      nodeY - nodeSize + triangleHeight + strokeLineWidth / 2
    ); // bottom vertex
    ctx.lineTo(nodeX + nodeSize, nodeY - nodeSize + strokeLineWidth / 2); // top left vertex
    ctx.lineTo(
      nodeX + nodeSize + triangleSize,
      nodeY - nodeSize + strokeLineWidth / 2
    ); // top right vertex
  }
  ctx.closePath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = strokeColor;
  ctx.stroke();
  ctx.fillStyle = fillColor;
  ctx.fill();
};

/**
 * Draw a number at a given location
 * @param {CanvasRenderingContext2D} ctx - The canvas context
 * @param {number} num - The number to be drawn
 * @param {number} x - The x-coordinate of the center of the number
 * @param {number} y - The y-coordinate of the center of the number
 * @param {number} triangleHeight - The height of the half diamond
 */
export const drawNumber = (ctx, num, x, y, triangleHeight) => {
  ctx.font = `${triangleHeight * 0.5}px Sans-Serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "black";
  ctx.fillText(num, x, y);
};

export const drawEdgeTriangle = (
  ctx,
  flip,
  lineWidthOffset,
  triangleSize,
  strokeColor,
  fillColor,
  rotation = 0
) => {
  // Save the current context
  ctx.save();

  //   // Translate to the center of the triangle
  //   ctx.translate((flip * triangleSize) / 2, -0.75 * triangleSize);

  //   // Rotate the context
  //   ctx.rotate(rotation);

  ctx.beginPath();
  ctx.moveTo(flip * lineWidthOffset, -0.25 * triangleSize); // top vertex
  ctx.lineTo(flip * triangleSize, -0.75 * triangleSize); // vertex
  ctx.lineTo(flip * lineWidthOffset, -1.25 * triangleSize); // bottom vertex
  ctx.closePath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = strokeColor;
  ctx.stroke();
  ctx.fillStyle = fillColor;
  ctx.fill();

  // Restore the original context
  ctx.restore();
};
