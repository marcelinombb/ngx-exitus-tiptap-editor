import { computeDragCropRect, computeCanvasCropCoordinates, CropRect } from './image-cropper-math';

describe('image-cropper-math', () => {
  const initialRect: CropRect = { x: 50, y: 50, width: 100, height: 100 };

  describe('computeDragCropRect', () => {
    it('deve mover o retângulo sem alterar o tamanho com modo "move"', () => {
      const result = computeDragCropRect(initialRect, 'move', 20, 30);
      expect(result).toEqual({ x: 70, y: 80, width: 100, height: 100 });
    });

    it('deve redimensionar a partir da direita', () => {
      const result = computeDragCropRect(initialRect, 'right', 40, 0);
      expect(result).toEqual({ x: 50, y: 50, width: 140, height: 100 });
    });

    it('deve redimensionar a partir da esquerda e deslocar x', () => {
      const result = computeDragCropRect(initialRect, 'left', 20, 0);
      expect(result).toEqual({ x: 70, y: 50, width: 80, height: 100 });
    });

    it('deve redimensionar a partir de baixo', () => {
      const result = computeDragCropRect(initialRect, 'bottom', 0, 50);
      expect(result).toEqual({ x: 50, y: 50, width: 100, height: 150 });
    });

    it('deve redimensionar a partir do topo e deslocar y', () => {
      const result = computeDragCropRect(initialRect, 'top', 0, 20);
      expect(result).toEqual({ x: 50, y: 70, width: 100, height: 80 });
    });

    it('deve redimensionar diagonalmente com bottomRight', () => {
      const result = computeDragCropRect(initialRect, 'bottomRight', 20, 30);
      expect(result).toEqual({ x: 50, y: 50, width: 120, height: 130 });
    });

    it('deve redimensionar diagonalmente com topLeft', () => {
      const result = computeDragCropRect(initialRect, 'topLeft', 10, 15);
      expect(result).toEqual({ x: 60, y: 65, width: 90, height: 85 });
    });

    it('deve respeitar tamanho mínimo (minSize)', () => {
      const result = computeDragCropRect(initialRect, 'right', -90, 0, 400, 400, 40);
      expect(result.width).toBe(40);
    });

    it('não deve ultrapassar limites do container', () => {
      const result = computeDragCropRect(initialRect, 'move', 300, 300, 200, 200);
      expect(result.x + result.width).toBeLessThanOrEqual(200);
      expect(result.y + result.height).toBeLessThanOrEqual(200);
    });
  });

  describe('computeCanvasCropCoordinates', () => {
    it('deve calcular coordenadas de escala proporcionalmente', () => {
      const cropRect: CropRect = { x: 50, y: 100, width: 200, height: 150 };
      const display = { width: 400, height: 300 };
      const natural = { width: 800, height: 600 }; // escala 2x

      const coords = computeCanvasCropCoordinates(
        cropRect,
        display.width,
        display.height,
        natural.width,
        natural.height,
      );

      expect(coords).toEqual({
        cropX: 100,
        cropY: 200,
        cropWidth: 400,
        cropHeight: 300,
      });
    });

    it('deve lançar erro com dimensões zeradas ou inválidas', () => {
      expect(() => {
        computeCanvasCropCoordinates(initialRect, 0, 100, 100, 100);
      }).toThrowError('Dimensões inválidas para recorte da imagem.');
    });
  });
});
