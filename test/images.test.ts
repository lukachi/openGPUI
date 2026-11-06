import { describe, expect, test } from "bun:test";
import { deflateSync } from "node:zlib";
import { readImageHeader } from "./lib.ts";

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));
const be16 = (n: number) => [n >> 8, n & 255];
const be32 = (n: number) => [(n >>> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255];
const le16 = (n: number) => [n & 255, n >> 8];
const le32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];

/** A real 3×2 PNG: signature, IHDR, IDAT, IEND (CRCs zeroed: only the header is read). */
const png = bytes([0x89], "PNG\r\n\x1a\n", be32(13), "IHDR", be32(3), be32(2), [8, 2, 0, 0, 0], be32(0), be32(0), "IDAT", [...deflateSync(new Uint8Array(20))], be32(0), "IEND");

/** JPEG with an optional EXIF APP1 (big-endian TIFF, one Orientation entry) before SOF0. */
function jpeg(width: number, height: number, orientation?: number, sof = 0xc0): Uint8Array {
  const tiff = orientation ? bytes("MM", be16(42), be32(8), be16(1), be16(0x0112), be16(3), be32(1), be16(orientation), [0, 0], be32(0)) : null;
  const app1 = tiff ? bytes([0xff, 0xe1], be16(2 + 6 + tiff.length), "Exif\0\0", [...tiff]) : bytes();
  const app0 = bytes([0xff, 0xe0], be16(16), "JFIF\0", [1, 1, 0], be16(1), be16(1), [0, 0]);
  const sofSeg = bytes([0xff, sof], be16(17), [8], be16(height), be16(width), [3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]);
  return bytes([0xff, 0xd8], [...app0], [...app1], [...sofSeg], [0xff, 0xd9]);
}

describe("readImageHeader", () => {
  test.each([
    ["png", png, { format: "png", ext: "png", width: 3, height: 2 }],
    ["gif", bytes("GIF89a", le16(640), le16(480), [0, 0, 0]), { format: "gif", width: 640, height: 480 }],
    ["jpeg", jpeg(1200, 800), { format: "jpeg", ext: "jpg", width: 1200, height: 800 }],
    ["progressive jpeg (SOF2)", jpeg(1200, 800, undefined, 0xc2), { width: 1200, height: 800 }],
    ["jpeg rotated a quarter turn by EXIF", jpeg(1200, 800, 6), { width: 800, height: 1200 }],
    ["jpeg flipped (EXIF 3) keeps its axes", jpeg(1200, 800, 3), { width: 1200, height: 800 }],
    ["webp VP8X", bytes("RIFF", le32(30), "WEBP", "VP8X", le32(10), [0, 0, 0, 0], [0xff, 0x03, 0], [0x57, 0x02, 0]), { format: "webp", width: 1024, height: 600 }],
    ["webp VP8L", bytes("RIFF", le32(30), "WEBP", "VP8L", le32(10), [0x2f], le32(((300 - 1) | ((200 - 1) << 14)) >>> 0), [0, 0, 0, 0, 0]), { width: 300, height: 200 }],
    ["webp VP8", bytes("RIFF", le32(30), "WEBP", "VP8 ", le32(10), [0, 0, 0], [0x9d, 0x01, 0x2a], le16(320), le16(240)), { width: 320, height: 240 }],
    ["bmp top-down", bytes("BM", le32(0), le32(0), le32(54), le32(40), le32(16), le32(-9 >>> 0)), { format: "bmp", width: 16, height: 9 }],
    ["OS/2 bmp core header", bytes("BM", le32(0), le32(0), le32(26), le32(12), le16(640), le16(480)), { format: "bmp", width: 640, height: 480 }],
    ["svg with px size", bytes('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="48px" height="32">'), { format: "svg", width: 48, height: 32 }],
    ["svg with only a viewBox", bytes('<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">'), { width: 300, height: 150 }],
    ["svg with width and viewBox", bytes('<svg width="50" viewBox="0 0 200 100">'), { width: 50, height: 25 }],
    ["svg with percent size falls back to 300×150", bytes('<svg width="100%" height="100%">'), { width: 300, height: 150 }],
    ["svg in em units at the 16px default", bytes('<svg width="2em" height="1em">'), { width: 32, height: 16 }],
    ["svg after a comment and an svg DOCTYPE", bytes('<?xml version="1.0"?><!-- logo --><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "x.dtd"><svg width="10" height="20">'), { width: 10, height: 20 }],
  ])("%s", (_name, data, expected) => {
    expect(readImageHeader(data)).toMatchObject(expected);
  });

  test.each([
    ["html error page", bytes("<!doctype html><html><body>404</body></html>")],
    ["html page with an inline svg icon", bytes('<!doctype html><html><body><p>404</p><svg class="icon" viewBox="0 0 24 24"></svg></body></html>')],
    ["plain text", bytes("not an image")],
    ["truncated png", png.subarray(0, 12)],
    ["zero-sized gif", bytes("GIF89a", le16(0), le16(0), [0])],
    ["jpeg without a frame header", bytes([0xff, 0xd8, 0xff, 0xd9])],
  ])("%s is not an image", (_name, data) => {
    expect(readImageHeader(data)).toBeNull();
  });
});
