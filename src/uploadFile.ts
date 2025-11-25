import * as vscode from 'vscode';
import path from 'node:path';

/**
 * 利用 VS Code TextDocument 接口读取文件内容并上传
 */
export async function uploadFile(uri: vscode.Uri | undefined) {
    try {
        if (!uri) {
            vscode.window.showWarningMessage('请在资源管理器中选中文件后再上传。');
            return;
        }

        const document = await vscode.workspace.openTextDocument(uri);
        const fileName = path.basename(document.uri.fsPath);

        const encoder = new TextEncoder();
        const buffer = encoder.encode(document.getText());

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `正在上传文件: ${fileName}`,
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0 });

            // 在这里实现实际的上传逻辑，例如将 buffer 上传到服务器

            // 模拟上传过程，使用 buffer.length 作为上传数据
            await new Promise(resolve => setTimeout(resolve, 1000));
            progress.report({ increment: 50, message: `上传 ${buffer.length} bytes...` });
            await new Promise(resolve => setTimeout(resolve, 1000));
            progress.report({ increment: 100 });
        });

        vscode.window.showInformationMessage(`文件上传成功: ${fileName} (${(buffer.length / 1024).toFixed(2)} KB)`);
    } catch (error) {
        vscode.window.showErrorMessage(`上传文件时出错: ${error instanceof Error ? error.message : String(error)}`);
    }
}