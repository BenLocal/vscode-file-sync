import * as vscode from "vscode";

export interface UploadHistoryItem {
  distPath: string;
  file: string;
  time: Date;
}

export class UploadHistory {
  private readonly _context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
  }

  public async add(file: string, distPath: string) {
    const key = this.getKey(file);

    let history = this.revive(
      this._context.globalState.get<UploadHistoryItem[]>(key) || []
    );

    let found = false;
    for (const item of history) {
      if (item.distPath === distPath) {
        item.time = new Date();
        found = true;
        break;
      }
    }

    if (!found) {
      history.push({
        distPath: distPath,
        file: file,
        time: new Date(),
      });
    }

    // 按时间排序（最新的在前），然后只保留最近的10个
    history.sort(
      (a, b) => b.time.getTime() - a.time.getTime()
    );
    history = history.slice(0, 10);

    await this._context.globalState.update(key, history);
  }

  public async get(file: string): Promise<UploadHistoryItem[]> {
    const key = this.getKey(file);
    const history =
      this._context.globalState.get<UploadHistoryItem[]>(key) || [];
    return this.revive(history);
  }

  private getKey(file: string): string {
    return `file.sync.history.${file}`;
  }

  private revive(history: UploadHistoryItem[]): UploadHistoryItem[] {
    return history.map((item) => ({
      ...item,
      time: item.time instanceof Date ? item.time : new Date(item.time),
    }));
  }
}
