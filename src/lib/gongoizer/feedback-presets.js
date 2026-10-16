// Palettes and presets for feedback-bg.js.
//
// A palette maps the field's phase (0..1, one stripe cycle) to a colour. "cyan" and "violet" were
// measured from the WJ-AVE5 captures; the rest are built from colour stops.

// 96-step palette extracted from the cyan/magenta captures (phase-binned median colour).
const LUT_CYAN = [
  11,9,0, 11,10,0, 11,11,0, 12,13,0, 13,14,0, 15,15,0, 16,16,0, 17,16,1, 17,17,1, 17,17,1,
  17,17,1, 17,17,1, 17,17,0, 17,18,0, 17,18,0, 17,18,0, 17,18,0, 17,18,0, 17,18,0, 18,18,0,
  18,19,0, 18,19,0, 18,19,0, 18,19,0, 18,19,0, 18,18,0, 18,18,0, 17,18,0, 17,17,0, 16,17,0,
  14,17,0, 12,17,0, 10,18,0, 8,24,1, 7,37,3, 6,51,13, 6,63,35, 7,78,69, 8,94,99, 9,109,124,
  10,122,142, 11,130,154, 11,134,160, 11,135,162, 11,136,165, 11,136,168, 11,138,176, 12,142,190,
  13,149,209, 16,154,226, 21,159,239, 29,164,245, 37,166,247, 44,168,248, 49,170,249, 53,171,249,
  57,172,249, 60,173,249, 64,174,249, 67,174,249, 71,175,249, 74,176,250, 78,177,250, 81,178,250,
  83,178,250, 84,179,250, 86,179,250, 89,179,250, 91,179,250, 94,179,250, 98,179,250, 106,177,250,
  121,166,250, 141,147,250, 169,120,249, 197,89,248, 219,63,247, 226,50,246, 228,46,244, 227,44,242,
  226,43,239, 222,42,234, 219,41,228, 212,40,220, 204,38,211, 192,36,198, 177,33,183, 162,30,167,
  143,26,147, 122,23,124, 101,19,100, 78,15,70, 54,11,42, 31,9,17, 15,9,3, 11,9,1,
];

// Palette from the hue-cycled streak captures (hue rotation tracked and removed before binning).
const LUT_VIOLET = [
  11,6,0, 11,6,0, 12,6,0, 12,7,0, 13,7,0, 14,7,0, 14,8,0, 15,8,0, 15,8,0, 16,8,0,
  16,9,0, 16,9,0, 16,9,0, 16,9,0, 16,9,0, 16,9,0, 16,9,0, 16,9,0, 16,9,0, 16,9,0,
  16,9,0, 16,10,0, 16,10,0, 15,11,0, 15,13,0, 14,15,0, 13,18,0, 11,25,0, 8,39,2, 5,50,8,
  3,68,35, 2,87,58, 1,108,80, 1,123,96, 1,135,107, 0,145,118, 1,151,129, 1,158,139, 2,161,148, 3,167,155,
  3,174,163, 5,182,172, 6,188,188, 9,197,203, 12,209,217, 17,217,224, 24,223,230, 31,228,234, 37,231,236, 43,233,238,
  49,235,238, 52,235,239, 57,234,240, 61,234,240, 65,233,241, 70,232,242, 74,229,243, 76,228,243, 78,227,243, 80,222,244,
  83,209,245, 86,200,245, 90,189,246, 93,181,245, 101,165,246, 105,153,246, 112,120,246, 120,92,246, 130,89,246, 146,85,247,
  160,83,247, 169,83,247, 169,82,247, 171,81,247, 172,80,246, 174,80,246, 171,78,245, 173,78,244, 169,76,242, 170,75,241,
  166,72,239, 164,69,237, 158,64,234, 156,62,231, 149,60,226, 143,58,220, 130,53,206, 120,51,188, 105,46,166, 91,42,137,
  77,36,108, 61,28,79, 42,19,49, 30,13,25, 15,9,4, 12,7,0,
];

// [position 0..1, r, g, b] stops, eased between, wrapping from the last stop back to the first.
function fromStops(stops, n = 96) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = i / n;
    let k = stops.length - 1;
    for (let j = 0; j < stops.length; j++) if (stops[j][0] <= x) k = j;
    const a = stops[k], b = stops[(k + 1) % stops.length];
    const span = ((b[0] - a[0]) + 1) % 1 || 1, f = (((x - a[0]) + 1) % 1) / span;
    const e = f * f * (3 - 2 * f);
    for (let c = 1; c <= 3; c++) out.push(Math.round(a[c] + (b[c] - a[c]) * e));
  }
  return out;
}

export const PALETTES = {
  cyan: LUT_CYAN,
  violet: LUT_VIOLET,
  ember: fromStops([[0, 8, 2, 0], [0.32, 12, 3, 0], [0.42, 120, 12, 4], [0.58, 230, 70, 10], [0.72, 255, 170, 40], [0.78, 255, 240, 170], [0.86, 160, 40, 8]]),
  mono: fromStops([[0, 6, 6, 6], [0.3, 10, 10, 10], [0.45, 120, 120, 120], [0.62, 200, 200, 200], [0.7, 245, 245, 245], [0.8, 90, 90, 90]]),
  acid: fromStops([[0, 4, 8, 0], [0.28, 6, 12, 2], [0.38, 40, 200, 30], [0.62, 120, 255, 40], [0.7, 250, 250, 60], [0.78, 230, 30, 200], [0.88, 60, 6, 50]]),
  ice: fromStops([[0, 4, 14, 40], [0.25, 10, 60, 110], [0.45, 40, 170, 200], [0.6, 220, 250, 255], [0.68, 120, 200, 240], [0.82, 20, 40, 90]]),
  sunset: fromStops([[0, 30, 4, 50], [0.22, 90, 10, 110], [0.4, 230, 40, 120], [0.58, 255, 120, 60], [0.7, 255, 210, 90], [0.82, 120, 20, 90]]),
  // more colours per cycle
  spectrum: fromStops([[0, 0, 0, 0], [0.12, 0, 0, 0], [0.2, 255, 30, 60], [0.34, 255, 160, 0], [0.46, 240, 255, 40], [0.58, 30, 255, 120], [0.7, 0, 180, 255], [0.82, 120, 40, 255], [0.92, 255, 40, 220]]),
  oilslick: fromStops([[0, 6, 4, 12], [0.2, 40, 10, 70], [0.36, 20, 120, 140], [0.5, 200, 190, 60], [0.62, 230, 60, 150], [0.74, 70, 40, 200], [0.86, 10, 70, 80]]),
  neon: fromStops([[0, 2, 0, 6], [0.18, 2, 0, 6], [0.26, 0, 255, 230], [0.36, 2, 0, 6], [0.48, 255, 0, 170], [0.58, 2, 0, 6], [0.7, 255, 230, 0], [0.8, 2, 0, 6], [0.9, 140, 60, 255]]),
  candy: fromStops([[0, 255, 140, 190], [0.2, 255, 220, 120], [0.4, 140, 240, 200], [0.6, 130, 170, 255], [0.8, 220, 140, 255]]),
  deepsea: fromStops([[0, 0, 4, 10], [0.3, 0, 20, 40], [0.5, 0, 90, 110], [0.6, 40, 220, 190], [0.66, 200, 255, 240], [0.75, 20, 120, 160], [0.88, 0, 30, 60]]),
};

