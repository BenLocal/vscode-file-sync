import * as vscode from 'vscode';

export default class GlobalStore {
    private readonly _context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this._context = context;
    }

    get<T>(key: string): T | undefined {
        return this._context.globalState.get<T>(key);
    }


    keys(): readonly string[] {
        return this._context.globalState.keys();
    }
}
