#include post-header.glsl;
uniform sampler2D uTex;
uniform vec2 uDir;
void main() {
	vec2 p = uv();
	o = texture(uTex, p) * 0.227027 + (texture(uTex, p + uDir * 1.384615) + texture(uTex, p - uDir * 1.384615)) * 0.316216 + (texture(uTex, p + uDir * 3.230769) + texture(uTex, p - uDir * 3.230769)) * 0.070270;
}
