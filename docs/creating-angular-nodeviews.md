# Guia de Criação de NodeViews com Angular

Este guia explica como criar NodeViews interativos usando componentes Angular e a biblioteca `ngx-tiptap`.

NodeViews são usados quando você precisa de uma representação complexa para um node do Tiptap, com interatividade, estado próprio ou layout que o HTML padrão não consegue fornecer facilmente.

## 1. O Componente Angular

Para criar um NodeView, crie um componente Angular que estenda `AngularNodeViewComponent`. Isso fornece acesso ao node, extension, editor e métodos para atualizar atributos.

### Exemplo: `CounterComponent`
Um componente simples que exibe um contador interativo.

```typescript
import { Component } from '@angular/core';
import { AngularNodeViewComponent } from 'ngx-tiptap';

@Component({
  selector: 'app-node-view-counter',
  standalone: true, // Recomendado usar Standalone Components
  template: `
    <div class="counter-wrapper">
      <p>Contador: {{ node.attrs.count }}</p>
      <button (click)="increment()">+1</button>
    </div>
  `,
  styles: [`
    .counter-wrapper {
      border: 1px solid #ccc;
      padding: 10px;
      border-radius: 4px;
      display: inline-block;
    }
    button {
      margin-top: 5px;
      padding: 4px 8px;
    }
  `]
})
export class CounterComponent extends AngularNodeViewComponent {
  increment() {
    // Atualiza o atributo 'count' do node
    this.updateAttributes({
      count: this.node.attrs.count + 1
    });
  }
}
```

**Pontos Importantes:**
- `this.node.attrs`: Acesso aos atributos do node.
- `this.updateAttributes({})`: Método para atualizar atributos e manter o estado sincronizado com o documento Prosemirror.
- `contenteditable="false"` não é necessário no wrapper principal se o componente não contiver conteúdo editável do editor, mas cuidado com seleção. O `ngx-tiptap` geralmente lida com o wrapper.

## 2. O Node (Extension)

Você precisa registrar o NodeView no seu Node extension usando `addNodeView` e `AngularNodeViewRenderer`.

### Exemplo: `CounterExtension`

```typescript
import { Node, mergeAttributes } from '@tiptap/core';
import { AngularNodeViewRenderer } from 'ngx-tiptap';
import { CounterComponent } from './counter.component'; // Importe seu componente
import { Injector } from '@angular/core';

export interface CounterOptions {
    injector: Injector;
}

export const CounterExtension = Node.create<CounterOptions>({
  name: 'counter',

  group: 'block',
  atom: true, // Importante se o node não tiver conteúdo editável (como texto interno)

  addAttributes() {
    return {
      count: {
        default: 0,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'app-node-view-counter',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['app-node-view-counter', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    // Registra o componente Angular como a view para este node
    return AngularNodeViewRenderer(CounterComponent, { injector: this.options.injector });
  },
});
```

## 3. Registrando no Editor

Ao configurar o editor, certifique-se de passar o `Injector` para a extensão, pois o `AngularNodeViewRenderer` precisa dele para criar o componente dinamicamente.

```typescript
// No seu componente pai do Editor
import { Editor } from '@tiptap/core';
import { CounterExtension } from './counter.extension';

// ...
export class EditorComponent {
    constructor(private injector: Injector) {}

    editor = new Editor({
        extensions: [
            // ... outras extensões
            CounterExtension.configure({
                injector: this.injector
            })
        ]
    })
}
```

## Resumo
1.  Crie um Componente Angular extendendo `AngularNodeViewComponent`.
2.  Use `this.node.attrs` para ler e `this.updateAttributes` para escrever.
3.  Crie a Extensão do Node e configure `addNodeView` com `AngularNodeViewRenderer`.
4.  Passe o `Injector` na configuração da extensão ao instanciar o Editor.
