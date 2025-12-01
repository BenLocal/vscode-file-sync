import * as vscode from "vscode";
import { Server, ServerConfig } from "../serverFactory";
import { ProgressFileStream } from "../fileStream";
import * as Minio from "minio";
import { FileSyncUtils } from "../utils";

const matadataKeys = {
  accessKeyId: "accessKeyId",
  accessKeySecret: "accessKeySecret",
  endpoint: "endpoint",
  bucket: "bucket",
  port: "port",
  useSSL: "useSSL",
};

export class MinioServer implements Server {
  async openEditServerConfigUICommand(context: vscode.ExtensionContext,
    old_matadata: Record<string, string | null> | undefined): Promise<Record<string, string | null> | undefined> {
    const accessKeyId = await vscode.window.showInputBox({
      placeHolder: "Enter Minio AccessKey ID",
      ignoreFocusOut: true,
      value: old_matadata?.[matadataKeys.accessKeyId] ?? undefined,
    });
    const accessKeySecret = await vscode.window.showInputBox({
      placeHolder: "Enter Minio AccessKey Secret",
      ignoreFocusOut: true,
      password: true,
      value: old_matadata?.[matadataKeys.accessKeySecret] ?? undefined,
    });
    const endpoint = await vscode.window.showInputBox({
      placeHolder: "Enter Minio Endpoint",
      ignoreFocusOut: true,
      value: old_matadata?.[matadataKeys.endpoint] ?? undefined,
    });
    const bucket = await vscode.window.showInputBox({
      placeHolder: "Enter Minio Bucket",
      ignoreFocusOut: true,
      value: old_matadata?.[matadataKeys.bucket] ?? undefined,
    });
    let port = await vscode.window.showInputBox({
      placeHolder: "Enter Minio Port, default is 9000",
      ignoreFocusOut: true,
      value: old_matadata?.[matadataKeys.port] ?? undefined,
    });
    if (!port || Number.isNaN(port)) {
      port = "9000";
    }
    const useSSL = await vscode.window.showInputBox({
      placeHolder: "Enter Minio Use SSL, default is false",
      ignoreFocusOut: true,
      value: old_matadata?.[matadataKeys.useSSL] ?? undefined,
    });
    if (!accessKeyId || !accessKeySecret || !endpoint || !bucket || !port) {
      return;
    }
    return {
      [matadataKeys.accessKeyId]: accessKeyId,
      [matadataKeys.accessKeySecret]: accessKeySecret,
      [matadataKeys.endpoint]: endpoint,
      [matadataKeys.bucket]: bucket,
      [matadataKeys.port]: port ?? null,
      [matadataKeys.useSSL]: useSSL ?? null,
    };
  }

  async uploadFile(context: vscode.ExtensionContext,
    serverConfig: ServerConfig,
    uploadFile: string,
    file: ProgressFileStream): Promise<void> {
    let portRaw = serverConfig.matadata[matadataKeys.port];
    let port = 9000;
    if (typeof portRaw === "string") {
      const parsedPort = Number.parseInt(portRaw, 10);
      if (!Number.isNaN(parsedPort)) {
        port = parsedPort;
      }
    } else if (typeof portRaw === "number" && !Number.isNaN(portRaw)) {
      port = portRaw;
    }
    const useSSL = serverConfig.matadata[matadataKeys.useSSL]?.toLowerCase() === "true";
    const minioClient = new Minio.Client({
      endPoint: serverConfig.matadata[matadataKeys.endpoint]!,
      port: port,
      useSSL: useSSL,
      accessKey: serverConfig.matadata[matadataKeys.accessKeyId] ?? undefined,
      secretKey: serverConfig.matadata[matadataKeys.accessKeySecret] ?? undefined,
    });

    const bucket = serverConfig.matadata[matadataKeys.bucket]!;
    const stream = await file.getStream();
    const fileSize = file.getSize();
    const res = await minioClient.putObject(bucket, uploadFile, stream, fileSize);
    if (res.etag) {
      // Generate presigned URL for download (valid for 7 days)
      const expiry = 7 * 24 * 60 * 60; // 7 days in seconds
      const url = await minioClient.presignedGetObject(bucket, uploadFile, expiry);

      const copy = "Copy Link";
      const open = "Open Link";
      const action = await vscode.window.showInformationMessage(
        `File ${uploadFile} uploaded successfully: ${url}`,
        copy,
        open
      );
      if (action === copy) {
        await vscode.env.clipboard.writeText(url);
        FileSyncUtils.showTemporaryInformationMessage("Link copied to clipboard.", 3000);
      } else if (action === open) {
        vscode.env.openExternal(vscode.Uri.parse(url));
      }
    } else {
      throw new Error("Failed to upload file");
    }
  }
}