// Palettes from lospec.com/palette-list, turned into feedback ramps. Similar palettes get different
// ramp styles (ramp, bands, mirror, neon, hue, inverted) so they don't look alike. Name (author) for credit.
const LOSPEC = {
  '2bit-demichrome': [[0.0, 233, 239, 236], [0.4, 233, 239, 236], [0.46, 160, 160, 139], [0.9, 85, 85, 104], [0.95, 33, 30, 32]],   // 2bit demichrome (Space Sandwich), inverted
  'aap-64': [[0.0, 6, 6, 8], [0.26, 6, 6, 8], [0.32, 180, 32, 42], [0.42, 250, 106, 10], [0.52, 36, 159, 222], [0.62, 32, 214, 199], [0.72, 156, 219, 67], [0.82, 255, 252, 64], [0.92, 255, 255, 255]],   // AAP-64 (Adigun A. Polack), ramp
  'ammo-8': [[0.0, 4, 12, 6], [0.121, 4, 12, 6], [0.125, 17, 35, 24], [0.246, 17, 35, 24], [0.25, 30, 58, 41], [0.371, 30, 58, 41], [0.375, 48, 93, 66], [0.496, 48, 93, 66], [0.5, 77, 128, 97], [0.621, 77, 128, 97], [0.625, 137, 162, 87], [0.746, 137, 162, 87], [0.75, 190, 220, 127], [0.871, 190, 220, 127], [0.875, 238, 255, 204], [0.996, 238, 255, 204]],   // Ammo-8 (unknown), bands
  'apollo': [[0.0, 9, 10, 20], [0.26, 9, 10, 20], [0.32, 165, 48, 48], [0.42, 222, 158, 65], [0.52, 168, 202, 88], [0.62, 70, 130, 50], [0.72, 79, 143, 186], [0.82, 198, 81, 151], [0.92, 235, 237, 233]],   // Apollo (AdamCYounis), hue
  'berry-nebula': [[0.0, 13, 0, 26], [0.071, 46, 10, 48], [0.143, 79, 20, 70], [0.214, 111, 29, 92], [0.286, 110, 81, 129], [0.357, 109, 133, 165], [0.429, 108, 185, 201], [0.5, 108, 237, 237], [0.571, 108, 185, 201], [0.643, 109, 133, 165], [0.714, 110, 81, 129], [0.786, 111, 29, 92], [0.857, 79, 20, 70], [0.929, 46, 10, 48]],   // Berry Nebula (LostInIndigo), mirror
  'blessing': [[0.0, 116, 86, 155], [0.125, 255, 179, 203], [0.25, 216, 191, 216], [0.375, 150, 251, 199], [0.5, 247, 255, 174], [0.625, 150, 251, 199], [0.75, 216, 191, 216], [0.875, 255, 179, 203]],   // Blessing (clarigariccus), mirror
  'bubblegum-16': [[0.0, 67, 0, 103], [0.26, 67, 0, 103], [0.32, 214, 36, 17], [0.42, 255, 38, 116], [0.52, 0, 120, 153], [0.62, 16, 210, 117], [0.72, 255, 209, 0], [0.82, 191, 255, 60], [0.92, 250, 253, 255]],   // Bubblegum 16 (PineappleOnPizza), ramp
  'citrink': [[0.0, 32, 21, 51], [0.26, 32, 21, 51], [0.32, 252, 246, 96], [0.42, 178, 217, 66], [0.52, 82, 195, 63], [0.62, 22, 110, 122], [0.72, 37, 77, 112], [0.82, 37, 36, 70], [0.92, 255, 255, 255]],   // Citrink (Inkpendude), hue
  'cyberpunk-neons': [[0.0, 11, 0, 27], [0.26, 11, 0, 27], [0.32, 77, 0, 79], [0.42, 3, 39, 76], [0.52, 193, 17, 90], [0.62, 225, 58, 106], [0.72, 15, 149, 149], [0.82, 228, 106, 135], [0.92, 83, 235, 228]],   // Cyberpunk Neons (Chippix), ramp
  'dawnbringer-16': [[0.0, 222, 238, 214], [0.4, 222, 238, 214], [0.46, 218, 212, 94], [0.548, 109, 194, 202], [0.636, 109, 170, 44], [0.724, 210, 125, 44], [0.812, 89, 125, 206], [0.9, 208, 70, 72], [0.95, 20, 12, 28]],   // DawnBringer 16 (unknown), inverted
  'endesga-32': [[0.0, 24, 20, 37], [0.26, 24, 20, 37], [0.32, 247, 118, 34], [0.42, 254, 231, 97], [0.52, 99, 199, 77], [0.62, 38, 92, 66], [0.72, 0, 153, 219], [0.82, 255, 0, 68], [0.92, 255, 255, 255]],   // Endesga 32 (ENDESGA), hue
  'fantasy-24': [[0.0, 48, 15, 10], [0.121, 48, 15, 10], [0.125, 155, 26, 10], [0.246, 155, 26, 10], [0.25, 57, 87, 28], [0.371, 57, 87, 28], [0.375, 239, 58, 12], [0.496, 239, 58, 12], [0.5, 239, 105, 47], [0.621, 239, 105, 47], [0.625, 60, 159, 156], [0.746, 60, 159, 156], [0.75, 239, 172, 40], [0.871, 239, 172, 40], [0.875, 239, 216, 161], [0.996, 239, 216, 161]],   // Fantasy 24 (unknown), bands
  'funkyfuture-8': [[0.0, 43, 15, 84], [0.071, 171, 31, 101], [0.143, 51, 104, 220], [0.214, 255, 79, 105], [0.286, 255, 129, 66], [0.357, 73, 231, 236], [0.429, 255, 218, 69], [0.5, 255, 247, 248], [0.571, 255, 218, 69], [0.643, 73, 231, 236], [0.714, 255, 129, 66], [0.786, 255, 79, 105], [0.857, 51, 104, 220], [0.929, 171, 31, 101]],   // FunkyFuture 8 (Shamaboy), mirror
  'goosebumps-gold': [[0.0, 33, 25, 28], [0.071, 55, 35, 101], [0.143, 148, 20, 52], [0.214, 200, 33, 8], [0.286, 64, 75, 119], [0.357, 227, 93, 8], [0.429, 90, 133, 164], [0.5, 209, 159, 34], [0.571, 90, 133, 164], [0.643, 227, 93, 8], [0.714, 64, 75, 119], [0.786, 200, 33, 8], [0.857, 148, 20, 52], [0.929, 55, 35, 101]],   // Goosebumps Gold (yoshi makes monsters), mirror
  'ice-cream-gb': [[0.0, 124, 63, 88], [0.26, 124, 63, 88], [0.32, 235, 107, 111], [0.62, 249, 168, 117], [0.92, 255, 246, 211]],   // Ice Cream GB (Kerrie Lake), ramp
  'journey': [[0.0, 15, 2, 46], [0.05, 148, 0, 122], [0.079, 148, 0, 122], [0.114, 15, 2, 46], [0.143, 15, 2, 46], [0.193, 255, 65, 125], [0.221, 255, 65, 125], [0.257, 15, 2, 46], [0.286, 15, 2, 46], [0.336, 72, 139, 212], [0.364, 72, 139, 212], [0.4, 15, 2, 46], [0.429, 15, 2, 46], [0.479, 237, 123, 57], [0.507, 237, 123, 57], [0.543, 15, 2, 46], [0.571, 15, 2, 46], [0.621, 61, 255, 110], [0.65, 61, 255, 110], [0.686, 15, 2, 46], [0.714, 15, 2, 46], [0.764, 255, 245, 64], [0.793, 255, 245, 64], [0.829, 15, 2, 46], [0.857, 15, 2, 46], [0.907, 250, 255, 255], [0.936, 250, 255, 255], [0.971, 15, 2, 46]],   // Journey (PineappleOnPizza), neon
  'kirokaze-gameboy': [[0.0, 51, 44, 80], [0.26, 51, 44, 80], [0.32, 70, 135, 143], [0.62, 148, 227, 68], [0.92, 226, 243, 228]],   // Kirokaze Gameboy (Kirokaze), ramp
  'lava-gb': [[0.0, 5, 31, 57], [0.246, 5, 31, 57], [0.25, 74, 36, 128], [0.496, 74, 36, 128], [0.5, 197, 58, 157], [0.746, 197, 58, 157], [0.75, 255, 142, 128], [0.996, 255, 142, 128]],   // Lava-GB (Aero), bands
  'midnight-ablaze': [[0.0, 19, 2, 8], [0.26, 19, 2, 8], [0.32, 31, 5, 16], [0.44, 49, 5, 30], [0.56, 70, 14, 43], [0.68, 124, 24, 60], [0.8, 213, 60, 106], [0.92, 255, 130, 116]],   // Midnight ablaze (Inkpendude), ramp
  'moonlight-gb': [[0.0, 15, 5, 45], [0.117, 32, 54, 113], [0.183, 32, 54, 113], [0.267, 15, 5, 45], [0.333, 15, 5, 45], [0.45, 54, 134, 143], [0.517, 54, 134, 143], [0.6, 15, 5, 45], [0.667, 15, 5, 45], [0.783, 95, 199, 93], [0.85, 95, 199, 93], [0.933, 15, 5, 45]],   // Moonlight GB (Tofu), neon
  'nyx8': [[0.0, 8, 20, 30], [0.26, 8, 20, 30], [0.32, 15, 42, 63], [0.42, 32, 57, 79], [0.52, 78, 73, 95], [0.62, 129, 98, 113], [0.72, 153, 117, 119], [0.82, 195, 163, 138], [0.92, 246, 214, 189]],   // Nyx8 (unknown), ramp
  'oil-6': [[0.0, 39, 39, 68], [0.1, 73, 77, 126], [0.2, 139, 109, 156], [0.3, 198, 159, 165], [0.4, 242, 211, 171], [0.5, 251, 245, 239], [0.6, 242, 211, 171], [0.7, 198, 159, 165], [0.8, 139, 109, 156], [0.9, 73, 77, 126]],   // Oil 6 (unknown), mirror
  'paper-8': [[0.0, 31, 36, 75], [0.26, 31, 36, 75], [0.32, 168, 96, 93], [0.42, 209, 166, 126], [0.52, 246, 231, 156], [0.62, 182, 207, 142], [0.72, 96, 174, 123], [0.82, 60, 107, 100], [0.92, 101, 64, 83]],   // Paper 8 (Frosty Rabbid), hue
  'pico-8': [[0.0, 0, 0, 0], [0.05, 255, 0, 77], [0.079, 255, 0, 77], [0.114, 0, 0, 0], [0.143, 0, 0, 0], [0.193, 131, 118, 156], [0.221, 131, 118, 156], [0.257, 0, 0, 0], [0.286, 0, 0, 0], [0.336, 41, 173, 255], [0.364, 41, 173, 255], [0.4, 0, 0, 0], [0.429, 0, 0, 0], [0.479, 0, 228, 54], [0.507, 0, 228, 54], [0.543, 0, 0, 0], [0.571, 0, 0, 0], [0.621, 255, 163, 0], [0.65, 255, 163, 0], [0.686, 0, 0, 0], [0.714, 0, 0, 0], [0.764, 255, 236, 39], [0.793, 255, 236, 39], [0.829, 0, 0, 0], [0.857, 0, 0, 0], [0.907, 255, 241, 232], [0.936, 255, 241, 232], [0.971, 0, 0, 0]],   // PICO-8 (unknown), neon
  'pollen8': [[0.0, 115, 70, 76], [0.05, 171, 86, 117], [0.079, 171, 86, 117], [0.114, 115, 70, 76], [0.143, 115, 70, 76], [0.193, 238, 106, 124], [0.221, 238, 106, 124], [0.257, 115, 70, 76], [0.286, 115, 70, 76], [0.336, 52, 172, 186], [0.364, 52, 172, 186], [0.4, 115, 70, 76], [0.429, 115, 70, 76], [0.479, 255, 167, 165], [0.507, 255, 167, 165], [0.543, 115, 70, 76], [0.571, 115, 70, 76], [0.621, 114, 220, 187], [0.65, 114, 220, 187], [0.686, 115, 70, 76], [0.714, 115, 70, 76], [0.764, 255, 224, 126], [0.793, 255, 224, 126], [0.829, 115, 70, 76], [0.857, 115, 70, 76], [0.907, 255, 231, 214], [0.936, 255, 231, 214], [0.971, 115, 70, 76]],   // Pollen8 (Conker), neon
  'resurrect-64': [[0.0, 46, 34, 47], [0.121, 46, 34, 47], [0.125, 234, 79, 54], [0.246, 234, 79, 54], [0.25, 247, 150, 23], [0.371, 247, 150, 23], [0.375, 213, 224, 75], [0.496, 213, 224, 75], [0.5, 48, 225, 185], [0.621, 48, 225, 185], [0.625, 77, 155, 230], [0.746, 77, 155, 230], [0.75, 195, 36, 84], [0.871, 195, 36, 84], [0.875, 255, 255, 255], [0.996, 255, 255, 255]],   // Resurrect 64 (Kerrie Lake), huebands
  'retrocal-8': [[0.0, 47, 20, 47], [0.05, 42, 88, 79], [0.079, 42, 88, 79], [0.114, 47, 20, 47], [0.143, 47, 20, 47], [0.193, 119, 68, 72], [0.221, 119, 68, 72], [0.257, 47, 20, 47], [0.286, 47, 20, 47], [0.336, 198, 80, 90], [0.364, 198, 80, 90], [0.4, 47, 20, 47], [0.429, 47, 20, 47], [0.479, 116, 163, 63], [0.507, 116, 163, 63], [0.543, 47, 20, 47], [0.571, 47, 20, 47], [0.621, 110, 184, 168], [0.65, 110, 184, 168], [0.686, 47, 20, 47], [0.714, 47, 20, 47], [0.764, 238, 156, 93], [0.793, 238, 156, 93], [0.829, 47, 20, 47], [0.857, 47, 20, 47], [0.907, 252, 255, 192], [0.936, 252, 255, 192], [0.971, 47, 20, 47]],   // retrocal-8 (polyphrog), neon
  'rust-gold-8': [[0.0, 32, 32, 32], [0.26, 32, 32, 32], [0.32, 51, 28, 23], [0.42, 86, 50, 38], [0.52, 57, 57, 57], [0.62, 114, 89, 86], [0.72, 172, 107, 38], [0.82, 187, 127, 87], [0.92, 246, 205, 38]],   // Rust Gold 8 (Trigo Mathmancer), ramp
  'slso8': [[0.0, 13, 43, 69], [0.121, 13, 43, 69], [0.125, 32, 60, 86], [0.246, 32, 60, 86], [0.25, 84, 78, 104], [0.371, 84, 78, 104], [0.375, 141, 105, 122], [0.496, 141, 105, 122], [0.5, 208, 129, 89], [0.621, 208, 129, 89], [0.625, 255, 170, 94], [0.746, 255, 170, 94], [0.75, 255, 212, 163], [0.871, 255, 212, 163], [0.875, 255, 236, 214], [0.996, 255, 236, 214]],   // SLSO8 (Luis Miguel Maldonado), bands
  'sunset-red': [[0.0, 13, 16, 27], [0.26, 13, 16, 27], [0.32, 40, 26, 45], [0.52, 107, 35, 65], [0.72, 175, 39, 71], [0.92, 238, 36, 61]],   // Sunset Red (Cabezinu), ramp
  'sweetie-16': [[0.0, 26, 28, 44], [0.121, 26, 28, 44], [0.125, 93, 39, 93], [0.246, 93, 39, 93], [0.25, 177, 62, 83], [0.371, 177, 62, 83], [0.375, 239, 125, 87], [0.496, 239, 125, 87], [0.5, 56, 183, 100], [0.621, 56, 183, 100], [0.625, 65, 166, 246], [0.746, 65, 166, 246], [0.75, 167, 240, 112], [0.871, 167, 240, 112], [0.875, 244, 244, 244], [0.996, 244, 244, 244]],   // Sweetie 16 (unknown), bands
  'taffy-16': [[0.0, 34, 37, 51], [0.071, 220, 67, 91], [0.143, 68, 141, 231], [0.214, 245, 137, 49], [0.286, 43, 219, 114], [0.357, 167, 245, 71], [0.429, 255, 235, 51], [0.5, 250, 255, 252], [0.571, 255, 235, 51], [0.643, 167, 245, 71], [0.714, 43, 219, 114], [0.786, 245, 137, 49], [0.857, 68, 141, 231], [0.929, 220, 67, 91]],   // Taffy 16 (PineappleOnPizza), mirror
  'twilight-5': [[0.0, 41, 40, 49], [0.26, 41, 40, 49], [0.32, 51, 63, 88], [0.52, 74, 122, 150], [0.72, 238, 134, 149], [0.92, 251, 187, 173]],   // Twilight 5 (Star), ramp
  'vanilla-milkshake': [[0.0, 40, 40, 46], [0.121, 40, 40, 46], [0.125, 249, 130, 132], [0.246, 249, 130, 132], [0.25, 176, 169, 228], [0.371, 176, 169, 228], [0.375, 254, 170, 228], [0.496, 254, 170, 228], [0.5, 255, 195, 132], [0.621, 255, 195, 132], [0.625, 176, 235, 147], [0.746, 176, 235, 147], [0.75, 233, 245, 157], [0.871, 233, 245, 157], [0.875, 255, 247, 228], [0.996, 255, 247, 228]],   // vanilla milkshake (Space Sandwich), bands
  'vinik24': [[0.0, 0, 0, 0], [0.26, 0, 0, 0], [0.32, 190, 149, 92], [0.42, 147, 161, 103], [0.52, 110, 170, 120], [0.62, 104, 172, 169], [0.72, 65, 106, 163], [0.82, 154, 79, 80], [0.92, 197, 204, 184]],   // Vinik24 (Vinik), hue
};
for (const [k, stops] of Object.entries(LOSPEC)) PALETTES[k] = fromStops(stops, 128);
export const LOSPEC_PALETTES = Object.keys(LOSPEC);

