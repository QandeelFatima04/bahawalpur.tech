/**
 * Copies @ricky0123/vad-web and onnxruntime-web runtime assets into public/
 * so Next.js serves them at the site root.
 *
 * useMicVAD is configured with:
 *   baseAssetPath: "/"      → looks for /silero_vad_legacy.onnx, /vad.worklet.bundle.min.js
 *   onnxWASMBasePath: "/"   → looks for /ort-wasm*.wasm
 *
 * The Dockerfile already runs this as a shell one-liner; this script makes the
 * same copy happen automatically for local npm dev/build runs.
 *
 * Run: node scripts/copy-vad-assets.mjs
 */

import { cpSync, existsSync, mkdirSync, readdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pub = resolve(root, "public");
mkdirSync(pub, { recursive: true });

let copied = 0;

function copy(src, dest) {
  if (!existsSync(src)) return;
  cpSync(src, dest, { force: true });
  copied++;
}

// silero_vad.onnx and vad worklet
const vadDist = resolve(root, "node_modules/@ricky0123/vad-web/dist");
if (existsSync(vadDist)) {
  for (const file of readdirSync(vadDist)) {
    if (file.endsWith(".onnx") || file === "vad.worklet.bundle.min.js") {
      copy(resolve(vadDist, file), resolve(pub, file));
    }
  }
}

// ort-wasm*.wasm files
const onnxDist = resolve(root, "node_modules/onnxruntime-web/dist");
if (existsSync(onnxDist)) {
  for (const file of readdirSync(onnxDist)) {
    if (file.endsWith(".wasm")) {
      copy(resolve(onnxDist, file), resolve(pub, file));
    }
  }
}

if (copied > 0) {
  console.log(`[copy-vad-assets] copied ${copied} file(s) to public/`);
} else {
  console.log("[copy-vad-assets] no VAD assets found in node_modules (skipping)");
}
