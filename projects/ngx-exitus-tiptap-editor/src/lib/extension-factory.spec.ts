import { Injector } from '@angular/core';
import {
  ExtensionFactory,
  createCoreExtensions,
  createImageExtensions,
  createMathExtensions,
  createQuestionExtensions,
  createSpellCheckerExtensions,
  createTableExtensions,
} from './extension-factory';

describe('ExtensionFactory', () => {
  const mockInjector = {} as Injector;

  it('createCoreExtensions deve retornar extensões tipográficas básicas', () => {
    const extensions = createCoreExtensions();
    expect(extensions.length).toBeGreaterThan(0);
    const names = extensions.map((e) => e.name);
    expect(names).toContain('subscript');
    expect(names).toContain('superscript');
    expect(names).toContain('textAlign');
    expect(names).toContain('indent');
    expect(names).toContain('teclatab');
  });

  it('createMathExtensions deve retornar extensões de fórmulas', () => {
    const extensions = createMathExtensions();
    expect(extensions.length).toBe(3);
    const names = extensions.map((e) => e.name);
    expect(names).toContain('katex');
    expect(names).toContain('mathtype');
    expect(names).toContain('mathTypePlugin');
  });

  it('createImageExtensions deve configurar extensões de imagem com injector', () => {
    const extensions = createImageExtensions(mockInjector, { proxyUrl: 'https://proxy.test' });
    expect(extensions.length).toBe(3);
    const names = extensions.map((e) => e.name);
    expect(names).toContain('image');
    expect(names).toContain('figcaption');
    expect(names).toContain('figure');
  });

  it('createQuestionExtensions deve configurar extensões de questões educacionais', () => {
    const extensions = createQuestionExtensions(mockInjector);
    expect(extensions.length).toBe(7);
    const names = extensions.map((e) => e.name);
    expect(names).toContain('colarQuestao');
    expect(names).toContain('answerBox');
    expect(names).toContain('association');
    expect(names).toContain('associationColumn');
    expect(names).toContain('associationItem');
    expect(names).toContain('alternative');
    expect(names).toContain('alternativeItem');
  });

  it('createTableExtensions deve retornar extensões de tabela', () => {
    const extensions = createTableExtensions();
    expect(extensions.length).toBeGreaterThan(0);
    const names = extensions.map((e) => e.name);
    expect(names).toContain('table');
  });

  it('createSpellCheckerExtensions deve retornar corretor ortográfico', () => {
    const extensions = createSpellCheckerExtensions({ apiUrl: 'https://api.spell.test' });
    expect(extensions.length).toBe(1);
    expect(extensions[0].name).toBe('spellChecker');
  });

  it('createSpellCheckerExtensions deve retornar vazio quando apiUrl não é fornecida', () => {
    expect(createSpellCheckerExtensions().length).toBe(0);
    expect(createSpellCheckerExtensions({}).length).toBe(0);
  });

  it('ExtensionFactory.createExtensions deve agregar todos os bundles sem exceções', () => {
    const extensions = ExtensionFactory.createExtensions(mockInjector, {
      image: { proxyUrl: 'https://proxy.test' },
      spellChecker: { apiUrl: 'https://api.spell.test' },
    });

    expect(extensions.length).toBeGreaterThan(15);
    const names = extensions.map((e) => e.name);
    expect(names).toContain('figure');
    expect(names).toContain('katex');
    expect(names).toContain('answerBox');
    expect(names).toContain('table');
    expect(names).toContain('spellChecker');
  });
});