// Original palettes: nature, places and vibes (brand-inspired ones get generic names).
const ORIGINAL = {
  'coral-reef': [[0, 4, 18, 40], [0.28, 6, 30, 60], [0.38, 0, 140, 160], [0.52, 255, 120, 100], [0.64, 255, 190, 120], [0.74, 250, 90, 140], [0.86, 30, 60, 110]],
  'peacock': [[0, 2, 10, 20], [0.25, 4, 30, 40], [0.36, 0, 110, 100], [0.5, 20, 160, 190], [0.6, 40, 70, 180], [0.7, 190, 170, 40], [0.8, 20, 60, 40]],
  'koi-pond': [[0, 6, 20, 24], [0.3, 10, 40, 48], [0.42, 240, 110, 20], [0.54, 255, 245, 230], [0.62, 240, 110, 20], [0.72, 20, 20, 20], [0.84, 30, 70, 80]],
  'autumn': [[0, 20, 8, 4], [0.28, 40, 14, 6], [0.38, 140, 30, 10], [0.5, 220, 90, 20], [0.62, 240, 170, 40], [0.72, 150, 120, 40], [0.84, 70, 40, 20]],
  'jellyfish': [[0, 0, 2, 10], [0.4, 0, 4, 20], [0.5, 40, 0, 120], [0.58, 120, 60, 255], [0.64, 90, 255, 230], [0.7, 255, 140, 255], [0.8, 10, 10, 60]],
  'aurora': [[0, 2, 6, 20], [0.3, 4, 12, 40], [0.42, 20, 200, 120], [0.56, 120, 255, 170], [0.66, 160, 80, 220], [0.76, 60, 20, 120], [0.88, 6, 20, 50]],
  'desert-dusk': [[0, 40, 20, 40], [0.25, 90, 40, 70], [0.42, 210, 90, 70], [0.56, 250, 160, 90], [0.68, 255, 220, 160], [0.8, 140, 70, 90]],
  'glacier': [[0, 10, 30, 60], [0.3, 30, 80, 120], [0.45, 110, 190, 220], [0.58, 220, 245, 255], [0.66, 255, 255, 255], [0.74, 140, 210, 235], [0.86, 40, 100, 150]],
  'macaw': [[0, 10, 10, 20], [0.24, 20, 20, 40], [0.32, 220, 20, 30], [0.46, 255, 200, 0], [0.58, 0, 160, 220], [0.7, 10, 80, 200], [0.82, 40, 160, 60]],
  'moss-stone': [[0, 18, 20, 16], [0.3, 40, 44, 36], [0.42, 90, 110, 40], [0.55, 150, 170, 60], [0.64, 120, 120, 110], [0.76, 70, 74, 66]],
  'cherry-blossom': [[0, 40, 20, 30], [0.25, 70, 40, 50], [0.4, 250, 190, 210], [0.55, 255, 235, 240], [0.65, 230, 120, 160], [0.8, 110, 60, 70]],
  'thunderstorm': [[0, 8, 10, 18], [0.4, 20, 24, 40], [0.52, 60, 70, 100], [0.6, 140, 150, 190], [0.63, 255, 255, 255], [0.66, 170, 160, 255], [0.75, 40, 44, 70]],
  'beetle': [[0, 5, 10, 5], [0.3, 10, 30, 10], [0.42, 20, 140, 60], [0.54, 60, 200, 140], [0.64, 40, 80, 200], [0.74, 120, 40, 160], [0.86, 20, 30, 40]],
  'vaporwave': [[0, 30, 10, 60], [0.25, 60, 20, 100], [0.38, 255, 110, 200], [0.52, 120, 220, 255], [0.64, 190, 140, 255], [0.76, 255, 230, 140], [0.88, 80, 40, 120]],
  'arcade-80s': [[0, 0, 0, 0], [0.3, 0, 0, 0], [0.36, 255, 0, 128], [0.48, 255, 240, 0], [0.6, 0, 255, 255], [0.7, 255, 0, 128], [0.78, 0, 0, 0]],
  'mall-90s': [[0, 20, 10, 40], [0.25, 0, 150, 150], [0.4, 120, 40, 180], [0.54, 255, 100, 160], [0.64, 255, 220, 90], [0.76, 0, 200, 190], [0.88, 40, 20, 70]],
  'highlighter': [[0, 250, 250, 245], [0.3, 250, 250, 245], [0.4, 255, 255, 60], [0.52, 90, 255, 90], [0.64, 255, 90, 200], [0.76, 90, 220, 255], [0.88, 250, 250, 245]],
  'police-lights': [[0, 0, 0, 10], [0.3, 0, 0, 10], [0.4, 255, 20, 20], [0.48, 255, 240, 240], [0.56, 20, 40, 255], [0.64, 0, 0, 10]],
  'phosphor': [[0, 0, 8, 0], [0.35, 0, 20, 4], [0.5, 20, 160, 40], [0.62, 120, 255, 120], [0.7, 220, 255, 220], [0.8, 10, 80, 20]],
  'amber-crt': [[0, 10, 4, 0], [0.35, 24, 10, 0], [0.5, 160, 80, 0], [0.62, 255, 170, 30], [0.7, 255, 230, 160], [0.8, 90, 40, 0]],
  'blueprint': [[0, 10, 40, 110], [0.4, 14, 50, 130], [0.47, 200, 220, 255], [0.5, 255, 255, 255], [0.53, 200, 220, 255], [0.6, 14, 50, 130]],
  'risograph': [[0, 245, 235, 220], [0.3, 245, 235, 220], [0.38, 255, 72, 176], [0.52, 0, 120, 191], [0.62, 255, 232, 0], [0.74, 80, 60, 120], [0.86, 245, 235, 220]],
  'soda-can': [[0, 40, 0, 0], [0.3, 120, 0, 10], [0.4, 230, 0, 30], [0.58, 255, 255, 255], [0.66, 230, 0, 30], [0.8, 90, 0, 10]],
  'burger-joint': [[0, 60, 10, 0], [0.28, 200, 16, 46], [0.45, 255, 199, 44], [0.58, 255, 240, 180], [0.66, 255, 199, 44], [0.8, 200, 16, 46]],
  'stream-purple': [[0, 14, 14, 16], [0.3, 24, 24, 28], [0.42, 100, 65, 165], [0.55, 145, 70, 255], [0.66, 220, 200, 255], [0.78, 60, 40, 110]],
};
for (const [k, stops] of Object.entries(ORIGINAL)) PALETTES[k] = fromStops(stops, 128);
export const ORIGINAL_PALETTES = Object.keys(ORIGINAL);

