import { Injectable } from '@angular/core';
import { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';

@Injectable({
  providedIn: 'root'
})
export class FloatingMenuService {
  private registeredNodes = new Set<string>();

  registerMenu(nodeName: string) {
    this.registeredNodes.add(nodeName);
  }

  isMostSpecificNodeActive(editor: Editor, targetNodeName: string | string[]): boolean {
    const targets = Array.isArray(targetNodeName) ? targetNodeName : [targetNodeName];

    if (!targets.some(t => editor.isActive(t))) {
      return false;
    }

    const { state } = editor;
    const { selection } = state;

    // Check if the exact node is selected via NodeSelection
    if (selection instanceof NodeSelection) {
      if (this.registeredNodes.has(selection.node.type.name)) {
        return targets.includes(selection.node.type.name);
      }
    }

    let depth = selection.$anchor.depth;
    while (depth > 0) {
      const node = selection.$anchor.node(depth);
      if (node && this.registeredNodes.has(node.type.name)) {
        return targets.includes(node.type.name);
      }
      depth--;
    }

    // If no registered node is found in the path, technically this shouldn't happen 
    // because `editor.isActive` was true, which usually means it's in the hierarchy.
    // However, if it happens, we assume the target is active because isActive is true.
    return true;
  }
}
