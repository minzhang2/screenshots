import debug, { Debugger } from 'debug'
import {
  app,
  BrowserView,
  BrowserWindow,
  clipboard,
  desktopCapturer,
  dialog,
  ipcMain,
  nativeImage
} from 'electron'
import path from 'path'
import Events from 'events'
import screenshot from 'screenshot-desktop'
import fs from 'fs-extra'
import Event from './event'
import getDisplay, { Display } from './getDisplay'
import padStart from './padStart'
import { Bounds, ScreenshotsData } from './preload'

export type LoggerFn = (...args: unknown[]) => void;
export type Logger = Debugger | LoggerFn;

export interface Lang {
  magnifier_position_label?: string;
  operation_ok_title?: string;
  operation_cancel_title?: string;
  operation_save_title?: string;
  operation_redo_title?: string;
  operation_undo_title?: string;
  operation_mosaic_title?: string;
  operation_text_title?: string;
  operation_brush_title?: string;
  operation_arrow_title?: string;
  operation_ellipse_title?: string;
  operation_rectangle_title?: string;
}

export interface ScreenshotsOpts {
  lang?: Lang;
  logger?: Logger;
  singleWindow?: boolean;
}

export { Bounds }

export class Screenshots extends Events {
  // 截图窗口对象
  public $win: BrowserWindow | null = null

