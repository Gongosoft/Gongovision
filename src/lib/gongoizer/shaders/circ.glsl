float wrapd(float x) {
	return x - floor(x + 0.5);
}
float circMix4(float a, float b, float c, float d, vec2 f) {
	b = a + wrapd(b - a);
	c = a + wrapd(c - a);
	d = a + wrapd(d - a);
	return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fetchPhi(highp sampler2D tex, vec2 st, ivec2 size) {
	vec2 p = st - 0.5;
	vec2 f = fract(p);
	ivec2 i = ivec2(floor(p));
	ivec2 mx = size - 1;
	return circMix4(texelFetch(tex, clamp(i, ivec2(0), mx), 0).r, texelFetch(tex, clamp(i + ivec2(1, 0), ivec2(0), mx), 0).r, texelFetch(tex, clamp(i + ivec2(0, 1), ivec2(0), mx), 0).r, texelFetch(tex, clamp(i + ivec2(1, 1), ivec2(0), mx), 0).r, f);
}
