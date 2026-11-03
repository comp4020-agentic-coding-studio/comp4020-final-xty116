import { spawnSync } from "node:child_process";

const credential = process.env.AI_API_KEY;
if (!credential) {
  console.log(
    "No model credential configured; keyword search remains available.",
  );
  process.exit(0);
}
const values = {
  AI_API_KEY: credential,
  AI_BASE_URL: process.env.AI_BASE_URL || "https://strproxy.comp.anu.edu.au",
  AI_MODEL: process.env.AI_MODEL || "claude-sonnet-5",
  AI_PROVIDER: process.env.AI_PROVIDER || "anthropic",
};
const input = Object.entries(values)
  .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
  .join("\n");
const result = spawnSync(
  "flyctl",
  ["secrets", "import", "--stage", "-a", "comp4020-final-xty116"],
  { input, encoding: "utf8" },
);
if (result.status !== 0) {
  console.error(
    "Could not stage model configuration. Check the Fly app token's permissions.",
  );
  process.exit(1);
}
console.log("Model configuration staged securely for this deployment.");
