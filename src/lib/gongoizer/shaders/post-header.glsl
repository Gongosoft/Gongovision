#version 300 es
precision highp float;
uniform vec2 uOut;          // output size in pixels
out vec4 o;
vec2 uv() {
	return gl_FragCoord.xy / uOut;
}
