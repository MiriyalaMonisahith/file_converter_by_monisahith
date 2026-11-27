import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { existsSync, statSync } from "fs";

const execFileAsync = promisify(execFile);

/**
 * Converts a PowerPoint presentation (.ppt, .pptx, .pps, .ppsx, .pptm) directly to PDF
 * using Microsoft PowerPoint's official built-in engine via COM automation.
 * Produces 100% exact, pixel-perfect slide matching identical to PowerPoint's "Save As PDF".
 */
export async function convertWithMicrosoftPowerPoint(
  inputPath: string,
  outputPath: string,
  timeoutMs = 60000
): Promise<boolean> {
  if (process.platform !== "win32") {
    return false;
  }

  const scriptPath = path.join(process.cwd(), "lib", "engines", "convert-ppt.ps1");
  if (!existsSync(scriptPath)) {
    return false;
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        scriptPath,
        "-InputPath",
        inputPath,
        "-OutputPath",
        outputPath,
      ],
      { timeout: timeoutMs }
    );

    if (existsSync(outputPath) && statSync(outputPath).size > 0) {
      return true;
    }
  } catch (err: any) {
    console.warn("Microsoft PowerPoint native engine error:", err?.message || err);
  }

  return false;
}
