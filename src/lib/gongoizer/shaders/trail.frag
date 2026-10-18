#include post-header.glsl;
uniform sampler2D uCur, uPrev;
uniform float uTrail;
void main() {
	vec3 c = texture(uCur, uv()).rgb, p = texture(uPrev, uv()).rgb * uTrail;
	o = vec4(max(c, p), 1.0);
}
