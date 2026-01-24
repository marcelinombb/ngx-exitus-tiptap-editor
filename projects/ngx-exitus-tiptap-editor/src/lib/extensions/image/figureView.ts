import { type Editor } from '@tiptap/core'
import { type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { type Node } from '@tiptap/pm/model'
import { type NodeView, type ViewMutationRecord } from '@tiptap/pm/view'

export class FigureView implements NodeView {
    node: Node
    dom: Element
    contentDOM?: HTMLElement | null | undefined
    editor: Editor
    getPos: () => number | undefined

    constructor(
        node: Node,
        editor: Editor,
        getPos: () => number | undefined
    ) {
        this.node = node
        this.editor = editor
        this.getPos = getPos

        // Wrapper div to hold figure + handles
        const wrapper = document.createElement('div')
        this.dom = wrapper
        wrapper.style.position = 'relative'
        // Apply width to the wrapper, which mimics the figure behavior
        wrapper.style.width = `${node.attrs['width']}px`

        // The actual figure element
        const figure = document.createElement('figure')
        figure.style.margin = '0' // Reset margin to let wrapper control layout
        figure.style.width = '100%'
        wrapper.appendChild(figure)
        this.contentDOM = figure

        // Sync classes to wrapper
        this.updateClasses(wrapper, node)

        // Resize handles
        const handles = ['tl', 'tr', 'bl', 'br'] as const
        handles.forEach(direction => {
            const handle = document.createElement('div')
            handle.classList.add('resize-handle', `resize-handle-${direction}`)
            handle.addEventListener('mousedown', (e) => this.onMouseDown(e, direction))
            wrapper.appendChild(handle)
        })

        // Insert Paragraph Before button
        const insertBeforeBtn = document.createElement('div')
        insertBeforeBtn.classList.add('insert-paragraph-btn', 'insert-paragraph-before')
        insertBeforeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M11 9l1.42 1.42L8.83 14H18V7h2v9H8.83l3.59 3.58L11 21l-6-6 6-6z"/></svg>'
        insertBeforeBtn.title = 'Inserir parágrafo antes'
        insertBeforeBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            this.insertParagraph('before')
        })
        wrapper.appendChild(insertBeforeBtn)

        // Insert Paragraph After button
        const insertAfterBtn = document.createElement('div')
        insertAfterBtn.classList.add('insert-paragraph-btn', 'insert-paragraph-after')
        insertAfterBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M11 9l1.42 1.42L8.83 14H18V7h2v9H8.83l3.59 3.58L11 21l-6-6 6-6z"/></svg>'
        insertAfterBtn.title = 'Inserir parágrafo após'
        insertAfterBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            this.insertParagraph('after')
        })
        wrapper.appendChild(insertAfterBtn)

        // Add click listener to select the figure when image is clicked
        wrapper.addEventListener('click', (e) => {
            const target = e.target as HTMLElement
            if (target.tagName === 'IMG' && typeof this.getPos === 'function') {
                const pos = this.getPos()
                if (pos !== undefined) {
                    e.preventDefault()
                    this.editor.commands.setNodeSelection(pos)
                }
            }
        })
    }

    selectNode() {
        (this.dom as HTMLElement).classList.add('ex-selected')
    }

    deselectNode() {
        (this.dom as HTMLElement).classList.remove('ex-selected')
    }

    ignoreMutation(mutation: ViewMutationRecord) {
        // Ignore style changes (width resizing) to prevent ProseMirror from resetting
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            return true
        }
        // Allow content changes
        return false
    }

    updateClasses(element: HTMLElement, node: Node) {
        element.className = node.attrs['class'] || ''
        if (!element.classList.contains('ex-image-wrapper')) {
            element.classList.add('ex-image-wrapper')
        }
    }

    onMouseDown(event: MouseEvent, direction: 'tl' | 'tr' | 'bl' | 'br') {
        event.preventDefault()
        const startX = event.clientX
        const wrapper = this.dom as HTMLElement
        const startWidth = wrapper.offsetWidth

        const onMouseMove = (moveEvent: MouseEvent) => {
            const currentX = moveEvent.clientX
            const diffX = currentX - startX

            // If dragging from the left, moving left (negative diff) increases width
            const multiplier = (direction === 'tl' || direction === 'bl') ? -1 : 1

            const newWidth = Math.max(300, Math.min(700, startWidth + (diffX * multiplier)))

            wrapper.style.width = `${newWidth}px`
        }

        const onMouseUp = (upEvent: MouseEvent) => {
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)

            const finalX = upEvent.clientX
            const diffX = finalX - startX
            const multiplier = (direction === 'tl' || direction === 'bl') ? -1 : 1
            const newWidth = Math.max(300, Math.min(700, startWidth + (diffX * multiplier)))

            this.updateAttributes({ width: newWidth })
        }

        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
    }

    update(newNode: ProseMirrorNode) {
        if (newNode.type !== this.node.type) {
            return false
        }

        this.node = newNode
        const wrapper = this.dom as HTMLElement
        this.updateClasses(wrapper, newNode)
        wrapper.style.width = `${newNode.attrs['width']}px`

        return true
    }

    updateAttributes(attributes: Record<string, any>) {
        if (typeof this.getPos === 'function') {
            const pos = this.getPos()
            if (pos === undefined) return

            const { view } = this.editor
            const transaction = view.state.tr

            try {
                transaction.setNodeMarkup(pos, undefined, {
                    ...this.node.attrs,
                    ...attributes
                })
                view.dispatch(transaction)
            } catch (e) {
                console.error("Failed to update figure attributes", e)
            }
        }
    }

    insertParagraph(where: 'before' | 'after') {
        if (typeof this.getPos !== 'function') return
        const pos = this.getPos()
        if (pos === undefined) return

        const insertionPos = where === 'before' ? pos : pos + this.node.nodeSize
        this.editor.commands.insertContentAt(insertionPos, { type: 'paragraph' })

        // Focus the new paragraph
        if (where === 'before') {
            this.editor.commands.focus(insertionPos)
        } else {
            this.editor.commands.focus(insertionPos + 1)
        }
    }
}
