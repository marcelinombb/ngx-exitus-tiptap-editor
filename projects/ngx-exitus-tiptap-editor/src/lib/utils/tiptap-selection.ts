import { findParentNode } from '@tiptap/core';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { EditorState, NodeSelection } from 'prosemirror-state';

/**
 * Finds the figure node from the current selection.
 * It checks if the selection is a NodeSelection of a figure,
 * or if it's inside a figure node.
 */
export function findFigureNode(
  state: EditorState,
): { node: ProseMirrorNode; pos: number } | undefined {
  const { selection } = state;

  // Check if it's a direct node selection
  if (selection instanceof NodeSelection && selection.node.type.name === 'figure') {
    return { node: selection.node, pos: selection.from };
  }

  // Check if we are inside a figure
  const result = findParentNode((node) => node.type.name === 'figure')(selection);

  if (result) {
    return { node: result.node, pos: result.pos };
  }

  return undefined;
}
