import * as vscode from "vscode";
import { Server, ServerConfig } from "../serverFactory";
import { ProgressFileStream } from "../fileStream";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import SMB2 from "@marsaud/smb2";

const matadataKeys = {
  endpoint: "endpoint",
  username: "username",
  password: "password",
};

export class SMBServer implements Server {
  async openEditServerConfigUICommand(context: vscode.ExtensionContext,
    old_matadata: Record<string, string | null> | undefined): Promise<Record<string, string | null> | undefined> {
    const endpoint = await vscode.window.showInputBox({
      placeHolder: "Enter the endpoint",
      ignoreFocusOut: true,
      value: old_matadata?.[matadataKeys.endpoint] ?? undefined,
    });
    const username = await vscode.window.showInputBox({
      placeHolder: "Enter the username, optional",
      ignoreFocusOut: true,
      value: old_matadata?.[matadataKeys.username] ?? undefined,
    });
    const password = await vscode.window.showInputBox({
      placeHolder: "Enter the password, optional",
      ignoreFocusOut: true,
      password: true,
      value: old_matadata?.[matadataKeys.password] ?? undefined,
    });
    if (!endpoint) {
      return;
    }
    return {
      [matadataKeys.endpoint]: endpoint,
      [matadataKeys.username]: username ?? null,
      [matadataKeys.password]: password ?? null,
    };
  }

  async uploadFile(context: vscode.ExtensionContext,
    serverConfig: ServerConfig,
    uploadFile: string,
    file: ProgressFileStream): Promise<void> {
    const address = serverConfig.matadata[matadataKeys.endpoint]!;
    const username = serverConfig.matadata[matadataKeys.username] ?? "";
    const password = serverConfig.matadata[matadataKeys.password] ?? "";
    const client = new SMB2({
      share: address,
      username: username,
      password: password,
      domain: ""
    });

    try {
      const stream = await file.getStream();
      const write = await client.createWriteStream(uploadFile);
      stream.pipe(write);
      await new Promise<void>((resolve, reject) => {
        write.on("finish", resolve);
        write.on("error", reject);
      });
      vscode.window.showInformationMessage(
        `File ${uploadFile} uploaded successfully`
      );
    } finally {
      client.disconnect();
    }

  }

}
