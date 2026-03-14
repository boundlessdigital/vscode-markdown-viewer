declare function acquireVsCodeApi(): {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
};

const vscode = acquireVsCodeApi();

export function post_message(type: string, payload: Record<string, any> = {}) {
  vscode.postMessage({ type, ...payload });
}

export function get_state<T>(): T | undefined {
  return vscode.getState() as T | undefined;
}

export function set_state<T>(state: T) {
  vscode.setState(state);
}
