export interface ColumnResizeCalculationParams {
  startWidth: number;
  startX: number;
  currentX: number;
  resizeMinWidth: number;
  isLastColumn: boolean;
  startTableWidth?: number;
  maxContainerWidth?: number;
  startWidthNeighbor?: number;
}

export interface ColumnResizeResult {
  width: number;
  widthNeighbor?: number;
}

/**
 * Calculates constrained column widths during table column resize dragging.
 */
export function calculateColumnResize(params: ColumnResizeCalculationParams): ColumnResizeResult {
  const {
    startWidth,
    startX,
    currentX,
    resizeMinWidth,
    isLastColumn,
    startTableWidth,
    maxContainerWidth,
    startWidthNeighbor,
  } = params;

  let offset = currentX - startX;

  if (maxContainerWidth != null && startTableWidth != null) {
    if (isLastColumn) {
      const otherColumnsWidth = startTableWidth - startWidth;
      const maxAllowedColumnWidth = maxContainerWidth - otherColumnsWidth;
      const minAllowedOffset = resizeMinWidth - startWidth;
      const maxAllowedOffset = maxAllowedColumnWidth - startWidth;
      offset = Math.max(minAllowedOffset, Math.min(maxAllowedOffset, offset));
      return { width: startWidth + offset };
    } else if (startWidthNeighbor !== undefined) {
      // For inner columns, it's a zero-sum resize with neighbor
      const minAllowedOffset = resizeMinWidth - startWidth;
      const maxAllowedOffset = startWidthNeighbor - resizeMinWidth;
      offset = Math.max(minAllowedOffset, Math.min(maxAllowedOffset, offset));
      return {
        width: startWidth + offset,
        widthNeighbor: startWidthNeighbor - offset,
      };
    }
  }

  return { width: Math.max(resizeMinWidth, startWidth + offset) };
}
