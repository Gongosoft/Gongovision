#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uPrev, uCur, uLut, uLut2;
uniform vec2 uSimSize, uCanvas;
uniform vec3 uDomain;
uniform float uAspect;
uniform float uMorph;       // blend toward the second palette
uniform vec3 uHueField;     // hue shift across x, down y, and per successive stripe
uniform float uAlpha, uPhaseOffset, uHue, uGrain, uFrame;
uniform float uPosterize, uMosaic, uNegative, uChroma, uScan, uCurve, uVignette, uPalReps;
uniform int uMirror;
uniform float uContour, uHaze, uTimeD, uCutShow;
out vec4 o;
#include circ.glsl;
#include shapes.glsl;
// Hue rotation, same maths as the OBS "Hue Rotation" shader (SkeletonBow).
vec3 HUEtoRGB(float H) {
	return clamp(vec3(abs(H * 6.0f - 3.0f) - 1.0f, 2.0f - abs(H * 6.0f - 2.0f), 2.0f - abs(H * 6.0f - 4.0f)), 0.0f, 1.0f);
}
vec3 RGBtoHCV(vec3 RGB) {
	vec4 P = (RGB.g < RGB.b) ? vec4(RGB.bg, -1.0f, 2.0f / 3.0f) : vec4(RGB.gb, 0.0f, -1.0f / 3.0f);
	vec4 Q = (RGB.r < P.x) ? vec4(P.xyw, RGB.r) : vec4(RGB.r, P.yzx);
	float C = Q.x - min(Q.w, Q.y);
	float H = abs((Q.w - Q.y) / (6.0f * C + 1e-10f) + Q.z);
	return vec3(H, C, Q.x);
}
vec3 hueRotate(vec3 c, float h) {
	vec3 hcv = RGBtoHCV(c);
	float S = hcv.y / (hcv.z + 1e-10f);
	return ((HUEtoRGB(fract(hcv.x + h)) - 1.0f) * S + 1.0f) * hcv.z;
}
float hash(vec2 p) {
	p = fract(p * vec2(443.897f, 441.423f));
	p += dot(p, p.yx + 19.19f);
	return fract((p.x + p.y) * p.x);
}
// screen uv (0..1, y down) -> phase 0..256: fract = position within a stripe, floor = which
// stripe (stable over time, since the stored field and the offset both wrap at 256)
float phaseRaw(vec2 uv) {
	vec2 st = (uv * vec2(uAspect, 1.0f) + uDomain.z) / uDomain.xy * uSimSize;
	ivec2 size = ivec2(uSimSize);
	float a = fetchPhi(uPrev, st, size), b = fetchPhi(uCur, st, size);
	return mod(a + wrapd(b - a) * uAlpha - uPhaseOffset, 256.0f);
}
float stripePos(float raw) {
	float th = fract(raw * uPalReps);
	if(uPosterize > 0.0f)
		th = (floor(th * uPosterize) + 0.5f) / uPosterize;
	return th;
}
float phaseAt(vec2 uv) {
	return stripePos(phaseRaw(uv));
}
vec3 lut(float th) {
	return mix(texture(uLut, vec2(th, 0.5f)).rgb, texture(uLut2, vec2(th, 0.5f)).rgb, uMorph);
}
void main() {
	vec2 fc = gl_FragCoord.xy;
	if(uMosaic > 0.0f) {
		float px = max(1.0f, uMosaic * uCanvas.y / 1080.0f);
		fc = (floor(fc / px) + 0.5f) * px;
	}
	vec2 uv = fc / uCanvas;
	uv.y = 1.0f - uv.y;
	float edge = 1.0f;
	if(uCurve > 0.0f) {
		vec2 cc = uv * 2.0f - 1.0f;
		cc *= 1.0f + uCurve * dot(cc, cc) * 0.25f;
		uv = cc * 0.5f + 0.5f;
		vec2 e = smoothstep(vec2(0.0f), vec2(0.01f), uv) * smoothstep(vec2(0.0f), vec2(0.01f), 1.0f - uv);
		edge = e.x * e.y;
	}
	if(uScan > 0.0f) {
		float line = floor(fc.y / 2.0f);
		uv.x += uScan * 0.004f * (hash(vec2(line, floor(uFrame / 2.0f))) - 0.5f) * step(0.92f, hash(vec2(floor(uFrame / 3.0f), floor(line / 24.0f))));
	}
	if(uHaze > 0.0f) {   // heat haze: the image shimmers sideways in bands
		uv.x += uHaze * 0.005f * sin(uv.y * 38.0f + uTimeD * 2.3f + sin(uv.x * 9.0f + uTimeD * 0.7f) * 2.0f);
		uv.y += uHaze * 0.003f * sin(uv.x * 27.0f - uTimeD * 1.7f);
	}
	vec2 suv = uv;     // screen position for the cutout, before mirroring
	if(uMirror > 0) {
		if(uMirror == 3) {
			vec2 p = (uv - 0.5f) * vec2(uAspect, 1.0f);
			float r = length(p), a = atan(p.y, p.x);
			float seg = 6.2831853f / 6.0f;
			a = mod(a, seg);
			a = abs(a - seg * 0.5f);
			uv = vec2(cos(a), sin(a)) * r / vec2(uAspect, 1.0f) + 0.5f;
		} else {
			uv.x = 0.5f - abs(uv.x - 0.5f);
			if(uMirror == 2)
				uv.y = 0.5f - abs(uv.y - 0.5f);
		}
	}
	vec3 col;
	float raw = phaseRaw(uv);
	if(uChroma > 0.0f) {
		vec2 dx = vec2(uChroma * 0.004f, 0.0f);
		col = vec3(lut(phaseAt(uv + dx)).r, lut(stripePos(raw)).g, lut(phaseAt(uv - dx * 1.5f)).b);
	} else
		col = lut(stripePos(raw));
	if(uContour != 0.0f) {   // thin lines along stripe boundaries (bright if > 0, dark if < 0)
		float f = fract(raw * uPalReps), w = max(fwidth(raw * uPalReps), 1e-4f);
		float line = 1.0f - smoothstep(w * 0.6f, w * 1.8f, min(f, 1.0f - f));
		col = mix(col, uContour > 0.0f ? vec3(1.0f) : vec3(0.0f), abs(uContour) * line);
	}
	if(uNegative > 0.0f)
		col = mix(col, 1.0f - col, uNegative);
	float hue = uHue + uHueField.x * uv.x + uHueField.y * uv.y + uHueField.z * floor(raw);
	if(hue != 0.0f)
		col = hueRotate(col, fract(hue));
	if(uScan > 0.0f)
		col *= 1.0f - uScan * 0.35f * step(1.0f, mod(fc.y, 3.0f));
	if(uVignette > 0.0f) {
		vec2 q = uv - 0.5f;
		col *= 1.0f - uVignette * dot(q, q) * 2.2f;
	}
	col *= edge;
	if(uCutShow > 0.0f && uCutShape > 0) {
		float sd = cutSDF(suv * vec2(uAspect, 1.0f));
		float px = 1.5f / uCanvas.y;
		col = mix(col, vec3(0.075f), uCutShow * (1.0f - smoothstep(-px, px, sd)));
	}
	col += (hash(fc + uFrame * 1.618f) - 0.5f) * uGrain;
	o = vec4(col, 1.0f);
}
