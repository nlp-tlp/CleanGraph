export const drawRoundedRect = (ctx, x, y, width, height, radius, color) => {
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.fill();
};

export const drawCheckmark = (
  ctx,
  x,
  y,
  angle,
  width,
  height,
  color = "green"
) => {
  ctx.save(); // Save current drawing state

  ctx.translate(x, y);
  ctx.rotate(angle);

  // Draw rounded rectangle
  drawRoundedRect(ctx, x, y, width, height, 4, color);

  ctx.beginPath();

  // Scale checkmark to fit within bounding box
  const scale = Math.min(width, height) / 100;

  // Starting point
  ctx.moveTo(x + 30 * scale, y + 50 * scale);

  // Draw line to middle point
  ctx.lineTo(x + 45 * scale, y + 70 * scale);

  // Draw line to end point
  ctx.lineTo(x + 70 * scale, y + 30 * scale);

  ctx.lineWidth = 8 * scale;
  ctx.strokeStyle = "#ffffff"; // Set the line color to white
  ctx.stroke(); // Draw it

  ctx.restore(); // Restore original drawing state
};

export const drawCheckmarkWithBox = () => {};
