import { Readable } from "node:stream";
import * as vscode from "vscode";
import { createReadStream } from "node:fs";


export class FileSyncUtils {
  /**
   * Show an information message that automatically disappears after the specified duration
   * @param message The message to display
   * @param duration Duration in milliseconds (default: 3000ms)
   */
  static showTemporaryInformationMessage(message: string, duration: number = 3000): void {
    vscode.window.setStatusBarMessage(`$(check) ${message}`, duration);
  }

  static async getReadableStream(uri: vscode.Uri): Promise<Readable> {
    if (uri.scheme === "file") {
      return createReadStream(uri.fsPath);
    }

    const file = await vscode.workspace.fs.readFile(uri);
    return Readable.from(Buffer.from(file));
  }

  static attachProgress(
    stream: Readable,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    totalBytes: number,
    fileName: string
  ) {
    if (!totalBytes || totalBytes <= 0) {
      return;
    }

    let uploaded = 0;
    let lastPercent = 0;

    const report = (done = false) => {
      const percent = done ? 100 : Math.min((uploaded / totalBytes) * 100, 100);
      if (percent <= lastPercent && !done) {
        return;
      }
      const increment = percent - lastPercent;
      if (increment <= 0) {
        return;
      }
      progress.report({
        increment,
        message: done
          ? `Upload completed (${fileName})`
          : `Uploading (${percent.toFixed(0)}%)`,
      });
      lastPercent = percent;
    };

    stream.on("data", (chunk: Buffer) => {
      uploaded += chunk.length;
      report();
    });

    stream.on("end", () => {
      report(true);
    });
    stream.on("error", (error) => {
      progress.report({ message: `Upload failed (${fileName}): ${error instanceof Error ? error.message : String(error)}` });
    });
  }
}
