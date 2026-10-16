// Analog video feedback background (WebGL2, no dependencies).
//
// Modelled on captures of a Panasonic WJ-AVE5 internal feedback loop. The mixer re-enters its
// own output every frame with a small spatial offset, so the picture behaves like a fluid
// flowing through the frame store: fresh stripes are "born" at an upstream edge and get
// sheared/folded further downstream. We simulate that as a scalar phase field that is
// advected (semi-Lagrangian) at low resolution, then map phase -> colour through a palette
// at full display resolution, so edges stay crisp.
//
// Stored field:  phi = theta + fInj * t   (theta = material phase, conserved along the flow)
// Only phi mod 1 is ever displayed, so sampling is done "circularly" (neighbours unwrapped to
// within half a cycle). That lets radial/spiral flows have a seam with an integer jump and lets
// the stored value wrap so it never grows.
import { PRESETS, PALETTES, BASE, registerPresets, resolvePreset } from './feedback-presets.js';

export { PRESETS, PALETTES, BASE, PRESET_INFO, registerPresets, resolvePreset, presetKeys } from './feedback-presets.js';

const VS = `#version 300 es
void main(){ vec2 p = vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2)); gl_Position = vec4(p*2.0-1.0,0.0,1.0); }`;

const NOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

// Circular bilinear interpolation of phase (values only matter mod 1). Done by hand so we
// don't need OES_texture_float_linear (missing on many phones).
const CIRC = `
float wrapd(float x){ return x-floor(x+0.5); }
float circMix4(float a, float b, float c, float d, vec2 f){
  b=a+wrapd(b-a); c=a+wrapd(c-a); d=a+wrapd(d-a);
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
float fetchPhi(highp sampler2D tex, vec2 st, ivec2 size){
  vec2 p=st-0.5; vec2 f=fract(p); ivec2 i=ivec2(floor(p)); ivec2 mx=size-1;
  return circMix4(texelFetch(tex,clamp(i,ivec2(0),mx),0).r, texelFetch(tex,clamp(i+ivec2(1,0),ivec2(0),mx),0).r,
                  texelFetch(tex,clamp(i+ivec2(0,1),ivec2(0),mx),0).r, texelFetch(tex,clamp(i+ivec2(1,1),ivec2(0),mx),0).r, f);
}`;

// Cutout shapes (the mixer's wipe pattern). Signed distance in H units, negative inside.
const SHAPES = `
uniform int uCutShape;      // 0 none, 1 diamond, 2 circle, 3 oval, 4 square, 5 rectangle, 6 hexagon, 7 star
uniform vec4 uCut;          // centre (H units), size, stretch
uniform vec4 uCutB;         // rotation (rad), softness, emitter, obstacle
float sdBox(vec2 p, vec2 b){ vec2 d=abs(p)-b; return length(max(d,0.0))+min(max(d.x,d.y),0.0); }
float sdHex(vec2 p, float r){
  const vec3 k=vec3(-0.866025404,0.5,0.577350269);
  p=abs(p); p-=2.0*min(dot(k.xy,p),0.0)*k.xy; p-=vec2(clamp(p.x,-k.z*r,k.z*r),r);
  return length(p)*sign(p.y);
}
float sdStar5(vec2 p, float r, float rf){
  const vec2 k1=vec2(0.809016994375,-0.587785252292); const vec2 k2=vec2(-k1.x,k1.y);
  p.x=abs(p.x); p-=2.0*max(dot(k1,p),0.0)*k1; p-=2.0*max(dot(k2,p),0.0)*k2; p.x=abs(p.x); p.y-=r;
  vec2 ba=rf*vec2(-k1.y,k1.x)-vec2(0,1); float h=clamp(dot(p,ba)/dot(ba,ba),0.0,r);
  return length(p-ba*h)*sign(p.y*ba.x-p.x*ba.y);
}
float cutSDF(vec2 s){
  if(uCutShape==0) return 1e3;
  vec2 p=s-uCut.xy; float a=uCutB.x; p=mat2(cos(a),sin(a),-sin(a),cos(a))*p;
  float k=max(uCut.w,0.05), r=uCut.z; vec2 q=p/vec2(k,1.0); float d;
  if(uCutShape==1) d=(abs(q.x)+abs(q.y)-r)*0.70710678;
  else if(uCutShape==2) d=length(q)-r;
  else if(uCutShape==3) d=length(q/vec2(1.6,1.0))-r;
  else if(uCutShape==4) d=sdBox(q,vec2(r));
  else if(uCutShape==5) d=sdBox(q,vec2(r*1.6,r*0.8));
  else if(uCutShape==6) d=sdHex(q,r);
  else d=sdStar5(vec2(q.x,-q.y),r,0.45);
  return d*min(k,1.0);
}`;

// Bakes the cutout's signed distance + outward normal at simulation resolution (RGBA16F).
const CUT_FS = `#version 300 es
precision highp float;
uniform vec2 uSimSize; uniform vec3 uDomain;
out vec4 o;
${SHAPES}
void main(){
  vec2 s=gl_FragCoord.xy/uSimSize*uDomain.xy-uDomain.z; const float e=0.004;
  vec2 n=vec2(cutSDF(s+vec2(e,0))-cutSDF(s-vec2(e,0)), cutSDF(s+vec2(0,e))-cutSDF(s-vec2(0,e)));
  o=vec4(cutSDF(s), n/max(length(n),1e-5), 1.0);
}`;

// Flow-field description. s = screen position in H units (x 0..aspect, y 0..1, y down).
const FLOW = `
uniform vec2 uSimSize; uniform float uAspect;
uniform vec3 uDomain;       // sim extent in H units (w, h) and the off-screen margin on every side
uniform int uMode;          // 0 straight, 1 radial out, 2 radial in
uniform vec2 uFlow; uniform vec2 uOrigin; uniform vec2 uCenter; uniform float uR0;
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
uniform int uCutShape; uniform vec4 uCutB; uniform sampler2D uCutTex;
vec3 cutAt(vec2 s){ return textureLod(uCutTex,(s+uDomain.z)/uDomain.xy,0.0).rgb; }   // explicit LOD: no gradients needed inside loops

// Flow-aligned frame at s: d = distance downstream of the birth edge, c = position across it
// (in radial modes c is the angle in turns, -0.5..0.5).
void frame(vec2 s, out float d, out float c, out vec2 fd, out vec2 cd){
  if(uMode==0){
    fd=uFlow; cd=vec2(uFlow.y,-uFlow.x); vec2 r=s-uOrigin; d=dot(r,fd); c=dot(r,cd);
  } else {
    vec2 r=s-uCenter; float l=max(length(r),1e-4); vec2 n=r/l;
    fd=(uMode==1)?n:-n; cd=vec2(-n.y,n.x);
    d=(uMode==1)?l-uR0:uR0-l; c=atan(r.y,r.x)*0.15915494;
  }
}
// Noise coordinates along the "across" direction, seamless around the circle in radial modes.
vec3 crossQ(float c, float scale, float z, float k){
  if(uMode==0) return vec3(c*scale, z, k);
  float a=6.2831853*c; return vec3(cos(a)*scale*0.16, sin(a)*scale*0.16, z+k);
}
float saw(float x){ return sin(x)+uWaveSharp*(0.5*sin(2.0*x)+0.333*sin(3.0*x)); }
// 0 in the laminar zone -> 1 in the turbulent zone; the split wanders over space and time.
float rampFrom(float d, float splitNoise){
  float split=uSplitVar*splitNoise;
  return smoothstep(uAmp.z+split,uAmp.w+split,d);
}
float zoneRamp(vec2 s, float t){
  float d,c; vec2 fd,cd; frame(s,d,c,fd,cd);
  return rampFrom(d,snoise(crossQ(c,0.6,t*0.015,11.0)));
}
vec2 velocity(vec2 s, float t){
  float d,c; vec2 fd,cd; frame(s,d,c,fd,cd);
  vec3 q=(uMode==0)?vec3(c*uNoise.z, d*uNoise.z*uStretch, t*uNoise.w):vec3(s*uNoise.z, t*uNoise.w);
  // all five noise lookups share one compiled copy of snoise
  float n0=0.0, n1=0.0, n2=0.0, n3=0.0, n4=0.0;
  for(int k=0;k<uN5;k++){
    vec3 p=(k==0)?crossQ(c,0.6,t*0.015,11.0):(k==1)?q:(k==2)?q+vec3(17.3,9.1,3.7)
          :(k==3)?crossQ(c,0.5,t*0.02,3.0):crossQ(c,uRowScale,t*0.03,23.0);
    float n=snoise(p);
    if(k==0) n0=n; else if(k==1) n1=n; else if(k==2) n2=n; else if(k==3) n3=n; else n4=n;
  }
  float ramp=rampFrom(d,n0);
  float amp=mix(uAmp.x,uAmp.y,ramp);
  float nL=n1, nT=n2;
  float wph=6.2831853*(uWave.y*c-uWave.z*t)+uWave.w*n3;
  float wave=uWave.x*saw(wph);
  // exp() keeps the downstream speed positive: stagnation points grow bullseye rings.
  float along=uSpeed*(1.0+uAccel*ramp)*exp(amp*(uNoise.x*nL+wave));
  along*=exp(uRowVar*n4);   // per-row speeds: streaks
  float across=uSpeed*(amp*uNoise.y*nT+uShear*ramp+uSwirl)+uCrossDrift;
  vec2 v=fd*along+cd*across;
  // pointer: stir (drag fluid along) and magnet (push away / pull in)
  vec2 pr=s-uPointer.xy; float pr2=dot(pr,pr);
  v+=uPointer.zw*uReact.x*exp(-pr2/(uReact.y*uReact.y));
  v+=uReact.z*0.25*pr/(sqrt(pr2)+0.03)*exp(-pr2/(uReact.w*uReact.w));
  v+=uPush;
  // click bursts: an expanding ring that shoves the fluid outward
  for(int k=0;k<uNBursts;k++){
    vec4 B=uBursts[k]; if(B.w<=0.0) continue;
    vec2 br=s-B.xy; float r=length(br); float front=B.z*0.3;
    v+=B.w*0.35*br/(r+1e-3)*exp(-(r-front)*(r-front)/0.006)*exp(-B.z*1.2);
  }
  // cutout: radiate away from its edge and/or act as an obstacle the flow slides around
  if(uCutShape>0){
    vec3 ct=cutAt(s); float sd=ct.r; vec2 n=ct.gb/max(length(ct.gb),1e-5);
    if(uCutPush!=0.0) v+=uCutPush*uSpeed*n*exp(-max(sd,0.0)/0.3);
    if(uCutB.w>0.0){
      float w=1.0-smoothstep(0.0,0.06,sd); float vn=dot(v,n);
      if(vn<0.0) v-=vn*n*w;
    }
  }
  return v;
}
`;

