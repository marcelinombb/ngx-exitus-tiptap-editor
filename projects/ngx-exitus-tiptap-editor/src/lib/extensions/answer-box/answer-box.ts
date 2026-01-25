import { Node, mergeAttributes, findParentNode } from '@tiptap/core';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import { AnswerBoxView } from './answer-box-view'

export interface AnswerBoxOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        answerBox: {
            insertAnswerBox: () => ReturnType;
            setAnswerBoxStyle: (style: 'box' | 'lines' | 'numbered-lines') => ReturnType;
            toggleAnswerBoxHeader: () => ReturnType;
            toggleAnswerBoxBorder: () => ReturnType;
            setAnswerBoxLines: (lines: number) => ReturnType;
        };
    }
}

export const AnswerBox = Node.create<AnswerBoxOptions>({
    name: 'answerBox',

    group: 'block',

    content: 'answerBoxHeader?',

    draggable: true,

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        return {
            style: {
                default: 'box',
                parseHTML: (element) => element.getAttribute('data-style') as any,
                renderHTML: (attributes) => {
                    return {
                        'data-style': attributes['style'],
                    };
                },
            },
            lines: {
                default: 5,
                parseHTML: (element) => parseInt(element.getAttribute('data-lines') || '5', 10),
                renderHTML: (attributes) => {
                    return {
                        'data-lines': attributes['lines'],
                    };
                },
            },
            showHeader: {
                default: false,
                parseHTML: (element) => element.getAttribute('data-show-header') === 'true',
                renderHTML: (attributes) => {
                    return {
                        'data-show-header': attributes['showHeader'],
                    };
                },
            },
            hideBorder: {
                default: false,
                parseHTML: (element) => element.getAttribute('data-hide-border') === 'true',
                renderHTML: (attributes) => {
                    return {
                        'data-hide-border': attributes['hideBorder'],
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div.ex-answer-box',
                contentElement: (element) => element.querySelector('.ex-answer-box-content-wrapper') || element,
            },
        ];
    },

    renderHTML({ HTMLAttributes, node }) {
        const { style, lines, hideBorder } = node.attrs;
        const classes = ['ex-answer-box'];
        if (hideBorder) {
            classes.push('ex-answer-box-no-border');
        }

        const visuals: any[] = ['div', { class: 'ex-answer-box-visuals' }];

        if (style === 'lines' || style === 'numbered-lines') {
            const count = parseInt(lines, 10) || 5;
            for (let i = 1; i <= count; i++) {
                const lineChildren: any[] = [];
                if (style === 'numbered-lines') {
                    lineChildren.push(['span', { class: 'ex-answer-number' }, `${i}.`]);
                }
                visuals.push(['div', { class: 'ex-answer-line' }, ...lineChildren]);
            }
        } else {
            const count = parseInt(lines, 10) || 5;
            visuals[1].style = `height: ${count * 30}px;`;
        }

        return [
            'div',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: classes.join(' ') }),
            ['div', { class: 'ex-answer-box-content-wrapper' }, 0],
            visuals
        ];
    },

    addNodeView() {
        return ({ node, editor, getPos }) => {
            // We pass the extension instance as context if needed, but mainly we need node/editor/getPos
            return new AnswerBoxView(node, editor, getPos);
        };
    },

    addCommands() {
        return {
            insertAnswerBox: () => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: {},
                });
            },
            setAnswerBoxStyle: (style: 'box' | 'lines' | 'numbered-lines') => ({ commands }) => {
                return commands.updateAttributes(this.name, { style });
            },
            setAnswerBoxLines: (lines: number) => ({ commands }) => {
                return commands.updateAttributes(this.name, { lines });
            },
            toggleAnswerBoxHeader: () => ({ commands, editor, state, dispatch }) => {
                const { selection } = state;
                let node: any = null;
                let pos: number | null = null;

                if (selection instanceof NodeSelection && selection.node.type.name === 'answerBox') {
                    node = selection.node;
                    pos = selection.from;
                } else {
                    const found = findParentNode((n) => n.type.name === 'answerBox')(selection);
                    if (found) {
                        node = found.node;
                        pos = found.pos;
                    }
                }

                if (!node || pos === null) {
                    return false;
                }

                if (dispatch) {
                    const showHeader = !node.attrs['showHeader'];
                    let tr = state.tr;

                    // Update attribute
                    tr = tr.setNodeAttribute(pos, 'showHeader', showHeader);

                    // Update content
                    // Schema: content: 'answerBoxHeader?'
                    // If showHeader is true, make sure we have the header node
                    // If showHeader is false, remove the header node

                    const headerType = state.schema.nodes['answerBoxHeader'];
                    const hasHeaderNode = node.childCount > 0 && node.firstChild?.type.name === 'answerBoxHeader';

                    if (showHeader && !hasHeaderNode) {
                        // Insert header at the beginning of the block
                        const headerNode = headerType.createAndFill();
                        if (headerNode) {
                            // Pos + 1 is inside the node
                            tr = tr.insert(pos + 1, headerNode);
                        }
                    } else if (!showHeader && hasHeaderNode) {
                        // Remove header
                        // The header is at the start (pos + 1)
                        const headerSize = node.firstChild!.nodeSize;
                        tr = tr.delete(pos + 1, pos + 1 + headerSize);
                    }

                    dispatch(tr);
                }

                return true;
            },
            toggleAnswerBoxBorder: () => ({ commands, state, dispatch }) => {
                const { selection } = state;
                let pos: number | null = null;
                let node: any = null;

                if (selection instanceof NodeSelection && selection.node.type.name === 'answerBox') {
                    node = selection.node;
                    pos = selection.from;
                } else {
                    const found = findParentNode((n) => n.type.name === 'answerBox')(selection);
                    if (found) {
                        node = found.node;
                        pos = found.pos;
                    }
                }

                if (pos === null || !node) return false;

                if (dispatch) {
                    const hideBorder = !node.attrs['hideBorder'];
                    dispatch(state.tr.setNodeAttribute(pos, 'hideBorder', hideBorder));
                }
                return true;
            },
        };
    },
});
