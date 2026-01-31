import { type Editor } from '@tiptap/core'
import { type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { type Node } from '@tiptap/pm/model'
import { type NodeView } from '@tiptap/pm/view'

import init, { bytes_to_base64 } from './image_to_base64_wasm/pkg/image_to_base64_wasm'

// ─────────────────────────────────────────────────────────────
// WASM INIT (ONCE)
// ─────────────────────────────────────────────────────────────
let wasmReady: Promise<void> | null = null

function ensureWasm() {
  if (!wasmReady) {
    wasmReady = init(new String('/assets/image-to-base64-wasm/image_to_base64_wasm_bg.wasm'))
  }
  return wasmReady
}

// ─────────────────────────────────────────────────────────────
// IMAGE → BASE64
// ─────────────────────────────────────────────────────────────
async function imageUrlToBase64(url: string): Promise<string> {
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`Image fetch failed: ${res.status}`)
  }

  const contentType =
    res.headers.get('content-type') ?? 'application/octet-stream'

  const buffer = await res.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  const base64 = bytes_to_base64(bytes)

  return `data:${contentType};base64,${base64}`
}

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
    try {
      await ensureWasm()

      const finalUrl = this.proxyUrl
        ? `${this.proxyUrl}/${encodeURIComponent(url)}`
        : url

      const base64Url = await imageUrlToBase64(url)

      this.updateAttributes({ src: base64Url })
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
