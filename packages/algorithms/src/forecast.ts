export interface SESInput {
  history: number[];
  alpha?: number;
  periods?: number;
}

export interface SESResult {
  fitted: number[];
  next: number[];
  lastLevel: number;
  confidence: number;
}

export function simpleExponentialSmoothing(input: SESInput): SESResult {
  const alpha = input.alpha ?? 0.3;
  const periods = input.periods ?? 1;
  if (alpha <= 0 || alpha >= 1) {
    throw new Error("alpha must be between 0 and 1");
  }
  if (input.history.length === 0) {
    return { fitted: [], next: Array(periods).fill(0), lastLevel: 0 };
  }

  const fitted: number[] = [];
  let level = input.history[0];
  fitted.push(level);

  for (let i = 1; i < input.history.length; i++) {
    level = alpha * input.history[i] + (1 - alpha) * level;
    fitted.push(level);
  }

  let totalError = 0;
  let totalActual = 0;
  for (let i = 0; i < input.history.length; i++) {
    totalError += Math.abs(input.history[i] - fitted[i]);
    totalActual += input.history[i];
  }

  const confidence = totalActual > 0 ? Math.max(0, 1 - totalError / totalActual) : 0;

  return {
    fitted,
    next: Array(periods).fill(level),
    lastLevel: level,
    confidence
  };
}
