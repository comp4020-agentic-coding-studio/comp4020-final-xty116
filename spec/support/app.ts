import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";

export async function availablePort(): Promise<number> {
  const server = createServer().listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  server.close(); await once(server, "close"); return address.port;
}
export async function startApp(port: number, databasePath: string, env: Record<string, string> = {}): Promise<ChildProcessWithoutNullStreams> {
  const app = spawn(process.execPath, ["dist/server/entry.mjs"], { env: { ...process.env, HOST: "127.0.0.1", PORT: String(port), DATABASE_PATH: databasePath, ...env } });
  let output = ""; app.stdout.on("data", chunk => output += chunk); app.stderr.on("data", chunk => output += chunk);
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}`)).ok) return app; } catch { /* Await the production listener. */ }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  app.kill(); throw new Error(`App startup failed: ${output}`);
}
export async function stopApp(app: ChildProcessWithoutNullStreams): Promise<void> {
  const exited = once(app, "exit"); app.kill("SIGTERM");
  await Promise.race([exited, new Promise<void>(resolve => setTimeout(() => { app.kill("SIGKILL"); resolve(); }, 1000))]);
}