// Every parameter the engine understands, with the A look as the base. Distances are in units of
// screen height (H), times in seconds.
export const BASE = {
  // flow
  flowMode: 0,          // 0 = straight, 1 = radial outward from the centre, 2 = radial inward
  flowAngle: 90,        // straight mode: degrees, 0 = right, 90 = down
  speed: 0.054,         // H per second
  stripePeriod: 0.113,  // H between stripes as they're born
  tilt: 0.03,           // straight: stripe slope at the birth edge; radial: arms per turn * stripePeriod
  crossDrift: 0.0,      // sideways drift (H/s)
  swirl: 0.0,           // sideways speed as a multiple of speed (spins radial modes)
  r0: 0.06,             // radial: birth radius (outward) / extra radius beyond the corners (inward)
  // birth edge
  wobAmp: 0.12, wobScale: 1.5, wobRate: 0.05,
  // laminar -> turbulent transition (distance downstream of the birth edge)
  ampStart: 0.0, ampEnd: 1.0, ampFrom: 0.42, ampTo: 0.62,
  splitVar: 0.12,       // how far the split wanders (H)
  accel: 2.5,           // extra downstream speed in the turbulent zone (stretches bands)
  tiltGain: 0.85,       // straight mode: the "/" lean gained through the transition (stripes per H across)
  shear: 0.0,           // extra sideways speed in the turbulent zone (radial: spiral arms)
  // turbulence
  longAmp: 0.5, transAmp: 1.5, noiseScale: 2.0, noiseStretch: 1.0, noiseRate: 0.05,
  waveAmp: 0.0, waveFreq: 1.8, waveDrift: 0.04, waveWarp: 1.5, waveSharp: 1.0,
  rowVar: 0.0, rowScale: 6.0,   // per-row speed differences (long streaks with tapered tips)
  diffuse: 0.15,
  // slow wander of lean / stretch / turbulence / split, like the hardware drifting
  vary: 1.0, varyRate: 1.0,
  // look
  palette: 'cyan',
  palette2: 'violet',   // second palette for morphing
  morph: 0,             // 0..1 blend toward palette2
  morphRate: 0,         // if > 0, the blend swings 0..morph this many times per second
  palReps: 1,           // palette repeats per stripe cycle
  stripeHue: 0,         // hue step from one stripe to the next (0.1 = rainbow every 10 stripes)
  hueSpreadX: 0,        // hue change across the screen (turns)
  hueSpreadY: 0,        // hue change down the screen (turns)
  hueSpeed: 0.998,      // same units as the OBS Hue Rotation "Speed" (cycles = t * speed * 0.01)
  hueOffset: 0.0,
  grain: 0.02,
  // effects (WJ-AVE5 digital effects + analog flavour)
  posterize: 0,         // "paint": colour steps per cycle, 0 = off
  mosaic: 0,            // block size in pixels at 1080p, 0 = off
  strobe: 0,            // frame-hold rate in Hz, 0 = off
  negative: 0,          // 1 = inverted
  chroma: 0,            // analog chroma/luma misregistration
  scan: 0,              // scanlines + line jitter
  curve: 0,             // CRT barrel curvature
  vignette: 0,
  mirror: 0,            // 0 = off, 1 = left/right, 2 = four-way, 3 = six-way kaleidoscope
  contour: 0,           // lines along stripe edges: > 0 bright, < 0 dark
  haze: 0,              // heat-haze shimmer
  glow: 0,              // tight glow around bright stripes
  glowRadius: 1,
  bloom: 0,             // wide, multi-scale halo
  glowThreshold: 0.15,  // how bright something must be to glow (0..1)
  glowPulse: 0,         // glow/bloom breathe in and out (0..1); audio also pumps it when reactive
  glowPulseRate: 0.25,  // breaths per second
  blur: 0,              // soft focus (mix toward a blurred copy)
  trails: 0,            // echo: previous frames linger (0..0.98), a second feedback loop on the output
  // cutout (the mixer's wipe shape in the middle of the screen)
  cutout: 0,            // 0 none, 1 diamond, 2 circle, 3 oval, 4 square, 5 rectangle, 6 hexagon, 7 star
  cutoutMode: 1,        // 0 = just a shape, 1 = emitter (stripes born at its edge), 2 = obstacle, 3 = both
  cutoutSize: 0.38,     // H
  cutoutStretch: 1,
  cutoutRotate: 0,      // degrees
  cutoutX: 0, cutoutY: 0,
  cutoutSoft: 0.02,
  cutoutPush: 1,        // emitter: how hard stripes radiate away from the edge
  cutoutShow: 0,        // draw the shape (preview of the site's cutout)
  // reactive (all scaled by `reactive`, 0 = off)
  reactive: 0,
  stir: 0, stirRadius: 0.12,       // pointer drags the fluid with it
  magnet: 0, magnetRadius: 0.15,   // + pushes the flow away from the pointer, - pulls it in
  burst: 0,                        // click/tap sends out a ring and drops new stripes
  wheel: 0,                        // mouse wheel / scroll blows the flow
  energy: 0,                       // pointer activity stirs up turbulence everywhere
  audio: 0,                        // mic level/beats (enable the mic from the panel)
  // engine
  simLines: 300, timeScale: 1.0,
  adaptive: 1,          // lower the resolution automatically when frames run slow
};

