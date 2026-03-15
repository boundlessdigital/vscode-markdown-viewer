// Provide the acquireVsCodeApi global that vscode_api.ts expects at module load time
(globalThis as any).acquireVsCodeApi = () => ({
  postMessage: () => {},
  getState: () => undefined,
  setState: () => {},
});
