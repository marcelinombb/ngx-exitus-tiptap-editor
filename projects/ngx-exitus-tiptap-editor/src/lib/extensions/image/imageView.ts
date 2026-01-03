import { type Editor } from '@tiptap/core'
import { type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { type Node } from '@tiptap/pm/model'
import { NodeSelection } from '@tiptap/pm/state'
import { type NodeView, type ViewMutationRecord } from '@tiptap/pm/view'

import { convertToBase64 } from './image'

function resetImageClass(imageWrapper: HTMLElement, newClass: string) {
  imageWrapper.className = ''
  imageWrapper.classList.add('ex-image-wrapper', 'tiptap-widget', newClass)
}

/* function alinhaDireita(imageView: ImageView) {
  return ({ button }: ButtonEventProps) => {
    const { imageWrapper } = imageView
    if (!imageWrapper.classList.contains('ex-image-block-align-right')) {
      button.on()
      resetImageClass(imageWrapper, 'ex-image-block-align-right')
    } else {
      button.off()
      resetImageClass(imageWrapper, 'ex-image-block-middle')
    }
    imageView.updateAttributes({
      classes: imageWrapper.className
    })
  }
}

function alinhaEsquerda(imageView: ImageView) {
  return ({ button }: ButtonEventProps) => {
    const { imageWrapper } = imageView
    if (!imageWrapper.classList.contains('ex-image-block-align-left')) {
      button.on()
      resetImageClass(imageWrapper, 'ex-image-block-align-left')
    } else {
      button.off()
      resetImageClass(imageWrapper, 'ex-image-block-middle')
    }
    imageView.updateAttributes({
      classes: imageWrapper.className
    })
  }
}

function alinhaMeio(imageView: ImageView) {
  return ({ button }: ButtonEventProps) => {
    const { imageWrapper } = imageView
    if (!imageWrapper.classList.contains('ex-image-block-middle')) {
      button.on()
      resetImageClass(imageWrapper, 'ex-image-block-middle')
    } else {
      button.off()
      imageWrapper.classList.remove('ex-image-block-middle')
    }
    imageView.updateAttributes({
      classes: imageWrapper.className
    })
  }
}

function sizeButton(dropdown: Dropdown, imageView: ImageView, label: string, size: number | (() => number)) {
  const button = new Button(dropdown.editor, {
    label,
    classList: ['ex-mr-0']
  })

  button.bind('click', () => {
    const sizeValue = typeof size == 'number' ? size : size()
    imageView.updateAttributes({
      style: `width: ${sizeValue}px;`
    })
  })

  return button.render()
}

function criarDropDown(dropdown: Dropdown, imageView: ImageView) {
  const dropdownContent = document.createElement('div')
  dropdownContent.className = 'ex-dropdownList-content'

  const original = sizeButton(dropdown, imageView, `original`, () => {
    return imageView.originalSize
  })
  const pequeno = sizeButton(dropdown, imageView, '300px', 300)
  const medio = sizeButton(dropdown, imageView, '400px', 400)
  const grande = sizeButton(dropdown, imageView, '700px', 700)

  dropdownContent?.append(original, pequeno, medio, grande)

  return dropdownContent
}

function showDropdown({ event, dropdown }: DropDownEventProps) {
  event.stopPropagation()
  if (dropdown.isOpen) {
    dropdown.off()
  } else {
    dropdown.on()
  }
} */
/* 
function criarDropDownAlinhamentoTexto(dropdown: Dropdown, imageView: ImageView) {
  const dropdownContent = document.createElement('div')
  dropdownContent.className = 'ex-dropdownList-content'

  const buttonAlignLeft = new Button(dropdown.editor, {
    icon: imgFloatLeft,
    classList: ['ex-mr-0']
  })

  const buttonAlignRight = new Button(dropdown.editor, {
    icon: imgFloatRight,
    classList: ['ex-mr-0']
  })

  buttonAlignLeft.bind('click', () => {
    const { imageWrapper } = imageView
    if (!imageWrapper.classList.contains('ex-image-float-left')) {
      buttonAlignLeft.on()
      buttonAlignRight.off()
      resetImageClass(imageWrapper, 'ex-image-float-left')
    } else {
      buttonAlignLeft.off()
      resetImageClass(imageWrapper, 'ex-image-block-middle')
    }
    imageView.updateAttributes({
      classes: imageWrapper.className
    })
  })

  buttonAlignRight.bind('click', () => {
    const { imageWrapper } = imageView
    if (!imageWrapper.classList.contains('ex-image-float-right')) {
      buttonAlignRight.on()
      buttonAlignLeft.off()
      resetImageClass(imageWrapper, 'ex-image-float-right')
    } else {
      buttonAlignRight.off()
      resetImageClass(imageWrapper, 'ex-image-block-middle')
    }
    imageView.updateAttributes({
      classes: imageWrapper.className
    })
  })

  dropdownContent?.append(buttonAlignLeft.render(), buttonAlignRight.render())

  return dropdownContent
}
 */
export class ImageView implements NodeView {
  node: Node
  dom: Element
  contentDOM?: HTMLElement | null | undefined
  image: HTMLImageElement
  imageWrapper: HTMLElement
  figcaption: HTMLElement
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

    this.imageWrapper = document.createElement('figure')
    this.imageWrapper.draggable = true
    this.imageWrapper.className = node.attrs['classes']

    this.image = this.imageWrapper.appendChild(document.createElement('img'))
    this.setImageAttributes(this.image, node)
    this.image.contentEditable = 'false'
    this.image.draggable = false
    this.image.setAttribute('style', 'display: table-cell')

    //this.figcaption = this.imageWrapper.appendChild(document.createElement('figcaption'))
    this.figcaption = document.createElement('figcaption')

    /* this.figcaption = this.imageWrapper.appendChild(document.createElement('figcaption'))
    this.figcaption.dataset['placeholder'] = 'Legenda da imagem'
    const figcaptionText = node.content.size === 0
    if (figcaptionText) {
      this.figcaption.className = 'ex-hidden'
    }

    this.contentDOM = this.figcaption
 */
    const imageUrlRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|bmp|webp|svg))/i

    if (imageUrlRegex.test(node.attrs['src'])) {
      this.urlToBase64(node.attrs['src'])
    } else {

      this.image.addEventListener("load", () => {
        this.originalSize = this.image.width;        
        this.updateAttributes({ style: `width: ${this.originalSize}px` })
      }, { once: true });

    }

    this.image.onload = () => {
      this.imageWrapper.style.width = this.node.attrs['width'] + 'px'
    }

    this.dom = this.imageWrapper
  }

  toggleFigcation() {
    /* const figcaption = this.figcaption
    if (figcaption) {
      if (figcaption.classList.contains('ex-hidden')) {
        figcaption.classList.remove('ex-hidden')
        this.figcaption.classList.add('figcaption-is-empty')
        button.on()
      } else {
        figcaption.classList.add('ex-hidden')
        figcaption.textContent = ''
        button.off()
      }
    } */
  }

  update(newNode: ProseMirrorNode) {
    if (newNode.type !== this.node.type) {
      return false
    }

    this.figcaption.classList.toggle('figcaption-is-empty', newNode.content.size === 0)

    this.node = newNode
    //this.setImageAttributes(this.image, this.node)
    this.imageWrapper.className = newNode.attrs['classes']
    this.imageWrapper.style.width = this.node.attrs['width'] + 'px'

    return true
  }


  selectNode() {
    this.imageWrapper.classList.add('ex-selected')
  }

  deselectNode() {
    this.imageWrapper.classList.remove('ex-selected')
  }
  
  urlToBase64(url: string) {
    const image = new Image()
    image.src = `${this.proxyUrl}/${encodeURIComponent(url)}`
    image.setAttribute('crossorigin', 'anonymous')

    this.image.addEventListener("load", () => {
      convertToBase64(image, (base64Url, width) => {
      this.updateAttributes({ src: base64Url })
      this.originalSize = width;
      this.updateAttributes({ style: `width: ${width}px` })
    })

    }, { once: true });

  }

  ignoreMutation(mutation: ViewMutationRecord) {
    if (mutation.type === 'attributes') {
      return true
    }
    return false
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
    this.imageWrapper.setAttribute('style', `${node.attrs['style']}`)
    image.setAttribute('src', node.attrs['src'])
  }

}
