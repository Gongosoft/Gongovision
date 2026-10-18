#include post-header.glsl;
uniform sampler2D uTex;
uniform vec2 uSrcTexel;
void main() {
	vec2 h = uSrcTexel;
	vec2 p = uv();
	o = 0.25 * (texture(uTex, p + vec2(-h.x, -h.y)) + texture(uTex, p + vec2(h.x, -h.y)) + texture(uTex, p + vec2(-h.x, h.y)) + texture(uTex, p + vec2(h.x, h.y)));
}