const P = (o) => ({ ...BASE, ...o });

const GLASS = {
  speed: 0.035, stripePeriod: 0.06, tilt: 0.12, wobAmp: 0.35, wobScale: 0.8, wobRate: 0.03,
  ampStart: 0.15, ampEnd: 0.35, ampFrom: 0.2, ampTo: 1.0, transAmp: 0.6, longAmp: 0.3,
  noiseScale: 1.2, noiseRate: 0.02, accel: 0.6, tiltGain: 0.3, splitVar: 0.05,
};
const STREAKS = {
  palette: 'violet', flowAngle: 180, speed: 0.2, stripePeriod: 2.5, tilt: 10,
  wobAmp: 0.1, wobScale: 3.0, wobRate: 0.06,
  ampStart: 1.0, ampEnd: 0.0, ampFrom: 0.0, ampTo: 0.2,
  longAmp: 0.6, transAmp: 1.8, noiseScale: 3.0, noiseStretch: 0.5, noiseRate: 0.08,
  rowVar: 0.4, rowScale: 3.0, accel: 0, splitVar: 0.03, tiltGain: 0,
};

const RIPTIDE = {
  speed: 0.09, stripePeriod: 0.1, ampStart: 0.6, ampFrom: 0.0, ampTo: 0.4,
  transAmp: 2.4, longAmp: 0.9, noiseScale: 2.8, noiseRate: 0.09, accel: 1.2, tiltGain: 0.5, diffuse: 0.3,
};
const TUNNEL = {
  flowMode: 1, speed: 0.06, stripePeriod: 0.09, tilt: 0, r0: 0.06, ampFrom: 0.25, ampTo: 0.75, shear: 4.0,
  tiltGain: 0, transAmp: 1.0, longAmp: 0.4, accel: 0.8, splitVar: 0.06, waveAmp: 0.35, waveFreq: 5, waveDrift: 0.01, waveWarp: 0.5,
};
const WHIRL = {
  flowMode: 2, speed: 0.06, stripePeriod: 0.2, tilt: 1.0, r0: 0.15, swirl: 2.2, ampStart: 0.8, ampEnd: 0.2,
  ampFrom: 0.0, ampTo: 0.6, transAmp: 0.8, longAmp: 0.3, accel: 1.5, tiltGain: 0, splitVar: 0.04,
};

