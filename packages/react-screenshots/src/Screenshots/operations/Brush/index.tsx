import React, { ReactElement, useCallback, useRef, useState } from 'react'
import useCanvasMousedown from '../../hooks/useCanvasMousedown'
import useCanvasMousemove from '../../hooks/useCanvasMousemove'
import useCanvasMouseup from '../../hooks/useCanvasMouseup'
import ScreenshotsButton from '../../ScreenshotsButton'
import ScreenshotsSizeColor from '../../ScreenshotsSizeColor'
import useCursor from '../../hooks/useCursor'
import useOperation from '../../hooks/useOperation'
import useHistory from '../../hooks/useHistory'
import useCanvasContextRef from '../../hooks/useCanvasContextRef'
import { HistoryAction, Point } from '../../types'
import useDrawSelect from '../../hooks/useDrawSelect'
import { isHit } from '../utils'

export interface BrushData {
  size: number
  color: string
  points: Point[]
}

function draw (ctx: CanvasRenderingContext2D, brush: BrushData): void {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = brush.size
  ctx.strokeStyle = brush.color
  ctx.beginPath()
  brush.points.forEach((item, index) => {
    if (index === 0) {
      ctx.moveTo(item.x, item.y)
    } else {
      ctx.lineTo(item.x, item.y)
    }
  })
  ctx.stroke()
}

export default function Brush (): ReactElement {
  const [, cursorDispatcher] = useCursor()
  const [operation, operationDispatcher] = useOperation()
  const canvasContextRef = useCanvasContextRef()
  const [history, historyDispatcher] = useHistory()
  const [size, setSize] = useState(3)
  const [color, setColor] = useState('#ee5126')
  const brushRef = useRef<HistoryAction<BrushData> | null>(null)

  const checked = operation === 'Brush'

  const selectBrush = useCallback(() => {
    if (checked) {
      return
    }
    operationDispatcher.set('Brush')
    cursorDispatcher.set('default')
  }, [checked, operationDispatcher, cursorDispatcher])

  const onDrawSelect = useCallback(
    (action: HistoryAction<unknown>) => {
      if (action.action !== 'Brush') {
        return
      }
      selectBrush()
    },
    [selectBrush]
  )

  const onMousedown = useCallback(
    (e: MouseEvent): void => {
      if (!checked || brushRef.current || !canvasContextRef.current) {
        return
      }

      const { left, top } = canvasContextRef.current.canvas.getBoundingClientRect()

      brushRef.current = {
        action: 'Brush',
        data: {
          size: size,
          color: color,
          points: [
            {
              x: e.clientX - left,
              y: e.clientY - top
            }
          ]
        },
        draw,
        isHit
      }
    },
    [checked, canvasContextRef, size, color]
  )

  const onMousemove = useCallback(
    (e: MouseEvent): void => {
      if (!checked || !brushRef.current || !canvasContextRef.current) {
        return
      }

      const { left, top } = canvasContextRef.current.canvas.getBoundingClientRect()

      brushRef.current.data.points.push({
        x: e.clientX - left,
        y: e.clientY - top
      })

      if (history.top !== brushRef.current) {
        historyDispatcher.push(brushRef.current)
      } else {
        historyDispatcher.set(history)
      }
    },
    [checked, history, canvasContextRef, historyDispatcher]
  )

  const onMouseup = useCallback((): void => {
    if (!checked) {
      return
    }

    if (brushRef.current) {
      brushRef.current = null
    }
  }, [checked])

  useDrawSelect(onDrawSelect)
  useCanvasMousedown(onMousedown)
  useCanvasMousemove(onMousemove)
  useCanvasMouseup(onMouseup)

  return (
    <ScreenshotsButton
      title='画笔'
      icon='icon-brush'
      checked={checked}
      onClick={selectBrush}
      option={<ScreenshotsSizeColor size={size} color={color} onSizeChange={setSize} onColorChange={setColor} />}
    />
  )
}
