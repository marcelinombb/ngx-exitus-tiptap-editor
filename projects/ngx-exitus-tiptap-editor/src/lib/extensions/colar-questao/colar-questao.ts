import { mergeAttributes, Node } from '@tiptap/core'
import { Fragment, type Node as PmNode, type Schema, Slice } from '@tiptap/pm/model'

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        colarQuestao: {
            addColarQuestao: (title: string) => ReturnType
            removeColarQuestao: (pos: number) => ReturnType
        }
    }
}

export const ColarQuestao = Node.create({
    name: 'colarQuestao',

    group: 'block',

    content: 'block*',

    selectable: false,

    isolating: true,

    defining: true,

    draggable: true,

    parseHTML() {
        return [
            {
                tag: 'colar-questao',
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return ['colar-questao', mergeAttributes(HTMLAttributes), 0]
    },

    addAttributes() {
        return {
            title: {
                default: null,
            },
        }
    },

    addCommands() {
        return {
            addColarQuestao: (title: string) => ({ tr, state, dispatch }) => {
                const { schema, selection, doc } = state
                const { $from, $to } = selection

                // Check for duplicate titles
                let exists = false
                doc.descendants((node) => {
                    if (node.type.name === this.name && node.attrs['title'] === title) {
                        exists = true
                        return false
                    }
                    return true
                })

                if (exists) return false

                // Check if selection is already inside a colarQuestao node
                let existingNodePos = -1
                let existingNode: PmNode | null = null

                // Walk up from current position to find if we are inside our node
                for (let d = $from.depth; d > 0; d--) {
                    const node = $from.node(d)
                    if (node.type.name === this.name) {
                        existingNode = node
                        existingNodePos = $from.before(d)
                        break
                    }
                }

                if (existingNode && existingNodePos > -1) {
                    // If title is the same, do nothing
                    if (existingNode.attrs['title'] === title) return false

                    if (dispatch) {
                        tr.setNodeMarkup(existingNodePos, undefined, { title })
                        dispatch(tr)
                    }
                    return true
                }

                // If not updating, we are inserting/wrapping.
                // Determine the range to wrap.
                // We want to wrap the current block(s).
                // If depth is 0, use full selection.
                const fromPos = $from.depth > 0 ? $from.before($from.depth) : selection.from
                const toPos = $to.depth > 0 ? $to.after($to.depth) : selection.to

                const slice = doc.slice(fromPos, toPos)
                const content = ensureBlockContent(slice, schema)

                const node = schema.nodes[this.name].create({ title }, content)

                if (dispatch) {
                    tr.replaceRangeWith(fromPos, toPos, node)
                    dispatch(tr)
                }

                return true
            },

            removeColarQuestao: (pos: number) => ({ tr, dispatch }) => {
                if (dispatch) {
                    const node = tr.doc.nodeAt(pos)
                    if (node && node.type.name === this.name) {
                        // Replace the node with its content (unwrap)
                        tr.replaceWith(pos, pos + node.nodeSize, node.content)
                        dispatch(tr)
                        return true
                    }
                }
                return false
            },
        }
    },

    addNodeView() {
        return ({ editor, node, getPos }) => {
            const dom = document.createElement('div')
            dom.draggable = true
            dom.classList.add('colar-questao')

            // Stop internal drops
            const handleDrop = (event: DragEvent) => {
                const draggedNodeType = event.dataTransfer?.getData('text/html') ?? ''
                if (/colar-questao/i.test(draggedNodeType)) {
                    event.preventDefault()
                }
            }
            dom.addEventListener('drop', handleDrop)

            const label = document.createElement('label')
            label.contentEditable = 'false'
            label.textContent = node.attrs['title']

            const close = document.createElement('button')
            close.contentEditable = 'false'
            close.className = 'close-colar'
            // Close icon
            close.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.04996 5.63672L11.9997 10.5865Z"></path></svg>`

            const remove = () => {
                if (typeof getPos === 'function') {
                    const pos = getPos()
                    if (typeof pos === 'number') {
                        editor.commands.removeColarQuestao(pos)
                    }
                }
            }
            close.addEventListener('click', remove)

            const content = document.createElement('div')
            content.classList.add('colar-content', 'is-editable')

            dom.append(label, close, content)

            return {
                dom,
                contentDOM: content,
                destroy: () => {
                    dom.removeEventListener('drop', handleDrop)
                    close.removeEventListener('click', remove)
                },
            }
        }
    },
})

/**
 * Helper to ensure we have block content for the wrapper
 */
function ensureBlockContent(slice: Slice, schema: Schema): Fragment {
    const items: PmNode[] = []
    let inline: PmNode[] = []

    slice.content.forEach((node) => {
        if (node.isInline) {
            inline.push(node)
        } else if (node.isBlock) {
            if (inline.length) {
                items.push(schema.nodes['paragraph'].create(null, inline))
                inline = []
            }
            items.push(node)
        }
    })

    // Flush remaining inline
    if (inline.length) {
        items.push(schema.nodes['paragraph'].create(null, inline))
    }

    // If empty, provide a default paragraph
    if (!items.length) {
        return Fragment.from(schema.nodes['paragraph'].create())
    }

    return Fragment.from(items)
}
