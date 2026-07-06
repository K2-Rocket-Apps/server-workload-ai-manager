import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { isLocalPveHost } from "./local.js";

const execFileAsync = promisify(execFile);

export type HostExecResult = {
  exitcode: number;
  stdout: string;
  stderr: string;
};

/** Run a command on the Proxmox host (argv array, no shell). */
export async function hostExec(command: string[], timeoutMs = 30_000): Promise<HostExecResult> {
  if (!isLocalPveHost()) {
    throw new Error(
      "Host shell exec only works when Mistral runs on the Proxmox node (local pvesh mode)",
    );
  }
  if (!command.length) throw new Error("command array cannot be empty");

  const [bin, ...args] = command;
  try {
    const { stdout, stderr } = await execFileAsync(bin, args, {
      maxBuffer: 4 * 1024 * 1024,
      timeout: timeoutMs,
      env: process.env,
    });
    return { exitcode: 0, stdout, stderr };
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stdout?: string; stderr?: string; code?: number };
    return {
      exitcode: typeof e.code === "number" ? e.code : 1,
      stdout: e.stdout ?? "",
      stderr: (e.stderr ?? e.message ?? "host exec failed").trim(),
    };
  }
}
