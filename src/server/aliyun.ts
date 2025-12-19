import * as vscode from "vscode";
import { Server, ServerConfig } from "../serverFactory";
import path from "node:path";
import OSS from "ali-oss";
import { ProgressFileStream } from "../fileStream";
import { FileSyncUtils } from "../utils";

const matadataKeys = {
  accessKeyId: "accessKeyId",
  accessKeySecret: "accessKeySecret",
  endpoint: "endpoint",
  bucket: "bucket",
  region: "region",
};

export class AliyunServer implements Server {
  /**
   * 基于 stream 的分片上传
   */
  private async multipartUploadStream(
    oss: OSS,
    uploadFile: string,
    stream: NodeJS.ReadableStream,
    fileSize: number,
    options?: {
      partSize?: number;
      parallel?: number;
      timeout?: number;
    }
  ): Promise<OSS.CompleteMultipartUploadResult> {
    const partSize = options?.partSize ?? 1024 * 1024 * 5; // 默认 5MB per part
    const parallel = options?.parallel ?? 4; // 默认并行上传 4 个分片
    const timeout = options?.timeout ?? 120000;

    // 初始化分片上传
    const initResult = await oss.initMultipartUpload(uploadFile, {
      timeout: timeout,
    });

    const uploadId = initResult.uploadId;

    try {
      // 读取 stream 数据到 chunks
      const chunks: Buffer[] = [];

      // 从 stream 读取所有数据
      await new Promise<void>((resolve, reject) => {
        stream.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });
        stream.on("end", () => resolve());
        stream.on("error", reject);
      });

      // 合并所有 chunks 为一个 buffer
      const buffer = Buffer.concat(chunks);

      // 计算分片数量
      const totalParts = Math.ceil(fileSize / partSize);
      const parts: Array<{ number: number; etag: string }> = [];

      // 并行上传分片
      const uploadPromises: Promise<void>[] = [];

      for (let i = 0; i < totalParts; i++) {
        const partNo = i + 1;
        const start = i * partSize;
        const end = Math.min(start + partSize, fileSize);
        const partBuffer = buffer.subarray(start, end);

        // 创建上传任务
        const uploadPromise = oss
          .uploadPart(uploadFile, uploadId, partNo, partBuffer, 0, partBuffer.length, {
            timeout: timeout,
          })
          .then((result) => {
            parts.push({
              number: partNo,
              etag: result.etag,
            });
          })
          .catch((err) => {
            throw err;
          });

        uploadPromises.push(uploadPromise);

        // 控制并行数量
        if (uploadPromises.length >= parallel || i === totalParts - 1) {
          await Promise.all(uploadPromises);
          uploadPromises.length = 0;
        }
      }

      // 确保所有分片都上传完成
      if (uploadPromises.length > 0) {
        await Promise.all(uploadPromises);
      }

      // 按分片编号排序
      parts.sort((a, b) => a.number - b.number);

      // 完成分片上传
      return await oss.completeMultipartUpload(uploadFile, uploadId, parts, {
        timeout: timeout,
      });
    } catch (error) {
      // 如果上传失败，尝试取消上传
      try {
        await oss.abortMultipartUpload(uploadFile, uploadId);
      } catch {
        // 忽略取消上传的错误，因为主要错误已经发生
      }
      throw error;
    }
  }

  async uploadFile(
    _context: vscode.ExtensionContext,
    serverConfig: ServerConfig,
    uploadFile: string,
    file: ProgressFileStream
  ): Promise<void> {
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

    let oss: OSS | null = null;
    try {
      oss = new OSS(options);

      const stream = await file.getStream();
      const fileSize = file.getSize();

      // 使用分片上传方法
      const result = await this.multipartUploadStream(oss, uploadFile, stream, fileSize, {
        partSize: 1024 * 1024 * 5, // 5MB per part
        parallel: 4, // 并行上传的分片数量
        timeout: 120000,
      });

      // 使用 generateObjectUrl 获取对象的访问 URL
      const url = oss.generateObjectUrl(result.name);
      const uploadFileName = path.basename(uploadFile);
      if (url) {
        const copy = "Copy Link";
        const open = "Open Link";
        const action = await vscode.window.showInformationMessage(
          `File ${uploadFileName} uploaded successfully: ${url}`,
          copy,
          open
        );

        if (action === copy) {
          await vscode.env.clipboard.writeText(url);
          FileSyncUtils.showTemporaryInformationMessage("Link copied to clipboard.", 3000);
        } else if (action === open) {
          vscode.env.openExternal(vscode.Uri.parse(url));
        }
      }
    } finally {
      if (oss) {
        oss = null;
      }
    }
  }

  async openEditServerConfigUICommand(
    _context: vscode.ExtensionContext,
    old_matadata: Record<string, string | null> | undefined
  ): Promise<Record<string, string | null> | undefined> {
    const accessKeyId = await vscode.window.showInputBox({
      placeHolder: "Enter Aliyun AccessKey ID",
      ignoreFocusOut: true,
      value: old_matadata?.[matadataKeys.accessKeyId] ?? undefined,
    });
    if (!accessKeyId) {
      return;
    }
    const accessKeySecret = await vscode.window.showInputBox({
      placeHolder: "Enter Aliyun AccessKey Secret",
      ignoreFocusOut: true,
      password: true,
      value: old_matadata?.[matadataKeys.accessKeySecret] ?? undefined,
    });
    const bucket = await vscode.window.showInputBox({
      placeHolder: "Enter Aliyun Bucket",
      ignoreFocusOut: true,
      value: old_matadata?.[matadataKeys.bucket] ?? undefined,
    });
    const region = await vscode.window.showInputBox({
      placeHolder: "Enter Aliyun Region (e.g. oss-cn-shanghai)",
      ignoreFocusOut: true,
      value: old_matadata?.[matadataKeys.region] ?? undefined,
    });
    const endpoint: string | undefined = await vscode.window.showInputBox({
      placeHolder: "Enter Aliyun Endpoint (optional)",
      ignoreFocusOut: true,
      value: old_matadata?.[matadataKeys.endpoint] ?? undefined,
    });
    if (!accessKeyId || !accessKeySecret || !bucket || !region) {
      return;
    }
    return {
      [matadataKeys.accessKeyId]: accessKeyId,
      [matadataKeys.accessKeySecret]: accessKeySecret,
      [matadataKeys.endpoint]: endpoint ?? null,
      [matadataKeys.bucket]: bucket,
      [matadataKeys.region]: region,
    };
  }
}
