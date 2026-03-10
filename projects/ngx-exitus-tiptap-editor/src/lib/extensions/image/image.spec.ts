import { ImageProxyBuilders, POST_BODY_TOKEN } from './image';

describe('ImageProxyBuilders', () => {
  const BASE = 'https://proxy.example.com/img';
  const SRC = 'https://cdn.example.com/photo.jpg';

  // ─────────────────────────────────────────────────────────────
  // queryParam
  // ─────────────────────────────────────────────────────────────
  describe('queryParam', () => {
    it('usa "imgurl" como nome padrão do parâmetro', () => {
      const builder = ImageProxyBuilders.queryParam(BASE);
      const result = builder(SRC);
      expect(result).toBe(`${BASE}?imgurl=${encodeURIComponent(SRC)}`);
    });

    it('aceita nome de parâmetro customizado', () => {
      const builder = ImageProxyBuilders.queryParam(BASE, 'url');
      const result = builder(SRC);
      expect(result).toBe(`${BASE}?url=${encodeURIComponent(SRC)}`);
    });

    it('encode caracteres especiais na URL da imagem', () => {
      const specialSrc = 'https://example.com/img?size=100&format=jpg';
      const builder = ImageProxyBuilders.queryParam(BASE);
      const result = builder(specialSrc);
      expect(result).toContain(`imgurl=${encodeURIComponent(specialSrc)}`);
      // Verifica que & foi encodado
      expect(result).not.toContain('&format');
    });

    it('retorna um builder diferente para cada chamada (sem compartilhar estado)', () => {
      const b1 = ImageProxyBuilders.queryParam('https://proxy1.com');
      const b2 = ImageProxyBuilders.queryParam('https://proxy2.com');
      expect(b1(SRC)).not.toBe(b2(SRC));
    });

    it('funciona com base URL contendo path', () => {
      const baseWithPath = 'https://api.example.com/v2/image-proxy';
      const builder = ImageProxyBuilders.queryParam(baseWithPath);
      expect(builder(SRC).startsWith(baseWithPath + '?imgurl=')).toBeTrue();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // pathEncoded
  // ─────────────────────────────────────────────────────────────
  describe('pathEncoded', () => {
    it('embute a URL encodada no path', () => {
      const builder = ImageProxyBuilders.pathEncoded(BASE);
      const result = builder(SRC);
      expect(result).toBe(`${BASE}/${encodeURIComponent(SRC)}`);
    });

    it('encode caracteres de path (/)', () => {
      const builder = ImageProxyBuilders.pathEncoded(BASE);
      const result = builder(SRC);
      // Slashes da URL da imagem devem estar encodados
      expect(result).toContain('%2F');
    });

    it('URLs com query strings são totalmente encodadas', () => {
      const srcWithQuery = 'https://example.com/img?w=800&h=600';
      const builder = ImageProxyBuilders.pathEncoded(BASE);
      const result = builder(srcWithQuery);
      expect(result).toBe(`${BASE}/${encodeURIComponent(srcWithQuery)}`);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // postBody
  // ─────────────────────────────────────────────────────────────
  describe('postBody', () => {
    it(`retorna string que começa com POST_BODY_TOKEN ("${POST_BODY_TOKEN}")`, () => {
      const builder = ImageProxyBuilders.postBody(BASE);
      const result = builder(SRC);
      expect(result.startsWith(POST_BODY_TOKEN)).toBeTrue();
    });

    it('inclui a BASE URL após o token', () => {
      const builder = ImageProxyBuilders.postBody(BASE);
      const result = builder(SRC);
      expect(result).toBe(`${POST_BODY_TOKEN}${BASE}`);
    });

    it('ignora a URL da imagem na construção da string retornada', () => {
      const builder = ImageProxyBuilders.postBody(BASE);
      const result1 = builder('https://img1.com/a.jpg');
      const result2 = builder('https://img2.com/b.png');
      // A URL da imagem NÃO aparece na string; só a base importa aqui
      expect(result1).toBe(result2);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // POST_BODY_TOKEN
  // ─────────────────────────────────────────────────────────────
  describe('POST_BODY_TOKEN', () => {
    it('é uma string não-vazia', () => {
      expect(typeof POST_BODY_TOKEN).toBe('string');
      expect(POST_BODY_TOKEN.length).toBeGreaterThan(0);
    });

    it('não é uma URL válida por si só (evita colisão acidental)', () => {
      expect(POST_BODY_TOKEN).not.toMatch(/^https?:\/\//i);
    });
  });
});
