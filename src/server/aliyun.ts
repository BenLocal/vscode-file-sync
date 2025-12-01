import * as vscode from "vscode";
import { Server, ServerConfig } from "../serverFactory";
import path from "node:path";
import OSS from "ali-oss";
import { ProgressFileStream } from "../fileStream";
import { FileSyncUtils } from "../utils";

const matadataKeys = {
  accessKeyId: "accessKeyId",
  accessKeySecret: "accessKeySecret",
  endpoint: "endpoint",
  bucket: "bucket",
  region: "region",
};

export class AliyunServer implements Server {
  async uploadFile(
    _context: vscode.ExtensionContext,
    serverConfig: ServerConfig,
    uploadFile: string,
    file: ProgressFileStream
  ): Promise<void> {
    const accessKeyId = serverConfig.matadata[matadataKeys.accessKeyId];
    const accessKeySecret = serverConfig.matadata[matadataKeys.accessKeySecret];
    const endpoint = serverConfig.matadata[matadataKeys.endpoint];
    const bucket = serverConfig.matadata[matadataKeys.bucket];
    const region = serverConfig.matadata[matadataKeys.region];

    const options: OSS.Options = {
      accessKeyId: accessKeyId!,
      accessKeySecret: accessKeySecret!,
      bucket: bucket!,
      region: region!,
    };

    if (endpoint) {
      options.endpoint = endpoint;
    }
    const oss = new OSS(options);

    const result = await oss.putStream(uploadFile, await file.getStream());

    const url = (result as { url?: string })?.url;
    const uploadFileName = path.basename(uploadFile);
    if (url) {
      const copy = "Copy Link";
      const open = "Open Link";
      const action = await vscode.window.showInformationMessage(
        `File ${uploadFileName} uploaded successfully: ${url}`,
        copy,
        open
      );

      if (action === copy) {
        await vscode.env.clipboard.writeText(url);
        FileSyncUtils.showTemporaryInformationMessage("Link copied to clipboard.", 3000);
      } else if (action === open) {
        vscode.env.openExternal(vscode.Uri.parse(url));
      }
    }
  }

  async openEditServerConfigUICommand(
    _context: vscode.ExtensionContext,
    old_matadata: Record<string, string | null> | undefined
  ): Promise<Record<string, string | null> | undefined> {
    const accessKeyId = await vscode.window.showInputBox({
      placeHolder: "Enter Aliyun AccessKey ID",
      ignoreFocusOut: true,
      value: old_matadata?.[matadataKeys.accessKeyId] ?? undefined,
    });
    if (!accessKeyId) {
      return;
    }
    const accessKeySecret = await vscode.window.showInputBox({
      placeHolder: "Enter Aliyun AccessKey Secret",
      ignoreFocusOut: true,
      password: true,
      value: old_matadata?.[matadataKeys.accessKeySecret] ?? undefined,
    });
    const bucket = await vscode.window.showInputBox({
      placeHolder: "Enter Aliyun Bucket",
      ignoreFocusOut: true,
      value: old_matadata?.[matadataKeys.bucket] ?? undefined,
    });
    const region = await vscode.window.showInputBox({
      placeHolder: "Enter Aliyun Region (e.g. oss-cn-shanghai)",
      ignoreFocusOut: true,
      value: old_matadata?.[matadataKeys.region] ?? undefined,
    });
    const endpoint: string | undefined = await vscode.window.showInputBox({
      placeHolder: "Enter Aliyun Endpoint (optional)",
      ignoreFocusOut: true,
      value: old_matadata?.[matadataKeys.endpoint] ?? undefined,
    });
    if (!accessKeyId || !accessKeySecret || !bucket || !region) {
      return;
    }
    return {
      [matadataKeys.accessKeyId]: accessKeyId,
      [matadataKeys.accessKeySecret]: accessKeySecret,
      [matadataKeys.endpoint]: endpoint ?? null,
      [matadataKeys.bucket]: bucket,
      [matadataKeys.region]: region,
    };
  }
}
