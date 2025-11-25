import * as vscode from "vscode";
import path from "node:path";
import { ServerConfig, ServerFactory } from "./serverFactory";

/**
 * 利用 VS Code TextDocument 接口读取文件内容并上传
 */
export async function uploadFile(
  context: vscode.ExtensionContext,
  uri: vscode.Uri | undefined
) {
  try {
    if (!uri) {
      return;
    }
    const serverOptions = context.globalState
      .keys()
      .filter((key) => key.startsWith("file.sync.server."))
      .map((key) => {
        const name = key.substring("file.sync.server.".length);
        return {
          label: name,
          detail: name,
        };
      });

    const selected = await vscode.window.showQuickPick(serverOptions, {
      placeHolder: "请选择服务器",
      ignoreFocusOut: true,
    });
    if (!selected) {
      return;
    }
    const serverName = selected.detail;
    const serverConfig = context.globalState.get<ServerConfig>(
      `file.sync.server.${serverName}`
    );
    if (!serverConfig) {
      return;
    }

    const server = ServerFactory.createServer(serverConfig.type);
    if (!server) {
      return;
    }
    const fileName = path.basename(uri.fsPath);
    const stat = await vscode.workspace.fs.stat(uri);
    const start = Date.now();
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `正在上传文件: ${fileName}`,
        cancellable: false,
      },
      async (progress) => {
        progress.report({ message: "准备上传..." });
        await server.uploadFile(
          context,
          serverConfig,
          uri,
          progress,
          stat.size
        );
      }
    );
    const durationSec = ((Date.now() - start) / 1000).toFixed(2);
    vscode.window.showInformationMessage(
      `文件上传成功: ${fileName}\n大小: ${(stat.size / 1024).toFixed(
        2
      )} KB\n耗时: ${durationSec} s`
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `上传文件时出错: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
