import { CropRect, computeCanvasCropCoordinates } from './image-cropper-math';

/**
 * Crops an HTMLImageElement using an offscreen canvas and returns the base64 data URL.
 */
export function cropImageToDataUrl(
  image: HTMLImageElement,
  cropRect: CropRect,
  displayWidth: number,
  displayHeight: number,
  mimeType = 'image/png',
): string {
  const { naturalWidth, naturalHeight } = image;
  const { cropX, cropY, cropWidth, cropHeight } = computeCanvasCropCoordinates(
    cropRect,
    displayWidth,
    displayHeight,
    naturalWidth,
    naturalHeight,
  );

  const canvas = document.createElement('canvas');
  canvas.width = cropWidth;
  canvas.height = cropHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Contexto 2D indisponível para recorte da imagem.');
  }

  context.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

  return canvas.toDataURL(mimeType);
}
