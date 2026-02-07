# Angular Bindings no ProseMirror/Tiptap

Este documento descreve a implementação customizada de integração entre Angular e Tiptap, localizada em `projects/ngx-exitus-tiptap-editor/src/lib/utils/angular-node-view-renderer.ts`.

## Por que Bindings Customizados?

O time do Tiptap fornece bindings oficiais (`@tiptap/angular`), mas optamos por uma implementação interna para:
1.  **Controle Total**: Entender e manipular exatamente como os componentes Angular são instanciados dentro do editor.
2.  **Performance**: Evitar o overhead de `Zone.js` quando não necessário, controlando manualmente o `ChangeDetection`.
3.  **Independência**: Não depender de pacotes que podem estar desatualizados em relação ao core do Tiptap.

## Arquitetura

A integração acontece através da API de `NodeView` do ProseMirror. Uma `NodeView` é uma classe que controla a representação visual de um nó do documento.

### Fluxo de Criação

1.  **Tiptap** encontra um nó customizado (ex: `answerBox`) durante a renderização.
2.  Chama `addNodeView` definido na extensão.
3.  O `AngularNodeViewRenderer` é invocado.
4.  É instanciada a classe `AngularNodeView` (implementação da interface `NodeView`).
5.  Dentro do construtor da `AngularNodeView`:
    *   Usa `createComponent` (API do Angular 14+) para criar uma instância do Componente solicitado.
    *   Injeta as dependências via `EnvironmentInjector` (passado nas opções).
    *   Pega o `nativeElement` do componente e o atribui ao `this.dom` do ProseMirror.
    *   Se o nó tiver conteúdo, procura por um elemento com atributo `data-node-view-content` para atribuir ao `this.contentDOM`.

### Ciclo de Vida e Atualizações

O Tiptap/ProseMirror não roda dentro da `NgZone` do Angular por padrão para evitar performance penalty em eventos de digitação rápidos. Por isso:

*   **Detecção de Mudanças**: É feita **manualmente**. Sempre que o `AngularNodeView.update()` é chamado pelo ProseMirror, nós atualizamos os inputs do componente e chamamos `changeDetectorRef.detectChanges()`.
*   **Destruição**: Quando o nó é removido do documento, o ProseMirror chama `destroy()`, e nós repassamos isso para o `componentRef.destroy()` para evitar memory leaks.

## Como Usar em Extensões

Para criar uma nova extensão com componente Angular:

1.  **Crie o Componente**:
    Deve implementar `AngularNodeViewComponent`.
    **Recomendado**: Use **Angular Signals** (`input()`, `input.required()`, `computed()`) para melhor performance e DX.
    O `AngularNodeViewRenderer` utiliza `setInput` internamente, suportando tanto Signals quanto `@Input` tradicional.

    ```typescript
    export class MeuComponente implements AngularNodeViewComponent {
      node = input.required<ProseMirrorNode>();
      editor = input.required<Editor>();
      // ...
    }
    ```

2.  **Registre na Extensão**:

```typescript
import { Node } from '@tiptap/core';
import { AngularNodeViewRenderer } from '../../utils/angular-node-view-renderer';
import { MeuComponente } from './meu-componente';
import { Injector } from '@angular/core';

export const MinhaExtensao = Node.create({
  name: 'minhaExtensao',
  // ... configuration ...
  addNodeView() {
    return AngularNodeViewRenderer(MeuComponente, { injector: this.options.injector });
  }
});
```

**Nota Importante**: O `Injector` deve ser passado para a extensão durante a inicialização do editor no `exitus-tiptap-editor.ts`.

## Content Projection (Nested Content)

Para nós que permitem conteúdo dentro deles (ex: uma caixa que pode ter parágrafos dentro), o componente Angular deve ter um elemento marcado:

```html
<div class="minha-caixa">
  <div class="header">Titulo</div>
  <!-- O ProseMirror montará o conteúdo editável aqui -->
  <div data-node-view-content></div>
</div>
```

O `AngularNodeViewRenderer` detectará esse atributo `data-node-view-content` e dirá ao ProseMirror para renderizar o conteúdo do nó ali.
