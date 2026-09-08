export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "-:--";
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function validateInRange(value: number, min: number, max: number): number {
  if (max && value > max) {
    return max;
  }
  if (min && value < min) {
    return min;
  }
  return value;
}

interface RoundedRectParams {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number | Record<"tl" | "tr" | "br" | "bl", number>;
  fill?: boolean;
  stroke?: boolean;
}

/**
 * Draws a rounded rectangle using the current state of the canvas.
 */
export function roundedRect({
  ctx,
  x,
  y,
  width,
  height,
  radius,
  fill = false,
  stroke = true,
}: RoundedRectParams): void {
  const radiusObj: Record<"tl" | "tr" | "br" | "bl", number> = {
    tl: 0,
    tr: 0,
    br: 0,
    bl: 0,
  };

  if (typeof radius === "number") {
    for (const key of Object.keys(radiusObj) as Array<keyof typeof radiusObj>) {
      radiusObj[key] = radius;
    }
  } else {
    Object.assign(radiusObj, radius);
  }

  ctx.beginPath();
  ctx.moveTo(x + radiusObj.tl, y);
  ctx.lineTo(x + (width - radiusObj.tr), y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radiusObj.tr);
  ctx.lineTo(x + width, y + (height - radiusObj.br));
  ctx.quadraticCurveTo(x + width, y + height, x + (width - radiusObj.br), y + height);
  ctx.lineTo(x + radiusObj.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + (height - radiusObj.bl));
  ctx.lineTo(x, y + radiusObj.tl);
  ctx.quadraticCurveTo(x, y, x + radiusObj.tl, y);
  ctx.closePath();
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }
}
