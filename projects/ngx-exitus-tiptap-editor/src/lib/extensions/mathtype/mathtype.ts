import { Node, mergeAttributes } from '@tiptap/core'

export const MathType = Node.create({
    name: 'mathtype',

    group: 'inline',

    inline: true,

    atom: true,

    content: 'inline*',

    draggable: true,

    parseHTML() {
        return [
            {
                tag: 'img',
                getAttrs(node) {
                    return (node as HTMLElement).classList.contains('Wirisformula') && null
                },
                priority: 100
            }
        ]
    },
    renderHTML({ HTMLAttributes }) {
        return ['span', { class: 'ex-mathype' }, ['img', mergeAttributes(HTMLAttributes)]]
    },
    addAttributes() {
        return {
            class: {
                default: 'Wirisformula'
            },
            style: {
                default: '',
                parseHTML(element) {
                    return element.getAttribute('style')
                }
            },
            width: {
                default: '',
                parseHTML(element) {
                    return element.getAttribute('width')
                }
            },
            height: {
                default: '',
                parseHTML(element) {
                    return element.getAttribute('height')
                }
            },
            'data-mathml': {
                default: '',
                parseHTML(element) {
                    return element.getAttribute('data-mathml')
                }
            },
            'data-custom-editor': {
                default: null,
                parseHTML(element) {
                    return element.getAttribute('data-custom-editor')
                }
            },
            src: {
                default: null
            }
        }
    },
    addNodeView() {
        return ({ node }) => {
            const dom = document.createElement('span')
            dom.className = 'ex-mathype tiptap-widget'
            const img = document.createElement('img')
            Object.keys(node.attrs).forEach(key => {
                if (node.attrs[key] == null) return
                img.setAttribute(key, node.attrs[key])
            })
            dom.appendChild(img)
            return {
                dom,
                selectNode() {
                    dom.classList.add('ex-selected')
                },
                deselectNode() {
                    dom.classList.remove('ex-selected')
                }
            }
        }
    }
})
