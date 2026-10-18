uniform vec2 uSimSize;
uniform float uAspect;
uniform vec3 uDomain;       // sim extent in H units (w, h) and the off-screen margin on every side
uniform int uMode;          // 0 straight, 1 radial out, 2 radial in
uniform vec2 uFlow;
uniform vec2 uOrigin;
uniform vec2 uCenter;
uniform float uR0;
uniform float uSpeed, uFInj, uKc, uSwirl;
uniform vec3 uWob;          // amp, scale, rate
uniform vec4 uAmp;          // start, end, from, to
uniform vec4 uNoise;        // longAmp, transAmp, scale, rate
uniform float uStretch, uCrossDrift, uAccel, uShear, uSplitVar, uTiltGain, uCrossMid, uRowVar, uRowScale;
uniform vec4 uWave;         // amp, waves per H across (per turn in radial modes), drift, warp
uniform float uWaveSharp;
// interaction
uniform vec4 uPointer;      // pos (H units), velocity (H/s)
uniform vec4 uReact;        // stir, stirRadius, magnet, magnetRadius
uniform vec2 uPush;         // global push (wheel), H/s
uniform vec4 uBursts[4];    // pos, age (s), strength (0 = unused)
uniform float uCutPush;     // radiate outward from the cutout edge (x speed)
// Loop counts come from uniforms (always 2 / 4 / active bursts) so the D3D shader compiler on
// Windows can't unroll the loops and inline every copy of the noise code. Unrolled, this shader
// took ~19 s to compile the first time a visitor loaded the page.
uniform int uN2, uN4, uN5, uNBursts;
// Cutout: shape + mode come in as uniforms; its distance field (sd, outward normal) is baked into
// uCutTex whenever the shape changes, so the simulation reads it once instead of re-evaluating
// the shape ~15 times per cell per step.
uniform int uCutShape;
uniform vec4 uCutB;
uniform sampler2D uCutTex;
vec3 cutAt(vec2 s) {
	return textureLod(uCutTex, (s + uDomain.z) / uDomain.xy, 0.0).rgb;
}   // explicit LOD: no gradients needed inside loops

// Flow-aligned frame at s: d = distance downstream of the birth edge, c = position across it
// (in radial modes c is the angle in turns, -0.5..0.5).
void frame(vec2 s, out float d, out float c, out vec2 fd, out vec2 cd) {
	if(uMode == 0) {
		fd = uFlow;
		cd = vec2(uFlow.y, -uFlow.x);
		vec2 r = s - uOrigin;
		d = dot(r, fd);
		c = dot(r, cd);
	} else {
		vec2 r = s - uCenter;
		float l = max(length(r), 1e-4);
		vec2 n = r / l;
		fd = (uMode == 1) ? n : -n;
		cd = vec2(-n.y, n.x);
		d = (uMode == 1) ? l - uR0 : uR0 - l;
		c = atan(r.y, r.x) * 0.15915494;
	}
}
// Noise coordinates along the "across" direction, seamless around the circle in radial modes.
vec3 crossQ(float c, float scale, float z, float k) {
	if(uMode == 0)
		return vec3(c * scale, z, k);
	float a = 6.2831853 * c;
	return vec3(cos(a) * scale * 0.16, sin(a) * scale * 0.16, z + k);
}
float saw(float x) {
	return sin(x) + uWaveSharp * (0.5 * sin(2.0 * x) + 0.333 * sin(3.0 * x));
}
// 0 in the laminar zone -> 1 in the turbulent zone; the split wanders over space and time.
float rampFrom(float d, float splitNoise) {
	float split = uSplitVar * splitNoise;
	return smoothstep(uAmp.z + split, uAmp.w + split, d);
}
float zoneRamp(vec2 s, float t) {
	float d, c;
	vec2 fd, cd;
	frame(s, d, c, fd, cd);
	return rampFrom(d, snoise(crossQ(c, 0.6, t * 0.015, 11.0)));
}
vec2 velocity(vec2 s, float t) {
	float d, c;
	vec2 fd, cd;
	frame(s, d, c, fd, cd);
	vec3 q = (uMode == 0) ? vec3(c * uNoise.z, d * uNoise.z * uStretch, t * uNoise.w) : vec3(s * uNoise.z, t * uNoise.w);
	// all five noise lookups share one compiled copy of snoise
	float n0 = 0.0, n1 = 0.0, n2 = 0.0, n3 = 0.0, n4 = 0.0;
	for(int k = 0; k < uN5; k++) {
		vec3 p = (k == 0) ? crossQ(c, 0.6, t * 0.015, 11.0) : (k == 1) ? q : (k == 2) ? q + vec3(17.3, 9.1, 3.7) : (k == 3) ? crossQ(c, 0.5, t * 0.02, 3.0) : crossQ(c, uRowScale, t * 0.03, 23.0);
		float n = snoise(p);
		if(k == 0)
			n0 = n;
		else if(k == 1)
			n1 = n;
		else if(k == 2)
			n2 = n;
		else if(k == 3)
			n3 = n;
		else
			n4 = n;
	}
	float ramp = rampFrom(d, n0);
	float amp = mix(uAmp.x, uAmp.y, ramp);
	float nL = n1, nT = n2;
	float wph = 6.2831853 * (uWave.y * c - uWave.z * t) + uWave.w * n3;
	float wave = uWave.x * saw(wph);
	// exp() keeps the downstream speed positive: stagnation points grow bullseye rings.
	float along = uSpeed * (1.0 + uAccel * ramp) * exp(amp * (uNoise.x * nL + wave));
	along *= exp(uRowVar * n4);   // per-row speeds: streaks
	float across = uSpeed * (amp * uNoise.y * nT + uShear * ramp + uSwirl) + uCrossDrift;
	vec2 v = fd * along + cd * across;
	// pointer: stir (drag fluid along) and magnet (push away / pull in)
	vec2 pr = s - uPointer.xy;
	float pr2 = dot(pr, pr);
	v += uPointer.zw * uReact.x * exp(-pr2 / (uReact.y * uReact.y));
	v += uReact.z * 0.25 * pr / (sqrt(pr2) + 0.03) * exp(-pr2 / (uReact.w * uReact.w));
	v += uPush;
	// click bursts: an expanding ring that shoves the fluid outward
	for(int k = 0; k < uNBursts; k++) {
		vec4 B = uBursts[k];
		if(B.w <= 0.0)
			continue;
		vec2 br = s - B.xy;
		float r = length(br);
		float front = B.z * 0.3;
		v += B.w * 0.35 * br / (r + 1e-3) * exp(-(r - front) * (r - front) / 0.006) * exp(-B.z * 1.2);
	}
	// cutout: radiate away from its edge and/or act as an obstacle the flow slides around
	if(uCutShape > 0) {
		vec3 ct = cutAt(s);
		float sd = ct.r;
		vec2 n = ct.gb / max(length(ct.gb), 1e-5);
		if(uCutPush != 0.0)
			v += uCutPush * uSpeed * n * exp(-max(sd, 0.0) / 0.3);
		if(uCutB.w > 0.0) {
			float w = 1.0 - smoothstep(0.0, 0.06, sd);
			float vn = dot(v, n);
			if(vn < 0.0)
				v -= vn * n * w;
		}
	}
	return v;
}
