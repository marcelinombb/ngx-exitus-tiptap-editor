import { type Editor, Node, nodeInputRule } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'

import { ImageView } from './imageView'

export function convertToBase64(img: HTMLImageElement, callback: (base64Url: string, width: number) => void) {
  return function () {
    const maxHeight = Math.min(img.height, 700)
    const maxWidth = Math.min(img.width, 700)
    //let newHeight, newWidth;
    const newDimension =
      img.width > img.height
        ? { width: maxWidth, height: Math.round(maxWidth / (img.width / img.height)) }
        : { width: maxHeight * (img.width / img.height), height: maxHeight }

    const canvas = document.createElement('canvas')

    canvas.width = newDimension.width
    canvas.height = newDimension.height

    const ctx = canvas.getContext('2d')
    ctx!.fillStyle = '#FFFFFF'
    ctx?.fillRect(0, 0, canvas.width, canvas.height)
    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
    callback(dataUrl, canvas.width)
  }
}

export function parseImagesToBase64(img: File, editor: Editor) {
  if (img) {
    const reader = new FileReader()

    reader.onload = function (e) {
      const img = document.createElement('img') as HTMLImageElement
      img.onload = convertToBase64(img, (base64Url: string) => {
        editor
          .chain()
          .focus()
          .setImage({ src: base64Url as string })
          .run()
      })

      img.src = e.target?.result as string
    }

    reader.readAsDataURL(img)
  }
}

export interface ImageOptions {
  inline: boolean
  allowBase64: boolean
  HTMLAttributes: Record<string, any>
  proxyUrl: string | undefined
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      setImage: (options: { src: string; alt?: string; title?: string }) => ReturnType
    }
  }
}

export const inputRegex = /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/

export const Image = Node.create<ImageOptions>({
  name: 'image',

  addOptions() {
    return {
      inline: false,
      allowBase64: false,
      HTMLAttributes: {},
      proxyUrl: undefined
    }
  },

  group: "",

  draggable: false,

  allowGapCursor: false,

  addAttributes() {
    return {
      src: {
        default: null
      },
      alt: {
        default: null
      },
      title: {
        default: null
      },
      classes: {
        default: ''
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: this.options.allowBase64 ? 'img[src]' : 'img[src]:not([src^="data:"])',
      }
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const { style, classes, src } = HTMLAttributes

    return ['img', { src, style: 'display: table-cell', draggable: false }]

  },

  addCommands() {
    return {
      setImage:
        options =>
          ({ commands }) => {
            return commands.insertContent({
              type: this.name,
              attrs: options
            })
          }
    }
  },
  addInputRules() {
    return [
      nodeInputRule({
        find: inputRegex,
        type: this.type,
        getAttributes: match => {
          const [, , alt, src, title] = match
          return { src, alt, title }
        }
      })
    ]
  },
  addNodeView() {
    return ({ node, editor, getPos }) => {
      return new ImageView(node, editor, getPos, this.options.proxyUrl)
    }
  },
  addProseMirrorPlugins() {
    const self = this
    return [
      new Plugin({
        key: new PluginKey('eventHandler'),
        props: {
          handleDOMEvents: {
            drop: (_view, event) => {
              const hasFiles = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length

              if (hasFiles) {
                const images = Array.from(event.dataTransfer?.files ?? []).filter(file => /image/i.test(file.type))

                if (images.length === 0) {
                  return false
                }
                images.forEach(image => parseImagesToBase64(image, self.editor))

                event.preventDefault()
                return true
              }
              return false
            }
          }
        }
      })
    ]
  }
})
