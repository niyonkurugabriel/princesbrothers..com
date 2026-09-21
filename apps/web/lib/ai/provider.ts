/** Common metadata returned by every AI-assisted service. */
export type AiResultMeta = {
  provider: string;
  model: string;
  stub: boolean;
  confidence: number;
};

/** Implement this contract to connect a real model or ML vendor. */
export interface AiProvider<Input, Output> {
  readonly name: string;
  readonly model: string;
  run(input: Input): Promise<Output>;
}

export const stubMeta = (confidence = 0.5): AiResultMeta => ({
  provider: "stub",
  model: "deterministic-v1",
  stub: true,
  confidence
});

export const normalizeTokens = (value: string): string[] =>
  value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);