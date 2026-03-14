import path from "path";

const is_watch = process.argv.includes("--watch");

// Build 1: Extension host (Node target, CJS, vscode external)
const extension_result = await Bun.build({
  entrypoints: ["./src/extension.ts"],
  outdir: "./out",
  target: "node",
  external: ["vscode"],
  format: "cjs",
  minify: !is_watch,
});

if (!extension_result.success) {
  console.error("Extension build failed:");
  for (const log of extension_result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log("Extension build: OK");

// Build 2: Webview (Browser target)
const webview_result = await Bun.build({
  entrypoints: ["./src/webview/main.ts"],
  outdir: "./out/webview",
  target: "browser",
  minify: !is_watch,
});

if (!webview_result.success) {
  console.error("Webview build failed:");
  for (const log of webview_result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log("Webview build: OK");
console.log("Build complete.");
