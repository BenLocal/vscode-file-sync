import * as vscode from "vscode";
import { Server, ServerConfig, ServerType } from "../serverFactory";
import path from "node:path";
import OSS from "ali-oss";
import { FileSyncUtils } from "../utils";

const matadataKeys = {
  accessKeyId: "accessKeyId",
  accessKeySecret: "accessKeySecret",
  endpoint: "endpoint",
  bucket: "bucket",
  region: "region",
};

export class AliyunServer implements Server {
  async uploadFile(
    context: vscode.ExtensionContext,
    serverConfig: ServerConfig,
    uri: vscode.Uri,
    uploadPath: string,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    fileSize: number
  ): Promise<void> {
    const fileName = path.basename(uri.fsPath);
    const stream = await FileSyncUtils.getReadableStream(uri);
    FileSyncUtils.attachProgress(stream, progress, fileSize, fileName);

    const accessKeyId = serverConfig.matadata[matadataKeys.accessKeyId];
    const accessKeySecret = serverConfig.matadata[matadataKeys.accessKeySecret];
    const endpoint = serverConfig.matadata[matadataKeys.endpoint];
    const bucket = serverConfig.matadata[matadataKeys.bucket];
    const region = serverConfig.matadata[matadataKeys.region];

    const options: OSS.Options = {
      accessKeyId: accessKeyId!,
      accessKeySecret: accessKeySecret!,
      bucket: bucket!,
      region: region!,
    };

    if (endpoint) {
      options.endpoint = endpoint;
    }
    const oss = new OSS(options);
    const uploadFile = path.posix.join(uploadPath, fileName);
    const result = await oss.putStream(uploadFile, stream);

    progress.report({ message: `上传完成 (${fileName})` });

    const url = (result as { url?: string })?.url;
    if (url) {
      const copy = "复制链接";
      const open = "打开链接";
      const action = await vscode.window.showInformationMessage(
        `文件上传成功: ${fileName}\n${url}`,
        { modal: true },
        copy,
        open
      );

      if (action === copy) {
        await vscode.env.clipboard.writeText(url);
        vscode.window.showInformationMessage("链接已复制到剪贴板");
      } else if (action === open) {
        vscode.env.openExternal(vscode.Uri.parse(url));
      }
    }
  }

  async createAddServerCommand(
    _context: vscode.ExtensionContext
  ): Promise<ServerConfig | undefined> {
    const accessKeyId = await vscode.window.showInputBox({
      placeHolder: "请输入阿里云AccessKeyID",
      ignoreFocusOut: true,
    });
    if (!accessKeyId) {
      return;
    }
    const accessKeySecret = await vscode.window.showInputBox({
      placeHolder: "请输入阿里云AccessKeySecret",
      ignoreFocusOut: true,
      password: true,
    });
    const bucket = await vscode.window.showInputBox({
      placeHolder: "请输入阿里云Bucket",
      ignoreFocusOut: true,
    });
    const region = await vscode.window.showInputBox({
      placeHolder: "请输入阿里云Region",
      ignoreFocusOut: true,
    });
    const name = await vscode.window.showInputBox({
      placeHolder: "请输入名称",
      ignoreFocusOut: true,
    });
    const endpoint: string | undefined = await vscode.window.showInputBox({
      placeHolder: "请输入阿里云Endpoint",
      ignoreFocusOut: true,
    });
    if (!accessKeyId || !accessKeySecret || !bucket || !region || !name) {
      return;
    }
    return {
      name: name,
      type: ServerType.Aliyun,
      matadata: {
        [matadataKeys.accessKeyId]: accessKeyId,
        [matadataKeys.accessKeySecret]: accessKeySecret,
        [matadataKeys.endpoint]: endpoint ?? null,
        [matadataKeys.bucket]: bucket,
        [matadataKeys.region]: region,
      },
    };
  }

}
