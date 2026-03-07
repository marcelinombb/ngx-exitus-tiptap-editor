import { RawCommands, findParentNode } from '@tiptap/core';
import { TextSelection, NodeSelection } from 'prosemirror-state';
import { ALIGN, hasFigureAlignment } from './figure-utils';
import { findFigureNode } from '../../utils/tiptap-selection';

export const createFigureCommands = (): Partial<RawCommands> => {
    return {
        hasAlignment: (align: 'left' | 'middle' | 'right' | 'inlineLeft' | 'inlineRight') => {
            return ({ state }) => {
                return hasFigureAlignment(state, align);
            };
        },
        setImageAlignment: (align: 'left' | 'middle' | 'right' | 'inlineLeft' | 'inlineRight') => {
            return ({ tr, state, dispatch }) => {
                const figureNode = findFigureNode(state);

                if (!figureNode) return false;

                const classes = new Set(
                    (figureNode.node.attrs['class'] ?? '').split(' ').filter(Boolean),
                );

                const targetClass = ALIGN[align];
                const isActive = classes.has(targetClass);

                Object.values(ALIGN).forEach((cls) => classes.delete(cls));

                classes.add(isActive ? ALIGN.middle : targetClass);

                const attributes = {
                    class: [...classes].join(' '),
                };

                const pos = figureNode.pos;

                tr = tr.setNodeMarkup(pos, undefined, {
                    ...figureNode.node.attrs,
                    ...attributes,
                });

                if (tr.docChanged) {
                    dispatch && dispatch(tr);
                    return true;
                }

                return false;
            };
        },
        toggleFigcaption:
            () =>
                ({ state, dispatch }) => {
                    const figureNode = findFigureNode(state);

                    if (figureNode) {
                        const { node, pos: figurePos } = figureNode;
                        const { schema } = state;
                        const figcaptionType = schema.nodes['figcaption'];

                        const hasCaption = node.childCount > 1 && node.lastChild?.type === figcaptionType;

                        let tr = state.tr;

                        if (hasCaption) {
                            const captionPos = figurePos + node.nodeSize - node.lastChild!.nodeSize - 1;

                            tr = tr.delete(captionPos, captionPos + node.lastChild!.nodeSize);
                        } else {
                            const caption = figcaptionType.createAndFill();
                            if (!caption) return false;

                            const insertPos = figurePos + node.nodeSize - 1;
                            tr = tr.insert(insertPos, caption);

                            // move cursor INTO figcaption
                            const $pos = tr.doc.resolve(insertPos + 1);
                            tr = tr.setSelection(TextSelection.near($pos));
                        }

                        dispatch && dispatch(tr.scrollIntoView());
                        return true;
                    }

                    return false;
                },
        setImageWidth: (width: number | null) => {
            return ({ tr, state, dispatch }) => {
                const figureNode = findFigureNode(state);

                if (!figureNode) return false;

                tr = tr.setNodeMarkup(figureNode.pos, undefined, {
                    ...figureNode.node.attrs,
                    width,
                });

                if (tr.docChanged) {
                    dispatch && dispatch(tr);
                    return true;
                }

                return false;
            };
        },
        cropImage: () => {
            return ({ editor, view }) => {
                const { selection } = view.state;
                let targetPos: number | undefined;

                if (selection instanceof NodeSelection && selection.node.type.name === 'figure') {
                    targetPos = selection.from;
                } else {
                    const figureResult = findParentNode((node) => node.type.name === 'figure')(selection);
                    targetPos = figureResult?.pos;
                }

                if (targetPos === undefined) return false;

                const dom = view.nodeDOM(targetPos) as any;
                if (dom && typeof dom.toggleCropping === 'function') {
                    dom.toggleCropping();
                    return true;
                }

                return false;
            };
        },

        toggleGreyScale: () => {
            return ({ tr, state, dispatch }) => {
                const figureNode = findFigureNode(state);

                if (!figureNode) return false;

                const classes = new Set(
                    (figureNode.node.attrs['class'] ?? '').split(' ').filter(Boolean),
                );

                const isActive = classes.has('ex-image-grayscale');

                if (isActive) {
                    classes.delete('ex-image-grayscale');
                } else {
                    classes.add('ex-image-grayscale');
                }

                const attributes = {
                    class: [...classes].join(' '),
                };

                const pos = figureNode.pos;

                tr = tr.setNodeMarkup(pos, undefined, {
                    ...figureNode.node.attrs,
                    ...attributes,
                });

                if (tr.docChanged) {
                    dispatch && dispatch(tr);
                    return true;
                }

                return false;
            };
        },
    };
};
