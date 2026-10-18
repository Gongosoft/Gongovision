uniform int uCutShape;      // 0 none, 1 diamond, 2 circle, 3 oval, 4 square, 5 rectangle, 6 hexagon, 7 star
uniform vec4 uCut;          // centre (H units), size, stretch
uniform vec4 uCutB;         // rotation (rad), softness, emitter, obstacle
float sdBox(vec2 p, vec2 b) {
	vec2 d = abs(p) - b;
	return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
float sdHex(vec2 p, float r) {
	const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
	p = abs(p);
	p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
	p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
	return length(p) * sign(p.y);
}
float sdStar5(vec2 p, float r, float rf) {
	const vec2 k1 = vec2(0.809016994375, -0.587785252292);
	const vec2 k2 = vec2(-k1.x, k1.y);
	p.x = abs(p.x);
	p -= 2.0 * max(dot(k1, p), 0.0) * k1;
	p -= 2.0 * max(dot(k2, p), 0.0) * k2;
	p.x = abs(p.x);
	p.y -= r;
	vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0, 1);
	float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
	return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
}
float cutSDF(vec2 s) {
	if(uCutShape == 0)
		return 1e3;
	vec2 p = s - uCut.xy;
	float a = uCutB.x;
	p = mat2(cos(a), sin(a), -sin(a), cos(a)) * p;
	float k = max(uCut.w, 0.05), r = uCut.z;
	vec2 q = p / vec2(k, 1.0);
	float d;
	if(uCutShape == 1)
		d = (abs(q.x) + abs(q.y) - r) * 0.70710678;
	else if(uCutShape == 2)
		d = length(q) - r;
	else if(uCutShape == 3)
		d = length(q / vec2(1.6, 1.0)) - r;
	else if(uCutShape == 4)
		d = sdBox(q, vec2(r));
	else if(uCutShape == 5)
		d = sdBox(q, vec2(r * 1.6, r * 0.8));
	else if(uCutShape == 6)
		d = sdHex(q, r);
	else
		d = sdStar5(vec2(q.x, -q.y), r, 0.45);
	return d * min(k, 1.0);
}