const SIM_FS = `#version 300 es
precision highp float; precision highp sampler2D;
uniform sampler2D uState; uniform float uTime, uDt, uDiffuse, uBurstKick;
uniform int uInit;          // 0 step, 1 start from the laminar solution, 2 resample uState from an old size
uniform vec3 uOldDomain; uniform vec2 uOldSize;
out vec4 o;
${NOISE}
${CIRC}
${FLOW}
vec2 toST(vec2 s){ return (s+uDomain.z)/uDomain.xy*uSimSize; }
vec2 toS(vec2 st){ return st/uSimSize*uDomain.xy-uDomain.z; }
// Undisturbed solution: fluid that crossed the birth edge at tc = t - d/speed (d < 0 means it
// hasn't arrived yet), plus the mean lean it picks up through the transition zone.
float laminarPhi(vec2 s, float t){
  float d,c; vec2 fd,cd; frame(s,d,c,fd,cd);
  float tc=t-d/max(uSpeed,1e-4);
  float wob=0.0, ramp=0.0;
  for(int k=0;k<uN2;k++){   // birth-edge wobble + zone ramp, one copy of snoise
    float n=snoise((k==0)?crossQ(c,uWob.y,tc*uWob.z,5.0):crossQ(c,0.6,t*0.015,11.0));
    if(k==0) wob=n; else ramp=rampFrom(d,n);
  }
  return uKc*c+uWob.x*wob+uFInj*(t-tc)+uTiltGain*(c-uCrossMid)*ramp;
}
// Texel lookup: upstream of the birth edge and outside the sim texture use the analytic field,
// so stripes keep being injected however small the per-step displacement is, and side inflow
// continues the pattern instead of smearing the edge.
float texelPhi(ivec2 i, ivec2 size, float t){
  vec2 s=toS(vec2(i)+0.5);
  float d,c; vec2 fd,cd; frame(s,d,c,fd,cd);
  if(uInit>0 || d<0.0 || any(lessThan(i,ivec2(0))) || any(greaterThanEqual(i,size))) return laminarPhi(s,t);
  if(uCutShape>0 && uCutB.z>0.0 && cutAt(s).r<0.0) return 0.0;
  return texelFetch(uState,i,0).r;
}
float samplePhi(vec2 st, ivec2 size, float t){
  vec2 p=st-0.5; vec2 f=fract(p); ivec2 i=ivec2(floor(p));
  float v0=0.0, v1=0.0, v2=0.0, v3=0.0;
  for(int k=0;k<uN4;k++){
    float v=texelPhi(i+ivec2(k&1,k>>1),size,t);
    if(k==0) v0=v; else if(k==1) v1=v; else if(k==2) v2=v; else v3=v;
  }
  return circMix4(v0,v1,v2,v3,f);
}
void main(){
  vec2 s=toS(gl_FragCoord.xy);
  ivec2 size=ivec2(uSimSize);
  if(uInit==2){   // window resized: carry the old field over (same H units)
    vec2 sto=(s+uOldDomain.z)/uOldDomain.xy*uOldSize;
    // newly exposed area: mirror the old field into it (continuous, no seam); the flow
    // reworks it within seconds
    vec2 L=uOldSize; sto=mod(sto,2.0*L); sto=mix(sto,2.0*L-sto,step(L,sto));
    o=vec4(fetchPhi(uState,sto,ivec2(uOldSize)),0,0,1); return;
  }
  if(uInit>0){ o=vec4(texelPhi(ivec2(gl_FragCoord.xy),size,uTime),0,0,1); return; }
  // RK2 back-trace (midpoint), as a loop so velocity() is compiled once
  vec2 v=vec2(0.0), q=s; float tq=uTime;
  for(int k=0;k<uN2;k++){ v=velocity(q,tq); q=s-0.5*uDt*v; tq=uTime-0.5*uDt; }
  vec2 b=s-uDt*v;
  float tPrev=uTime-uDt;
  vec2 st=toST(b);
  float phi=samplePhi(st,size,tPrev);
  if(uDiffuse>0.0){
    // plain neighbour texels (no ghost cells) are plenty for a little softening
    float avg=0.0;
    for(int k=0;k<uN4;k++){
      vec2 o=(k<2)?vec2(k==0?1.0:-1.0,0.0):vec2(0.0,k==2?1.0:-1.0);
      avg+=wrapd(fetchPhi(uState,st+o,size)-phi);
    }
    phi+=uDiffuse*0.25*avg;
  }
  // Progressive lean: fluid picks up a cross-flow phase gradient through the transition zone,
  // so bands lean lower down; turbulence then breaks them into S-hooks.
  // (accumulated along the flow, so sideways turbulence carries the lean around with it)
  if(uTiltGain!=0.0){
    float d,c; vec2 fd,cd; frame(s,d,c,fd,cd);
    float dr=0.0;
    for(int k=0;k<uN2;k++) dr+=(k==0)?zoneRamp(s,uTime):-zoneRamp(b,tPrev);
    phi+=uTiltGain*(c-uCrossMid)*dr;
  }
  // click bursts also drop a blob of fresh phase -> concentric rings that then get carried off
  for(int k=0;k<uNBursts;k++){
    vec4 B=uBursts[k]; if(B.w<=0.0) continue;
    vec2 br=s-B.xy;
    phi+=uBurstKick*B.w*exp(-dot(br,br)/0.004)*exp(-B.z*5.0)*5.0*uDt;
  }
  phi+=uFInj*uDt;
  // cutout as an emitter: the mixer shows other content inside the wipe, so its edge is a
  // second birth edge. Inside, the field is held still (theta keeps cycling with time).
  if(uCutB.z>0.0){
    float sd=cutAt(s).r;
    if(uCutShape>0 && sd<0.0) phi=mix(phi,phi+wrapd(-phi),smoothstep(0.0,-max(uCutB.y,1e-3),sd));
  }
  o=vec4(phi-256.0*floor(phi/256.0),0,0,1);   // wrap: only phi mod 1 is ever shown
}`;

