export function isHeic(file) {
  const name = file.name.toLowerCase()
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  )
}

// Returns a JPEG File for HEIC/HEIF input, or the original file unchanged.
// Throws if conversion fails. heic2any (~1.4MB) is loaded only when needed.
export async function convertHeicToJpeg(file) {
  if (!isHeic(file)) return file
  const { default: heic2any } = await import('heic2any')
  const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
  return new File([blob], file.name.replace(/\.hei[cf]$/i, '.jpg'), { type: 'image/jpeg' })
}
