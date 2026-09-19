export type CropHandleDirection =
  | 'move'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'topLeft'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomRight';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const DEFAULT_MIN_CROP_SIZE = 40;

/**
 * Calculates new crop rectangle based on drag handle, displacement and boundaries.
 */
export function computeDragCropRect(
  startRect: CropRect,
  dragMode: CropHandleDirection,
  dx: number,
  dy: number,
  containerWidth?: number,
  containerHeight?: number,
  minSize: number = DEFAULT_MIN_CROP_SIZE,
): CropRect {
  let { x, y, width, height } = startRect;

  switch (dragMode) {
    case 'move':
      x = startRect.x + dx;
      y = startRect.y + dy;
      break;
    case 'left':
      x = startRect.x + dx;
      width = startRect.width - dx;
      break;
    case 'right':
      width = startRect.width + dx;
      break;
    case 'top':
      y = startRect.y + dy;
      height = startRect.height - dy;
      break;
    case 'bottom':
      height = startRect.height + dy;
      break;
    case 'topLeft':
      x = startRect.x + dx;
      y = startRect.y + dy;
      width = startRect.width - dx;
      height = startRect.height - dy;
      break;
    case 'topRight':
      y = startRect.y + dy;
      width = startRect.width + dx;
      height = startRect.height - dy;
      break;
    case 'bottomLeft':
      x = startRect.x + dx;
      width = startRect.width - dx;
      height = startRect.height + dy;
      break;
    case 'bottomRight':
      width = startRect.width + dx;
      height = startRect.height + dy;
      break;
  }

  const affectsLeft = ['left', 'topLeft', 'bottomLeft'].includes(dragMode);
  const affectsTop = ['top', 'topLeft', 'topRight'].includes(dragMode);

  if (width < minSize) {
    if (affectsLeft) {
      x = startRect.x + (startRect.width - minSize);
    }
    width = minSize;
  }

  if (height < minSize) {
    if (affectsTop) {
      y = startRect.y + (startRect.height - minSize);
    }
    height = minSize;
  }

  if (x < 0) {
    width += x;
    x = 0;
  }

  if (y < 0) {
    height += y;
    y = 0;
  }

  if (dragMode === 'move') {
    if (containerWidth != null) {
      if (x + width > containerWidth) {
        x = Math.max(0, containerWidth - width);
      }
      if (x < 0) {
        x = 0;
      }
    }
    if (containerHeight != null) {
      if (y + height > containerHeight) {
        y = Math.max(0, containerHeight - height);
      }
      if (y < 0) {
        y = 0;
      }
    }
    return { x, y, width, height };
  }

  if (containerWidth != null && x + width > containerWidth) {
    width = Math.max(minSize, containerWidth - x);
  }

  if (containerHeight != null && y + height > containerHeight) {
    height = Math.max(minSize, containerHeight - y);
  }

  return { x, y, width, height };
}

/**
 * Maps the displayed crop rectangle to the image natural dimensions for canvas cropping.
 */
export function computeCanvasCropCoordinates(
  cropRect: CropRect,
  displayWidth: number,
  displayHeight: number,
  naturalWidth: number,
  naturalHeight: number,
): { cropX: number; cropY: number; cropWidth: number; cropHeight: number } {
  if (!naturalWidth || !naturalHeight || !displayWidth || !displayHeight) {
    throw new Error('Dimensões inválidas para recorte da imagem.');
  }

  const scaleX = naturalWidth / displayWidth;
  const scaleY = naturalHeight / displayHeight;

  const cropX = Math.max(0, Math.round(cropRect.x * scaleX));
  const cropY = Math.max(0, Math.round(cropRect.y * scaleY));
  const cropWidth = Math.max(1, Math.round(cropRect.width * scaleX));
  const cropHeight = Math.max(1, Math.round(cropRect.height * scaleY));

  return { cropX, cropY, cropWidth, cropHeight };
}
