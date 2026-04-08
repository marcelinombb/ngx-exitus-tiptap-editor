import { EditorState } from 'prosemirror-state';
import { findFigureNode } from '../../utils/tiptap-selection';

export const MIN_WIDTH = 50;
export const MAX_WIDTH = 700;

export const parseWidth = (value?: string | null): number | null => {
    if (!value) return null;
    const width = parseInt(value.replace('px', ''), 10);
    return isNaN(width) ? null : Math.min(Math.max(width, MIN_WIDTH), MAX_WIDTH);
};

export const ALIGN = {
    left: 'ex-image-block-align-left',
    middle: 'ex-image-block-middle',
    right: 'ex-image-block-align-right',
    inlineLeft: 'ex-image-float-left',
    inlineRight: 'ex-image-float-right',
} as const;

export const alignClasses = [
    'ex-image-block-align-left',
    'ex-image-block-align-right',
    'ex-image-block-middle',
];

export const allowedClasses = [
    'ex-image-wrapper',
    ...alignClasses,
    'ex-image-grayscale',
    'ex-image-float-left',
    'ex-image-float-right',
];

export const defaultClasses = ['ex-image-wrapper', 'ex-image-block-middle', 'tiptap-widget'];

export function hasFigureAlignment(
    state: EditorState,
    align: 'left' | 'middle' | 'right' | 'inlineLeft' | 'inlineRight',
): boolean {
    const figureNode = findFigureNode(state);

    if (!figureNode) return false;

    const classes = (figureNode.node.attrs['class'] ?? '').split(' ');
    return classes.includes(ALIGN[align]);
}
