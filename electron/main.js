const { app, BrowserWindow, ipcMain } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const assetsPath = path.join(__dirname, '..', 'assets');
const distPath = path.join(__dirname, '..', 'dist');

function getAppIcon() {
  if (process.platform === 'darwin') {
    const icns = path.join(assetsPath, 'app.icns');
    if (fs.existsSync(icns)) return icns;
  }
  const ico = path.join(assetsPath, 'app.ico');
  if (fs.existsSync(ico)) return ico;
  return path.join(distPath, 'favicon.ico');
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

const server = http.createServer((req, res) => {
  const filePath = path.join(distPath, req.url === '/' ? 'index.html' : req.url);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      const hasExt = path.extname(req.url) !== '';
      if (hasExt) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      const indexPath = path.join(distPath, 'index.html');
      fs.readFile(indexPath, (err2, data2) => {
        if (err2) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data2);
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'KGS Music Academy',
    icon: getAppIcon(),
  });

  mainWindow.loadURL('http://localhost:5173');

  mainWindow.webContents.setWindowOpenHandler(() => {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
        },
      },
    };
  });
}

ipcMain.handle('print-html', async (_event, html) => {
  const printWindow = new BrowserWindow({ show: false });
  printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await new Promise((resolve) => printWindow.webContents.on('did-finish-load', resolve));
  return new Promise((resolve, reject) => {
    printWindow.webContents.print(
      {
        silent: false,
        printBackground: true,
        pageSize: { width: 148000, height: 210000 },
        margins: { marginType: 'custom', top: 8000, bottom: 8000, left: 8000, right: 8000 },
      },
      (success, reason) => {
        printWindow.close();
        success ? resolve(true) : reject(new Error(reason));
      },
    );
  });
});

app.whenReady().then(() => {
  server.listen(5173, () => {
    console.log('KGS Music Academy running on http://localhost:5173');
    createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    server.close();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
