import * as vscode from "vscode";
import { Server, ServerConfig } from "../serverFactory";
import Client from "ssh2-sftp-client";
import { FileSyncUtils } from "../utils";
import path from "node:path";
import { Readable } from "node:stream";

const matadataKeys = {
  host: "host",
  port: "port",
  username: "username",
  password: "password",
  privateKey: "privateKey",
  passphrase: "passphrase",
  remotePath: "remotePath",
};


export class SftpServer implements Server {

  async openEditServerConfigUICommand(context: vscode.ExtensionContext, old_matadata: Record<string, string | null> | undefined): Promise<Record<string, string | null> | undefined> {
    const host = await vscode.window.showInputBox({
      placeHolder: "Enter the host",
      ignoreFocusOut: true,
      value: old_matadata?.[matadataKeys.host] ?? undefined,
    });
    if (!host) {
      return;
    }

    const port = await vscode.window.showInputBox({
      placeHolder: "Enter the port, default is 22",
      ignoreFocusOut: true,
      value: old_matadata?.[matadataKeys.port] ?? undefined,
    });

    let portNumber = 22;
    if (port && !Number.isNaN(port)) {
      portNumber = Number(port);
    }

    let username = await vscode.window.showInputBox({
      placeHolder: "Enter the username, default is root",
      ignoreFocusOut: true,
      value: old_matadata?.[matadataKeys.username] ?? undefined,
    });
    if (!username) {
      username = "root";
    }

    const password = await vscode.window.showInputBox({
      placeHolder: "Enter the password",
      ignoreFocusOut: true,
      password: true,
      value: old_matadata?.[matadataKeys.password] ?? undefined,
    });
    if (!password) {
      return;
    }

    return {
      [matadataKeys.host]: host,
      [matadataKeys.port]: portNumber.toString(),
      [matadataKeys.username]: username,
      [matadataKeys.password]: password,
    };
  }


  async uploadFile(context: vscode.ExtensionContext,
    serverConfig: ServerConfig,
    uploadFile: string,
    getFileStream: () => Promise<Readable>): Promise<void> {
    const host = serverConfig.matadata[matadataKeys.host] ?? undefined;
    const port = Number(serverConfig.matadata[matadataKeys.port]);
    const username = serverConfig.matadata[matadataKeys.username] ?? "root";
    const password = serverConfig.matadata[matadataKeys.password] ?? undefined;

    let client: Client | null = null;
    try {
      client = new Client();
      await client.connect({
        host: host,
        port: Number.isNaN(port) ? 22 : port,
        username: username,
        password: password,
      });
      // check if the directory exists
      const parentDir = path.dirname(uploadFile);
      const exists = await client.exists(parentDir);
      if (!exists) {
        await client.mkdir(parentDir, true);
      }

      const result = await client.put(await getFileStream(), uploadFile);
      if (result) {
        vscode.window.showInformationMessage(`File ${uploadFile} uploaded successfully`);
      } else {
        throw new Error("Failed to upload file");
      }
    } finally {
      if (client) {
        await client.end();
      }
    }
  }
}
