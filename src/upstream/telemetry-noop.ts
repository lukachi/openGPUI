// lang-core's runtime telemetry is opt-in upstream; opengpui removes it entirely,
// so rendering never reaches the network on its own. Same exports as
// lang-core/src/telemetry/runtime.ts that the parser and prompt modules import.
export function prepareParserParseTelemetry(): undefined {
  return undefined;
}
export function captureParserParseResult(_context?: unknown, _result?: unknown): void {}
export function captureParserParseException(_context?: unknown): void {}
export function recordSystemPromptGeneration(_spec?: unknown, _inputShape?: unknown): void {}