// Keys are two-digit numbers; the original letters A-Z still work as aliases (A = 01 ... Z = 26).
export const PRESETS = {
  // ---- based on the captures --------------------------------------------------------------
  '01': P({}),
  // flows up from the bottom, leaning the other way, two-tone palette, sawtooth waves
  '02': P({
    palette: 'violet', flowAngle: 270, stripePeriod: 0.15, ampFrom: 0.3, ampTo: 0.55,
    tiltGain: -0.9, waveAmp: 0.25, waveFreq: 1.4, transAmp: 1.2, accel: 1.8, hueOffset: 0.3,
  }),
  // long streaks pulled left out of a turbulent column at the right edge
  '03': P(STREAKS),
  // calm, fine laminar stripes with slow swells (the top half of the captures, everywhere)
  '04': P(GLASS),
  // turbulent everywhere, fast and folded
  '05': P({
    speed: 0.09, stripePeriod: 0.1, ampStart: 0.6, ampFrom: 0.0, ampTo: 0.4,
    transAmp: 2.4, longAmp: 0.9, noiseScale: 2.8, noiseRate: 0.09, accel: 1.2, tiltGain: 0.5,
    diffuse: 0.3, hueOffset: 0.55,
  }),
  // ---- new shapes ------------------------------------------------------------------------
  // rings born behind the diamond, breaking into spiral arms toward the corners
  '06': P({
    flowMode: 1, palette: 'sunset', speed: 0.06, stripePeriod: 0.09, tilt: 0, r0: 0.06,
    ampFrom: 0.25, ampTo: 0.75, shear: 4.0, tiltGain: 0, transAmp: 1.0, longAmp: 0.4, accel: 0.8, splitVar: 0.06,
    waveAmp: 0.35, waveFreq: 5, waveDrift: 0.01, waveWarp: 0.5,
  }),
  // spiral arms draining into the diamond
  '07': P({
    flowMode: 2, palette: 'ice', speed: 0.06, stripePeriod: 0.2, tilt: 1.0, r0: 0.15, swirl: 2.2,
    ampStart: 0.8, ampEnd: 0.2, ampFrom: 0.0, ampTo: 0.6, transAmp: 0.8, longAmp: 0.3,
    accel: 1.5, tiltGain: 0, splitVar: 0.04,
  }),
  // AVE5 "paint" + mosaic over the baseline structure
  '08': P({ palette: 'acid', posterize: 5, mosaic: 10, speed: 0.07, hueOffset: 0.15 }),
  // flames: flowing up, turbulent from the start, flickering
  '09': P({
    palette: 'ember', flowAngle: 270, speed: 0.12, stripePeriod: 0.09, tilt: 0.0,
    ampStart: 0.5, ampEnd: 1.4, ampFrom: 0.0, ampTo: 0.7, transAmp: 1.4, longAmp: 0.8,
    noiseScale: 3.0, noiseStretch: 0.5, noiseRate: 0.15, accel: 1.5, tiltGain: 0,
    rowVar: 0.3, rowScale: 8, waveAmp: 0.2, waveFreq: 3, hueSpeed: 0.15,
  }),
  // black-and-white VHS dub: strobe-held frames, chroma bleed, scanlines, curved glass
  '10': P({
    palette: 'mono', negative: 1, strobe: 15, chroma: 1.0, scan: 0.7, curve: 0.18, vignette: 0.5,
    grain: 0.06, speed: 0.07, transAmp: 1.8,
  }),
  // ---- reactive ----------------------------------------------------------------------------
  // stir the calm stripes with the pointer
  '11': P({ ...GLASS, reactive: 1, stir: 1.0, stirRadius: 0.1, energy: 0.6, hueOffset: 0.4 }),
  // click/tap drops ripples into the baseline
  '12': P({ reactive: 1, burst: 1.0, stir: 0.3, palette: 'violet', hueOffset: 0.7 }),
  // mouse wheel / scroll blows the streaks; the pointer stirs a little
  '13': P({ ...STREAKS, reactive: 1, wheel: 1.0, stir: 0.4, hueOffset: 0.5 }),
  // the pointer is a magnet the stripes bend around
  '14': P({ reactive: 1, magnet: 0.35, magnetRadius: 0.14, energy: 0.3, palette: 'acid' }),
  // audio: mic level drives speed/turbulence, beats drop ripples and kick the hue
  '15': P({ reactive: 1, audio: 1.0, stir: 0.5, burst: 0.6, speed: 0.07, transAmp: 1.8, hueOffset: 0.2 }),
  // ---- further out -------------------------------------------------------------------------
  // six-way kaleidoscope of a turbulent flow: a slowly churning mandala
  '16': P({
    mirror: 3, palette: 'sunset', palReps: 2, speed: 0.06, stripePeriod: 0.12,
    ampStart: 0.4, ampFrom: 0.0, ampTo: 0.6, transAmp: 2.0, longAmp: 0.7, noiseScale: 2.4,
    accel: 1.0, tiltGain: 0.6, diffuse: 0.25,
  }),
  // four-way mirror of a diagonal flow, double palette, slight CRT
  '17': P({
    flowAngle: 45, mirror: 2, palette: 'ice', palReps: 2, speed: 0.06, stripePeriod: 0.1,
    ampFrom: 0.3, ampTo: 0.7, transAmp: 1.6, tiltGain: 0.6, curve: 0.1, vignette: 0.35,
  }),
  // every stripe its own hue: rainbows that flow with the pattern
  '18': P({ palette: 'oilslick', stripeHue: 0.085, hueSpreadX: 0.15, speed: 0.06, hueSpeed: 0.4 }),
  // calm glass in neon, slowly morphing into a full spectrum and back, hue sweeping across
  '19': P({ ...GLASS, stripePeriod: 0.16, wobAmp: 0.5, palette: 'neon', palette2: 'spectrum', morph: 1, morphRate: 0.025, hueSpreadX: 0.35, hueSpeed: 0.5 }),
  // ---- post effects + cutouts ------------------------------------------------------------
  // glowing neon tubes on calm glass
  '20': P({ ...GLASS, stripePeriod: 0.12, palette: 'neon', glow: 1.0, glowRadius: 1.6, bloom: 0.8, glowThreshold: 0.25, glowPulse: 0.3, hueOffset: 0.6 }),
  // riptide with echoes: strobe-held frames leave fading afterimages
  '21': P({
    speed: 0.09, stripePeriod: 0.1, ampStart: 0.6, ampFrom: 0.0, ampTo: 0.4,
    transAmp: 2.4, longAmp: 0.9, noiseScale: 2.8, noiseRate: 0.09, accel: 1.2, tiltGain: 0.5,
    diffuse: 0.3, palette: 'violet', trails: 0.9, strobe: 15, hueOffset: 0.15,
  }),
  // topographic map: stepped bands with dark contour lines
  '22': P({ ...GLASS, palette: 'deepsea', posterize: 6, contour: 0.7, stripePeriod: 0.14, transAmp: 1.0, ampFrom: 0.1, hueSpeed: 0.3 }),
  // lava lamp: slow fat blobs, soft focus and glow
  '23': P({
    palette: 'ember', flowAngle: 270, speed: 0.025, stripePeriod: 0.35, ampStart: 0.7, ampFrom: 0.0, ampTo: 0.5,
    transAmp: 1.6, longAmp: 0.9, noiseScale: 1.4, noiseRate: 0.03, accel: 0.5, tiltGain: 0,
    blur: 0.3, glow: 0.6, glowRadius: 2, bloom: 0.5, hueSpeed: 0.3, vary: 1.5,
  }),
  // the mixer's diamond wipe: stripes radiate from the diamond's edge and get swept downstream
  '24': P({ cutout: 1, cutoutMode: 1, cutoutPush: 1.5, cutoutSize: 0.38, ampFrom: 0.55, ampTo: 0.85 }),
  // a ring source around the stream: halos pushed out and swept down, glowing
  '25': P({
    ...GLASS, cutout: 2, cutoutMode: 3, cutoutPush: 1.3, cutoutSize: 0.3, stripePeriod: 0.16,
    palette: 'spectrum', glow: 0.45, glowRadius: 1.2, bloom: 0.35, glowThreshold: 0.45, hueSpeed: 0.6,
  }),
  // flames seen through heat haze
  '26': P({
    palette: 'sunset', flowAngle: 270, speed: 0.07, stripePeriod: 0.12,
    ampStart: 0.4, ampEnd: 1.2, ampFrom: 0.0, ampTo: 0.8, transAmp: 1.2, longAmp: 0.7,
    noiseScale: 2.4, noiseStretch: 0.6, noiseRate: 0.1, accel: 1.2, tiltGain: 0,
    haze: 1.6, blur: 0.2, glow: 0.5, bloom: 0.4, hueSpeed: 0.4,
  }),
  // ---- nature ------------------------------------------------------------------------------
  '27': P({ ...RIPTIDE, palette: 'coral-reef', speed: 0.05, blur: 0.15, bloom: 0.4, glowThreshold: 0.3, hueSpeed: 0.2 }),
  '28': P({ ...TUNNEL, palette: 'peacock', palReps: 2, stripePeriod: 0.12, shear: 2.5, hueSpeed: 0.15 }),
  '29': P({ ...STREAKS, palette: 'koi-pond', speed: 0.09, rowVar: 0.7, rowScale: 2.5, hueSpeed: 0, cutout: 3, cutoutMode: 2, cutoutSize: 0.16, cutoutX: -0.15 }),
  '30': P({ palette: 'autumn', wobAmp: 0.3, haze: 0.4, speed: 0.045, transAmp: 1.8, hueSpeed: 0.1, cutout: 6, cutoutMode: 2, cutoutSize: 0.14, cutoutX: -0.45, cutoutY: -0.05 }),
  '31': P({ ...TUNNEL, palette: 'jellyfish', speed: 0.035, stripePeriod: 0.16, glow: 0.8, bloom: 0.9, glowPulse: 0.5, glowPulseRate: 0.2, trails: 0.6, hueSpeed: 0.2 }),
  '32': P({ ...GLASS, palette: 'aurora', flowAngle: 270, wobAmp: 0.9, wobScale: 0.5, stripePeriod: 0.2, glow: 0.4, hueSpreadX: 0.25, bloom: 0.6, glowThreshold: 0.3, hueSpeed: 0.2 }),
  '33': P({ ...GLASS, palette: 'desert-dusk', speed: 0.02, stripePeriod: 0.09, blur: 0.2, tilt: 0.25, hueSpeed: 0.1, cutout: 3, cutoutMode: 2, cutoutSize: 0.14, cutoutStretch: 1.8, cutoutY: 0.12 }),
  '34': P({ ...STREAKS, palette: 'glacier', contour: 0.45, speed: 0.06, hueSpeed: 0, cutout: 1, cutoutMode: 2, cutoutShow: 1, cutoutSize: 0.26, cutoutStretch: 0.7, cutoutRotate: 20 }),
  '35': P({ ...RIPTIDE, palette: 'macaw', mirror: 1, hueSpeed: 0.3 }),
  '36': P({ ...RIPTIDE, palette: 'thunderstorm', strobe: 18, bloom: 0.8, glowThreshold: 0.55, hueSpeed: 0 }),
  '37': P({ ...RIPTIDE, palette: 'beetle', mirror: 3, glow: 0.5, glowThreshold: 0.35, speed: 0.05, hueSpeed: 0.3 }),
  '38': P({ ...TUNNEL, palette: 'cherry-blossom', mirror: 3, speed: 0.04, stripePeriod: 0.14, blur: 0.2, bloom: 0.4, glowThreshold: 0.5, hueSpeed: 0.1 }),
  // ---- places, objects, vibes -----------------------------------------------------------------
  '39': P({ palette: 'vaporwave', flowAngle: 270, stripePeriod: 0.15, ampFrom: 0.3, ampTo: 0.55, tiltGain: -0.9, waveAmp: 0.25, curve: 0.12, scan: 0.3, hueSpreadY: 0.3, hueSpeed: 0.3 }),
  '40': P({ ...GLASS, palette: 'arcade-80s', mosaic: 8, glow: 0.7, stripePeriod: 0.13, hueSpeed: 0.3 }),
  '41': P({ palette: 'highlighter', contour: -0.6, speed: 0.06, hueSpeed: 0.2, cutout: 5, cutoutMode: 1, cutoutSize: 0.2, cutoutStretch: 1.4, cutoutSoft: 0.08, cutoutPush: 1.2 }),
  '42': P({ ...WHIRL, palette: 'police-lights', swirl: 4, speed: 0.09, strobe: 16, hueSpeed: 0 }),
  '43': P({ palette: 'phosphor', scan: 0.6, curve: 0.15, vignette: 0.6, grain: 0.06, glow: 0.4, hueSpeed: 0 }),
  '44': P({ ...STREAKS, palette: 'amber-crt', scan: 0.5, curve: 0.18, vignette: 0.5, chroma: 0.4, hueSpeed: 0 }),
  '45': P({ ...GLASS, palette: 'blueprint', stripePeriod: 0.08, ampFrom: 0.3, transAmp: 1.4, mirror: 1, hueSpeed: 0 }),
  '46': P({ palette: 'risograph', posterize: 4, grain: 0.07, chroma: 0.6, speed: 0.05, hueSpeed: 0.1, cutout: 2, cutoutMode: 3, cutoutSize: 0.2, cutoutSoft: 0.14, cutoutY: 0.15, cutoutPush: 1.4 }),
  '47': P({ ...STREAKS, palette: 'soda-can', speed: 0.3, rowVar: 0.8, rowScale: 6, wobAmp: 0.3, hueSpeed: 0 }),
  '48': P({ ...RIPTIDE, palette: 'burger-joint', posterize: 6, hueSpeed: 0, cutout: 3, cutoutMode: 1, cutoutSize: 0.2, cutoutStretch: 1.1, cutoutPush: -1.2 }),
  '49': P({ flowAngle: 45, mirror: 2, palette: 'mall-90s', palReps: 2, speed: 0.06, stripePeriod: 0.1, ampFrom: 0.3, ampTo: 0.7, transAmp: 1.6, tiltGain: 0.6, curve: 0.1, hueSpeed: 0.2 }),
  '50': P({ palette: 'stream-purple', stripeHue: 0.04, glow: 0.5, bloom: 0.4, hueSpeed: 0, cutout: 5, cutoutMode: 1, cutoutSize: 0.42, cutoutStretch: 0.3, cutoutX: 0.62, cutoutPush: 0.8 }),
  // ---- lospec palettes ------------------------------------------------------------------------
  '51': P({ palette: 'sweetie-16', speed: 0.06, cutout: 4, cutoutMode: 1, cutoutSize: 0.18, cutoutRotate: 15, cutoutPush: 2.5 }),
  '52': P({ ...GLASS, palette: 'fantasy-24', contour: -0.7, stripePeriod: 0.2, transAmp: 1.2, ampFrom: 0.1, hueSpeed: 0.1, cutout: 7, cutoutMode: 1, cutoutSize: 0.24, cutoutRotate: 18, cutoutPush: 2 }),
  '53': P({ ...GLASS, palette: 'kirokaze-gameboy', mosaic: 6, posterize: 4, stripePeriod: 0.22, hueSpeed: 0 }),
  // ---- reactive ------------------------------------------------------------------------------
  '54': P({ ...GLASS, palette: 'pico-8', stripePeriod: 0.2, reactive: 1, stir: 1.4, stirRadius: 0.08, hueSpeed: 0.2 }),
  '55': P({ ...GLASS, palette: 'koi-pond', stripePeriod: 0.16, reactive: 1, burst: 1.2, glow: 0.4, hueSpeed: 0.1 }),
  '56': P({ ...WHIRL, palette: 'berry-nebula', reactive: 1, magnet: -0.8, magnetRadius: 0.2, bloom: 0.7, hueSpeed: 0.3 }),
  '57': P({ ...TUNNEL, palette: 'cyberpunk-neons', reactive: 1, audio: 1.4, burst: 0.6, bloom: 0.7, glowPulse: 0.3, hueSpeed: 0.3 }),
  '58': P({ ...STREAKS, palette: 'oil-6', reactive: 1, wheel: 1.5, energy: 0.8, stir: 0.4 }),
  '59': P({ palette: 'endesga-32', reactive: 1, cutout: 6, cutoutMode: 1, cutoutPush: 1.0, cutoutSize: 0.18, stripePeriod: 0.16, glow: 0.4, burst: 1.0, energy: 0.6, hueSpeed: 0.3 }),
  '60': P({ palette: 'taffy-16', reactive: 1, magnet: 0.6, magnetRadius: 0.18, energy: 0.6 }),
};

