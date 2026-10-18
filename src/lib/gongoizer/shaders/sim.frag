#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uState;
uniform float uTime, uDt, uDiffuse, uBurstKick;
uniform int uInit;          // 0 step, 1 start from the laminar solution, 2 resample uState from an old size
uniform vec3 uOldDomain;
uniform vec2 uOldSize;
out vec4 o;
#include noise.glsl;
#include circ.glsl;
#include flow.glsl;
vec2 toST(vec2 s) {
	return (s + uDomain.z) / uDomain.xy * uSimSize;
}
vec2 toS(vec2 st) {
	return st / uSimSize * uDomain.xy - uDomain.z;
}
// Undisturbed solution: fluid that crossed the birth edge at tc = t - d/speed (d < 0 means it
// hasn't arrived yet), plus the mean lean it picks up through the transition zone.
float laminarPhi(vec2 s, float t) {
	float d, c;
	vec2 fd, cd;
	frame(s, d, c, fd, cd);
	float tc = t - d / max(uSpeed, 1e-4f);
	float wob = 0.0f, ramp = 0.0f;
	for(int k = 0; k < uN2; k++) {   // birth-edge wobble + zone ramp, one copy of snoise
		float n = snoise((k == 0) ? crossQ(c, uWob.y, tc * uWob.z, 5.0f) : crossQ(c, 0.6f, t * 0.015f, 11.0f));
		if(k == 0)
			wob = n;
		else
			ramp = rampFrom(d, n);
	}
	return uKc * c + uWob.x * wob + uFInj * (t - tc) + uTiltGain * (c - uCrossMid) * ramp;
}
// Texel lookup: upstream of the birth edge and outside the sim texture use the analytic field,
// so stripes keep being injected however small the per-step displacement is, and side inflow
// continues the pattern instead of smearing the edge.
float texelPhi(ivec2 i, ivec2 size, float t) {
	vec2 s = toS(vec2(i) + 0.5f);
	float d, c;
	vec2 fd, cd;
	frame(s, d, c, fd, cd);
	if(uInit > 0 || d < 0.0f || any(lessThan(i, ivec2(0))) || any(greaterThanEqual(i, size)))
		return laminarPhi(s, t);
	if(uCutShape > 0 && uCutB.z > 0.0f && cutAt(s).r < 0.0f)
		return 0.0f;
	return texelFetch(uState, i, 0).r;
}
float samplePhi(vec2 st, ivec2 size, float t) {
	vec2 p = st - 0.5f;
	vec2 f = fract(p);
	ivec2 i = ivec2(floor(p));
	float v0 = 0.0f, v1 = 0.0f, v2 = 0.0f, v3 = 0.0f;
	for(int k = 0; k < uN4; k++) {
		float v = texelPhi(i + ivec2(k & 1, k >> 1), size, t);
		if(k == 0)
			v0 = v;
		else if(k == 1)
			v1 = v;
		else if(k == 2)
			v2 = v;
		else
			v3 = v;
	}
	return circMix4(v0, v1, v2, v3, f);
}
void main() {
	vec2 s = toS(gl_FragCoord.xy);
	ivec2 size = ivec2(uSimSize);
	if(uInit == 2) {   // window resized: carry the old field over (same H units)
		vec2 sto = (s + uOldDomain.z) / uOldDomain.xy * uOldSize;
	// newly exposed area: mirror the old field into it (continuous, no seam); the flow
	// reworks it within seconds
		vec2 L = uOldSize;
		sto = mod(sto, 2.0f * L);
		sto = mix(sto, 2.0f * L - sto, step(L, sto));
		o = vec4(fetchPhi(uState, sto, ivec2(uOldSize)), 0, 0, 1);
		return;
	}
	if(uInit > 0) {
		o = vec4(texelPhi(ivec2(gl_FragCoord.xy), size, uTime), 0, 0, 1);
		return;
	}
	// RK2 back-trace (midpoint), as a loop so velocity() is compiled once
	vec2 v = vec2(0.0f), q = s;
	float tq = uTime;
	for(int k = 0; k < uN2; k++) {
		v = velocity(q, tq);
		q = s - 0.5f * uDt * v;
		tq = uTime - 0.5f * uDt;
	}
	vec2 b = s - uDt * v;
	float tPrev = uTime - uDt;
	vec2 st = toST(b);
	float phi = samplePhi(st, size, tPrev);
	if(uDiffuse > 0.0f) {
	// plain neighbour texels (no ghost cells) are plenty for a little softening
		float avg = 0.0f;
		for(int k = 0; k < uN4; k++) {
			vec2 o = (k < 2) ? vec2(k == 0 ? 1.0f : -1.0f, 0.0f) : vec2(0.0f, k == 2 ? 1.0f : -1.0f);
			avg += wrapd(fetchPhi(uState, st + o, size) - phi);
		}
		phi += uDiffuse * 0.25f * avg;
	}
	// Progressive lean: fluid picks up a cross-flow phase gradient through the transition zone,
	// so bands lean lower down; turbulence then breaks them into S-hooks.
	// (accumulated along the flow, so sideways turbulence carries the lean around with it)
	if(uTiltGain != 0.0f) {
		float d, c;
		vec2 fd, cd;
		frame(s, d, c, fd, cd);
		float dr = 0.0f;
		for(int k = 0; k < uN2; k++) dr += (k == 0) ? zoneRamp(s, uTime) : -zoneRamp(b, tPrev);
		phi += uTiltGain * (c - uCrossMid) * dr;
	}
	// click bursts also drop a blob of fresh phase -> concentric rings that then get carried off
	for(int k = 0; k < uNBursts; k++) {
		vec4 B = uBursts[k];
		if(B.w <= 0.0f)
			continue;
		vec2 br = s - B.xy;
		phi += uBurstKick * B.w * exp(-dot(br, br) / 0.004f) * exp(-B.z * 5.0f) * 5.0f * uDt;
	}
	phi += uFInj * uDt;
	// cutout as an emitter: the mixer shows other content inside the wipe, so its edge is a
	// second birth edge. Inside, the field is held still (theta keeps cycling with time).
	if(uCutB.z > 0.0f) {
		float sd = cutAt(s).r;
		if(uCutShape > 0 && sd < 0.0f)
			phi = mix(phi, phi + wrapd(-phi), smoothstep(0.0f, -max(uCutB.y, 1e-3f), sd));
	}
	o = vec4(phi - 256.0f * floor(phi / 256.0f), 0, 0, 1);   // wrap: only phi mod 1 is ever shown
}
