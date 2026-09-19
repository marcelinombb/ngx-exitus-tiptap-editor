import { SpellChecker } from './spell-checker';
import { SpellCheckerExtension } from './SpellCheckerPlugin';

describe('SpellChecker & SpellCheckerExtension', () => {
  describe('SpellChecker Class', () => {
    let checker: SpellChecker;

    beforeEach(() => {
      checker = new SpellChecker({
        apiUrl: 'https://spellcheck.example.com',
        debounceMs: 100,
        minWordLength: 3,
      });
    });

    afterEach(() => {
      checker.destroy();
    });

    it('deve inicializar com as configurações passadas', () => {
      expect(checker).toBeTruthy();
    });

    it('deve retornar null para palavra não em cache', () => {
      const result = checker.checkWord('inexistente');
      expect(result).toBeNull();
    });

    it('deve registrar callback onResults', () => {
      const spy = jasmine.createSpy('onResults');
      checker.onResults(spy);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('SpellCheckerExtension', () => {
    it('deve ter nome spellChecker', () => {
      expect(SpellCheckerExtension.name).toBe('spellChecker');
    });

    it('deve retornar opções padrão na chamada addOptions', () => {
      const options = (SpellCheckerExtension.config.addOptions as any)?.call({});
      expect(options).toBeDefined();
      expect(options.debounceMs).toBe(500);
      expect(options.minWordLength).toBe(3);
      expect(options.apiUrl).toBe('');
    });

    it('deve retornar plugins vazios se apiUrl não for informada', () => {
      const plugins = (SpellCheckerExtension.config.addProseMirrorPlugins as any)?.call({
        options: { apiUrl: '' },
      });
      expect(plugins).toEqual([]);
    });
  });
});
