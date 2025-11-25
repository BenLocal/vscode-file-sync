// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { uploadFile } from './uploadFile';

export function activate(context: vscode.ExtensionContext) {
    const uploadFileCommand = vscode.commands.registerCommand('vscode-file-sync.uploadFile', async (uri: vscode.Uri) => {
        await uploadFile(uri);
    });

    context.subscriptions.push(uploadFileCommand);
}

export function deactivate() { }
