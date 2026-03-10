import { ImageProxyBuilders, POST_BODY_TOKEN } from './image';
import { ImageView } from './imageView';

// ─────────────────────────────────────────────────────────────
// HELPERS DE MOCK
// ─────────────────────────────────────────────────────────────

/** Shared cache so nodes of the same type share the same type object (like ProseMirror). */
const nodeTypeCache = new Map<string, { name: string }>();

/** Cria um nó ProseMirror falso com os atributos fornecidos. */
function makeNode(attrs: Record<string, unknown> = {}, typeName = 'image'): any {
  if (!nodeTypeCache.has(typeName)) {
    nodeTypeCache.set(typeName, { name: typeName });
  }
  return {
    type: nodeTypeCache.get(typeName) as any,
    attrs: { src: null, alt: null, title: null, ...attrs },
  };
}

/** Cria um editor Tiptap falso com spies para dispatch. */
function makeEditor(getPos: () => number | undefined = () => 5): {
  editor: any;
  dispatchSpy: jasmine.Spy;
  setNodeMarkupSpy: jasmine.Spy;
} {
  const setNodeMarkupSpy = jasmine.createSpy('setNodeMarkup').and.returnValue(undefined);
  const dispatchSpy = jasmine.createSpy('dispatch');

  const tr: any = { setNodeMarkup: setNodeMarkupSpy };
  const editor: any = {
    view: {
      state: { tr },
      dispatch: dispatchSpy,
    },
  };

  return { editor, dispatchSpy, setNodeMarkupSpy };
}

/** Simula uma Response de fetch bem-sucedida. */
function makeFetchResponse(
  base64Content = 'data:image/jpeg;base64,abc123',
  ok = true,
  status = 200,
): Response {
  const blob = new Blob([base64Content], { type: 'image/jpeg' });
  return {
    ok,
    status,
    blob: () => Promise.resolve(blob),
  } as unknown as Response;
}

// ─────────────────────────────────────────────────────────────
// SUITE PRINCIPAL
// ─────────────────────────────────────────────────────────────

