import React, { ReactElement, useCallback } from 'react'
import Screenshots from '../Screenshots'
import url from './Battlecry.jpg'
import './app.less'
import { Bounds } from '../Screenshots/types'

export default function App (): ReactElement {
  const onSave = useCallback((blob: Blob, bounds: Bounds) => {
    console.log('save', blob, bounds)
    console.log(URL.createObjectURL(blob))
  }, [])
  const onCancel = useCallback(() => {
    console.log('cancel')
  }, [])
  const onOk = useCallback((blob: Blob, bounds: Bounds) => {
    console.log('ok', blob, bounds)
  }, [])

  return (
    <div className='body'>
      <Screenshots
        url={url}
        width={window.innerWidth / 2}
        height={window.innerHeight / 2}
        onSave={onSave}
        onCancel={onCancel}
        onOk={onOk}
      />
      <Screenshots
        url={url}
        width={window.innerWidth / 2}
        height={window.innerHeight / 2}
        onSave={onSave}
        onCancel={onCancel}
        onOk={onOk}
      />
      <Screenshots
        url={url}
        width={window.innerWidth / 2}
        height={window.innerHeight / 2}
        onSave={onSave}
        onCancel={onCancel}
        onOk={onOk}
      />
      <Screenshots
        url={url}
        width={window.innerWidth / 2}
        height={window.innerHeight / 2}
        onSave={onSave}
        onCancel={onCancel}
        onOk={onOk}
      />
    </div>
  )
}