const DISPLAY_FS = `#version 300 es
precision highp float; precision highp sampler2D;
uniform sampler2D uPrev, uCur, uLut, uLut2;
uniform vec2 uSimSize, uCanvas; uniform vec3 uDomain; uniform float uAspect;
uniform float uMorph;       // blend toward the second palette
uniform vec3 uHueField;     // hue shift across x, down y, and per successive stripe
uniform float uAlpha, uPhaseOffset, uHue, uGrain, uFrame;
uniform float uPosterize, uMosaic, uNegative, uChroma, uScan, uCurve, uVignette, uPalReps;
uniform int uMirror;
uniform float uContour, uHaze, uTimeD, uCutShow;
out vec4 o;
${CIRC}
${SHAPES}
// Hue rotation, same maths as the OBS "Hue Rotation" shader (SkeletonBow).
vec3 HUEtoRGB(float H){ return clamp(vec3(abs(H*6.0-3.0)-1.0, 2.0-abs(H*6.0-2.0), 2.0-abs(H*6.0-4.0)),0.0,1.0); }
vec3 RGBtoHCV(vec3 RGB){
  vec4 P=(RGB.g<RGB.b)?vec4(RGB.bg,-1.0,2.0/3.0):vec4(RGB.gb,0.0,-1.0/3.0);
  vec4 Q=(RGB.r<P.x)?vec4(P.xyw,RGB.r):vec4(RGB.r,P.yzx);
  float C=Q.x-min(Q.w,Q.y); float H=abs((Q.w-Q.y)/(6.0*C+1e-10)+Q.z);
  return vec3(H,C,Q.x);
}
vec3 hueRotate(vec3 c, float h){
  vec3 hcv=RGBtoHCV(c); float S=hcv.y/(hcv.z+1e-10);
  return ((HUEtoRGB(fract(hcv.x+h))-1.0)*S+1.0)*hcv.z;
}
float hash(vec2 p){ p=fract(p*vec2(443.897,441.423)); p+=dot(p,p.yx+19.19); return fract((p.x+p.y)*p.x); }
// screen uv (0..1, y down) -> phase 0..256: fract = position within a stripe, floor = which
// stripe (stable over time, since the stored field and the offset both wrap at 256)
float phaseRaw(vec2 uv){
  vec2 st=(uv*vec2(uAspect,1.0)+uDomain.z)/uDomain.xy*uSimSize; ivec2 size=ivec2(uSimSize);
  float a=fetchPhi(uPrev,st,size), b=fetchPhi(uCur,st,size);
  return mod(a+wrapd(b-a)*uAlpha-uPhaseOffset,256.0);
}
float stripePos(float raw){
  float th=fract(raw*uPalReps);
  if(uPosterize>0.0) th=(floor(th*uPosterize)+0.5)/uPosterize;
  return th;
}
float phaseAt(vec2 uv){ return stripePos(phaseRaw(uv)); }
vec3 lut(float th){ return mix(texture(uLut,vec2(th,0.5)).rgb,texture(uLut2,vec2(th,0.5)).rgb,uMorph); }
void main(){
  vec2 fc=gl_FragCoord.xy;
  if(uMosaic>0.0){ float px=max(1.0,uMosaic*uCanvas.y/1080.0); fc=(floor(fc/px)+0.5)*px; }
  vec2 uv=fc/uCanvas; uv.y=1.0-uv.y;
  float edge=1.0;
  if(uCurve>0.0){
    vec2 cc=uv*2.0-1.0; cc*=1.0+uCurve*dot(cc,cc)*0.25; uv=cc*0.5+0.5;
    vec2 e=smoothstep(vec2(0.0),vec2(0.01),uv)*smoothstep(vec2(0.0),vec2(0.01),1.0-uv); edge=e.x*e.y;
  }
  if(uScan>0.0){
    float line=floor(fc.y/2.0);
    uv.x+=uScan*0.004*(hash(vec2(line,floor(uFrame/2.0)))-0.5)*step(0.92,hash(vec2(floor(uFrame/3.0),floor(line/24.0))));
  }
  if(uHaze>0.0){   // heat haze: the image shimmers sideways in bands
    uv.x+=uHaze*0.005*sin(uv.y*38.0+uTimeD*2.3+sin(uv.x*9.0+uTimeD*0.7)*2.0);
    uv.y+=uHaze*0.003*sin(uv.x*27.0-uTimeD*1.7);
  }
  vec2 suv=uv;     // screen position for the cutout, before mirroring
  if(uMirror>0){
    if(uMirror==3){
      vec2 p=(uv-0.5)*vec2(uAspect,1.0); float r=length(p), a=atan(p.y,p.x);
      float seg=6.2831853/6.0; a=mod(a,seg); a=abs(a-seg*0.5);
      uv=vec2(cos(a),sin(a))*r/vec2(uAspect,1.0)+0.5;
    } else {
      uv.x=0.5-abs(uv.x-0.5);
      if(uMirror==2) uv.y=0.5-abs(uv.y-0.5);
    }
  }
  vec3 col;
  float raw=phaseRaw(uv);
  if(uChroma>0.0){
    vec2 dx=vec2(uChroma*0.004,0.0);
    col=vec3(lut(phaseAt(uv+dx)).r, lut(stripePos(raw)).g, lut(phaseAt(uv-dx*1.5)).b);
  } else col=lut(stripePos(raw));
  if(uContour!=0.0){   // thin lines along stripe boundaries (bright if > 0, dark if < 0)
    float f=fract(raw*uPalReps), w=max(fwidth(raw*uPalReps),1e-4);
    float line=1.0-smoothstep(w*0.6,w*1.8,min(f,1.0-f));
    col=mix(col, uContour>0.0?vec3(1.0):vec3(0.0), abs(uContour)*line);
  }
  if(uNegative>0.0) col=mix(col,1.0-col,uNegative);
  float hue=uHue+uHueField.x*uv.x+uHueField.y*uv.y+uHueField.z*floor(raw);
  if(hue!=0.0) col=hueRotate(col,fract(hue));
  if(uScan>0.0) col*=1.0-uScan*0.35*step(1.0,mod(fc.y,3.0));
  if(uVignette>0.0){ vec2 q=uv-0.5; col*=1.0-uVignette*dot(q,q)*2.2; }
  col*=edge;
  if(uCutShow>0.0 && uCutShape>0){
    float sd=cutSDF(suv*vec2(uAspect,1.0)); float px=1.5/uCanvas.y;
    col=mix(col,vec3(0.075),uCutShow*(1.0-smoothstep(-px,px,sd)));
  }
  col+=(hash(fc+uFrame*1.618)-0.5)*uGrain;
  o=vec4(col,1.0);
}`;

// ---- post chain: trails (echo), blur, glow --------------------------------------------------
const POST_HEAD = `#version 300 es
precision highp float;
uniform vec2 uOut;          // output size in pixels
out vec4 o;
vec2 uv(){ return gl_FragCoord.xy/uOut; }`;
// echo: the previous output lingers and fades (max keeps bright stripes from smearing to grey)
const TRAIL_FS = `${POST_HEAD}
uniform sampler2D uCur, uPrev; uniform float uTrail;
void main(){ vec3 c=texture(uCur,uv()).rgb, p=texture(uPrev,uv()).rgb*uTrail; o=vec4(max(c,p),1.0); }`;
// 4-tap box downsample
const DOWN_FS = `${POST_HEAD}
uniform sampler2D uTex; uniform vec2 uSrcTexel;
void main(){ vec2 h=uSrcTexel; vec2 p=uv();
  o=0.25*(texture(uTex,p+vec2(-h.x,-h.y))+texture(uTex,p+vec2(h.x,-h.y))+texture(uTex,p+vec2(-h.x,h.y))+texture(uTex,p+vec2(h.x,h.y))); }`;
// 9-tap gaussian in 5 bilinear fetches
const BLUR_FS = `${POST_HEAD}
uniform sampler2D uTex; uniform vec2 uDir;
void main(){ vec2 p=uv();
  o=texture(uTex,p)*0.227027+(texture(uTex,p+uDir*1.384615)+texture(uTex,p-uDir*1.384615))*0.316216
   +(texture(uTex,p+uDir*3.230769)+texture(uTex,p-uDir*3.230769))*0.070270; }`;
