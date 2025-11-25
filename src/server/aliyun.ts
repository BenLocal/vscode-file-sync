import * as vscode from "vscode";
import { Server, ServerConfig, ServerType } from "../serverFactory";
import path from "node:path";
import OSS from "ali-oss";
import { Readable } from "node:stream";
import { createReadStream } from "node:fs";

const matadataKeys = {
  accessKeyId: "accessKeyId",
  accessKeySecret: "accessKeySecret",
  endpoint: "endpoint",
  bucket: "bucket",
  region: "region",
};

export class AliyunServer implements Server {
  async uploadFile(
    context: vscode.ExtensionContext,
    serverConfig: ServerConfig,
    uri: vscode.Uri,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    fileSize: number
  ): Promise<void> {
    const fileName = path.basename(uri.fsPath);
    const stream = await this.getReadableStream(uri);
    this.attachProgress(stream, progress, fileSize, fileName);

    const accessKeyId = serverConfig.matadata[matadataKeys.accessKeyId];
    const accessKeySecret = serverConfig.matadata[matadataKeys.accessKeySecret];
    const endpoint = serverConfig.matadata[matadataKeys.endpoint];
    const bucket = serverConfig.matadata[matadataKeys.bucket];
    const region = serverConfig.matadata[matadataKeys.region];

    const oss = new OSS({
      accessKeyId: accessKeyId,
      accessKeySecret: accessKeySecret,
      endpoint: endpoint,
      bucket: bucket,
      region: region,
    });

    const result = await oss.putStream(fileName, stream);
    console.log(result);
    progress.report({ message: `上传完成 (${fileName})` });
  }

  async createAddServerCommand(
    _context: vscode.ExtensionContext
  ): Promise<ServerConfig | undefined> {
    const accessKeyId = await vscode.window.showInputBox({
      placeHolder: "请输入阿里云AccessKeyID",
      ignoreFocusOut: true,
    });
    if (!accessKeyId) {
      return;
    }
    const accessKeySecret = await vscode.window.showInputBox({
      placeHolder: "请输入阿里云AccessKeySecret",
      ignoreFocusOut: true,
      password: true,
    });
    if (!accessKeySecret) {
      return;
    }
    const endpoint = await vscode.window.showInputBox({
      placeHolder: "请输入阿里云Endpoint",
      ignoreFocusOut: true,
    });
    if (!endpoint) {
      return;
    }
    const bucket = await vscode.window.showInputBox({
      placeHolder: "请输入阿里云Bucket",
      ignoreFocusOut: true,
    });
    if (!bucket) {
      return;
    }
    const region = await vscode.window.showInputBox({
      placeHolder: "请输入阿里云Region",
      ignoreFocusOut: true,
    });
    if (!region) {
      return;
    }
    const name = await vscode.window.showInputBox({
      placeHolder: "请输入名称",
      ignoreFocusOut: true,
    });
    if (!name) {
      return;
    }
    if (!accessKeyId || !accessKeySecret || !endpoint || !bucket || !region) {
      return;
    }
    return {
      name: name,
      type: ServerType.Aliyun,
      matadata: {
        [matadataKeys.accessKeyId]: accessKeyId,
        [matadataKeys.accessKeySecret]: accessKeySecret,
        [matadataKeys.endpoint]: endpoint,
        [matadataKeys.bucket]: bucket,
        [matadataKeys.region]: region,
      },
    };
  }

  private async getReadableStream(uri: vscode.Uri): Promise<Readable> {
    if (uri.scheme === "file") {
      return createReadStream(uri.fsPath);
    }

    const file = await vscode.workspace.fs.readFile(uri);
    return Readable.from(Buffer.from(file));
  }

  private attachProgress(
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
          ? `上传完成 (${fileName})`
          : `上传中 (${percent.toFixed(0)}%)`,
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
  }
}
