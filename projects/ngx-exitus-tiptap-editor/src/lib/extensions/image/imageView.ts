import { type Editor } from '@tiptap/core'
import { type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { type Node } from '@tiptap/pm/model'
import { type NodeView } from '@tiptap/pm/view'

// ─────────────────────────────────────────────────────────────
// REGEX
// ─────────────────────────────────────────────────────────────
const imageUrlRegex = /^https?:\/\//i

// ─────────────────────────────────────────────────────────────
// NODE VIEW
// ─────────────────────────────────────────────────────────────
export class ImageView implements NodeView {
  node: Node
  dom: HTMLImageElement
  contentDOM?: HTMLElement | null
  editor: Editor
  getPos: () => number | undefined
  originalSize = 300
  proxyUrl?: string

  constructor(
    node: Node,
    editor: Editor,
    getPos: () => number | undefined,
    proxyUrl?: string
  ) {
    this.node = node
    this.editor = editor
    this.getPos = getPos
    this.proxyUrl = proxyUrl

    // DOM
    this.dom = document.createElement('img')
    this.dom.draggable = false
    this.dom.style.width = '100%'
    this.setImageAttributes(this.dom, node)

    // Measure size for base64 images
    this.dom.addEventListener(
      'load',
      () => {
        this.originalSize = this.dom.naturalWidth
      },
      { once: true }
    )

    // Convert URL → Base64 if needed
    const src = node.attrs['src']
    if (typeof src === 'string' && imageUrlRegex.test(src)) {
      this.convertUrlToBase64(src)
    }
  }

  // ───────────────────────────────────────────────────────────
  // UPDATE
  // ───────────────────────────────────────────────────────────
  update(newNode: ProseMirrorNode) {
    if (newNode.type !== this.node.type) {
      return false
    }

    this.node = newNode
    this.setImageAttributes(this.dom, newNode)

    return true
  }

  // ───────────────────────────────────────────────────────────
  // URL → BASE64
  // ───────────────────────────────────────────────────────────
  private async convertUrlToBase64(url: string) {
    if (!this.proxyUrl) return

    try {
      const finalUrl = `${this.proxyUrl}?imgurl=${encodeURIComponent(url)}`

      const res = await fetch(finalUrl)
      if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`)

      const blob = await res.blob()

      const reader = new FileReader()
      reader.onloadend = () => {
        if (reader.result && typeof reader.result === 'string') {
          this.updateAttributes({ src: reader.result })
        }
      }
      reader.onerror = (err) => {
        console.error('[ImageView] FileReader error', err)
      }
      reader.readAsDataURL(blob)

    } catch (err) {
      console.error('[ImageView] base64 conversion failed', err)
    }
  }

  // ───────────────────────────────────────────────────────────
  // UPDATE ATTRIBUTES
  // ───────────────────────────────────────────────────────────
  private updateAttributes(attributes: Record<string, any>) {
    if (typeof this.getPos !== 'function') return

    const pos = this.getPos()
    if (pos == null) return

    const { view } = this.editor
    const tr = view.state.tr

    tr.setNodeMarkup(pos, undefined, {
      ...this.node.attrs,
      ...attributes,
    })

    view.dispatch(tr)
  }

  // ───────────────────────────────────────────────────────────
  // APPLY ATTRIBUTES
  // ───────────────────────────────────────────────────────────
  private setImageAttributes(image: HTMLImageElement, node: Node) {
    if (node.attrs['style']) {
      image.setAttribute('style', node.attrs['style'])
    }
    if (node.attrs['src']) {
      image.setAttribute('src', node.attrs['src'])
    }
  }
}
