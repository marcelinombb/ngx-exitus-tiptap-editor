import { mergeAttributes, Node, type NodeViewRendererProps } from '@tiptap/core';
import { DOMSerializer, Fragment, type Node as PmNode, type Schema, Slice } from '@tiptap/pm/model';
import { type EditorView } from '@tiptap/pm/view';
import { type EditorState } from '@tiptap/pm/state';
import { AngularNodeViewRenderer } from 'ngx-tiptap';
import { ColarQuestaoComponent } from './colar-questao.component';
import { Injector } from '@angular/core';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        colarQuestao: {
            /**
             * Add a new ColarQuestao node.
             * If selection is inside an existing node, updates its title.
             * If valid blocks are selected, wraps them.
             */
            addColarQuestao: (title: string) => ReturnType;
            /**
             * Remove the ColarQuestao node at the specified position.
             * Unwrap its content.
             */
            removeColarQuestao: (pos: number) => ReturnType;
            /**
             * Get the content HTML of a specific ColarQuestao node by title.
             */
            getColarQuestaoContent: (title: string) => any;
        };
    }
}

const CLOSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.04996 5.63672L11.9997 10.5865Z"></path></svg>`;

export interface ColarQuestaoOptions {
    HTMLAttributes: Record<string, any>;
    injector?: Injector;
}

export const ColarQuestao = Node.create<ColarQuestaoOptions>({
    name: 'colarQuestao',

    group: 'block',

    content: 'block+',

    selectable: false,

    isolating: true,

    defining: true,

    draggable: true,

    addOptions() {
        return {
            HTMLAttributes: {},
            injector: undefined,
        };
    },

    addAttributes() {
        return {
            title: {
                default: null,
                parseHTML: (element) => element.getAttribute('title'),
                renderHTML: (attributes) => {
                    return {
                        title: attributes["title"],
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'colar-questao',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'colar-questao',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
            0,
        ];
    },

    addCommands() {
        return {
            addColarQuestao:
                (title: string) =>
                    ({ tr, state, dispatch }) => {
                        const { schema, selection, doc } = state;

                        // 1. Check for duplicate titles (Business Rule)
                        let titleExists = false;
                        doc.descendants((node) => {
                            if (node.type.name === this.name && node.attrs['title'] === title) {
                                titleExists = true;
                                return false; // Stop iteration
                            }
                            return true;
                        });

                        if (titleExists) {
                            return false;
                        }

                        // 2. Check if we are inside an existing node (Update Scenario)
                        const { $from, $to } = selection;
                        let existingPos = -1;
                        let existingNode: PmNode | null = null;

                        for (let d = $from.depth; d > 0; d--) {
                            const node = $from.node(d);
                            if (node.type.name === this.name) {
                                existingNode = node;
                                existingPos = $from.before(d);
                                break;
                            }
                        }

                        if (existingNode && existingPos > -1) {
                            // If identical title, no-op
                            if (existingNode.attrs['title'] === title) {
                                return false;
                            }

                            if (dispatch) {
                                tr.setNodeMarkup(existingPos, undefined, {
                                    ...existingNode.attrs,
                                    title,
                                });
                            }
                            return true;
                        }

                        // 3. Wrap selection (Creation Scenario)
                        // Determine the range to wrap (expand to full blocks)
                        const fromPos =
                            $from.depth > 0 ? $from.before($from.depth) : selection.from;
                        const toPos = $to.depth > 0 ? $to.after($to.depth) : selection.to;

                        // Create the slice and ensure it contains blocks
                        const slice = doc.slice(fromPos, toPos);
                        const content = ensureBlockContent(slice, schema);

                        // Create the node
                        const node = schema.nodes[this.name].create({ title }, content);

                        if (dispatch) {
                            tr.replaceRangeWith(fromPos, toPos, node);
                        }

                        return true;
                    },

            removeColarQuestao:
                (pos: number) =>
                    ({ tr, dispatch }) => {
                        const node = tr.doc.nodeAt(pos);
                        if (node && node.type.name === this.name) {
                            if (dispatch) {
                                // Unwrap: replace the node with its own content
                                tr.replaceWith(pos, pos + node.nodeSize, node.content);
                            }
                            return true;
                        }
                        return false;
                    },

            getColarQuestaoContent:
                (title: string) =>
                    ({ state }: { state: EditorState }) => {
                        let targetNode: PmNode | null = null;
                        state.doc.descendants((node) => {
                            if (node.type.name === this.name && node.attrs['title'] === title) {
                                targetNode = node;
                                return false;
                            }
                            return true;
                        });

                        if (targetNode) {
                            const serializer = DOMSerializer.fromSchema(state.schema);
                            const fragment = serializer.serializeFragment((targetNode as PmNode).content);
                            const wrapper = document.createElement('div');
                            wrapper.appendChild(fragment);
                            return wrapper.innerHTML;
                        }
                        return null;
                    },
        };
    },

    addNodeView() {
        if (!this.options.injector) {
            console.warn('ColarQuestao: Injector not provided. Angular NodeView might fail.');
        }
        return AngularNodeViewRenderer(ColarQuestaoComponent, { injector: this.options.injector! });
    },
});

/**
 * Helper: Ensures a slice contains only block content wrapped in paragraphs if needed.
 */
function ensureBlockContent(slice: Slice, schema: Schema): Fragment {
    const items: PmNode[] = [];
    let inlineBuffer: PmNode[] = [];

    slice.content.forEach((node) => {
        if (node.isInline) {
            inlineBuffer.push(node);
        } else if (node.isBlock) {
            if (inlineBuffer.length) {
                items.push(schema.nodes['paragraph'].create(null, inlineBuffer));
                inlineBuffer = [];
            }
            items.push(node);
        }
    });

    // Flush remaining inline content
    if (inlineBuffer.length) {
        items.push(schema.nodes['paragraph'].create(null, inlineBuffer));
    }

    // If empty, provide a default empty paragraph to ensure valid content
    if (!items.length) {
        return Fragment.from(schema.nodes['paragraph'].create());
    }

    return Fragment.from(items);
}