// glow = tight blur of the bright parts; bloom = wide halo from three smaller blur levels
const FINAL_FS = `${POST_HEAD}
uniform sampler2D uSrc, uBl, uM1, uM2, uM3, uSnap; uniform float uGlow, uBlur, uHasBl, uBloom, uThresh, uSnapMix;
vec3 bright(vec3 b){ return b*smoothstep(uThresh,uThresh+0.35,max(b.r,max(b.g,b.b))); }
void main(){
  vec3 c=texture(uSrc,uv()).rgb;
  if(uHasBl>0.0){
    vec3 b=texture(uBl,uv()).rgb;
    c=mix(c,b,uBlur);
    vec3 g=bright(b)*uGlow*1.6;
    if(uBloom>0.0){
      vec3 w=texture(uM1,uv()).rgb*0.45+texture(uM2,uv()).rgb*0.33+texture(uM3,uv()).rgb*0.22;
      g+=bright(w)*uBloom*2.4;
    }
    c=1.0-(1.0-c)*(1.0-clamp(g,0.0,1.0));   // screen blend
  }
  c=mix(texture(uSnap,uv()).rgb,c,uSnapMix);   // crossfade from the previous preset's last frame
  o=vec4(c,1.0);
}`;

// Programs are created without asking for their status, so with KHR_parallel_shader_compile the
// driver compiles them in the background (on Windows, translating big shaders to D3D is slow).
function program(gl, fs) {
  const p = gl.createProgram();
  const vsh = gl.createShader(gl.VERTEX_SHADER), fsh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(vsh, VS); gl.compileShader(vsh);
  gl.shaderSource(fsh, fs); gl.compileShader(fsh);
  gl.attachShader(p, vsh); gl.attachShader(p, fsh);
  gl.linkProgram(p);
  return { p, vsh, fsh, u: null };
}
function finishProgram(gl, prog) {
  const p = prog.p;
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(gl.getShaderInfoLog(prog.fsh) || gl.getShaderInfoLog(prog.vsh) || gl.getProgramInfoLog(p));
  }
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    u[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name);
  }
  prog.u = u;
}

const SIM_HZ = 60;
const WARMUP = 24;        // seconds of simulation run before the first reveal, so turbulence has formed
const WARM_DT = 1 / 10;   // big steps while warming up (semi-Lagrangian stays stable)
const FADE_TIME = 0.6;    // seconds for the crossfade between presets
const QUALITY = [1, 0.85, 0.72, 0.6, 0.5];   // adaptive quality levels (grid + output scale)
const MARGIN = 0.1;   // simulate this far (in H) past each screen edge so edge effects stay off-screen

export class FeedbackBackground {
  constructor(canvas, { preset = '01', params = {}, maxPixels = 1920 * 1200, seed = null } = {}) {
    this.canvas = canvas;
    this.seed = seed;
    this.params = { ...BASE, ...(PRESETS[resolvePreset(preset)] || PRESETS['01']), ...params };
    this.maxPixels = maxPixels;
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
    if (!gl) throw new Error('WebGL2 unavailable');
    if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('float render targets unavailable');
    this.gl = gl;
    this.parallel = gl.getExtension('KHR_parallel_shader_compile');
    this.sim = program(gl, SIM_FS);
    this.display = program(gl, DISPLAY_FS);
    this.post = { trail: program(gl, TRAIL_FS), down: program(gl, DOWN_FS), blur: program(gl, BLUR_FS), final: program(gl, FINAL_FS) };
    this.cutProg = program(gl, CUT_FS);
    this.cutTex = null; this.cutKey = '';
    this.fade = null;          // preset crossfade: { t } while fading in, after a hidden warm-up
    this.qIndex = 0; this.quality = 1;   // adaptive quality level (see _adapt)
    this.perf = { ema: 0, min: 1, slow: 0, fast: 0, cool: 2 };
    this.ready = false;       // shaders compiled + field allocated
    this.warmLeft = 0;        // seconds of warm-up still to run (spread over frames)
    this.revealed = false;    // canvas stays transparent until the first warm-up is done
    this.warmSteps = 6;       // warm-up steps per frame, adapted to how fast the device is
    canvas.style.opacity = '0';
    canvas.style.transition = 'opacity 0.8s ease';
    this.targets = null;
    this.vao = gl.createVertexArray();
    this.lut = this._makeLut(PALETTES[this.params.palette] || PALETTES.cyan);
    this.lut2 = this._makeLut(PALETTES[this.params.palette2] || PALETTES.cyan);
    this.simTime = 0; this.acc = 0; this.frame = 0; this.running = false; this.lastShown = -1;
    this.state = null;
    // interaction state
    this.pointer = { x: -10, y: -10, vx: 0, vy: 0, t: 0, activity: 0 };
    this.push = { x: 0, y: 0 };
    this.bursts = [];
    this.hueKick = 0;
    this.audio = null; this.audioLevel = 0; this.audioBass = 0;
    this._onFrame = this._onFrame.bind(this);
    this._ro = new ResizeObserver(() => this.ready && this._resize());
    this._ro.observe(canvas);
    if (!this.parallel) this._finishInit();
  }

  _programs() { return [this.sim, this.display, this.cutProg, ...Object.values(this.post)]; }
  // true once every shader has finished compiling (never blocks when the extension exists)
  _compiled() {
    if (!this.parallel) return true;
    return this._programs().every((pr) => this.gl.getProgramParameter(pr.p, this.parallel.COMPLETION_STATUS_KHR));
  }
  _finishInit() {
    if (this.ready) return;
    for (const pr of this._programs()) finishProgram(this.gl, pr);
    this.ready = true;
    this._resize(true);
  }
  // Resolves when the shaders are in and the field exists (warm-up may still be running).
  whenReady() {
    return new Promise((resolve) => {
      const check = () => {
        if (!this.ready && this._compiled()) this._finishInit();
        this.ready ? resolve() : setTimeout(check, 16);
      };
      check();
    });
  }
  // Run any remaining warm-up right now (blocking). For captures/tests.
  finishWarmup() {
    while (this.warmLeft > 0) { this._step(WARM_DT); this.warmLeft -= WARM_DT; }
    this._step(1 / SIM_HZ);
  }

  setParams(p) {
    const rebuild = 'simLines' in p && p.simLines !== this.params.simLines;
    const newPalette = 'palette' in p && p.palette !== this.params.palette;
    const newPalette2 = 'palette2' in p && p.palette2 !== this.params.palette2;
    Object.assign(this.params, p);
    if (newPalette) {
      this.gl.deleteTexture(this.lut);
      this.lut = this._makeLut(PALETTES[this.params.palette] || PALETTES.cyan);
    }
    if (newPalette2) {
      this.gl.deleteTexture(this.lut2);
      this.lut2 = this._makeLut(PALETTES[this.params.palette2] || PALETTES.cyan);
    }
    if (rebuild) this._resize();
  }

  // Fade from what's on screen now to a new look: the current frame is frozen while the new one
  // warms up out of sight, then it crossfades in.
  switchTo(params) {
    if (!this.ready || !this.revealed) { this.setParams(params); this.reset(); return; }
    this._snapshot();
    this.setParams(params);
    this._resize(true);
    this.fade = { t: 0 };
  }

