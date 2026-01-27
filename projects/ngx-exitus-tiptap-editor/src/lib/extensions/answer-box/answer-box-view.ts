import { Node } from '@tiptap/pm/model';
import { Editor } from '@tiptap/core';

export class AnswerBoxView {
    dom: HTMLElement;
    contentDOM: HTMLElement | null = null; // Since we might have content (header)
    node: Node;
    editor: Editor;
    getPos: () => number | undefined;

    constructor(node: Node, editor: Editor, getPos: () => number | undefined) {
        this.node = node;
        this.editor = editor;
        this.getPos = getPos;

        this.dom = document.createElement('div');
        this.dom.classList.add('ex-answer-box', 'tiptap-widget');

        // Create container for header
        const headerContainer = document.createElement('div');
        headerContainer.classList.add('ex-answer-box-header');
        this.contentDOM = headerContainer;
        this.dom.appendChild(headerContainer);

        this.dom.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;

            // 1. If click is inside header (contentDOM), let ProseMirror handle it
            // ONLY if header is visible
            if (this.contentDOM?.style.display !== 'none' && this.contentDOM?.contains(target)) {
                return;
            }

            // 2. If click is on a button or inside it, don't select node
            if (target.closest('.insert-paragraph-btn')) {
                return;
            }

            // 3. Otherwise, select the node itself to show floating menu
            if (typeof this.getPos === 'function') {
                const pos = this.getPos();
                if (pos !== undefined) {
                    this.editor.commands.setNodeSelection(pos);
                }
            }
        });

        // Insert Paragraph Before button
        const insertBeforeBtn = document.createElement('div')
        insertBeforeBtn.classList.add('insert-paragraph-btn', 'insert-paragraph-before')
        insertBeforeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M11 9l1.42 1.42L8.83 14H18V7h2v9H8.83l3.59 3.58L11 21l-6-6 6-6z"/></svg>'
        insertBeforeBtn.title = 'Inserir parágrafo antes'
        insertBeforeBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            this.insertParagraph('before')
        })
        this.dom.appendChild(insertBeforeBtn)

        // Insert Paragraph After button
        const insertAfterBtn = document.createElement('div')
        insertAfterBtn.classList.add('insert-paragraph-btn', 'insert-paragraph-after')
        insertAfterBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M11 9l1.42 1.42L8.83 14H18V7h2v9H8.83l3.59 3.58L11 21l-6-6 6-6z"/></svg>'
        insertAfterBtn.title = 'Inserir parágrafo após'
        insertAfterBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            this.insertParagraph('after')
        })
        this.dom.appendChild(insertAfterBtn)

        this.render();
    }

    insertParagraph(where: 'before' | 'after') {
        if (typeof this.getPos !== 'function') return
        const pos = this.getPos()
        if (pos === undefined) return

        const insertionPos = where === 'before' ? pos : pos + this.node.nodeSize
        this.editor.commands.insertContentAt(insertionPos, {
            type: 'paragraph',
            content: [{ type: 'text', text: ' ' }]
        })

        // Focus the new paragraph
        if (where === 'before') {
            this.editor.commands.focus(insertionPos)
        } else {
            this.editor.commands.focus(insertionPos + 1)
        }
    }

    update(node: Node) {
        if (node.type !== this.node.type) {
            return false;
        }
        this.node = node;
        this.render();
        return true;
    }

    selectNode() {
        this.dom.classList.add('ex-selected');
    }

    deselectNode() {
        this.dom.classList.remove('ex-selected');
    }

    render() {
        // IMPORTANT: Use classList to preserve Tiptap-managed selection classes (like .ex-selected)
        this.dom.classList.add('ex-answer-box');

        const { style, lines, showHeader, hideBorder } = this.node.attrs;

        if (hideBorder) {
            this.dom.classList.add('ex-answer-box-no-border');
        } else {
            this.dom.classList.remove('ex-answer-box-no-border');
        }

        this.dom.setAttribute('data-style', style);

        // Handle Header visibility
        if (this.contentDOM) {
            this.contentDOM.style.display = showHeader ? 'block' : 'none';
        }

        // Visuals (Lines / Box)
        const oldVisuals = this.dom.querySelector('.ex-answer-box-visuals');
        if (oldVisuals) {
            oldVisuals.remove();
        }

        const visualsContainer = document.createElement('div');
        visualsContainer.classList.add('ex-answer-box-visuals');
        visualsContainer.contentEditable = 'false';

        if (style === 'lines' || style === 'numbered-lines') {
            const count = parseInt(lines as any, 10) || 5;
            for (let i = 1; i <= count; i++) {
                const lineEl = document.createElement('div');
                lineEl.classList.add('ex-answer-line');
                if (style === 'numbered-lines') {
                    const numberSpan = document.createElement('span');
                    numberSpan.classList.add('ex-answer-number');
                    numberSpan.innerText = `${i}.`;
                    lineEl.appendChild(numberSpan);
                }
                visualsContainer.appendChild(lineEl);
            }
        } else {
            const count = parseInt(lines as any, 10) || 5;
            visualsContainer.style.height = `${count * 30}px`;
        }

        this.dom.appendChild(visualsContainer);
    }

    destroy() {
        // cleanup
    }
}
