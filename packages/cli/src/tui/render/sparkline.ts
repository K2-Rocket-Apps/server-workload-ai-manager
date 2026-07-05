/** Unicode block characters for sparklines (8 levels). */
const BLOCKS = [" ", "▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"] as const;

export type SparklineOptions = {
  min?: number;
  max?: number;
  width?: number;
  empty?: string;
  fill?: string;
};

/**
 * Render ASCII sparkline from numeric series.
 * Normalizes values to 0–8 block height by default.
 */
export function sparkline(values: readonly number[], options: SparklineOptions = {}): string {
  if (values.length === 0) return "";

  const { min, max, width, empty = BLOCKS[0], fill } = options;

  let series = [...values];
  if (width !== undefined && width > 0 && series.length > width) {
    series = downsample(series, width);
  } else if (width !== undefined && width > 0 && series.length < width) {
    series = upsample(series, width);
  }

  const lo = min ?? Math.min(...series);
  const hi = max ?? Math.max(...series);
  const range = hi - lo || 1;

  return series
    .map((v) => {
      const normalized = (v - lo) / range;
      const idx = Math.min(BLOCKS.length - 1, Math.max(0, Math.round(normalized * (BLOCKS.length - 1))));
      if (fill && idx > 0) return fill;
      return idx === 0 ? empty : BLOCKS[idx];
    })
    .join("");
}

function downsample(values: number[], targetWidth: number): number[] {
  const result: number[] = [];
  const bucketSize = values.length / targetWidth;
  for (let i = 0; i < targetWidth; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.floor((i + 1) * bucketSize);
    let sum = 0;
    let count = 0;
    for (let j = start; j < end && j < values.length; j++) {
      sum += values[j]!;
      count++;
    }
    result.push(count > 0 ? sum / count : 0);
  }
  return result;
}

function upsample(values: number[], targetWidth: number): number[] {
  if (values.length === 0) return [];
  if (values.length === 1) return Array(targetWidth).fill(values[0]);
  const result: number[] = [];
  for (let i = 0; i < targetWidth; i++) {
    const t = (i / (targetWidth - 1)) * (values.length - 1);
    const lo = Math.floor(t);
    const hi = Math.ceil(t);
    const frac = t - lo;
    const a = values[lo]!;
    const b = values[hi]!;
    result.push(a + (b - a) * frac);
  }
  return result;
}

export type BarChartOptions = {
  width?: number;
  height?: number;
  char?: string;
  emptyChar?: string;
  labelWidth?: number;
};

/**
 * Mini horizontal bar chart: one row per label.
 */
export function miniBarChart(
  items: readonly { label: string; value: number }[],
  options: BarChartOptions = {},
): string[] {
  const { width = 20, char = "█", emptyChar = "░", labelWidth = 10 } = options;
  const maxVal = Math.max(...items.map((i) => i.value), 1);

  return items.map(({ label, value }) => {
    const barLen = Math.round((value / maxVal) * width);
    const bar = char.repeat(barLen) + emptyChar.repeat(Math.max(0, width - barLen));
    const lbl = label.slice(0, labelWidth).padEnd(labelWidth);
    return `${lbl} ${bar} ${value}`;
  });
}

/**
 * Single-line percentage bar.
 */
export function percentBar(ratio: number, width = 20, fill = "█", empty = "░"): string {
  const clamped = Math.max(0, Math.min(1, ratio));
  const filled = Math.round(clamped * width);
  return fill.repeat(filled) + empty.repeat(width - filled);
}

/**
 * Summary stats for a series.
 */
export function seriesStats(values: readonly number[]): {
  min: number;
  max: number;
  avg: number;
  last: number;
} {
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, last: 0 };
  }
  let min = values[0]!;
  let max = values[0]!;
  let sum = 0;
  for (const v of values) {
    min = Math.min(min, v);
    max = Math.max(max, v);
    sum += v;
  }
  return {
    min,
    max,
    avg: sum / values.length,
    last: values[values.length - 1]!,
  };
}
