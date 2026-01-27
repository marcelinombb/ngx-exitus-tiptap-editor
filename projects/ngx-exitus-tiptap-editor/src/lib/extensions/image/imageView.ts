import { type Editor } from '@tiptap/core'
import { type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { type Node } from '@tiptap/pm/model'
import { type NodeView } from '@tiptap/pm/view'
import { convertToBase64 } from './image'

const imageUrlRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|bmp|webp|svg))/i

export class ImageView implements NodeView {
  node: Node
  dom: Element
  contentDOM?: HTMLElement | null | undefined
  image: HTMLImageElement
  editor: Editor
  getPos: () => number | undefined
  originalSize: number = 300

  constructor(
    node: Node,
    editor: Editor,
    getPos: () => number | undefined,
    public proxyUrl: string | undefined
  ) {
    this.node = node
    this.editor = editor
    this.getPos = getPos

    this.image = document.createElement('img')
    this.setImageAttributes(this.image, node)
    this.image.draggable = false
    this.image.style.width = '100%' // Image always fills container

    if (imageUrlRegex.test(node.attrs['src'])) {
      this.urlToBase64(node.attrs['src'])
    } else {

      this.image.addEventListener("load", () => {
        this.originalSize = this.image.width;
      }, { once: true });

    }

    this.dom = this.image
  }

  update(newNode: ProseMirrorNode) {
    if (newNode.type !== this.node.type) {
      return false
    }

    this.node = newNode
    this.image.draggable = false

    this.setImageAttributes(this.image, newNode)

    return true
  }

  urlToBase64(url: string) {
    const image = new Image()
    image.src = `${this.proxyUrl}/${encodeURIComponent(url)}`
    image.setAttribute('crossorigin', 'anonymous')

    this.image.addEventListener("load", () => {
      convertToBase64(image, (base64Url, width) => {
        this.updateAttributes({ src: base64Url })
        this.originalSize = width;
      })

    }, { once: true });

  }

  updateAttributes(attributes: Record<string, any>) {
    if (typeof this.getPos === 'function') {
      const { view } = this.editor
      const transaction = view.state.tr
      transaction.setNodeMarkup(this.getPos()!, undefined, {
        ...this.node.attrs,
        ...attributes
      })
      view.dispatch(transaction)
    }
  }

  setImageAttributes(image: Element, node: Node) {
    this.image.setAttribute('style', `${node.attrs['style']}`)
    image.setAttribute('src', node.attrs['src'])
  }

}
