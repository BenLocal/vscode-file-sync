import * as vscode from "vscode";
import path from "node:path";
import { ServerFactory } from "./serverFactory";
import { UploadHistory, UploadHistoryItem } from "./history";
import { FileSyncUtils } from "./utils";
import { ProgressFileStream } from "./fileStream";

export async function uploadFile(
  context: vscode.ExtensionContext,
  history: UploadHistory,
  uri: vscode.Uri | undefined
) {
  try {
    if (!uri) {
      return;
    }
    const serverOptions = ServerFactory.getServerList(context).map((name) => ({
      label: name,
      detail: name,
    }));

    const selected = await vscode.window.showQuickPick(serverOptions, {
      placeHolder: "Select a server",
      ignoreFocusOut: true,
    });
    if (!selected) {
      return;
    }
    const serverConfig = ServerFactory.getServerConfig(
      context,
      selected.detail
    );
    if (!serverConfig) {
      return;
    }
    const server = ServerFactory.createServer(serverConfig.type);
    if (!server) {
      return;
    }
    const fileName = path.basename(uri.fsPath);
    const his = await history.get(fileName);
    const uploadPath = await pickUploadPath(his);
    if (!uploadPath) {
      return;
    }
    const normalizedPath = toLinuxPath(uploadPath);

    const stat = await vscode.workspace.fs.stat(uri);
    const fileSize = stat.size;
    const start = Date.now();

    await history.add(fileName, normalizedPath);
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Uploading file: ${fileName}`,
        cancellable: false,
      },
      async (progress) => {
        progress.report({ message: "Preparing upload..." });
        try {
          const uploadFilePath = path.posix.join(uploadPath, fileName);
          const progressFileStream = new ProgressFileStream(
            uri,
            progress,
            fileSize
          );
          await server.uploadFile(
            context,
            serverConfig,
            uploadFilePath,
            progressFileStream
          );
        } catch (error) {
          const errorMesssage =
            error instanceof Error ? error.message : String(error);
          progress.report({
            message: `Upload failed (${fileName}): ${errorMesssage}`,
          });
          throw error;
        }
        progress.report({ message: `Upload completed (${fileName})` });
      }
    );
    const durationSec = ((Date.now() - start) / 1000).toFixed(2);
    FileSyncUtils.showTemporaryInformationMessage(
      `Upload completed: ${fileName} | Size: ${(stat.size / 1024).toFixed(
        2
      )} KB | Duration: ${durationSec} s`,
      3000
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to upload file: ${error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

async function pickUploadPath(
  historyItems: UploadHistoryItem[]
): Promise<string | undefined> {
  const quickPick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { value?: string }
  >();

  quickPick.items = historyItems.map((item) => ({
    label: item.distPath,
    description: new Date(item.time).toLocaleString(),
    value: item.distPath,
  }));
  quickPick.placeholder =
    "Select a previous path or type a new upload destination";
  quickPick.ignoreFocusOut = true;
  quickPick.matchOnDescription = true;
  quickPick.value = historyItems[0]?.distPath ?? "";

  return new Promise((resolve) => {
    quickPick.onDidAccept(() => {
      const selection = quickPick.selectedItems[0];
      const value = selection?.value ?? quickPick.value.trim();
      if (!value) {
        vscode.window.showWarningMessage("Please enter a valid upload path.");
        return;
      }
      resolve(value);
      quickPick.hide();
    });

    quickPick.onDidHide(() => {
      resolve(undefined);
      quickPick.dispose();
    });

    quickPick.show();
  });
}

function toLinuxPath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const segments = trimmed
    .split(/[\\/]+/)
    .filter((segment) => segment.length > 0);

  if (segments.length === 0) {
    return "";
  }

  return `/${segments.join("/")}`;
}
