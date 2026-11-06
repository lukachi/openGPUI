// An image file's format and intrinsic size, read from its header bytes.
//
// gpui draws a local file but reports nothing about it, while OpenUI's layouts
// (aspect ratios, object-fit crops, the gallery grid) need the picture's own
// width and height before it is drawn. Hosts call this on the bytes they cache.
// Pure TypeScript: no gpui, no host.

export type ImageFormat = "png" | "jpeg" | "gif" | "webp" | "bmp" | "svg";

export interface ImageHeader {
  format: ImageFormat;
  /** The extension gpui's loader recognizes the format by. */
  ext: string;
  /** Intrinsic size in CSS px, as a browser lays the image out. */
  width: number;
  height: number;
}

const u16be = (b: Uint8Array, i: number) => (b[i]! << 8) | b[i + 1]!;
const u16le = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8);
const u24le = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16);
const u32be = (b: Uint8Array, i: number) => ((b[i]! << 24) >>> 0) + (b[i + 1]! << 16) + (b[i + 2]! << 8) + b[i + 3]!;
const i32le = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16) | (b[i + 3]! << 24);
const ascii = (b: Uint8Array, i: number, n: number) => String.fromCharCode(...b.subarray(i, i + n));

/** Format and size from a file's bytes, or null when it is not an image gpui draws. */
export function readImageHeader(bytes: Uint8Array): ImageHeader | null {
  const b = bytes;
  if (b.length >= 24 && b[0] === 0x89 && ascii(b, 1, 3) === "PNG" && ascii(b, 12, 4) === "IHDR") {
    return sized("png", "png", u32be(b, 16), u32be(b, 20));
  }
  if (b.length >= 10 && (ascii(b, 0, 6) === "GIF87a" || ascii(b, 0, 6) === "GIF89a")) {
    return sized("gif", "gif", u16le(b, 6), u16le(b, 8));
  }
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) return jpeg(b);
  if (b.length >= 30 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return webp(b);
  if (b.length >= 26 && ascii(b, 0, 2) === "BM") {
    // BITMAPINFOHEADER and later: signed width/height (negative height: top-down).
    return sized("bmp", "bmp", Math.abs(i32le(b, 18)), Math.abs(i32le(b, 22)));
  }
  return svg(b);
}

function sized(format: ImageFormat, ext: string, width: number, height: number): ImageHeader | null {
  return width > 0 && height > 0 ? { format, ext, width, height } : null;
}

/** The first SOFn frame header; EXIF orientations 5–8 swap the axes, as browsers draw them. */
function jpeg(b: Uint8Array): ImageHeader | null {
  let i = 2;
  let swap = false;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1]!;
    if (marker === 0xff) {
      i += 1; // fill byte
      continue;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2; // markers without a length
      continue;
    }
    const length = u16be(b, i + 2);
    if (marker === 0xe1 && ascii(b, i + 4, 4) === "Exif") swap = exifSwapsAxes(b, i + 10, i + 2 + length);
    const sof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (sof) {
      const height = u16be(b, i + 5);
      const width = u16be(b, i + 7);
      return swap ? sized("jpeg", "jpg", height, width) : sized("jpeg", "jpg", width, height);
    }
    i += 2 + length;
  }
  return null;
}

/** Whether the EXIF Orientation tag (0x0112) in a TIFF block is 5–8 (a quarter turn). */
function exifSwapsAxes(b: Uint8Array, start: number, end: number): boolean {
  if (start + 8 > end || end > b.length) return false;
  const le = ascii(b, start, 2) === "II";
  const u16 = (i: number) => (le ? u16le(b, i) : u16be(b, i));
  const u32 = (i: number) => (le ? (u16le(b, i) | (u16le(b, i + 2) << 16)) >>> 0 : u32be(b, i));
  const ifd = start + u32(start + 4);
  if (ifd + 2 > end) return false;
  const count = u16(ifd);
  for (let n = 0; n < count; n++) {
    const entry = ifd + 2 + n * 12;
    if (entry + 12 > end) return false;
    if (u16(entry) === 0x0112) {
      const orientation = u16(entry + 8);
      return orientation >= 5 && orientation <= 8;
    }
  }
  return false;
}

function webp(b: Uint8Array): ImageHeader | null {
  const chunk = ascii(b, 12, 4);
  if (chunk === "VP8X") return sized("webp", "webp", u24le(b, 24) + 1, u24le(b, 27) + 1);
  if (chunk === "VP8L" && b[20] === 0x2f) {
    const bits = b[21]! | (b[22]! << 8) | (b[23]! << 16) | (b[24]! << 24);
    return sized("webp", "webp", (bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
  }
  if (chunk === "VP8 " && b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a) {
    return sized("webp", "webp", u16le(b, 26) & 0x3fff, u16le(b, 28) & 0x3fff);
  }
  return null;
}

/**
 * The root <svg>'s size as a browser takes it for an <img>: width/height in px
 * (or one of them with the viewBox's ratio), else the viewBox ratio at 300 wide
 * when only a viewBox is given, else 300×150.
 */
function svg(b: Uint8Array): ImageHeader | null {
  // Latin-1 is enough to read ASCII markup; a UTF-8 byte order mark is skipped.
  const head = ascii(b, 0, Math.min(b.length, 4096)).replace(/^\xEF\xBB\xBF/, "").trimStart();
  if (!head.startsWith("<")) return null;
  const tag = /<svg\b([^>]*)>/i.exec(head);
  if (!tag) return null;
  const attr = (name: string) => new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(tag[1]!)?.[1];
  const length = (value: string | undefined) => {
    const m = value === undefined ? null : /^\s*([\d.]+)\s*(px)?\s*$/.exec(value);
    return m ? Number(m[1]) : null;
  };
  const box = attr("viewBox")?.trim().split(/[\s,]+/).map(Number);
  const ratio = box && box.length === 4 && box[2]! > 0 && box[3]! > 0 ? box[2]! / box[3]! : null;
  let width = length(attr("width"));
  let height = length(attr("height"));
  if (width === null && height === null) {
    width = 300;
    height = ratio ? 300 / ratio : 150;
  } else if (width === null) width = ratio ? height! * ratio : 300;
  else if (height === null) height = ratio ? width / ratio : 150;
  return sized("svg", "svg", width, height!);
}
