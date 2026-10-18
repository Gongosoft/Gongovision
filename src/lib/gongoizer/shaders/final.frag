#include post-header.glsl;
uniform sampler2D uSrc, uBl, uM1, uM2, uM3, uSnap;
uniform float uGlow, uBlur, uHasBl, uBloom, uThresh, uSnapMix;
vec3 bright(vec3 b) {
	return b * smoothstep(uThresh, uThresh + 0.35, max(b.r, max(b.g, b.b)));
}
void main() {
	vec3 c = texture(uSrc, uv()).rgb;
	if(uHasBl > 0.0) {
		vec3 b = texture(uBl, uv()).rgb;
		c = mix(c, b, uBlur);
		vec3 g = bright(b) * uGlow * 1.6;
		if(uBloom > 0.0) {
			vec3 w = texture(uM1, uv()).rgb * 0.45 + texture(uM2, uv()).rgb * 0.33 + texture(uM3, uv()).rgb * 0.22;
			g += bright(w) * uBloom * 2.4;
		}
		c = 1.0 - (1.0 - c) * (1.0 - clamp(g, 0.0, 1.0));   // screen blend
	}
	c = mix(texture(uSnap, uv()).rgb, c, uSnapMix);   // crossfade from the previous preset's last frame
	o = vec4(c, 1.0);
}
