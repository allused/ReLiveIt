import { isAllowedImageUpload, isHeicUpload, looksLikeHeic } from './image-upload.util';

describe('image-upload.util', () => {
  it('accepts jpeg, png, webp, and iPhone HEIC types', () => {
    expect(isAllowedImageUpload('image/jpeg', 'a.jpg')).toBe(true);
    expect(isAllowedImageUpload('image/png', 'a.png')).toBe(true);
    expect(isAllowedImageUpload('image/webp', 'a.webp')).toBe(true);
    expect(isAllowedImageUpload('image/heic', 'IMG_1234.HEIC')).toBe(true);
    expect(isAllowedImageUpload('image/heif', 'photo.heif')).toBe(true);
    expect(isAllowedImageUpload('application/octet-stream', 'IMG_1234.HEIC')).toBe(true);
    expect(isAllowedImageUpload('application/octet-stream', 'photo.jpg')).toBe(true);
    expect(isAllowedImageUpload('text/plain', 'notes.txt')).toBe(false);
  });

  it('detects HEIC from filename when the browser omits a mime type', () => {
    expect(isHeicUpload('', 'vacation.heic')).toBe(true);
    expect(isHeicUpload('application/octet-stream', 'vacation.heif')).toBe(true);
    expect(isHeicUpload('image/jpeg', 'photo.jpg')).toBe(false);
  });

  it('detects HEIC from ftyp brands', () => {
    const header = Buffer.alloc(12);
    header.write('ftypheic', 4);
    expect(looksLikeHeic(header)).toBe(true);
    expect(looksLikeHeic(Buffer.from('not an image'))).toBe(false);
  });
});
