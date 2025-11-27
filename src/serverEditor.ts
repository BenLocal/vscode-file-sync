import * as vscode from "vscode";
import { ServerFactory, ServerType } from "./serverFactory";

export function addServerCommand(context: vscode.ExtensionContext) {
  const addServerCommand = vscode.commands.registerCommand(
    "vscode-file-sync.addServer",
    async () => {
      const serverTypeOptions: vscode.QuickPickItem[] =
        ServerFactory.getServerTypeList();
      const selected = await vscode.window.showQuickPick(serverTypeOptions, {
        placeHolder: "Select a server type",
        ignoreFocusOut: true,
      });

      if (!selected) {
        return;
      }

      const serverType = selected.detail as ServerType;
      const server = ServerFactory.createServer(serverType);
      if (!server) {
        return;
      }

      const name = await vscode.window.showInputBox({
        placeHolder: "Enter a server name",
        ignoreFocusOut: true,
      });
      if (!name) {
        return;
      }
      const matadata = await server.openEditServerConfigUICommand(context, undefined);
      if (!matadata) {
        return;
      }

      const serverConfig = {
        name: name,
        type: serverType,
        matadata: matadata,
      };
      ServerFactory.updateServerConfig(context, serverConfig);
      vscode.window.showInformationMessage(
        `Server ${name} added successfully.`
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
      vscode.window.showInformationMessage("All servers have been cleared.");
    }
  );
  context.subscriptions.push(clearServerCommand);

  const editServerCommand = vscode.commands.registerCommand(
    "vscode-file-sync.editServer",
    async () => {
      const serverOptions = ServerFactory.getServerList(context).map((name) => ({
        label: name,
        detail: name,
      }));
      const selected = await vscode.window.showQuickPick(serverOptions, {
        placeHolder: "Select a server to edit",
        ignoreFocusOut: true,
      });
      if (!selected) {
        return;
      }
      const serverName = selected.detail;
      const old = ServerFactory.getServerConfig(context, serverName);
      const serverType = old?.type;
      if (!serverType) {
        return;
      }
      const server = ServerFactory.createServer(serverType);
      if (!server) {
        return;
      }
      const matadata = await server.openEditServerConfigUICommand(context, old?.matadata ?? undefined);
      if (!matadata) {
        return;
      }
      const serverConfig = {
        name: serverName,
        type: serverType,
        matadata: matadata,
      };
      ServerFactory.updateServerConfig(context, serverConfig);
      vscode.window.showInformationMessage(
        `Server ${serverName} edited successfully.`
      );
    }
  );
  context.subscriptions.push(editServerCommand);
}
