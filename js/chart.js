export class ChartRenderer {
  static drawBarChart(canvas, values) {
    if (!canvas || !canvas.getContext) return;

    const rect = canvas.parentElement.getBoundingClientRect();
    const width = Math.max(rect.width, 220);
    const height = Math.max(rect.height, 160);
    const dpr = window.devicePixelRatio || 1;

    // учитываем плотность пикселей экрана, чтобы график не мылился
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const styles = getComputedStyle(document.documentElement);
    const barColor = styles.getPropertyValue('--chart-bar').trim() || '#3b82f6';
    const gridColor = styles.getPropertyValue('--chart-grid').trim() || '#e2e8f0';
    const textColor = styles.getPropertyValue('--chart-text').trim() || '#475569';

    if (!Array.isArray(values) || values.length === 0) {
      ctx.fillStyle = textColor;
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Нет данных', width / 2, height / 2);
      return;
    }

    const padding = { top: 24, right: 14, bottom: 26, left: 34 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const maxVal = Math.max(...values.map(v => Math.abs(v)), 10);

    const steps = 4;
    ctx.strokeStyle = gridColor;
    ctx.fillStyle = textColor;
    ctx.lineWidth = 1;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const y = padding.top + plotHeight - ratio * plotHeight;
      const labelVal = Math.round(ratio * maxVal);

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillText(String(labelVal), padding.left - 6, y + 3);
    }

    const count = values.length;
    const slotWidth = plotWidth / count;
    const barWidth = Math.max(8, Math.min(38, slotWidth * 0.62));

    values.forEach((rawVal, index) => {
      const val = Math.max(0, Number(rawVal) || 0);
      const barHeight = (val / maxVal) * plotHeight;
      const x = padding.left + index * slotWidth + (slotWidth - barWidth) / 2;
      const y = padding.top + plotHeight - barHeight;

      ctx.fillStyle = barColor;
      ctx.beginPath();
      const radius = Math.min(4, barHeight / 2);
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barWidth, barHeight, [radius, radius, 0, 0]);
      } else {
        ctx.rect(x, y, barWidth, barHeight);
      }
      ctx.fill();

      ctx.fillStyle = textColor;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(val), x + barWidth / 2, Math.max(12, y - 5));

      ctx.font = '10px sans-serif';
      ctx.fillText(`#${index + 1}`, x + barWidth / 2, height - 8);
    });
  }
}