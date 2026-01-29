export async function resizeImageFile(
  file: File,
  maxSize: number,
  quality: number = 0.85
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  const imageDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageDataUrl;
  });

  const { width, height } = image;
  if (width <= maxSize && height <= maxSize) {
    return file;
  }

  const scale = Math.min(maxSize / width, maxSize / height);
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(
      (result) => resolve(result),
      outputType,
      outputType === "image/jpeg" ? quality : undefined
    );
  });

  if (!blob) return file;

  return new File([blob], file.name, { type: outputType });
}
