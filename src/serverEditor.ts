import * as vscode from "vscode";
import { ServerFactory, ServerType } from "./serverFactory";

export function addServerCommand(context: vscode.ExtensionContext) {
  const addServerCommand = vscode.commands.registerCommand(
    "vscode-file-sync.addServer",
    async () => {
      const serverTypeOptions: vscode.QuickPickItem[] =
        ServerFactory.getServerList();
      const selected = await vscode.window.showQuickPick(serverTypeOptions, {
        placeHolder: "请选择服务器类型",
        ignoreFocusOut: true,
      });

      if (!selected) {
        return;
      }

      const serverType = selected.detail as ServerType;
      console.log(`选择的服务器类型: ${serverType}`);
      const server = ServerFactory.createServer(serverType);
      if (!server) {
        return;
      }
      const serverConfig = await server.createAddServerCommand(context);
      if (!serverConfig || !serverConfig.name) {
        return;
      }
      context.globalState.update(
        `file.sync.server.${serverConfig.name}`,
        serverConfig
      );
      vscode.window.showInformationMessage(
        `服务器${serverConfig.name}添加成功`
      );
    }
  );
  context.subscriptions.push(addServerCommand);

  const clearServerCommand = vscode.commands.registerCommand(
    "vscode-file-sync.clearServer",
    async () => {
      for (const key of context.globalState
        .keys()
        .filter((key) => key.startsWith("file.sync.server."))) {
        context.globalState.update(key, undefined);
      }
      vscode.window.showInformationMessage("服务器清除成功");
    }
  );
  context.subscriptions.push(clearServerCommand);
}