describe('ImageView', () => {
  let fetchSpy: jasmine.Spy;

  beforeEach(() => {
    fetchSpy = spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    // Garante que nenhum fetch pendente polua os próximos testes
    fetchSpy.calls.reset();
  });

  // ─────────────────────────────────────────────────────────
  // CONSTRUTOR — DOM
  // ─────────────────────────────────────────────────────────
  describe('constructor — criação do DOM', () => {
    it('cria um elemento <img> como dom', () => {
      const node = makeNode({ src: 'data:image/jpeg;base64,xyz' });
      const { editor } = makeEditor();

      const view = new ImageView(node, editor, () => 5);

      expect(view.dom).toBeInstanceOf(HTMLImageElement);
      expect(view.dom.tagName).toBe('IMG');
    });

    it('define draggable=false e width=100%', () => {
      const node = makeNode({ src: 'data:image/jpeg;base64,xyz' });
      const { editor } = makeEditor();

      const view = new ImageView(node, editor, () => 5);

      expect(view.dom.draggable).toBeFalse();
      expect(view.dom.style.width).toBe('100%');
    });

    it('define o atributo src no elemento', () => {
      const src = 'data:image/jpeg;base64,xyz';
      const node = makeNode({ src });
      const { editor } = makeEditor();

      const view = new ImageView(node, editor, () => 5);

      expect(view.dom.getAttribute('src')).toBe(src);
    });

    it('define o atributo style quando presente nos atributos do nó', () => {
      const node = makeNode({ src: null, style: 'border: 1px solid red' });
      const { editor } = makeEditor();

      const view = new ImageView(node, editor, () => 5);

      expect(view.dom.getAttribute('style')).toContain('border');
    });

    it('não faz fetch quando não há proxyUrl configurado', () => {
      const node = makeNode({ src: 'https://external.com/img.jpg' });
      const { editor } = makeEditor();

      const _view = new ImageView(node, editor, () => 5 /* sem proxyUrl */);


      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('não faz fetch para URLs data: mesmo com proxyUrl configurado', () => {
      const node = makeNode({ src: 'data:image/jpeg;base64,abc' });
      const { editor } = makeEditor();

      const _view = new ImageView(node, editor, () => 5, 'https://proxy.example.com');


      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────
  // PROXYURL: RETROCOMPAT (string → queryParam)
  // ─────────────────────────────────────────────────────────
  describe('proxyUrl como string (retrocompatibilidade)', () => {
    it('faz GET usando o padrão ?imgurl= quando proxyUrl é string', async () => {
      const src = 'https://cdn.example.com/banner.jpg';
      const base = 'https://proxy.example.com';
      const node = makeNode({ src });
      const { editor } = makeEditor();

      fetchSpy.and.returnValue(Promise.resolve(makeFetchResponse()));

      const _view = new ImageView(node, editor, () => 5, base);

      await new Promise((r) => setTimeout(r, 0)); // flush microtasks

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url] = fetchSpy.calls.mostRecent().args as [string, RequestInit?];
      expect(url).toBe(`${base}?imgurl=${encodeURIComponent(src)}`);
    });
  });

  // ─────────────────────────────────────────────────────────
  // PROXYURL: FUNCTION BUILDER
  // ─────────────────────────────────────────────────────────
  describe('proxyUrl como ImageProxyUrlBuilder', () => {
    it('usa o builder fornecido para construir a URL do GET', async () => {
      const src = 'https://external.com/photo.jpg';
      const customBuilder = (s: string) => `https://my-proxy.com/fetch?source=${btoa(s)}`;
      const node = makeNode({ src });
      const { editor } = makeEditor();

      fetchSpy.and.returnValue(Promise.resolve(makeFetchResponse()));

      const _view = new ImageView(node, editor, () => 5, customBuilder);

      await new Promise((r) => setTimeout(r, 0));

      const [url] = fetchSpy.calls.mostRecent().args as [string];
      expect(url).toBe(customBuilder(src));
    });

    it('usa queryParam builder corretamente', async () => {
      const src = 'https://cdn.example.com/img.png';
      const base = 'https://proxy.example.com/q';
      const builder = ImageProxyBuilders.queryParam(base, 'source');
      const node = makeNode({ src });
      const { editor } = makeEditor();

      fetchSpy.and.returnValue(Promise.resolve(makeFetchResponse()));

      const _view = new ImageView(node, editor, () => 5, builder);

      await new Promise((r) => setTimeout(r, 0));

      const [url] = fetchSpy.calls.mostRecent().args as [string];
      expect(url).toBe(`${base}?source=${encodeURIComponent(src)}`);
    });

    it('usa pathEncoded builder corretamente', async () => {
      const src = 'https://cdn.example.com/img.png';
      const base = 'https://proxy.example.com/p';
      const builder = ImageProxyBuilders.pathEncoded(base);
      const node = makeNode({ src });
      const { editor } = makeEditor();

      fetchSpy.and.returnValue(Promise.resolve(makeFetchResponse()));

      const _view = new ImageView(node, editor, () => 5, builder);

      await new Promise((r) => setTimeout(r, 0));

      const [url] = fetchSpy.calls.mostRecent().args as [string];
      expect(url).toBe(`${base}/${encodeURIComponent(src)}`);
    });

    it('usa postBody builder: faz POST com body JSON', async () => {
      const src = 'https://cdn.example.com/img.png';
      const base = 'https://proxy.example.com/post';
      const builder = ImageProxyBuilders.postBody(base);
      const node = makeNode({ src });
      const { editor } = makeEditor();

      fetchSpy.and.returnValue(Promise.resolve(makeFetchResponse()));

      const _view = new ImageView(node, editor, () => 5, builder);

      await new Promise((r) => setTimeout(r, 0));

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
      expect(url).toBe(base); // POST_BODY_TOKEN removido
      expect(url).not.toContain(POST_BODY_TOKEN);
      expect(init.method).toBe('POST');
      expect(init.headers).toEqual(jasmine.objectContaining({ 'Content-Type': 'application/json' }));
      expect(init.body).toBe(JSON.stringify({ url: src }));
    });
  });

  // ─────────────────────────────────────────────────────────
  // ATUALIZAÇÃO DE ATRIBUTOS APÓS CONVERSÃO
  // ─────────────────────────────────────────────────────────
  describe('atualização do atributo src após conversão bem-sucedida', () => {
    it('chama view.dispatch com o novo src base64', async () => {
      const src = 'https://cdn.example.com/img.png';
      const base64 = 'data:image/jpeg;base64,realdata';
      const blob = new Blob([base64], { type: 'image/jpeg' });
      const node = makeNode({ src });
      const { editor, dispatchSpy, setNodeMarkupSpy } = makeEditor();

      fetchSpy.and.returnValue(
        Promise.resolve({ ok: true, status: 200, blob: () => Promise.resolve(blob) } as Response),
      );

      // Spy FileReader para retornar base64 diretamente
      const originalFileReader = globalThis.FileReader;
      const readerMock = {
        onloadend: null as any,
        onerror: null as any,
        result: base64,
        readAsDataURL: function () {
          // Chama onloadend de forma síncrona
          if (this.onloadend) this.onloadend();
        },
      };
      spyOn(globalThis as any, 'FileReader').and.returnValue(readerMock);

      const _view = new ImageView(node, editor, () => 5, 'https://proxy.example.com');

      await new Promise((r) => setTimeout(r, 50));

      expect(setNodeMarkupSpy).toHaveBeenCalledWith(
        5,
        undefined,
        jasmine.objectContaining({ src: base64 }),
      );
      expect(dispatchSpy).toHaveBeenCalled();

      (globalThis as any).FileReader = originalFileReader;
    });

    it('não chama dispatch quando getPos retorna undefined', async () => {
      const src = 'https://cdn.example.com/img.png';
      const node = makeNode({ src });
      const { editor, dispatchSpy } = makeEditor();

      fetchSpy.and.returnValue(Promise.resolve(makeFetchResponse()));

      // getPos retorna undefined
      const _view = new ImageView(node, editor, () => undefined, 'https://proxy.example.com');

      await new Promise((r) => setTimeout(r, 50));

      expect(dispatchSpy).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────
  // ERROS DE FETCH
  // ─────────────────────────────────────────────────────────
  describe('tratamento de erros de fetch', () => {
    it('não lança exceção quando o fetch falha (log de erro apenas)', async () => {
      const src = 'https://cdn.example.com/img.png';
      const node = makeNode({ src });
      const { editor } = makeEditor();
      const consoleSpy = spyOn(console, 'error');

      fetchSpy.and.returnValue(Promise.resolve(makeFetchResponse('', false, 500)));

      expect(() => {
        const _v = new ImageView(node, editor, () => 5, 'https://proxy.example.com');

      }).not.toThrow();

      await new Promise((r) => setTimeout(r, 0));

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ImageView] Falha ao converter URL para base64:',
        jasmine.any(Error),
      );
    });

    it('não lança exceção quando fetch rejeita com erro de rede', async () => {
      const src = 'https://cdn.example.com/img.png';
      const node = makeNode({ src });
      const { editor } = makeEditor();
      spyOn(console, 'error');

      fetchSpy.and.returnValue(Promise.reject(new TypeError('Network error')));

      expect(() => {
        const _v = new ImageView(node, editor, () => 5, 'https://proxy.example.com');

      }).not.toThrow();

      await new Promise((r) => setTimeout(r, 0));
    });
  });

  // ─────────────────────────────────────────────────────────
  // DESTROY — AbortController
  // ─────────────────────────────────────────────────────────
  describe('destroy()', () => {
    it('chama abort() no AbortController quando há fetch em andamento', async () => {
      const src = 'https://cdn.example.com/img.png';
      const node = makeNode({ src });
      const { editor } = makeEditor();

      // fetch nunca resolve (simula requisição lenta)
      let abortSignal: AbortSignal | null | undefined;
      fetchSpy.and.callFake((_url: string, init: RequestInit) => {
        abortSignal = init.signal;
        return new Promise(() => { /* never resolves */ });
      });

      const view = new ImageView(node, editor, () => 5, 'https://proxy.example.com');
      await new Promise((r) => setTimeout(r, 0)); // garante que fetch foi chamado

      expect(abortSignal?.aborted).toBeFalse();
      view.destroy();
      expect(abortSignal?.aborted).toBeTrue();
    });

    it('não lança exceção quando destroy() é chamado sem fetch ativo', () => {
      const node = makeNode({ src: 'data:image/jpeg;base64,abc' });
      const { editor } = makeEditor();

      const view = new ImageView(node, editor, () => 5);

      expect(() => view.destroy()).not.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────
  describe('update()', () => {
    it('retorna true e atualiza o nó quando o tipo é o mesmo', () => {
      const node = makeNode({ src: 'data:image/jpeg;base64,old' });
      const { editor } = makeEditor();
      const view = new ImageView(node, editor, () => 5);

      const newNode = makeNode({ src: 'data:image/jpeg;base64,new' });
      const result = view.update(newNode);

      expect(result).toBeTrue();
      expect(view.dom.getAttribute('src')).toBe('data:image/jpeg;base64,new');
    });

    it('retorna false quando o tipo do nó é diferente', () => {
      const node = makeNode({ src: null }, 'image');
      const { editor } = makeEditor();
      const view = new ImageView(node, editor, () => 5);

      const differentNode = makeNode({ src: null }, 'paragraph');
      const result = view.update(differentNode);

      expect(result).toBeFalse();
    });
  });
});
