// Basic Button interface to avoid dependency issues if needed, 
// but we'll try to keep it compatible with what was there.
export interface CropperButton {
  on: () => void
  off: () => void
}

type CropHandleDirection = 'move' | 'top' | 'bottom' | 'left' | 'right' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'

interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

interface CropTarget {
  image: HTMLImageElement
  imageWrapper: HTMLElement
  figcaption?: HTMLElement | null
  resizer?: { hide: () => void; show: () => void }
  updateAttributes: (attrs: Record<string, any>) => void
}

const MIN_CROP_SIZE = 40

export default class ImageCropper {
  private readonly target: CropTarget
  private readonly overlay: HTMLDivElement
  private readonly cropArea: HTMLDivElement
  private readonly actions: HTMLDivElement
  private readonly applyButton: HTMLButtonElement
  private readonly cancelButton: HTMLButtonElement
  private toggleButton?: CropperButton

  private isCropping: boolean = false
  private cropRect: CropRect = { x: 0, y: 0, width: 0, height: 0 }
  private dragMode: CropHandleDirection | null = null
  private startPointer: { x: number; y: number } = { x: 0, y: 0 }
  private startRect: CropRect = { x: 0, y: 0, width: 0, height: 0 }

  private readonly onPointerMove: (event: PointerEvent) => void
  private readonly onPointerUp: (event: PointerEvent) => void
  private readonly onKeyDown: (event: KeyboardEvent) => void

