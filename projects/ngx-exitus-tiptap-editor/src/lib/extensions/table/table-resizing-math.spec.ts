import { calculateColumnResize } from './table-resizing-math';

describe('table-resizing-math', () => {
  describe('calculateColumnResize', () => {
    it('deve redimensionar a última coluna respeitando o maxWidth do container', () => {
      const result = calculateColumnResize({
        startWidth: 100,
        startX: 50,
        currentX: 100, // +50px
        resizeMinWidth: 25,
        isLastColumn: true,
        startTableWidth: 300,
        maxContainerWidth: 400, // maxAllowedColumnWidth = 400 - 200 = 200
      });

      expect(result.width).toBe(150);
    });

    it('deve limitar a última coluna para não ultrapassar a largura máxima do container', () => {
      const result = calculateColumnResize({
        startWidth: 100,
        startX: 50,
        currentX: 500, // tentando expandir +450px
        resizeMinWidth: 25,
        isLastColumn: true,
        startTableWidth: 300, // otherColumnsWidth = 200
        maxContainerWidth: 400, // max allowed = 200
      });

      expect(result.width).toBe(200);
    });

    it('deve realizar ajuste zero-sum entre coluna interna e sua vizinha', () => {
      const result = calculateColumnResize({
        startWidth: 100,
        startX: 50,
        currentX: 70, // +20px
        resizeMinWidth: 25,
        isLastColumn: false,
        startTableWidth: 300,
        maxContainerWidth: 500,
        startWidthNeighbor: 100,
      });

      expect(result.width).toBe(120);
      expect(result.widthNeighbor).toBe(80);
    });

    it('deve respeitar a largura mínima da vizinha no zero-sum', () => {
      const result = calculateColumnResize({
        startWidth: 100,
        startX: 50,
        currentX: 200, // +150px
        resizeMinWidth: 25,
        isLastColumn: false,
        startTableWidth: 300,
        maxContainerWidth: 500,
        startWidthNeighbor: 100, // vizinha tem 100, max expand = 100 - 25 = 75
      });

      expect(result.width).toBe(175);
      expect(result.widthNeighbor).toBe(25);
    });

    it('deve respeitar a largura mínima da própria coluna (resizeMinWidth)', () => {
      const result = calculateColumnResize({
        startWidth: 100,
        startX: 50,
        currentX: -100, // tentando diminuir muito
        resizeMinWidth: 25,
        isLastColumn: false,
        startTableWidth: 300,
        maxContainerWidth: 500,
        startWidthNeighbor: 100,
      });

      expect(result.width).toBe(25);
      expect(result.widthNeighbor).toBe(175);
    });
  });
});
