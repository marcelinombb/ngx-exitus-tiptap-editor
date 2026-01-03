import { Plugin } from '@editor/Plugin'
import { BalloonPosition, type ButtonEventProps } from '@editor/ui'
import formula from '@icons/formula.svg'
import './style.css'

import { Katex, KatexBalloon } from '.'

export class KatexPlugin extends Plugin {
  static get pluginName() {
    return 'katex'
  }

  static get requires() {
    return [Katex]
  }

  init() {
    this.editor.toolbar.setButton(KatexPlugin.pluginName, {
      icon: formula,
      click: this.click,
      checkActive: KatexPlugin.pluginName,
      tooltip: 'Fórmula matemática - Latex',
      classList: []
    })
  }

  click({ editor, button }: ButtonEventProps) {
    const { pos } = editor.state.selection.$anchor

    const main = editor.view.dom.getBoundingClientRect()
    const { bottom, left } = editor.view.coordsAtPos(pos)

    if (button.active()) {
      return
    }

    button.on()

    const confirmButtonCallback = (katexBalloon: KatexBalloon) => {
      const { input, checkboxDisplay } = katexBalloon
      if (input.value === '') return
      editor.commands.insertContentAt(pos, `<span class="math-tex ${checkboxDisplay.checked ? 'katex-display' : ''}">${input.value}</span>`, {
        updateSelection: true,
        parseOptions: {
          preserveWhitespace: true
        }
      })
      cancelButtonCallback(katexBalloon)
    }

    const cancelButtonCallback = (katexBalloon: KatexBalloon) => {
      button.off()
      editor.editorMainDiv.removeChild(katexBalloon.getBalloon())
    }

    const balloon = new KatexBalloon(
      editor,
      {
        latexFormula: '',
        display: false
      },
      confirmButtonCallback,
      cancelButtonCallback,
      BalloonPosition.FLOAT
    )

    const focus = () => {
      button.off()
      editor.off('focus', focus)
      try {
        editor.editorMainDiv.removeChild(balloon.getBalloon())
      } catch (e) {}
    }

    editor.on('focus', focus)

    editor.editorMainDiv.appendChild(balloon.getBalloon())
    balloon.balloon.setPosition(left - main.left, bottom - main.y, 'bottom')
  }
}
