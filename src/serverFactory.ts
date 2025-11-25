import * as vscode from "vscode";
import { AliyunServer } from "./server/aliyun";

export enum ServerType {
  Aliyun = "aliyun",
}

export interface ServerConfig {
  name: string;
  type: ServerType;
  matadata: Record<string, string>;
}

export class ServerFactory {
  static readonly _serverList: Map<
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
        name: "阿里云OSS",
        icon: "cloud",
        description: "使用阿里云对象存储服务",
        creater: () => new AliyunServer(),
      },
    ],
  ]);

  static getServerList(): vscode.QuickPickItem[] {
    return Array.from(this._serverList.keys()).map((key) => {
      const server = this._serverList.get(key);
      return {
        label: server?.name || "",
        description: server?.description || "",
        detail: key,
      };
    });
  }

  static createServer(type: ServerType): Server | undefined {
    const config = this._serverList.get(type);
    if (!config) {
      return undefined;
    }
    return config.creater();
  }
}

export interface Server {
  createAddServerCommand(
    context: vscode.ExtensionContext
  ): Promise<ServerConfig | undefined>;

  uploadFile(
    context: vscode.ExtensionContext,
    serverConfig: ServerConfig,
    uri: vscode.Uri,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    fileSize: number
  ): Promise<void>;
}
