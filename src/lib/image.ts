const DEFAULT_MAX_DIMENSION = 1280;

// Phone photos are several MB; uploads are resized so they stay fast on mobile data
// and well under the storage bucket limits.
export const resizeImage = (file: File, maxDimension = DEFAULT_MAX_DIMENSION): Promise<Blob> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Not an image file'));
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Canvas is not available'));
        return;
      }
      // JPEG has no alpha channel; without this, transparent areas turn black.
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Image could not be encoded'))),
        'image/jpeg',
        0.85
      );
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image could not be decoded'));
    };
    image.src = objectUrl;
  });

export const PHOTO_READ_ERROR = 'That file could not be read as a photo. Please choose a JPG or PNG image.';
