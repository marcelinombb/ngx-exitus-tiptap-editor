# Guia Completo: Criando Extensões no Tiptap

Este guia aprofunda os detalhes da criação de extensões personalizadas para o Tiptap, com foco especial na anatomia e configuração de **Nodes**.

## Tipos de Extensões

1.  **Nodes**: Definem a estrutura do documento (parágrafos, títulos, imagens). São renderizados como blocos ou elementos inline.
2.  **Marks**: Adicionam estilos ou metadados a partes de um texto (negrito, itálico, links). Não alteram a estrutura do documento.
3.  **Extensions**: Funcionalidades globais (atalhos, histórico, colagem) que não possuem representação direta no documento.

---

## 1. Anatomia de um Node (`NodeConfig`)

Ao criar um node com `Node.create`, você define um objeto de configuração robusto. Entender cada propriedade é crucial para controlar o comportamento do editor.

### Propriedades do Schema (Document Model)

Estas propriedades configuram como o ProseMirror entende o seu node.

| Propriedade | Tipo | Descrição |
| :--- | :--- | :--- |
| `name` | `string` | **Obrigatório**. Identificador único (ex: `'paragraph'`, `'customBlock'`). |
| `group` | `string` | Onde este node se encaixa (ex: `'block'`, `'inline'`, `'list_item'`). Usado na propriedade `content` de outros nodes. |
| `content` | `string` | Expressão de conteúdo. Ex: `'inline*'` (texto/marks), `'block+'` (1+ blocos), `'(text|image)*'`. |
| `inline` | `boolean` | `true` para nodes que fluem com o texto (ex: mention). `false` para blocos. Padrão: `false`. |
| `atom` | `boolean` | `true` se o node deve ser tratado como uma unidade indivisível (o cursor pula ele, não entra nele). Útil para embeds. Padrão: `false`. |
| `selectable` | `boolean` | Se o usuário pode selecionar o node clicando nele. Padrão: `true`. |
| `draggable` | `boolean` | Se o node pode ser arrastado. Padrão: `false`. |
| `code` | `boolean` | Se `true`, desativa transformações de texto automáticas dentro dele. |
| `defining` | `boolean` | Se `true`, colar conteúdo dentro tende a preservar o conteúdo em vez de substituir o node. Essencial para containers (Blockquotes). |
| `isolating` | `boolean` | Se `true`, edições (como backspace) não "vazam" para fora do node. Útil para Células de Tabela. |

### Exemplo de Configuração Avançada

```typescript
export const SuperBlock = Node.create({
  name: 'superBlock',
  group: 'block',
  content: 'paragraph+', // Deve conter parágrafos
  defining: true,       // Mantém o container ao colar
  draggable: true,      // Pode ser arrastado
  // ...
});
```

---

## 2. Métodos de Implementação

Além das propriedades estáticas, você implementa métodos para definir comportamento e renderização.

### `addAttributes()`

Define o estado do node que deve ser persistido. Para cada atributo, você define como ele é lido do HTML (`parseHTML`) e como é escrito (`renderHTML`).

```typescript
addAttributes() {
  return {
    cor: {
      default: 'black',
      // Parse: Lê do estilo inline ou data-attribute
      parseHTML: element => element.style.color || element.getAttribute('data-cor'),
      // Render: Escreve no estilo e data-attribute
      renderHTML: attributes => {
        if (!attributes.cor) return {};
        return {
          style: `color: ${attributes.cor}`,
          'data-cor': attributes.cor,
        };
      },
    },
  };
},
```

### `parseHTML()`

Define como o Tiptap reconhece seu node ao colar conteúdo ou carregar HTML inicial.

```typescript
parseHTML() {
  return [
    {
      tag: 'div[data-type="super-block"]', // Seletor CSS
      priority: 51, // Maior prioridade vence regras genéricas (ex: div genérica)
    },
    {
      tag: 'section.super-block', // Outra forma de reconhecer
    }
  ];
},
```

### `renderHTML()`

Define a saída HTML padrão (para `editor.getHTML()` ou visualização se não houver NodeView). Retorna um array no formato `[TAG, ATRIBUTOS, CONTEUDO]`.

