import { PassThrough, Readable } from "node:stream";
import * as vscode from "vscode";
import { FileSyncUtils } from "./utils";
import path from "node:path";

export class ProgressFileStream {
  private readonly _uri: vscode.Uri;
  private readonly _progress: vscode.Progress<{
    message?: string;
    increment?: number;
  }>;
  private readonly _fileSize: number;
  private readonly _fileName: string;

  constructor(
    uri: vscode.Uri,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    fileSize: number
  ) {
    this._uri = uri;
    this._progress = progress;
    this._fileSize = fileSize;
    this._fileName = path.basename(uri.fsPath);
  }

  async getStream(): Promise<Readable> {
    const stream = await FileSyncUtils.getReadableStream(this._uri);
    const tracked = new PassThrough();
    FileSyncUtils.attachProgress(
      tracked,
      this._progress,
      this._fileSize,
      this._fileName
    );
    stream.pipe(tracked);
    return tracked;
  }

  getSize(): number {
    return this._fileSize;
  }

  getPath(): string {
    return this._uri.fsPath;
  }
}