  start() { if (!this.running) { this.running = true; this.last = performance.now(); requestAnimationFrame(this._onFrame); } }
  stop() { this.running = false; }
  destroy() {
    this.stop(); this._ro.disconnect(); this.detachInput(); this.audio?.stop();
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
  // Restart the field (with a crossfade once the page is showing).
  reset() {
    if (!this.ready) return;
    if (!this.revealed) { this._resize(true); return; }
    this._snapshot();
    this._resize(true);
    this.fade = { t: 0 };
  }

  // ---- interaction ---------------------------------------------------------------------------
  // Listens on window (the canvas sits behind the page). Only has an effect when the active
  // params turn a reactive feature on.
  attachInput(target = window) {
    if (this._input) return;
    const toS = (e) => {
      const r = this.canvas.getBoundingClientRect();
      return [(e.clientX - r.left) / r.height, (e.clientY - r.top) / r.height];
    };
    const move = (e) => {
      const [x, y] = toS(e), now = performance.now() / 1000, p = this.pointer;
      const dt = Math.max(now - p.t, 1 / 240);
      if (p.t && now - p.t < 0.2) {
        const k = Math.min(1, dt * 20);
        p.vx += ((x - p.x) / dt - p.vx) * k; p.vy += ((y - p.y) / dt - p.vy) * k;
        const sp = Math.hypot(p.vx, p.vy), max = 3;   // cap so a fast flick doesn't tear the field
        if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }
      }
      p.x = x; p.y = y; p.t = now;
    };
    const down = (e) => {
      const [x, y] = toS(e);
      this.addBurst(x, y, 1);
    };
    const wheel = (e) => {
      const h = this.canvas.getBoundingClientRect().height || 1;
      const dy = (e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY) / h;
      this.push.y -= dy * 1.5; this.push.x -= ((e.deltaMode === 1 ? e.deltaX * 16 : e.deltaX) / h) * 1.5;
    };
    const leave = () => { this.pointer.x = this.pointer.y = -10; };
    target.addEventListener('pointermove', move, { passive: true });
    target.addEventListener('pointerdown', down, { passive: true });
    target.addEventListener('wheel', wheel, { passive: true });
    document.documentElement.addEventListener('mouseleave', leave);
    this._input = { target, move, down, wheel, leave };
  }
  detachInput() {
    const i = this._input; if (!i) return;
    i.target.removeEventListener('pointermove', i.move);
    i.target.removeEventListener('pointerdown', i.down);
    i.target.removeEventListener('wheel', i.wheel);
    document.documentElement.removeEventListener('mouseleave', i.leave);
    this._input = null;
  }
  addBurst(x, y, strength) {
    this.bursts.push({ x, y, age: 0, strength });
    if (this.bursts.length > 4) this.bursts.shift();
  }
  // Mic input (asks for permission). Resolves to true when listening.
  // source: 'mic' or 'desktop' (screen/tab share with audio)
  async enableAudio(source = 'mic') {
    this.disableAudio();
    const { startAudio } = await import('./feedback-audio.js');
    this.audio = await startAudio(source);
    return true;
  }
  disableAudio() { this.audio?.stop(); this.audio = null; this.audioLevel = this.audioBass = 0; }

  // Audio slider response: gentle at 1, about three times stronger at the max (3).
  _audioGain() { const a = this.params.audio; return a * (1 + 2 * (a / 3) ** 2); }

  _updateInput(dt) {
    const P = this.params, on = P.reactive;
    const p = this.pointer;
    const decay = Math.exp(-dt * 6);
    p.vx *= decay; p.vy *= decay;
    // pointer activity 0..1 (fast-ish attack, slow release)
    const sp = Math.min(1, Math.hypot(p.vx, p.vy) / 1.5);
    p.activity += (sp - p.activity) * (sp > p.activity ? Math.min(1, dt * 4) : Math.min(1, dt * 0.5));
    const pd = Math.exp(-dt * 2.5);
    this.push.x *= pd; this.push.y *= pd;
    for (const b of this.bursts) b.age += dt;
    this.bursts = this.bursts.filter((b) => b.age < 3);
    if (this.audio?.ended) this.disableAudio();
    if (this.audio && on && P.audio > 0) {
      const a = this.audio.read();
      this.audioLevel += (a.level - this.audioLevel) * Math.min(1, dt * 10);
      this.audioBass += (a.bass - this.audioBass) * Math.min(1, dt * 12);
      if (a.beat) {
        const g = this._audioGain();
        this.addBurst(Math.random() * this.aspect, Math.random(), Math.min(3, 0.8 * g));
        this.hueKick += Math.min(0.25, 0.06 * g);
      }
    } else { this.audioLevel *= decay; this.audioBass *= decay; }
  }

