import fs from "fs";

function readOptimizationState() {
  if (!fs.existsSync("./optimized-bolt-state.json")) return {};
  return JSON.parse(fs.readFileSync("./optimized-bolt-state.json", "utf-8"));
}

console.log("🖥️ État actuel de Bolt:");
console.table(readOptimizationState());
