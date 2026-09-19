import { findParentNode } from '@tiptap/core';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { EditorState, NodeSelection, Selection } from '@tiptap/pm/state';

export interface FoundNode {
  node: ProseMirrorNode;
  pos: number;
}

/**
 * Finds a node from the current selection or state.
 * Checks if the selection is a direct NodeSelection of the node,
 * or if the selection is inside a parent node of matching name.
 */
export function findNodeFromSelection(
  selectionOrState: Selection | EditorState,
  nodeName: string,
): FoundNode | undefined {
  const selection = 'selection' in selectionOrState ? selectionOrState.selection : selectionOrState;

  if (selection instanceof NodeSelection && selection.node.type.name === nodeName) {
    return { node: selection.node, pos: selection.from };
  }

  const result = findParentNode((node) => node.type.name === nodeName)(selection);
  if (result) {
    return { node: result.node, pos: result.pos };
  }

  return undefined;
}

/**
 * Backward-compatible helper to find a figure node from EditorState.
 */
export function findFigureNode(selectionOrState: Selection | EditorState): FoundNode | undefined {
  return findNodeFromSelection(selectionOrState, 'figure');
}
