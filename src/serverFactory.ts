import * as vscode from "vscode";
import { AliyunServer } from "./server/aliyun";
import { Readable } from "node:stream";
import { SftpServer } from "./server/sftp";

export enum ServerType {
  Aliyun = "aliyun",
  Sftp = "sftp",
}

export interface ServerConfig {
  name: string;
  type: ServerType;
  matadata: Record<string, string | null>;
}

export class ServerFactory {
  static readonly _serverTypeList: Map<
    ServerType,
    {
      name: string;
      icon: string;
      description: string;
      creater: () => Server;
    }
  > = new Map([
    [
      ServerType.Aliyun,
      {
        name: "Aliyun OSS",
        icon: "cloud",
        description: "Upload files to Aliyun Object Storage Service",
        creater: () => new AliyunServer(),
      },
    ],
    [
      ServerType.Sftp,
      {
        name: "SFTP",
        icon: "cloud",
        description: "Upload files to SFTP server",
        creater: () => new SftpServer(),
      },
    ],
  ]);

  static getServerTypeList(): vscode.QuickPickItem[] {
    return Array.from(this._serverTypeList.keys()).map((key) => {
      const server = this._serverTypeList.get(key);
      return {
        label: server?.name || "",
        description: server?.description || "",
        detail: key,
      };
    });
  }

  static createServer(type: ServerType): Server | undefined {
    const config = this._serverTypeList.get(type);
    if (!config) {
      return undefined;
    }
    return config.creater();
  }

  static getServerList(context: vscode.ExtensionContext): string[] {
    const serverOptions = context.globalState
      .keys()
      .filter((key) => key.startsWith("file.sync.server."))
      .map((key) => {
        return key.substring("file.sync.server.".length);
      });

    if (!serverOptions) {
      return [];
    }
    return serverOptions.sort((a, b) => a.localeCompare(b));
  }

  static getServerConfig(context: vscode.ExtensionContext, name: string): ServerConfig | undefined {
    if (!name) {
      return undefined;
    }

    return context.globalState.get<ServerConfig>(
      `file.sync.server.${name}`
    );
  }

  static updateServerConfig(context: vscode.ExtensionContext, serverConfig: ServerConfig | undefined) {
    if (!serverConfig) {
      return;
    }
    const name = serverConfig.name;
    if (!name) {
      return;
    }
    context.globalState.update(`file.sync.server.${name}`, serverConfig);
  }

  static deleteServerConfig(context: vscode.ExtensionContext, name: string) {
    if (!name) {
      return;
    }
    context.globalState.update(`file.sync.server.${name}`, undefined);
  }
}

export interface Server {
  openEditServerConfigUICommand(
    context: vscode.ExtensionContext,
    old_matadata: Record<string, string | null> | undefined
  ): Promise<Record<string, string | null> | undefined>;

  uploadFile(
    context: vscode.ExtensionContext,
    serverConfig: ServerConfig,
    uploadFile: string,
    getFileStream: () => Promise<Readable>,
  ): Promise<void>;
}