export const PRESET_INFO = {
  '01': { name: 'Baseline', desc: 'The original capture: stripes born at the top, leaning into "/" bands lower down.' },
  '02': { name: 'Undertow', desc: 'Flows up from the bottom, leaning the other way, two-tone with sawtooth waves.' },
  '03': { name: 'Streaks', desc: 'Long streaks pulled left out of a turbulent column on the right.' },
  '04': { name: 'Glass', desc: 'Calm, fine stripes with slow swells.' },
  '05': { name: 'Riptide', desc: 'Turbulent everywhere, fast and folded.' },
  '06': { name: 'Tunnel', desc: 'Rings born behind the diamond, rippling apart toward the corners.' },
  '07': { name: 'Whirlpool', desc: 'Spiral arms draining into the centre.' },
  '08': { name: 'Paint', desc: 'AVE5 paint + mosaic over the baseline.' },
  '09': { name: 'Ember', desc: 'Rising flames.' },
  '10': { name: 'Dub', desc: 'Black-and-white VHS: negative, strobe, chroma bleed, scanlines, curved glass.' },
  '11': { name: 'Stir', desc: 'Drag the pointer to stir calm stripes.' },
  '12': { name: 'Ripple', desc: 'Click or tap to drop ripples.' },
  '13': { name: 'Wind', desc: 'Mouse wheel blows the streaks around.' },
  '14': { name: 'Magnet', desc: 'Stripes bend around the cursor.' },
  '15': { name: 'Audio', desc: 'Pulses with mic or desktop audio.' },
  '16': { name: 'Kaleido', desc: 'Six-way kaleidoscope mandala.' },
  '17': { name: 'Mirror Maze', desc: 'Four-way mirrored diagonal flow making diamond shapes.' },
  '18': { name: 'Prism', desc: 'Every stripe gets its own hue.' },
  '19': { name: 'Neon Drift', desc: 'Calm neon glass slowly morphing into a full spectrum.' },
  '20': { name: 'Bloom', desc: 'Glowing, breathing neon tubes.' },
  '21': { name: 'Afterimage', desc: 'Turbulence with strobed echoes.' },
  '22': { name: 'Topo', desc: 'Stepped bands with contour lines, like a map.' },
  '23': { name: 'Lava', desc: 'Slow fat blobs with soft glow.' },
  '24': { name: 'Wipe', desc: 'Stripes radiating from a diamond wipe, swept downstream.' },
  '25': { name: 'Halo', desc: 'Glowing eclipse ring.' },
  '26': { name: 'Mirage', desc: 'Flames seen through heat haze.' },
  '27': { name: 'Reef', desc: 'Coral colours churning underwater, soft and glowing.' },
  '28': { name: 'Peacock', desc: 'Iridescent feather-eye rings in teal, blue and gold.' },
  '29': { name: 'Koi', desc: 'Orange and white streaks gliding around a rock.' },
  '30': { name: 'Autumn', desc: 'Falling-leaf colours drifting past a stone.' },
  '31': { name: 'Jellyfish', desc: 'Bioluminescent rings pulsing on black.' },
  '32': { name: 'Aurora', desc: 'Glowing green curtains rising in a night sky.' },
  '33': { name: 'Desert', desc: 'Warm dune bands flowing around a long rock.' },
  '34': { name: 'Glacier', desc: 'Ice-blue strata parting around an iceberg.' },
  '35': { name: 'Macaw', desc: 'Tropical feather colours, mirrored.' },
  '36': { name: 'Thunderhead', desc: 'Dark storm turbulence with flashing highlights.' },
  '37': { name: 'Beetle', desc: 'Iridescent shell in six-way symmetry.' },
  '38': { name: 'Sakura', desc: 'Soft pink blossom drift.' },
  '39': { name: 'Vaporwave', desc: 'Pastel neon sunset on a curved old TV.' },
  '40': { name: 'Arcade', desc: 'Chunky neon pixels glowing on black.' },
  '41': { name: 'Highlighter', desc: 'Marker strokes radiating from a soft-edged box.' },
  '42': { name: 'Siren', desc: 'Red and blue lights spinning down the drain.' },
  '43': { name: 'Terminal', desc: 'Green phosphor monitor.' },
  '44': { name: 'Amber', desc: 'Amber CRT streaks.' },
  '45': { name: 'Blueprint', desc: 'White drafting lines on blue, mirrored.' },
  '46': { name: 'Riso', desc: 'Misregistered print rings around a soft circle.' },
  '47': { name: 'Soda', desc: 'Fizzy red-and-white streaks.' },
  '48': { name: 'Lunch Rush', desc: 'Fast-food colours sucked into a giant bun.' },
  '49': { name: 'Mall 96', desc: 'Mirrored 90s food-court carpet.' },
  '50': { name: 'Purple Chat', desc: 'Streamer purples pouring out of a chat panel.' },
  '51': { name: 'Sweetie', desc: 'Hard-edged bands stepping out of a tilted square.' },
  '52': { name: 'Atlas', desc: 'Fantasy-map bands around a compass rose.' },
  '53': { name: 'Handheld', desc: 'Old handheld LCD: four greens, chunky pixels.' },
  '54': { name: 'Finger Paint', desc: 'Drag to smear pixel-art colours around.' },
  '55': { name: 'Pond', desc: 'Click to drop pebbles into a calm koi pond.' },
  '56': { name: 'Black Hole', desc: 'The cursor pulls everything into it.' },
  '57': { name: 'Bass Tunnel', desc: 'Neon rings that pulse with the music.' },
  '58': { name: 'Gust', desc: 'Wheel and mouse movement blow the streaks around.' },
  '59': { name: 'Reactor', desc: 'A hexagon core firing rings; click to add bursts.' },
  '60': { name: 'Repel', desc: 'Push the colour bands around with the cursor.' },
};
// reactive / strobe flags come from the params themselves
for (const [k, info] of Object.entries(PRESET_INFO)) {
  info.reactive = !!PRESETS[k]?.reactive;
  info.strobe = (PRESETS[k]?.strobe || 0) > 0;
  info.cutout = (PRESETS[k]?.cutout || 0) > 0;
  info.audio = !!PRESETS[k]?.reactive && (PRESETS[k]?.audio || 0) > 0;
}

