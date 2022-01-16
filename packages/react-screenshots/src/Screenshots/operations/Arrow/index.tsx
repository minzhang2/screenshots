import React, { ReactElement, useCallback, useRef, useState } from 'react'
import ScreenshotsButton from '../../ScreenshotsButton'
import ScreenshotsSizeColor from '../../ScreenshotsSizeColor'
import useCanvasMousedown from '../../hooks/useCanvasMousedown'
import useCanvasMousemove from '../../hooks/useCanvasMousemove'
import useCanvasMouseup from '../../hooks/useCanvasMouseup'
import { HistoryItemEdit, HistoryItemSource, HistoryItemType } from '../../types'
import useCursor from '../../hooks/useCursor'
import useOperation from '../../hooks/useOperation'
import useHistory from '../../hooks/useHistory'
import useCanvasContextRef from '../../hooks/useCanvasContextRef'
import { isHit } from '../utils'
import useDrawSelect from '../../hooks/useDrawSelect'
import draw from './draw'

export interface ArrowData {
  size: number
  color: string
  x1: number
  x2: number
  y1: number
  y2: number
}

export interface ArrowEditData {
  x1: number
  x2: number
  y1: number
  y2: number
}

export default function Arrow (): ReactElement {
  const [, cursorDispatcher] = useCursor()
  const [operation, operationDispatcher] = useOperation()
  const [history, historyDispatcher] = useHistory()
  const canvasContextRef = useCanvasContextRef()
  const [size, setSize] = useState(3)
  const [color, setColor] = useState('#ee5126')
  const arrowRef = useRef<HistoryItemSource<ArrowData, ArrowEditData> | null>(null)
  const arrowEditRef = useRef<HistoryItemEdit<ArrowEditData, ArrowData> | null>(null)

  const checked = operation === 'Arrow'

  const selectArrow = useCallback(() => {
    operationDispatcher.set('Arrow')
    cursorDispatcher.set('default')
  }, [operationDispatcher, cursorDispatcher])

  const onSelectArrow = useCallback(() => {
    if (checked) {
      return
    }
    selectArrow()
    historyDispatcher.clearSelect()
  }, [checked, selectArrow, historyDispatcher])

  const onDrawSelect = useCallback(
    (action: HistoryItemSource<unknown, unknown>, e: MouseEvent) => {
      if (action.name !== 'Arrow') {
        return
      }

      selectArrow()

      arrowEditRef.current = {
        type: HistoryItemType.EDIT,
        data: {
          x1: e.clientX,
          y1: e.clientY,
          x2: e.clientX,
          y2: e.clientY
        },
        source: action as HistoryItemSource<ArrowData, ArrowEditData>
      }

      historyDispatcher.select(action)
    },
    [selectArrow, historyDispatcher]
  )

  const onMousedown = useCallback(
    (e: MouseEvent) => {
      if (!checked || arrowRef.current || !canvasContextRef.current) {
        return
      }

      const { left, top } = canvasContextRef.current.canvas.getBoundingClientRect()
      arrowRef.current = {
        name: 'Arrow',
        type: HistoryItemType.SOURCE,
        data: {
          size,
          color,
          x1: e.clientX - left,
          y1: e.clientY - top,
          x2: e.clientX - left,
          y2: e.clientY - top
        },
        editHistory: [],
        draw,
        isHit
      }
    },
    [checked, color, size, canvasContextRef]
  )

  const onMousemove = useCallback(
    (e: MouseEvent) => {
      if (!checked || !canvasContextRef.current) {
        return
      }
      if (arrowEditRef.current) {
        arrowEditRef.current.data.x2 = e.clientX
        arrowEditRef.current.data.y2 = e.clientY
        if (history.top !== arrowEditRef.current) {
          arrowEditRef.current.source.editHistory.push(arrowEditRef.current)
          historyDispatcher.push(arrowEditRef.current)
        } else {
          historyDispatcher.set(history)
        }
      } else if (arrowRef.current) {
        const { left, top } = canvasContextRef.current.canvas.getBoundingClientRect()

        arrowRef.current.data.x2 = e.clientX - left
        arrowRef.current.data.y2 = e.clientY - top

        if (history.top !== arrowRef.current) {
          historyDispatcher.push(arrowRef.current)
        } else {
          historyDispatcher.set(history)
        }
      }
    },
    [checked, history, canvasContextRef, historyDispatcher]
  )

  const onMouseup = useCallback(() => {
    if (!checked) {
      return
    }

    if (arrowRef.current) {
      historyDispatcher.clearSelect()
    }

    arrowRef.current = null
    arrowEditRef.current = null
  }, [checked, historyDispatcher])

  useDrawSelect(onDrawSelect)
  useCanvasMousedown(onMousedown)
  useCanvasMousemove(onMousemove)
  useCanvasMouseup(onMouseup)

  return (
    <ScreenshotsButton
      title='箭头'
      icon='icon-arrow'
      checked={checked}
      onClick={onSelectArrow}
      option={<ScreenshotsSizeColor size={size} color={color} onSizeChange={setSize} onColorChange={setColor} />}
    />
  )
}
