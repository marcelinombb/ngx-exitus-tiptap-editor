import { Node } from '@tiptap/pm/model';
import { Editor } from '@tiptap/core';
import { NodeView } from '@tiptap/core'; // or appropriate base class/interface

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

        // We need a place for the header content if it exists
        // The schema says `content: answerBoxHeader?`. 
        // If showHeader is true (or if content exists), we render a contentDOM.
        // Actually, Tiptap NodeViews with content MUST have a contentDOM.
        // If the schema allows content, we should provide a contentDOM.

        // Structure:
        // <div class="ex-answer-box [styles...]">
        //    <div class="ex-answer-box-content-wrapper"> (contentDOM) </div>
        //    <div class="ex-answer-box-visuals"> ... lines ... </div>
        // </div>

        // Create container for header
        const headerContainer = document.createElement('div');
        headerContainer.classList.add('ex-answer-box-content-wrapper');
        this.contentDOM = headerContainer;
        this.dom.appendChild(headerContainer);

        this.dom.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            // If the click is inside the contentDOM (header), we let ProseMirror handle it (text selection)
            if (this.contentDOM?.contains(target)) {
                return;
            }

            // Otherwise, we select the node itself
            if (typeof this.getPos === 'function') {
                const pos = this.getPos();
                if (pos !== undefined) {
                    // Prevent default to avoid conflicting selection behavior if any
                    // But be careful not to stop event propagation if bubbling is needed elsewhere
                    // event.preventDefault(); 

                    this.editor.commands.setNodeSelection(pos);
                }
            }
        });

        this.render();
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
        // Reset classes
        this.dom.className = 'ex-answer-box tiptap-widget';

        const { style, lines, showHeader, hideBorder } = this.node.attrs;

        if (hideBorder) {
            this.dom.classList.add('ex-answer-box-no-border');
        }

        this.dom.setAttribute('data-style', style);

        // Handle Header visibility
        // Note: The Presence of content in 'contentDOM' is managed by Prosemirror.
        // But we can control visibility of the wrapper or styling.
        if (!showHeader) {
            // If we don't show header, we might want to hide the content wrapper 
            // BUT if there is content inside, hiding it might be confusing.
            // However, `showHeader` logic should probably correspond to the existence of the child node.
            // Let's assume `showHeader` attribute is just a visual toggle or synchronized with content.
        }

        // Visuals (Lines / Box)
        // Remove old visuals
        const oldVisuals = this.dom.querySelector('.ex-answer-box-visuals');
        if (oldVisuals) {
            oldVisuals.remove();
        }

        const visualsContainer = document.createElement('div');
        visualsContainer.classList.add('ex-answer-box-visuals');

        if (style === 'lines' || style === 'numbered-lines') {
            for (let i = 1; i <= lines; i++) {
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
            // 'box' style - just empty space or specific box styling
            const count = parseInt(lines, 10) || 5;
            visualsContainer.style.height = `${count * 30}px`;
        }

        this.dom.appendChild(visualsContainer);
    }

    destroy() {
        // cleanup
    }

    ignoreMutation() {
        return true;
    }
}