- O `0` representa onde o conteúdo filho (`content`) deve ser inserido.

```typescript
renderHTML({ HTMLAttributes }) {
  // mergeAttributes combina atributos padrão com os do seu node
  return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
},
```

### `addCommands()`

Adiciona comandos ao editor (`editor.commands...`). Retorna um objeto de funções que retornam hooks de comando.

```typescript
addCommands() {
  return {
    setSuperBlock: () => ({ commands }) => {
      // Usa comandos internos do Tiptap/ProseMirror
      return commands.wrapIn(this.name);
    },
    // Comando com acesso direto à Transaction (TR)
    customAction: () => ({ tr, dispatch }) => {
        if (dispatch) {
            tr.insertText('Ola'); // Manipulação direta
        }
        return true;
    }
  };
},
```

### `addKeyboardShortcuts()`

Define atalhos de teclado específicos. `Mod` é Cmd (Mac) ou Ctrl (Windows).

```typescript
addKeyboardShortcuts() {
  return {
    'Mod-Shift-s': () => this.editor.commands.setSuperBlock(),
  };
},
```

### `addInputRules()` e `addPasteRules()`

Detectam padrões de digitação ou colagem para converter texto em nodes automaticamente (ex: digitar `# ` vira H1).

```typescript
addInputRules() {
  return [
    wrappingInputRule({
      find: /^:::$/, // Digitar ::: converte em wrapping node
      type: this.type,
    }),
  ];
},
```

---

## 3. Criando um Node Completo (Exemplo Prático)

Vamos criar um `Callout` (caixa de destaque) com um atributo de `level` (info, warning, error).

```typescript
import { Node, mergeAttributes } from '@tiptap/core';

export interface CalloutOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: () => ReturnType;
      toggleCallout: () => ReturnType;
    }
  }
}

export const Callout = Node.create<CalloutOptions>({
  name: 'callout',

  // Configuração do Schema
  group: 'block',
  content: 'inline*', // Contém texto
  defining: true,     // User friendly ao colar/copiar 
  
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      level: {
        default: 'info',
        parseHTML: element => element.getAttribute('data-level'),
        renderHTML: attributes => ({ 'data-level': attributes.level }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div[data-type="callout"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
        'div', 
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'callout' }), 
        0 // Renderiza o conteúdo aqui
    ];
  },

  addCommands() {
    return {
      setCallout: () => ({ commands }) => commands.setNode(this.name),
      toggleCallout: () => ({ commands }) => commands.toggleNode(this.name, 'paragraph'),
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-c': () => this.editor.commands.toggleCallout(),
    };
  }
});
```

---

## 4. Marks

Marks funcionam de forma muito similar a Nodes, mas sem a complexidade de estrutura (parent/child). Eles envolvem o texto.

### Diferenças Chave
- Não possuem `group` ou `content`.
- `parseHTML` geralmente busca estilos (`style`) ou tags simples (`strong`, `em`).
- `renderHTML` quase sempre retorna arrays simples como `['strong', 0]`.

---

## 5. Eventos e Ciclo de Vida

Você pode reagir a eventos globais dentro da sua extensão:

- **`onCreate()`**: O editor foi criado.
- **`onUpdate()`**: Houve mudança no conteúdo.
- **`onSelectionUpdate()`**: O cursor moveu.
- **`onTransaction({ transaction })`**: Acesso de baixo nível a cada passo do ProseMirror.
- **`onDestroy()`**: O editor foi destruído.
- **`onBeforeCreate()`**: Antes da criação.

```typescript
onUpdate() {
   // Exemplo: Validação simples
   const json = this.editor.getJSON();
   console.log('Documento atualizado:', json);
}
```

---

## 6. ProseMirror Plugins (`addProseMirrorPlugins`)

Para lógica que não se encaixa na estrutura de API do Tiptap (ex: decorações dinâmicas, state management complexo), você pode injetar plugins nativos do ProseMirror.

Isso permite interceptar transações, criar decorações baseadas em regex, ou manter um estado paralelo. Consulte a documentação do ProseMirror para detalhes profundos sobre isso.