// Little icons shown next to preset names: reactive, sound-reactive, strobe, cutout.
export function presetIcons(key) {
  const i = PRESET_INFO[key] || {};
  return (i.reactive ? ' ⚡' : '') + (i.audio ? ' 🔊' : '') + (i.strobe ? ' ◐' : '') + (i.cutout ? ' ◆' : '');
}

// Old letter keys (A = 01 ... Z = 26) keep working.
export const PRESET_ALIASES = Object.fromEntries('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((L, i) => [L, String(i + 1).padStart(2, '0')]));
// Display order: numbered presets 01, 02, ... first, then anything registered later (saved presets).
// (JS objects put integer-like keys such as '10' ahead of '01', so don't rely on Object.keys order.)
export function presetKeys() {
  const ks = Object.keys(PRESETS), num = (k) => /^\d+$/.test(k);
  return [...ks.filter(num).sort((a, b) => a - b), ...ks.filter((k) => !num(k))];
}
export function resolvePreset(key) { return PRESETS[key] ? key : (PRESET_ALIASES[key] ?? key); }

// Add presets saved from the panel (presets.json): registerPresets(await (await fetch('presets.json')).json())
export function registerPresets(map) {
  for (const [key, params] of Object.entries(map || {})) {
    PRESETS[key] = { ...BASE, ...params };
    PRESET_INFO[key] ??= { name: key, desc: '' };
    PRESET_INFO[key].reactive = !!params.reactive;
    PRESET_INFO[key].strobe = (params.strobe || 0) > 0;
    PRESET_INFO[key].cutout = (params.cutout || 0) > 0;
    PRESET_INFO[key].audio = !!params.reactive && (params.audio || 0) > 0;
  }
}