  // ---- GL plumbing ----------------------------------------------------------------------------
  _makeLut(data) {
    const gl = this.gl, n = data.length / 3, px = new Uint8Array(n * 4);
    for (let i = 0; i < n; i++) { px.set(data.slice(i * 3, i * 3 + 3), i * 4); px[i * 4 + 3] = 255; }
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, n, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  _makeTarget(w, h) {
    const gl = this.gl, tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, w, h, 0, gl.RED, gl.FLOAT, null);
    for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fbo };
  }

  _resize(force = false) {
    // Output: device pixels capped at 2x (the image is soft anyway) and at maxPixels, both scaled
    // down further by the adaptive quality level.
    const c = this.canvas, dpr = Math.min(window.devicePixelRatio || 1, 2), q = this.quality;
    const cw = Math.max(1, c.clientWidth), ch = Math.max(1, c.clientHeight);
    let w = Math.round(cw * dpr), h = Math.round(ch * dpr);
    const scale = Math.min(1, Math.sqrt(this.maxPixels * q * q / (w * h)));
    c.width = Math.round(w * scale); c.height = Math.round(h * scale);
    this.aspect = cw / ch;

    // Simulation grid: height from simLines, width from the aspect ratio, but never more cells than
    // a 16:9 screen would need (wide phones in landscape would otherwise cost ~4x more).
    let simH = Math.round(this.params.simLines * q * (1 + 2 * MARGIN));
    let simW = Math.max(16, Math.round(simH * (this.aspect + 2 * MARGIN) / (1 + 2 * MARGIN)));
    const maxCells = simH * simH * (16 / 9 + 2 * MARGIN) / (1 + 2 * MARGIN);
    if (simW * simH > maxCells) {
      const k = Math.sqrt(maxCells / (simW * simH));
      simW = Math.max(16, Math.round(simW * k)); simH = Math.max(16, Math.round(simH * k));
    }
    if (!force && this.state && Math.abs(simW - this.simW) / this.simW < 0.08 && simH === this.simH) return;
    const fresh = !this.state;
    // A plain window resize carries the current field over; a forced rebuild (restart, new
    // resolution) starts again from the laminar solution and re-runs the warm-up.
    const old = !force && this.state ? { state: this.state, w: this.simW, h: this.simH, aspect: this.simAspect } : null;
    if (this.state && !old) for (const t of this.state) { this.gl.deleteTexture(t.tex); this.gl.deleteFramebuffer(t.fbo); }
    this.simW = simW; this.simH = simH; this.simAspect = this.aspect;
    this.state = [this._makeTarget(simW, simH), this._makeTarget(simW, simH)];
    if (fresh) {
      this.simTime = 1000 + (this.seed ?? Math.random() * 1000) % 1000;   // start point in the noise
      this.clock = this.simTime;   // display clock (hue, morph, haze): only ever moves with real time
      this.clock0 = this.clock;    // hue cycling starts from the palette's own colours
    }
    if (old) {
      this._step(0, 2, old);
      for (const t of old.state) { this.gl.deleteTexture(t.tex); this.gl.deleteFramebuffer(t.fbo); }
      this._step(1 / SIM_HZ);
      return;
    }
    this._step(0, 1);
    this._step(1 / SIM_HZ);
    this.warmLeft = WARMUP;
  }

  // One frame's share of the warm-up. The step count adapts to the frame time so slow devices
  // stay responsive and fast ones finish in a few frames.
  _warmFrame(frameDt) {
    // back off before frames get long, so the page stays responsive on slow devices
    if (frameDt > 0.034) this.warmSteps = Math.max(1, Math.floor(this.warmSteps * 0.6));
    else if (frameDt < 0.022) this.warmSteps = Math.min(48, this.warmSteps + 3);
    for (let i = 0; i < this.warmSteps && this.warmLeft > 0; i++) { this._step(WARM_DT); this.warmLeft -= WARM_DT; }
    if (this.warmLeft <= 0) this._step(1 / SIM_HZ);   // leave prev/cur one real step apart
  }

  // Slow, smooth wander in [-1, 1] (three incommensurate sines per channel).
  _lfo(i, t) {
    const r = this.params.varyRate;
    return (Math.sin(t * r * 0.071 + i * 1.7) + Math.sin(t * r * 0.0313 + i * 4.1) * 0.7
          + Math.sin(t * r * 0.0177 + i * 2.3) * 0.5) / 2.2;
  }

  // Params with the slow "vary" drift and the reactive/audio modulation applied.
  _effective() {
    const P = this.params, v = P.vary, t = this.simTime;
    const E = { ...P };
    if (v) {
      const shift = 0.08 * v * this._lfo(3, t);
      E.tiltGain *= 1 + 0.35 * v * this._lfo(0, t);
      E.accel *= 1 + 0.3 * v * this._lfo(1, t);
      E.transAmp *= 1 + 0.4 * v * this._lfo(2, t);
      E.longAmp *= 1 + 0.4 * v * this._lfo(4, t);
      E.ampFrom += shift; E.ampTo += shift;
    }
    if (P.reactive) {
      const g = this._audioGain();
      const boost = Math.min(6, 1 + P.energy * 2 * this.pointer.activity + g * 2.5 * this.audioBass);
      E.transAmp *= boost; E.longAmp *= boost;
      E.speed *= Math.min(4, 1 + g * 1.2 * this.audioLevel);
    }
    return E;
  }

  _uniformsFlow(prog, E) {
    const gl = this.gl, u = prog.u, radial = E.flowMode > 0;
    const a = E.flowAngle * Math.PI / 180, fx = Math.cos(a), fy = Math.sin(a);
    // straight mode: birth edge passes through the screen corner that's furthest upstream
    const ox = fx < -1e-3 ? this.aspect : 0, oy = fy < -1e-3 ? 1 : 0;
    const cx = this.aspect / 2, cy = 0.5;
    const r0 = E.flowMode === 2 ? Math.hypot(cx, cy) + MARGIN + E.r0 : E.r0;
    // radial: whole numbers of stripes/waves/lean per turn so the seam disappears
    const kc = E.tilt / E.stripePeriod;
    gl.uniform2f(u.uSimSize, this.simW, this.simH);
    gl.uniform1f(u.uAspect, this.aspect);
    gl.uniform3f(u.uDomain, this.aspect + 2 * MARGIN, 1 + 2 * MARGIN, MARGIN);
    gl.uniform1i(u.uMode, E.flowMode | 0);
    gl.uniform2f(u.uFlow, fx, fy);
    gl.uniform2f(u.uOrigin, ox, oy);
    gl.uniform2f(u.uCenter, cx, cy);
    gl.uniform1f(u.uR0, r0);
    gl.uniform1f(u.uSpeed, E.speed);
    gl.uniform1f(u.uFInj, E.speed / E.stripePeriod);
    gl.uniform1f(u.uKc, radial ? Math.round(kc) : kc);
    gl.uniform1f(u.uSwirl, E.swirl);
    gl.uniform3f(u.uWob, E.wobAmp, E.wobScale, E.wobRate);
    gl.uniform4f(u.uAmp, E.ampStart, E.ampEnd, E.ampFrom, E.ampTo);
    gl.uniform4f(u.uNoise, E.longAmp, E.transAmp, E.noiseScale, E.noiseRate);
    gl.uniform1f(u.uStretch, E.noiseStretch);
    gl.uniform1f(u.uCrossDrift, E.crossDrift);
    gl.uniform1f(u.uAccel, E.accel);
    gl.uniform1f(u.uShear, E.shear);
    gl.uniform1f(u.uSplitVar, E.splitVar);
    // radial modes get their spirals from shear instead (a phase lean would leave a seam)
    gl.uniform1f(u.uTiltGain, radial ? 0 : E.tiltGain);
    gl.uniform1f(u.uRowVar, E.rowVar);
    gl.uniform1f(u.uRowScale, E.rowScale);
    // lean is measured from the middle of the birth edge so neither side gets an outsized gradient
    const crossLen = Math.abs(fx) * 1 + Math.abs(fy) * this.aspect;
    gl.uniform1f(u.uCrossMid, radial ? 0 : 0.5 * crossLen);
    const wf = radial ? Math.round(E.waveFreq) : E.waveFreq;
    gl.uniform4f(u.uWave, E.waveAmp, wf, E.waveDrift * wf, E.waveWarp);
    gl.uniform1f(u.uWaveSharp, E.waveSharp);
    // interaction
    const R = E.reactive ? 1 : 0, p = this.pointer;
    gl.uniform4f(u.uPointer, p.x, p.y, p.vx, p.vy);
    gl.uniform4f(u.uReact, R * E.stir, E.stirRadius, R * E.magnet, E.magnetRadius);
    gl.uniform2f(u.uPush, R * E.wheel * this.push.x, R * E.wheel * this.push.y);
    const bs = new Float32Array(16);
    if (R) this.bursts.forEach((b, i) => bs.set([b.x, b.y, b.age, b.strength * Math.max(E.burst, E.audio ? 0.8 : 0)], i * 4));
    gl.uniform4fv(u.uBursts, bs);
    gl.uniform1i(u.uN2, 2); gl.uniform1i(u.uN4, 4); gl.uniform1i(u.uN5, 5);
    gl.uniform1i(u.uNBursts, R ? this.bursts.length : 0);
    this._uniformsCut(u, E);
    gl.uniform1f(u.uCutPush, E.cutout && (E.cutoutMode & 1) ? E.cutoutPush : 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.cutTex ? this.cutTex.tex : null);
    gl.uniform1i(u.uCutTex, 1);
  }

  _uniformsCut(u, E) {
    const gl = this.gl, mode = E.cutoutMode | 0;
    gl.uniform1i(u.uCutShape, E.cutout | 0);
    gl.uniform4f(u.uCut, this.aspect / 2 + E.cutoutX, 0.5 + E.cutoutY, E.cutoutSize, E.cutoutStretch);
    gl.uniform4f(u.uCutB, E.cutoutRotate * Math.PI / 180, E.cutoutSoft, mode & 1 ? 1 : 0, mode & 2 ? 1 : 0);
  }

  // Re-bake the cutout distance field when the shape, its settings or the grid change.
  _bakeCutout(E) {
    const key = [E.cutout, E.cutoutSize, E.cutoutStretch, E.cutoutRotate, E.cutoutX, E.cutoutY, this.aspect, this.simW, this.simH].join();
    if (!(E.cutout > 0) || key === this.cutKey) return;
    const gl = this.gl;
    if (!this.cutTex || this.cutTex.w !== this.simW || this.cutTex.h !== this.simH) {
      if (this.cutTex) { gl.deleteTexture(this.cutTex.tex); gl.deleteFramebuffer(this.cutTex.fbo); }
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, this.simW, this.simH, 0, gl.RGBA, gl.HALF_FLOAT, null);
      for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR);
      for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      this.cutTex = { tex, fbo, w: this.simW, h: this.simH };
    }
    const u = this.cutProg.u;
    gl.useProgram(this.cutProg.p);
    gl.bindVertexArray(this.vao);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.cutTex.fbo);
    gl.viewport(0, 0, this.simW, this.simH);
    gl.uniform2f(u.uSimSize, this.simW, this.simH);
    gl.uniform3f(u.uDomain, this.aspect + 2 * MARGIN, 1 + 2 * MARGIN, MARGIN);
    this._uniformsCut(u, E);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.cutKey = key;
  }

  // init: 0 = normal step, 1 = laminar start, 2 = resample `old` ({ state, w, h, aspect })
  _step(dt, init = 0, old = null) {
    const gl = this.gl, s = this.sim;
    this.simTime += dt;
    const E = this._effective();
    this._bakeCutout(E);
    this.fInj = E.speed / E.stripePeriod;
    const [src, dst] = this.state;
    gl.useProgram(s.p);
    gl.bindVertexArray(this.vao);
    this._uniformsFlow(s, E);
    gl.uniform1f(s.u.uTime, this.simTime);
    gl.uniform1f(s.u.uDt, dt);
    gl.uniform1f(s.u.uDiffuse, E.diffuse);
    gl.uniform1f(s.u.uBurstKick, 1.2);
    gl.uniform1i(s.u.uInit, init | 0);
    if (old) {
      gl.uniform3f(s.u.uOldDomain, old.aspect + 2 * MARGIN, 1 + 2 * MARGIN, MARGIN);
      gl.uniform2f(s.u.uOldSize, old.w, old.h);
    }
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, old ? old.state[0].tex : src.tex);
    gl.uniform1i(s.u.uState, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
    gl.viewport(0, 0, this.simW, this.simH);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.state = [dst, src];
    this.lastDt = dt;
    // theta = phi - fInj * t; the offset is accumulated on the CPU in double precision so it
    // stays right when speed/stripePeriod change on the fly.
    if (init === 1) this.phaseOffset = this.fInj * this.simTime;
    else this.phaseOffset += this.fInj * dt;
  }

  // RGBA8 colour targets for the post chain, (re)made when the canvas size changes.
  _colorTarget(w, h) {
    const gl = this.gl, tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR);
    for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fbo, w, h };
  }
  _ensureTargets() {
    const w = this.canvas.width, h = this.canvas.height, T = this.targets;
    if (T && T.w === w && T.h === h) return T;
    if (T) for (const t of [T.scene, T.snap, ...T.out, ...T.q, ...T.mips.flat()]) { this.gl.deleteTexture(t.tex); this.gl.deleteFramebuffer(t.fbo); }
    const qw = Math.max(1, w >> 2), qh = Math.max(1, h >> 2);
    const pair = (sh) => [this._colorTarget(Math.max(1, w >> sh), Math.max(1, h >> sh)), this._colorTarget(Math.max(1, w >> sh), Math.max(1, h >> sh))];
    this.targets = {
      w, h, cur: 0,
      scene: this._colorTarget(w, h),
      snap: this._colorTarget(w, h),   // last frame of the previous look, for crossfades
      out: [this._colorTarget(w, h), this._colorTarget(w, h)],
      q: [this._colorTarget(qw, qh), this._colorTarget(qw, qh)],
      mips: [pair(3), pair(4), pair(5)],   // 1/8, 1/16, 1/32 for bloom
    };
    return this.targets;
  }
  _pass(prog, target, setup) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fbo : null);
    const w = target ? target.w : this.canvas.width, h = target ? target.h : this.canvas.height;
    gl.viewport(0, 0, w, h);
    gl.useProgram(prog.p);
    gl.uniform2f(prog.u.uOut, w, h);
    setup(prog.u);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  _bind(unit, tex, loc) { const gl = this.gl; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(loc, unit); }

  // out: a colour target to render into instead of the screen (used for the crossfade snapshot)
  _render(out = null) {
    const gl = this.gl, d = this.display, P = this.params;
    const [cur, prev] = this.state;
    const alpha = Math.min(1, this.acc * SIM_HZ);
    const tDisplay = this.clock;
    const off = this.phaseOffset - this.fInj * this.lastDt * (1 - alpha);
    const post = P.glow > 0 || P.blur > 0 || P.trails > 0 || P.bloom > 0 || !!out || !!this.fade;
    const T = post ? this._ensureTargets() : null;
    gl.bindFramebuffer(gl.FRAMEBUFFER, post ? T.scene.fbo : null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(d.p);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, prev.tex); gl.uniform1i(d.u.uPrev, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, cur.tex); gl.uniform1i(d.u.uCur, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.lut); gl.uniform1i(d.u.uLut, 2);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, this.lut2); gl.uniform1i(d.u.uLut2, 3);
    const m = P.morphRate > 0 ? P.morph * (0.5 - 0.5 * Math.cos(2 * Math.PI * tDisplay * P.morphRate)) : P.morph;
    gl.uniform1f(d.u.uMorph, m);
    gl.uniform3f(d.u.uHueField, P.hueSpreadX, P.hueSpreadY, P.stripeHue);
    gl.uniform2f(d.u.uSimSize, this.simW, this.simH);
    gl.uniform1f(d.u.uAspect, this.aspect);
    gl.uniform3f(d.u.uDomain, this.aspect + 2 * MARGIN, 1 + 2 * MARGIN, MARGIN);
    gl.uniform2f(d.u.uCanvas, this.canvas.width, this.canvas.height);
    gl.uniform1f(d.u.uAlpha, alpha);
    gl.uniform1f(d.u.uPhaseOffset, ((off % 256) + 256) % 256);
    const hue = (((tDisplay - this.clock0) * P.hueSpeed * 0.01 + P.hueOffset + this.hueKick) % 1 + 1) % 1;
    gl.uniform1f(d.u.uHue, hue);
    gl.uniform1f(d.u.uGrain, P.grain);
    gl.uniform1f(d.u.uFrame, this.frame++ % 1000);
    gl.uniform1f(d.u.uPosterize, P.posterize);
    gl.uniform1f(d.u.uMosaic, P.mosaic);
    gl.uniform1f(d.u.uNegative, P.negative);
    gl.uniform1f(d.u.uChroma, P.chroma);
    gl.uniform1f(d.u.uScan, P.scan);
    gl.uniform1f(d.u.uCurve, P.curve);
    gl.uniform1f(d.u.uVignette, P.vignette);
    gl.uniform1f(d.u.uPalReps, Math.max(1, Math.round(P.palReps)));
    gl.uniform1i(d.u.uMirror, P.mirror | 0);
    gl.uniform1f(d.u.uContour, P.contour);
    gl.uniform1f(d.u.uHaze, P.haze);
    gl.uniform1f(d.u.uTimeD, tDisplay % 1000);
    gl.uniform1f(d.u.uCutShow, P.cutoutShow);
    this._uniformsCut(d.u, P);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (post) this._postChain(T, P, out);
  }

  // Freeze the current picture into T.snap (for the preset crossfade).
  _snapshot() { const T = this._ensureTargets(); this._render(T.snap); }
  // While the new look warms up out of sight, keep showing the frozen picture.
  _showSnapshot() {
    const T = this._ensureTargets();
    this._pass(this.post.final, null, (u) => {
      this._bind(0, T.snap.tex, u.uSrc); this._bind(5, T.snap.tex, u.uSnap);
      this.gl.uniform1f(u.uHasBl, 0); this.gl.uniform1f(u.uSnapMix, 1);
    });
  }

  _postChain(T, P, out = null) {
    const X = this.post;
    let src = T.scene;
    if (P.trails > 0) {
      const prevOut = T.out[T.cur], next = T.out[1 - T.cur];
      this._pass(X.trail, next, (u) => {
        this._bind(0, src.tex, u.uCur); this._bind(1, prevOut.tex, u.uPrev);
        this.gl.uniform1f(u.uTrail, Math.min(P.trails, 0.985));
      });
      T.cur = 1 - T.cur; src = next;
    }
    const needBlur = P.glow > 0 || P.blur > 0 || P.bloom > 0;
    const blurPair = ([a, b], k) => {
      this._pass(X.blur, b, (u) => { this._bind(0, a.tex, u.uTex); this.gl.uniform2f(u.uDir, k / a.w, 0); });
      this._pass(X.blur, a, (u) => { this._bind(0, b.tex, u.uTex); this.gl.uniform2f(u.uDir, 0, k / a.h); });
    };
    const down = (from, to) => this._pass(X.down, to, (u) => { this._bind(0, from.tex, u.uTex); this.gl.uniform2f(u.uSrcTexel, 1 / from.w, 1 / from.h); });
    if (needBlur) {
      const r = Math.max(0.25, P.glowRadius);
      down(src, T.q[0]);
      for (let i = 0; i < 2; i++) blurPair(T.q, r * (i + 1));
      if (P.bloom > 0) {   // each level halves the previous one and blurs it: a wide, soft halo
        let prev = T.q[0];
        for (const m of T.mips) { down(prev, m[0]); blurPair(m, 1.5); prev = m[0]; }
      }
    }
    // pulse: glow breathes over time; on reactive presets audio pumps it too
    const pulse = 1 + P.glowPulse * Math.sin(2 * Math.PI * this.clock * P.glowPulseRate)
      + (P.reactive ? Math.min(3, this._audioGain() * 1.5 * this.audioLevel) : 0);
    const mix = this.fade && !out ? Math.min(1, this.fade.t / FADE_TIME) : 1;
    this._pass(X.final, out, (u) => {
      this._bind(0, src.tex, u.uSrc);
      // (never sample the snapshot while writing into it)
      this._bind(5, out === T.snap ? src.tex : T.snap.tex, u.uSnap);
      this.gl.uniform1f(u.uSnapMix, mix * mix * (3 - 2 * mix));
      this._bind(1, T.q[0].tex, u.uBl);
      this._bind(2, T.mips[0][0].tex, u.uM1);
      this._bind(3, T.mips[1][0].tex, u.uM2);
      this._bind(4, T.mips[2][0].tex, u.uM3);
      this.gl.uniform1f(u.uGlow, P.glow * pulse);
      this.gl.uniform1f(u.uBloom, P.bloom * pulse);
      this.gl.uniform1f(u.uThresh, P.glowThreshold);
      this.gl.uniform1f(u.uBlur, P.blur);
      this.gl.uniform1f(u.uHasBl, needBlur ? 1 : 0);
    });
  }

  // Adaptive quality: when frames run well below the device's normal rate for a while, lower the
  // simulation grid and output resolution a step; after a long smooth stretch, try a step back up.
  // "Normal rate" is the fastest recent frame, so 30 Hz-capped displays aren't seen as struggling,
  // and anything running at 50+ fps is left alone.
  _adapt(frameDt) {
    const f = this.perf;
    if (!this.params.adaptive || frameDt <= 0 || frameDt > 0.5) return;
    f.cool -= frameDt;
    f.ema = f.ema ? f.ema * 0.93 + frameDt * 0.07 : frameDt;
    f.min = Math.min(f.min, frameDt) + 0.0004 * frameDt;   // slowly forget very old fast frames
    const ratio = f.ema / Math.max(f.min, 1 / 240);
    f.slow = ratio > 1.35 && f.ema > 1 / 50 ? f.slow + frameDt : 0;
    f.fast = ratio < 1.12 || f.ema < 1 / 58 ? f.fast + frameDt : 0;
    if (f.cool > 0) return;
    if (f.slow > 1.5 && this.qIndex < QUALITY.length - 1) this._setQuality(this.qIndex + 1, 12);
    else if (f.fast > 12 && this.qIndex > 0) this._setQuality(this.qIndex - 1, 4);
  }
  _setQuality(i, cooldown) {
    this.qIndex = i; this.quality = QUALITY[i];
    Object.assign(this.perf, { slow: 0, fast: 0, ema: 0, cool: cooldown });
    this._resize();   // carries the field over at the new size
  }

  _onFrame(now) {
    if (!this.running) return;
    const frameDt = (now - this.last) / 1000;
    const real = Math.min(frameDt, 0.1);
    const dt = real * this.params.timeScale;
    this.last = now;
    if (!this.ready) {
      try { if (this._compiled()) this._finishInit(); }
      catch (e) { this.running = false; this.onError?.(e); if (!this.onError) console.error(e); return; }
      requestAnimationFrame(this._onFrame);
      return;
    }
    this.clock += dt;   // real time only: warm-ups and resizes never make the hue jump
    if (this.warmLeft > 0) {
      this._warmFrame(frameDt);
      if (this.fade) this._showSnapshot();          // switching presets: hold the old picture
      else if (this.revealed) this._render();
      else if (this.warmLeft <= 0) { this._render(); this.canvas.style.opacity = '1'; this.revealed = true; }
      requestAnimationFrame(this._onFrame);
      return;
    }
    if (this.fade && (this.fade.t += real) >= FADE_TIME) this.fade = null;
    else if (!this.fade) this._adapt(frameDt);
    this._updateInput(real);
    this.acc += dt;
    const step = 1 / SIM_HZ;
    let n = 0;
    // At most 3 catch-up steps per frame: a slow device runs slightly slower instead of
    // spending ever longer frames trying to catch up.
    while (this.acc >= step && n < 3) { this._step(step); this.acc -= step; n++; }
    if (n === 3) this.acc = 0;
    // strobe: hold the displayed frame (the canvas keeps its last image when we don't draw)
    const hold = this.params.strobe > 0 ? 1 / this.params.strobe : 0;
    if (!hold || now / 1000 - this.lastShown >= hold) { this._render(); this.lastShown = now / 1000; }
    requestAnimationFrame(this._onFrame);
  }
}

