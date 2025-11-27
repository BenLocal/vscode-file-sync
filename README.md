# VS Code File Sync

VS Code File Sync lets you push any local file to a remote Object Storage Service directly from the Explorer context menu. The first release targets Aliyun OSS and guides you through storing credentials, choosing upload paths, streaming file contents, and copying the resulting public URL.

## Key Features

- **One-click uploads** – right-click a file and choose `File-Sync: Upload File To Server`.
- **Server profiles** – securely store multiple Aliyun OSS credentials in VS Code `globalState`.
- **Smart destination picker** – choose from the last 10 destinations per file or type a new Linux-style path.
- **Progress reporting** – uploads stream data and track progress via VS Code notifications.
- **Result dialog** – once OSS returns a URL, a modal dialog shows it with actions to copy or open.

## Requirements

- Visual Studio Code `1.73+`

## Supported Servers

- Aliyun OSS
- SFTP
- COS(Tencent Cloud Object Storage)

## Getting Started

1. Install this extension from VSIX or the Marketplace (when available).
2. Open the Command Palette (`Ctrl/Cmd+Shift+P`) and run **`File-Sync: Add Server`**.
3. Select _Aliyun OSS_ and enter:
   - AccessKey ID & AccessKey Secret
   - Bucket name
   - Region (e.g. `oss-cn-shanghai`)
   - Optional custom endpoint
   - Friendly server name
4. In the Explorer, right-click a file and choose **Upload File To Server**.
5. Pick the server profile, pick or type the remote path, and watch the upload progress notification.
6. Copy or open the URL from the completion dialog.

## Commands

| Command                            | Description                                                           |
| ---------------------------------- | --------------------------------------------------------------------- |
| `File-Sync: Upload File To Server` | Upload the selected file. Also exposed via the Explorer context menu. |
| `File-Sync: Add Server`            | Register a new server profile (currently Aliyun OSS).                 |
| `File-Sync: Edit Server`           | Placeholder for editing existing profiles.                            |
| `File-Sync: Delete Server`         | Placeholder for removing a single profile.                            |
| `File-Sync: Clear Server`          | Remove all saved profiles.                                            |

## Upload Workflow

1. **Server selection** – keys under `file.sync.server.*` are discovered and shown in a QuickPick.
2. **Destination input** – a custom QuickPick lists the latest 10 destinations for the file while still accepting manual input. Paths are normalized to Linux separators before uploading.
3. **Streaming & progress** – `FileSyncUtils` converts the VS Code document into a stream, tracks bytes, and reports incremental progress.
4. **OSS upload** – the Aliyun client performs `oss.putStream`, then returns the public URL.
5. **Result dialog** – the URL is displayed in a modal dialog with “Copy Link” and “Open Link” actions.

## Development

```bash
npm install
npm run watch   # incremental builds
# or
npm run compile # single webpack build
```

Press `F5` to launch an Extension Development Host. Tests can be added later via `npm test`.

## Roadmap & Contributions

- Additional providers (AWS S3, Azure Blob, SFTP, etc.)
- Editing/removing server profiles
- Workspace-level default destinations and per-project overrides

Bugs and feature requests are tracked in [GitHub Issues](https://github.com/BenLocal/vscode-file-sync/issues). Contributions are welcome! Feel free to open a pull request or contact the maintainer via the email listed in `package.json`.
