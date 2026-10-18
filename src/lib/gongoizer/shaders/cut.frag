#version 300 es
precision highp float;
uniform vec2 uSimSize;
uniform vec3 uDomain;
out vec4 o;
#include shapes.glsl;
void main() {
	vec2 s = gl_FragCoord.xy / uSimSize * uDomain.xy - uDomain.z;
	const float e = 0.004f;
	vec2 n = vec2(cutSDF(s + vec2(e, 0)) - cutSDF(s - vec2(e, 0)), cutSDF(s + vec2(0, e)) - cutSDF(s - vec2(0, e)));
	o = vec4(cutSDF(s), n / max(length(n), 1e-5f), 1.0f);
}
