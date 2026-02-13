// src/main/index.ts
import 'dotenv/config'
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import { getPrisma } from './prisma'
import { registerIpc } from './ipc'
import { ensureAdmin } from './seed'

let mainWindow: BrowserWindow | null = null

/**
 * Crea y configura la ventana principal.
 * Mantiene el renderer aislado (sin Node) y comunica por preload + IPC.
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),

      // Seguridad recomendada:
      nodeIntegration: false,
      contextIsolation: true,

      // El template usa sandbox false por compatibilidad.
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/**
 * Bootstrap del proceso main:
 * - Inicializa DB (Prisma) y corre seed
 * - Registra IPC handlers
 * - Crea ventana
 */
async function bootstrap(): Promise<void> {
  // Windows app id (notificaciones, taskbar grouping)
  electronApp.setAppUserModelId('com.electron')

  // Atajos: F12 devtools en dev / bloquear reload en prod
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Ping de prueba (puedes quitarlo cuando ya no lo uses)
  ipcMain.on('ping', () => console.log('pong'))

  // Inicializa DB y datos mínimos
  const prisma = getPrisma()
  await ensureAdmin(prisma)

  // Registra todos los handlers del POS (auth/products/sales/etc.)
  registerIpc()

  // Lanza UI
  createWindow()

  // macOS: recrear ventana si se hace click en dock y no hay ventanas
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}

app.whenReady().then(() => {
  void bootstrap().catch((error) => {
    console.error('[bootstrap] error:', error)
    app.quit()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