const STORE_KEY = 'feedback-bg-params';   // written by the tuning panel (per browser)
const attrParams = (el) => { try { return JSON.parse(el.getAttribute('params') || '{}'); } catch { return {}; } };

// Drop-in element: <feedback-background preset="A" fallback="still.jpg"></feedback-background>
//   params='{"cutout":1}'  extra settings (JSON) on top of the preset
//   panel-key="gongo"      word that opens the tuning panel when typed anywhere ("off" disables it)
//   panel="open"           open the panel on load; closing it leaves a small fading button to reopen
//                          it (for the standalone toy builds, where typing a secret word is awkward)
export class FeedbackBackgroundElement extends HTMLElement {
  async connectedCallback() {
    // a preset saved from the panel (presets.json next to this module) can be named directly
    const want = resolvePreset(this.getAttribute('preset') || '01');
    if (!PRESETS[want]) {
      try {
        const r = await fetch(new URL('./presets.json', import.meta.url), { cache: 'no-store' });
        if (r.ok) registerPresets(await r.json());
      } catch { /* none */ }
    }
    const root = this.shadowRoot || this.attachShadow({ mode: 'open' });
    // transparent until the canvas fades in, so whatever is behind (e.g. a still poster) shows meanwhile
    root.innerHTML = `<style>:host{display:block;position:relative;overflow:hidden}
      canvas,img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}</style><canvas></canvas>`;
    const canvas = root.querySelector('canvas');
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { /* storage blocked */ }
    const fallback = (e) => {
      console.warn('feedback-background: falling back to still image', e);
      this.fb?.destroy(); this.fb = null;
      canvas.remove();
      const src = this.getAttribute('fallback');
      if (src) { const img = document.createElement('img'); img.src = src; img.alt = ''; root.appendChild(img); }
    };
    try {
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.fb = new FeedbackBackground(canvas, {
        preset: resolvePreset(this.getAttribute('preset') || '01'),
        params: { ...attrParams(this), ...(stored || {}), ...(reduce ? { timeScale: 0.3 } : {}) },
      });
      this.fb.onError = fallback;   // shader problems show up after compiling finishes
      this.fb.attachInput();
      this.fb.start();
    } catch (e) { fallback(e); return; }
    let typed = '';
    this._onKey = (e) => {
      if (e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) return;
      if (e.key.length !== 1) return;
      const word = (this.getAttribute('panel-key') || 'gongo').toLowerCase();
      if (word === 'off') return;
      typed = (typed + e.key.toLowerCase()).slice(-word.length);
      if (typed === word) { typed = ''; this.togglePanel(); }
    };
    window.addEventListener('keydown', this._onKey);
    if (this.getAttribute('panel') === 'open') this.togglePanel();
  }
  async togglePanel() {
    if (this._panel) { this._panel.close(); return; }
    if (this._opening) return;
    this._opening = true;
    const { openPanel } = await import('./feedback-panel.js');
    this._panel = await openPanel(this);
    this._opening = false;
    this._hideReopen();
  }
  // called by the panel when it closes
  _onPanelClosed() {
    if (this.getAttribute('panel') === 'open' && this.isConnected) this._showReopen();
  }
  // Small button to bring the panel back. Fades out when the pointer is idle, back on movement/tap.
  _showReopen() {
    if (!this._reopen) {
      const b = this._reopen = document.createElement('button');
      b.type = 'button';
      b.title = 'Open controls';
      b.setAttribute('aria-label', 'Open controls');
      b.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">'
        + '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>';
      b.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483647;width:40px;height:40px;border-radius:50%;'
        + 'display:grid;place-items:center;padding:0;cursor:pointer;color:#cfe;background:rgba(8,8,6,.75);'
        + 'border:1px solid #2a4a55;box-shadow:0 2px 12px #0008;transition:opacity .8s ease;';
      for (const t of ['pointerdown', 'pointermove', 'wheel', 'dblclick']) b.addEventListener(t, (e) => e.stopPropagation());
      b.addEventListener('click', (e) => { e.stopPropagation(); this.togglePanel(); });
      this._wake = () => {
        if (!this._reopen?.isConnected) return;
        this._reopen.style.opacity = '1';
        clearTimeout(this._fadeTimer);
        this._fadeTimer = setTimeout(() => { if (this._reopen) this._reopen.style.opacity = '0'; }, 3000);
      };
      for (const t of ['pointermove', 'pointerdown', 'touchstart']) window.addEventListener(t, this._wake, { passive: true });
    }
    document.body.appendChild(this._reopen);
    this._wake();
  }
  _hideReopen() { this._reopen?.remove(); clearTimeout(this._fadeTimer); }
  disconnectedCallback() {
    window.removeEventListener('keydown', this._onKey);
    if (this._wake) for (const t of ['pointermove', 'pointerdown', 'touchstart']) window.removeEventListener(t, this._wake);
    this._hideReopen();
    this._panel?.close();
    this.fb?.destroy(); this.fb = null;
  }
}
if (!customElements.get('feedback-background')) customElements.define('feedback-background', FeedbackBackgroundElement);
