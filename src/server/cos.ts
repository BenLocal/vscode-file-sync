import * as vscode from "vscode";
import { Server, ServerConfig } from "../serverFactory";
import { ProgressFileStream } from "../fileStream";
import COS from "cos-nodejs-sdk-v5";
import { FileSyncUtils } from "../utils";

const matadataKeys = {
  secretId: "secretId",
  secretKey: "secretKey",
  bucket: "bucket",
  region: "region",
};

export class COSServer implements Server {
  async openEditServerConfigUICommand(
    context: vscode.ExtensionContext,
    old_matadata: Record<string, string | null> | undefined
  ): Promise<Record<string, string | null> | undefined> {
    const secretId = await vscode.window.showInputBox({
      placeHolder: "Enter COS SecretId",
      ignoreFocusOut: true,
      value: old_matadata?.[matadataKeys.secretId] ?? undefined,
    });
    const secretKey = await vscode.window.showInputBox({
      placeHolder: "Enter COS SecretKey",
      ignoreFocusOut: true,
      value: old_matadata?.[matadataKeys.secretKey] ?? undefined,
    });
    const bucket = await vscode.window.showInputBox({
      placeHolder: "Enter COS Bucket",
      ignoreFocusOut: true,
      value: old_matadata?.[matadataKeys.bucket] ?? undefined,
    });
    const region = await vscode.window.showInputBox({
      placeHolder: "Enter COS Region",
      ignoreFocusOut: true,
      value: old_matadata?.[matadataKeys.region] ?? undefined,
    });

    if (!secretId || !secretKey || !bucket || !region) {
      return;
    }
    return {
      [matadataKeys.secretId]: secretId,
      [matadataKeys.secretKey]: secretKey,
      [matadataKeys.bucket]: bucket,
      [matadataKeys.region]: region,
    };
  }
  async uploadFile(
    context: vscode.ExtensionContext,
    serverConfig: ServerConfig,
    uploadFile: string,
    file: ProgressFileStream
  ): Promise<void> {
    const secretId = serverConfig.matadata[matadataKeys.secretId];
    const secretKey = serverConfig.matadata[matadataKeys.secretKey];
    const bucket = serverConfig.matadata[matadataKeys.bucket];
    const region = serverConfig.matadata[matadataKeys.region];
    const cos = new COS({
      SecretId: secretId ?? undefined,
      SecretKey: secretKey ?? undefined,
    });
    cos.putObject(
      {
        Bucket: bucket!,
        Region: region!,
        Body: await file.getStream(),
        Key: uploadFile,
      },
      async (err, data) => {
        if (err) {
          vscode.window.showErrorMessage(
            "Failed to upload file: " + err.message
          );
        } else {
          if (!data?.Location) {
            vscode.window.showErrorMessage("Failed to get file URL");
            return;
          }
          const url = "https://" + data?.Location;
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
        }
      }
    );
  }
}
