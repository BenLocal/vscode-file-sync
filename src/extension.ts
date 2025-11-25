// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { uploadFile } from "./uploadFile";
import { addServerCommand } from "./serverEditor";

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  createStatusBarItem();

  const uploadFileCommand = vscode.commands.registerCommand(
    "vscode-file-sync.uploadFile",
    async (uri: vscode.Uri) => {
      await uploadFile(context, uri);
    }
  );
  context.subscriptions.push(uploadFileCommand);

  addServerCommand(context);
}

export function deactivate() {
  statusBarItem?.dispose();
}

function createStatusBarItem() {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );

  statusBarItem.text = "File Sync";
  statusBarItem.tooltip = "File Sync";
  statusBarItem.show();
}
