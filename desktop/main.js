// Meridian desktop app — fully self-contained. The built web app is bundled
// inside the app and served from a tiny local HTTP server on 127.0.0.1.
// Nothing ever touches the internet; all data stays on this machine.
const { app, BrowserWindow, shell } = require('electron')
const http = require('http')
const fs = require('fs')
const path = require('path')

const DIST = app.isPackaged
  ? path.join(process.resourcesPath, 'dist')
  : path.join(__dirname, 'dist')

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
}

// A FIXED port matters: localStorage (where all the user's logs live) is keyed
// by origin, including the port. A random port would make every launch a fresh
// origin and the app would appear to have lost all data.
const PREFERRED_PORTS = [41712, 41713, 41714, 41715]

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent((req.url || '/').split('?')[0])
      if (urlPath === '/') urlPath = '/index.html'
      const full = path.normalize(path.join(DIST, urlPath))
      if (!full.startsWith(DIST)) {
        res.writeHead(403)
        return res.end()
      }
      fs.readFile(full, (err, data) => {
        const send = (buf, ext) => {
          res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
          res.end(buf)
        }
        if (err) {
          // SPA fallback: serve index.html for unknown paths.
          fs.readFile(path.join(DIST, 'index.html'), (e2, idx) => {
            if (e2) {
              res.writeHead(404)
              res.end()
            } else send(idx, '.html')
          })
          return
        }
        send(data, path.extname(full))
      })
    })
    let attempt = 0
    const tryListen = () => {
      const port = PREFERRED_PORTS[attempt]
      if (port === undefined) return reject(new Error('no free port for the local server'))
      server.once('error', (err) => {
        if (err && err.code === 'EADDRINUSE') {
          attempt++
          tryListen()
        } else reject(err)
      })
      server.listen(port, '127.0.0.1', () => resolve(port))
    }
    tryListen()
  })
}

async function createWindow() {
  const port = await startServer()

  const win = new BrowserWindow({
    width: 1180,
    height: 860,
    title: 'Meridian',
    backgroundColor: '#0e1116',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  })

  // External links open in the user's browser; app navigation stays in-app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://127.0.0.1')) return { action: 'allow' }
    shell.openExternal(url)
    return { action: 'deny' }
  })

  win.loadURL(`http://127.0.0.1:${port}/`)
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
