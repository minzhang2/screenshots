import { Rectangle, screen } from 'electron'

export interface Display extends Rectangle {
  id: number
  screenshotDesktopId?: number // 截图包screenshot-desktop需要用到
  index?: number
}

export interface ScreenshotDesktopDisplay {
  id: number;
  name: string;
}

/**
 *
 * @returns screenshotDesktopDisplays
 * Mac 取值
 *
 [
  { name: 'Color LCD', primary: true, id: 0 },
  { name: 'DELL S2721DS', primary: false, id: 1 }
]
 * Windows取值
 * [
  {
    id: '\\\\.\\DISPLAY1',
    name: '\\\\.\\DISPLAY1',
    top: 0,
    right: 1920,
    bottom: 1080,
    left: 0,
    dpiScale: 1.25,
    height: 1080,
    width: 1920
  },
  {
    id: '\\\\.\\DISPLAY2',
    name: '\\\\.\\DISPLAY2',
    top: 0,
    right: 0,
    bottom: 1440,
    left: -2560,
    dpiScale: 1,
    height: 1440,
    width: 2560
  }
]
 *
 */
export const getAllDisplays = async (screenshotDesktopDisplays: ScreenshotDesktopDisplay[]) => {
  const displays = screen.getAllDisplays()
  return displays.map(({ bounds, id }, index) => {
    return {
      id,
      index, // 很重要，页面截图回调的时候会带着这个参数，用来跟窗口对应
      screenshotDesktopId: screenshotDesktopDisplays[index].id,
      x: Math.floor(bounds.x),
      y: Math.floor(bounds.y),
      width: Math.floor(bounds.width),
      height: Math.floor(bounds.height)
    }
  })
}

export default (): Display => {
  const point = screen.getCursorScreenPoint()
  const { id, bounds } = screen.getDisplayNearestPoint(point)

  return {
    id,
    x: Math.floor(bounds.x),
    y: Math.floor(bounds.y),
    width: Math.floor(bounds.width),
    height: Math.floor(bounds.height)
  }
}