  constructor(target: CropTarget) {
    this.target = target

    this.overlay = document.createElement('div')
    this.overlay.className = 'ex-crop-overlay ex-hidden'
    this.overlay.contentEditable = 'false'

    this.cropArea = document.createElement('div')
    this.cropArea.className = 'ex-crop-area'
    this.overlay.appendChild(this.cropArea)

    this.createHandles()

    this.actions = document.createElement('div')
    this.actions.className = 'ex-crop-actions ex-hidden'

    this.applyButton = this.createActionButton('Aplicar', 'ex-crop-apply')
    this.cancelButton = this.createActionButton('Cancelar', 'ex-crop-cancel')

    this.actions.append(this.cancelButton, this.applyButton)
    this.target.imageWrapper.appendChild(this.actions)

    if (this.target.figcaption?.parentElement === this.target.imageWrapper) {
      this.target.imageWrapper.insertBefore(this.overlay, this.target.figcaption)
    } else {
      this.target.imageWrapper.appendChild(this.overlay)
    }

    this.onPointerMove = this.handlePointerMove.bind(this)
    this.onPointerUp = this.handlePointerUp.bind(this)
    this.onKeyDown = this.handleKeyDown.bind(this)

    this.cropArea.addEventListener('pointerdown', event => this.handlePointerDown(event))
    this.applyButton.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      void this.applyCrop()
    })
    this.cancelButton.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      this.disable()
    })
  }

  toggle(button?: CropperButton) {
    if (button) {
      this.toggleButton = button
    }

    if (this.isCropping) {
      this.disable()
    } else {
      void this.enable()
    }
  }

  private async enable() {
    if (this.isCropping) return

    if (!this.target.image.complete) {
      await new Promise<void>(resolve => {
        this.target.image.addEventListener('load', () => resolve(), { once: true })
      })
    }

    this.isCropping = true
    this.target.imageWrapper.classList.add('ex-image-cropping')
    this.toggleButton?.on()

    this.updateOverlayBounds()
    this.overlay.classList.remove('ex-hidden')
    this.overlay.style.display = 'block'
    this.actions.classList.remove('ex-hidden')
    this.actions.style.display = 'flex'

    const fallbackWidth = this.target.image.naturalWidth || this.target.imageWrapper.clientWidth
    const fallbackHeight = this.target.image.naturalHeight || this.target.imageWrapper.clientHeight

    const width = this.overlay.clientWidth || this.target.image.clientWidth || fallbackWidth || MIN_CROP_SIZE
    const height = this.overlay.clientHeight || this.target.image.clientHeight || fallbackHeight || MIN_CROP_SIZE

    this.cropRect = {
      x: Math.max(0, width * 0.05),
      y: Math.max(0, height * 0.05),
      width: Math.max(MIN_CROP_SIZE, width * 0.9),
      height: Math.max(MIN_CROP_SIZE, height * 0.9)
    }

    if (this.cropRect.width > width) {
      this.cropRect.width = width
      this.cropRect.x = 0
    }

    if (this.cropRect.height > height) {
      this.cropRect.height = height
      this.cropRect.y = 0
    }

    this.target.resizer?.hide()

    this.renderCropArea()

    document.addEventListener('keydown', this.onKeyDown)
  }

  private disable() {
    if (!this.isCropping) return

    this.isCropping = false
    this.dragMode = null

    document.removeEventListener('pointermove', this.onPointerMove)
    document.removeEventListener('pointerup', this.onPointerUp)
    document.removeEventListener('keydown', this.onKeyDown)

    this.target.imageWrapper.classList.remove('ex-image-cropping')
    this.overlay.classList.add('ex-hidden')
    this.overlay.style.display = 'none'
    this.actions.classList.add('ex-hidden')
    this.actions.style.display = 'none'

    if (this.target.imageWrapper.classList.contains('ex-selected')) {
      this.target.resizer?.show()
    } else {
      this.target.resizer?.hide()
    }
    this.toggleButton?.off()
  }

  private handlePointerDown(event: PointerEvent) {
    if (!this.isCropping) return

    const target = event.target as HTMLElement
    const handle = target.dataset['cropHandle'] as CropHandleDirection | undefined

    this.dragMode = handle ?? 'move'
    this.startPointer = { x: event.clientX, y: event.clientY }
    this.startRect = { ...this.cropRect }

    event.preventDefault()
    event.stopPropagation()

    document.addEventListener('pointermove', this.onPointerMove)
    document.addEventListener('pointerup', this.onPointerUp)
  }

  private handlePointerMove(event: PointerEvent) {
    if (!this.isCropping || !this.dragMode) return

    const dx = event.clientX - this.startPointer.x
    const dy = event.clientY - this.startPointer.y

    let { x, y, width, height } = this.startRect

    switch (this.dragMode) {
      case 'move':
        x = this.startRect.x + dx
        y = this.startRect.y + dy
        break
      case 'left':
        x = this.startRect.x + dx
        width = this.startRect.width - dx
        break
      case 'right':
        width = this.startRect.width + dx
        break
      case 'top':
        y = this.startRect.y + dy
        height = this.startRect.height - dy
        break
      case 'bottom':
        height = this.startRect.height + dy
        break
      case 'topLeft':
        x = this.startRect.x + dx
        y = this.startRect.y + dy
        width = this.startRect.width - dx
        height = this.startRect.height - dy
        break
      case 'topRight':
        y = this.startRect.y + dy
        width = this.startRect.width + dx
        height = this.startRect.height - dy
        break
      case 'bottomLeft':
        x = this.startRect.x + dx
        width = this.startRect.width - dx
        height = this.startRect.height + dy
        break
      case 'bottomRight':
        width = this.startRect.width + dx
        height = this.startRect.height + dy
        break
    }

    const containerWidth = this.overlay.clientWidth || this.target.image.clientWidth
    const containerHeight = this.overlay.clientHeight || this.target.image.clientHeight

    const affectsLeft = ['left', 'topLeft', 'bottomLeft'].includes(this.dragMode)
    const affectsTop = ['top', 'topLeft', 'topRight'].includes(this.dragMode)

    if (width < MIN_CROP_SIZE) {
      if (affectsLeft) {
        x = this.startRect.x + (this.startRect.width - MIN_CROP_SIZE)
      }
      width = MIN_CROP_SIZE
    }

    if (height < MIN_CROP_SIZE) {
      if (affectsTop) {
        y = this.startRect.y + (this.startRect.height - MIN_CROP_SIZE)
      }
      height = MIN_CROP_SIZE
    }

    if (x < 0) {
      width += x
      x = 0
    }

    if (y < 0) {
      height += y
      y = 0
    }

    if (containerWidth != null && x + width > containerWidth) {
      width = containerWidth - x
    }

    if (containerHeight != null && y + height > containerHeight) {
      height = containerHeight - y
    }

    this.cropRect = { x, y, width, height }
    this.renderCropArea()
  }

  private handlePointerUp() {
    this.dragMode = null
    document.removeEventListener('pointermove', this.onPointerMove)
    document.removeEventListener('pointerup', this.onPointerUp)
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      this.disable()
    }
  }

  private renderCropArea() {
    this.cropArea.style.left = `${this.cropRect.x}px`
    this.cropArea.style.top = `${this.cropRect.y}px`
    this.cropArea.style.width = `${this.cropRect.width}px`
    this.cropArea.style.height = `${this.cropRect.height}px`
  }

  private createHandles() {
    const handles: CropHandleDirection[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'top', 'bottom', 'left', 'right']

    handles.forEach(direction => {
      const handle = document.createElement('div')
      handle.className = `ex-crop-handle ex-crop-handle-${direction}`
      handle.setAttribute('data-crop-handle', direction)
      this.cropArea.appendChild(handle)
    })
  }

  private createActionButton(label: string, className: string) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `ex-crop-action ${className}`
    button.textContent = label
    button.setAttribute('tabindex', '0')
    return button
  }

  private updateOverlayBounds() {
    const imageRect = this.target.image.getBoundingClientRect()
    const wrapperRect = this.target.imageWrapper.getBoundingClientRect()

    const width = this.target.image.clientWidth || imageRect.width
    const height = this.target.image.clientHeight || imageRect.height
    const left = imageRect.left - wrapperRect.left
    const top = imageRect.top - wrapperRect.top

    this.overlay.style.width = `${width}px`
    this.overlay.style.height = `${height}px`
    this.overlay.style.left = `${left}px`
    this.overlay.style.top = `${top}px`
  }

  private async applyCrop() {
    if (!this.isCropping) return

    try {
      if (!this.target.image.complete) {
        await new Promise<void>(resolve => {
          this.target.image.addEventListener('load', () => resolve(), { once: true })
        })
      }

      const naturalWidth = this.target.image.naturalWidth
      const naturalHeight = this.target.image.naturalHeight

      if (!naturalWidth || !naturalHeight) {
        throw new Error('Dimensões inválidas para recorte da imagem.')
      }

      const displayWidth = this.target.image.clientWidth || naturalWidth
      const displayHeight = this.target.image.clientHeight || naturalHeight

      const scaleX = naturalWidth / displayWidth
      const scaleY = naturalHeight / displayHeight

      const cropX = Math.max(0, Math.round(this.cropRect.x * scaleX))
      const cropY = Math.max(0, Math.round(this.cropRect.y * scaleY))
      const cropWidth = Math.max(1, Math.round(this.cropRect.width * scaleX))
      const cropHeight = Math.max(1, Math.round(this.cropRect.height * scaleY))

      const canvas = document.createElement('canvas')
      canvas.width = cropWidth
      canvas.height = cropHeight

      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('Contexto 2D indisponível para recorte da imagem.')
      }

      context.drawImage(this.target.image, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)

      const dataUrl = canvas.toDataURL('image/png')
      
      const newWidth = Math.round(this.cropRect.width)

      // Only update attributes, let the NodeView handle the visual update
      this.target.updateAttributes({
        src: dataUrl,
        width: newWidth
      })
    } catch (error) {
      console.error('Erro ao recortar imagem:', error)
      window.alert('Não foi possível recortar a imagem. Verifique se a imagem permite acesso (CORS) ou se o arquivo é válido.')
    } finally {
      this.disable()
    }
  }

  destroy() {
    this.disable()
    this.overlay.remove()
    this.actions.remove()
  }

  cancel() {
    this.disable()
  }

  get active() {
    return this.isCropping
  }
}
