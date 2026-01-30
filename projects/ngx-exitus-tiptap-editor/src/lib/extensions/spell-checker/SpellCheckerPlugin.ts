import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { SpellChecker, type SpellCheckerConfig } from './spell-checker'
import { SpellCheckerView } from './SpellCheckerView'

export const SpellCheckerExtension = Extension.create<SpellCheckerConfig>({
  name: 'spellChecker',

  addOptions() {
    return {
      apiUrl: '',
      debounceMs: 500,
      minWordLength: 3,
    }
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('spellChecker')
    const { apiUrl, debounceMs, minWordLength } = this.options
    const editor = this.editor

    if (!apiUrl) {
      console.warn('SpellCheckerExtension: apiUrl not configured')
      return []
    }

    const spellChecker = new SpellChecker({ apiUrl, debounceMs, minWordLength })

    return [
      new Plugin({
        key: pluginKey,
        state: {
          init() {
            return DecorationSet.empty
          },
          apply(tr, oldSet) {
            const set = tr.getMeta(pluginKey)
            if (set) return set
            return oldSet.map(tr.mapping, tr.doc)
          }
        },
        props: {
          decorations(state) {
            return this.getState(state)
          }
        },
        view: (view) => {
          const spellCheckerView = new SpellCheckerView(view)
          
          // Helper to handle clicks on spelling errors
          const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (target.classList.contains('spelling-error')) {
              e.preventDefault()
              e.stopPropagation()

              const word = target.dataset['word']
              const suggestionsStr = target.dataset['suggestions']
              const from = parseInt(target.dataset['from'] || '0', 10)
              const to = parseInt(target.dataset['to'] || '0', 10)

              if (word && suggestionsStr) {
                const suggestions = JSON.parse(suggestionsStr)
                spellCheckerView.show(e.clientX, e.clientY, word, suggestions, (replacement) => {
                  editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, replacement).run()
                  // Re-check after replacement?
                  // The update() method will detect doc change and queue check.
                })
              }
            }
          }

          view.dom.addEventListener('click', handleClick)

          // Setup spell checker results handler
          spellChecker.onResults((results) => {
            const { state } = view
            const { doc } = state
            const decorations: Decoration[] = []

            doc.descendants((node, pos) => {
              if (node.isText && node.text) {
                const regex = /[a-zA-ZÀ-ÿ]+/g
                let wordMatch: RegExpExecArray | null

                while ((wordMatch = regex.exec(node.text)) !== null) {
                  console.log(node.text);
                  
                  const word = wordMatch[0].toLowerCase()
                  // Check API results or local cache
                  const result = results.get(word) || spellChecker.checkWord(word)

                  if (result && !result.isCorrect) {
                    const from = pos + wordMatch.index
                    const to = from + wordMatch[0].length

                    decorations.push(
                      Decoration.inline(from, to, {
                        class: 'spelling-error',
                        'data-word': word,
                        'data-suggestions': JSON.stringify(result.suggestions.slice(0, 5)),
                        'data-from': String(from),
                        'data-to': String(to),
                        style: 'text-decoration: underline wavy red; cursor: pointer;'
                      })
                    )
                  }
                }
              }
              return true
            })

            const decorationSet = DecorationSet.create(doc, decorations)
            const transaction = state.tr.setMeta(pluginKey, decorationSet)
            view.dispatch(transaction)
          })

          return {
            update(view, prevState) {
              // Queue check if document changed
              if (!prevState.doc.eq(view.state.doc)) {

                 view.state.doc.descendants((node, pos) => {
                    if (node.isText && node.text) {
                      const regex = /[a-zA-ZÀ-ÿ]+/g
                      let wordMatch: RegExpExecArray | null

                      while ((wordMatch = regex.exec(node.text)) !== null) {
                        
                        const word = wordMatch[0].toLowerCase()
                       
                        spellChecker.queueTextCheck(word)

                      }
                    }
                  return true
                })
                
              }
            },
            destroy() {
              view.dom.removeEventListener('click', handleClick)
              spellCheckerView.destroy()
              spellChecker.destroy()
            }
          }
        }
      })
    ]
  }
})