  public $view: BrowserView = new BrowserView({
    webPreferences: {
      preload: require.resolve('./preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  private logger: Logger

  private singleWindow: boolean

  private screenshotPath: string

  private isReady = new Promise<void>((resolve) => {
    ipcMain.once('SCREENSHOTS:ready', () => {
      this.logger('SCREENSHOTS:ready')

      resolve()
    })
  })

  constructor (opts?: ScreenshotsOpts) {
    super()
    this.logger = opts?.logger || debug('electron-screenshots')
    this.singleWindow = opts?.singleWindow || false
    this.screenshotPath = path.join(app.getPath('userData'), '/AkeyTemp')
    this.listenIpc()
    this.$view.webContents.loadURL(
      `file://${require.resolve('akey-react-screenshots/electron/electron.html')}`
    )
    if (opts?.lang) {
      this.setLang(opts.lang)
    }
  }

  /**
   * 开始截图
   */
  public async startCapture (): Promise<void> {
    this.logger('startCapture')
    const display = getDisplay()

    const [imageUrl] = await Promise.all([this.capture(display), this.isReady])

    try {
      await this.createWindow(display)
    } catch (error) {
      this.logger(error)
    }

    this.$view.webContents.send('SCREENSHOTS:capture', display, imageUrl)
  }

  /**
   * 结束截图
   */
  public async endCapture (): Promise<void> {
    this.logger('endCapture')
    await this.reset()

    if (!this.$win) {
      return
    }

    // 先清除 Kiosk 模式，然后取消全屏才有效
    this.$win.setKiosk(false)
    this.$win.setSimpleFullScreen(false)
    this.$win.blur()
    this.$win.blurWebView()
    this.$win.unmaximize()
    this.$win.removeBrowserView(this.$view)

    if (this.singleWindow) {
      this.$win.hide()
    } else {
      this.$win.destroy()
    }

    // fs.unlinkSync(this.screenshotPath)
    fs.emptyDir(this.screenshotPath)
  }

  /**
   * 设置语言
   */
  public async setLang (lang: Partial<Lang>): Promise<void> {
    this.logger('setLang', lang)

    await this.isReady

    this.$view.webContents.send('SCREENSHOTS:setLang', lang)
  }

  private async reset () {
    this.logger('reset')
    // 重置截图区域
    this.$view.webContents.send('SCREENSHOTS:reset')

    this.logger('reset1')
    // 保证 UI 有足够的时间渲染
    await Promise.race([
      new Promise<void>((resolve) => setTimeout(() => resolve(), 500)),
      new Promise<void>((resolve) =>
        ipcMain.once('SCREENSHOTS:reset', () => resolve())
      )
    ])
  }

  /**
   * 初始化窗口
   */
  private async createWindow (display: Display): Promise<void> {
    this.logger('createWindow')
    // 重置截图区域
    await this.reset()

    this.logger('createWindow1')
    // 复用未销毁的窗口
    if (!this.$win || this.$win?.isDestroyed?.()) {
      this.$win = new BrowserWindow({
        title: 'screenshots',
        x: display.x,
        y: display.y,
        width: display.width,
        height: display.height,
        useContentSize: true,
        frame: false,
        show: false,
        autoHideMenuBar: true,
        transparent: true,
        // mac resizable 设置为 false 会导致页面崩溃
        // resizable: process.platform !== 'darwin',
        resizable: false,
        movable: false,
        // focusable: true, 否则窗口不能及时响应esc按键，输入框也不能输入
        focusable: true,
        /**
         * linux 下必须设置为false，否则不能全屏显示在最上层
         * mac 下设置为false，否则可能会导致程序坞不恢复问题
         * https://github.com/nashaofu/screenshots/issues/148
         */
        fullscreen: process.platform !== 'darwin',
        // 设为true 防止mac新开一个桌面，影响效果
        simpleFullscreen: process.platform === 'darwin',
        backgroundColor: '#00000000',
        titleBarStyle: 'hidden',
        alwaysOnTop: true,
        enableLargerThanScreen: true,
        skipTaskbar: true,
        hasShadow: false,
        paintWhenInitiallyHidden: false,
        acceptFirstMouse: true
      })

      this.$win.on('show', () => {
        this.$win?.focus()
        /**
         * 在窗口显示时设置，防止与 fullscreen、x、y、width、height 等冲突, 导致显示效果不符合预期
         * mac 下不设置 kiosk 模式，https://github.com/nashaofu/screenshots/issues/148
         */
        this.$win?.setKiosk(process.platform !== 'darwin')
      })

      this.$win.on('closed', () => {
        this.$win = null
      })
    }

    this.$win.setBrowserView(this.$view)

    this.$win.webContents.once('crashed', (e) => {
      this.logger(e)
    })

    this.$win.webContents.once('render-process-gone', async (event, { reason }) => {
      const msg = `The renderer process has crashed unexpected or is killed (${reason}).`
      this.logger(msg)

      // if (reason == 'crashed') {
      // }
    })

    // 适定平台
    if (process.platform === 'darwin') {
      this.$win.setWindowButtonVisibility(false)
    }

    if (process.platform !== 'win32') {
      this.$win.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
        skipTransformProcessType: true
      })
    }

    this.$win.blur()
    // this.$win.setKiosk(false)

    // if (process.platform === 'darwin') {
    //   this.$win.setSimpleFullScreen(true)
    // }

    this.$win.setBounds(display)
    this.$view.setBounds({
      x: 0,
      y: 0,
      width: display.width,
      height: display.height
    })

    this.$win.show()
  }

  private async capture (display: Display): Promise<string> {
    this.logger('SCREENSHOTS:capture')

    let index = display.id - 1
    if (index < 0) {
      index = 0
    }

    const imgPath = await screenshot({
      filename: path.join(this.screenshotPath, `/shot-${Date.now()}.png`),
      screen: index
    })

    return `file://${imgPath}`
  }

  /**
   * 绑定ipc时间处理
   */
  private listenIpc (): void {
    /**
     * OK事件
     */
    ipcMain.on('SCREENSHOTS:ok', (e, buffer: Buffer, data: ScreenshotsData) => {
      this.logger('SCREENSHOTS:ok', buffer, data)

      const event = new Event()
      this.emit('ok', event, buffer, data)
      if (event.defaultPrevented) {
        return
      }
      clipboard.writeImage(nativeImage.createFromBuffer(buffer))
      this.endCapture()
    })
    /**
     * CANCEL事件
     */
    ipcMain.on('SCREENSHOTS:cancel', () => {
      this.logger('SCREENSHOTS:cancel')

      const event = new Event()
      this.emit('cancel', event)
      if (event.defaultPrevented) {
        return
      }
      this.endCapture()
    })

    /**
     * SAVE事件
     */
    ipcMain.on(
      'SCREENSHOTS:save',
      async (e, buffer: Buffer, data: ScreenshotsData) => {
        this.logger('SCREENSHOTS:save', buffer, data)

        const event = new Event()
        this.emit('save', event, buffer, data)
        if (event.defaultPrevented || !this.$win) {
          return
        }

        const time = new Date()
        const year = time.getFullYear()
        const month = padStart(time.getMonth() + 1, 2, '0')
        const date = padStart(time.getDate(), 2, '0')
        const hours = padStart(time.getHours(), 2, '0')
        const minutes = padStart(time.getMinutes(), 2, '0')
        const seconds = padStart(time.getSeconds(), 2, '0')
        const milliseconds = padStart(time.getMilliseconds(), 3, '0')

        this.$win.setAlwaysOnTop(false)

        const { canceled, filePath } = await dialog.showSaveDialog(this.$win, {
          defaultPath: `${year}${month}${date}${hours}${minutes}${seconds}${milliseconds}.png`
        })

        if (!this.$win) {
          return
        }
        this.$win.setAlwaysOnTop(true)
        if (canceled || !filePath) {
          return
        }

        await fs.writeFile(filePath, buffer)
        this.endCapture()
      }
    )
  }
}
