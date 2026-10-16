import { targetSpeed } from "./hand.js";
// A single material yarn, identified by its family and original cut end.
// Render runs and tail-cache slots are transient and never become grip IDs.
export const yarnGripTypesWGSL = `
struct YarnHandle { id: vec4<u32>, goal: vec4<f32>, setup: vec4<f32> };
struct YarnState { front: vec4<f32>, root: vec4<f32>, force: vec4<f32>, nodes: vec4<u32> };
`;

export const yarnGripWGSL =
  yarnGripTypesWGSL +
  `
@group(0) @binding(0) var<uniform> P: SimParams;
@group(0) @binding(1) var<uniform> FU: array<vec4<u32>, 3>;
@group(0) @binding(2) var<storage, read> nodes: array<NodeStatic>;
@group(0) @binding(3) var<storage, read> x: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read> dx: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read> segs: array<Seg>;
@group(0) @binding(6) var<storage, read_write> field: array<u32>;
@group(0) @binding(7) var<storage, read> strength: array<vec2<f32>>;
@group(0) @binding(8) var<storage, read_write> ext: array<vec4<f32>>;
@group(0) @binding(9) var<storage, read_write> counters: array<atomic<u32>>;
@group(0) @binding(10) var<storage, read_write> events: array<atomic<u32>>;
@group(0) @binding(11) var<uniform> H: YarnHandle;
@group(0) @binding(12) var<storage, read_write> W: YarnState;
struct YarnContact { p: vec3<f32>, ids: vec4<u32>, weights: vec4<f32>, rest: f32, stiffness: f32, friction: f32, cap: f32, valid: bool };
fn yarnCode(pos: i32) -> u32 {
  let F = FU[H.id.x];
  let k = select(H.id.z, u32(max(pos, 0)), H.id.y == 0u);
  let m = select(u32(max(pos, 0)), H.id.z, H.id.y == 0u);
  if (pos < 0 || k >= F.y || m >= F.z) { return 255u; }
  return (field[F.x + m * F.y + k] >> (8u * H.id.y)) & 255u;
}
fn yarnContact(iterate: bool) -> YarnContact {
  var o: YarnContact; o.valid = false;
  let l = H.id.x; let f = H.id.y; let F = FU[l]; let mat = P.layers[l]; let L = mat.lattice;
  let bu = mat.yarn[1].yarnsPerSpan; let bv = mat.yarn[0].yarnsPerSpan;
  let along = W.front.x;
  let k = select(f32(H.id.z), along, f == 0u); let m = select(along, f32(H.id.z), f == 0u);
  if (k < 0.0 || m < 0.0 || k >= f32(F.y) || m >= f32(F.z)) { return o; }
  let ij = clamp((vec2<f32>(k, m) - 0.5 * (vec2<f32>(bu, bv) - 1.0)) / vec2<f32>(bu, bv), vec2<f32>(0.0), vec2<f32>(L.yz - vec2<u32>(1u)));
  let cell = min(vec2<u32>(floor(ij)), L.yz - vec2<u32>(2u)); let uv = ij - vec2<f32>(cell);
  let n = L.x + cell.y * L.y + cell.x;
  o.ids = vec4<u32>(n, n + 1u, n + L.y, n + L.y + 1u);
  o.weights = vec4<f32>((1.0-uv.x)*(1.0-uv.y), uv.x*(1.0-uv.y), (1.0-uv.x)*uv.y, uv.x*uv.y);
  var normal = 0.0;
  for (var j=0u; j<4u; j++) {
    if (x[o.ids[j]].w >= 1.5 && o.weights[j] > 0.001) { return o; }
    o.p += o.weights[j] * (x[o.ids[j]].xyz + select(vec3<f32>(0.0), dx[o.ids[j]].xyz, iterate));
    normal += o.weights[j] * nodes[o.ids[j]].n0 / (bu * bv);
  }
  let pitch = select(mat.b.x / bv, mat.a.w / bu, f == 0u);
  o.rest = H.setup.y + abs(along - H.setup.x) * pitch;
  let B = mat.yarn[f].yarnsPerSpan;
  o.stiffness = clamp(mat.yarn[f].eaLow / (B * max(o.rest, 0.001)), 0.5, 120.0);
  let c = F.x + u32(m) * F.y + u32(k);
  o.cap = max(0.01, 0.85 * strength[c][f]);
  // Actual transverse span tension increases the crossing's resistance.
  let g = 1u-f; let sg = segs[2u*n+g]; let b = n + select(L.y, 1u, g == 0u);
  var transverse = 0.0;
  if (segActive(sg) && x[b].w < 1.5) {
    let strain = (length(x[b].xyz-x[n].xyz)-sg.rest)/max(sg.rest,1e-8);
    transverse = max(0.0,axialTension(mat.yarn[g],strain))/mat.yarn[g].yarnsPerSpan;
  }
  o.friction = max(1e-5, mat.a.y * (normal + mat.a.z * transverse));
  o.valid = true; return o;
}
fn yarnTension(c: YarnContact) -> f32 { return min(c.cap, c.stiffness * max(0.0, length(H.goal.xyz-c.p)-c.rest)); }
@compute @workgroup_size(1)
fn yarnAdvance() {
  if (H.goal.w < 0.5 || P.hg.x <= 0.0 || P.counts.z == 0u || W.front.w >= 2.0) { return; }
  var front = i32(W.front.x);
  // Skip only material already pulled out. A second cut ends this fragment.
  for (var skip=0u; skip<256u; skip++) {
    if (yarnCode(front) != 254u) { break; }
    front += i32(H.setup.z); W.front.y = 0.0;
  }
  W.front.x = f32(front);
  if (yarnCode(front) == 255u) { W.front.w = 2.0; W.force = vec4<f32>(0.0); atomicAdd(&counters[1],1u); return; }
  let c = yarnContact(false);
  if (!c.valid) { W.front.w = 3.0; W.force = vec4<f32>(0.0); return; }
  let tension = yarnTension(c);
  let lengthAlong=select(FU[H.id.x].z,FU[H.id.x].y,H.id.y==0u);
  var mounted=0.0;
  if(front==0||front==i32(lengthAlong)-1){for(var j=0u;j<4u;j++){mounted+=c.weights[j]*f32(nodes[c.ids[j]].flags&1u);}}
  let drive = select(max(0.0,tension/c.friction-1.0),0.0,mounted>0.99);
  W.front.y = advancePull(W.front.y,drive,P.hg.x,P.layers[H.id.x].yarn[H.id.y].crimpStrain);
  W.root = vec4<f32>(c.p,c.rest); W.force = vec4<f32>(0.0,0.0,0.0,tension); W.nodes = c.ids;
  if (W.front.y < 1.0) { return; }
  let F=FU[H.id.x]; let f=H.id.y;
  let k=select(H.id.z,u32(front),f==0u); let m=select(u32(front),H.id.z,f==0u); let index=F.x+m*F.y+k;
  field[index]=(field[index]&~(255u<<(8u*f)))|(254u<<(8u*f));
  atomicStore(&events[0],1u);
  W.front.x+=H.setup.z; W.front.y=0.0; W.front.z+=1.0;
}
@compute @workgroup_size(1)
fn yarnTerms() {
  if (H.goal.w < 0.5 || W.front.w >= 2.0) { return; }
  let c=yarnContact(true); if (!c.valid) { return; }
  let delta=H.goal.xyz-c.p; let distance=length(delta); let axis=delta/max(distance,1e-9);
  let tension=yarnTension(c); let force=axis*tension;
  let axial=select(c.stiffness,0.0,tension>=c.cap||distance<=c.rest);
  let lateral=tension/max(distance,1e-6);
  let diag=vec3<f32>(lateral)+(axial-lateral)*axis*axis;
  let off=(axial-lateral)*vec3<f32>(axis.x*axis.y,axis.x*axis.z,axis.y*axis.z);
  for (var j=0u;j<4u;j++) {
    let w=c.weights[j]; let n=c.ids[j]; let base=3u*n;
    ext[base]+=vec4<f32>(-w*force,0.0);
    ext[base+1u]+=w*w*vec4<f32>(diag.x,off.x,off.y,diag.y);
    ext[base+2u]+=w*w*vec4<f32>(off.z,diag.z,0.0,0.0);
  }
  W.root=vec4<f32>(c.p,c.rest); W.force=vec4<f32>(force,tension); W.nodes=c.ids;
}
`;

export const yarnPickWGSL = `
struct PickU { vp: mat4x4<f32>, pointer: vec4<f32>, size: vec4<f32> };
struct PickOut { best: atomic<u32>, valid: u32, pad: vec2<u32>, record: vec4<u32>, tip: vec4<f32>, root: vec4<f32>, geo: vec4<f32> };
@group(0) @binding(0) var<uniform> U: PickU;
@group(0) @binding(1) var<storage,read> runs: array<vec4<u32>>;
@group(0) @binding(2) var<storage,read> geometry: array<vec4<f32>>;
@group(0) @binding(3) var<storage,read> tails: array<vec4<f32>>;
@group(0) @binding(4) var<storage,read> count: array<u32>;
@group(0) @binding(5) var<storage,read_write> result: PickOut;
@group(0) @binding(6) var depth: texture_depth_multisampled_2d;
@compute @workgroup_size(128)
fn pickYarn(@builtin(global_invocation_id) id: vec3<u32>) {
  let r=id.x; if(r>=min(count[0],65536u)){return;}
  let rec=runs[r]; let a=(rec.x>>5u)&3u; let b=(rec.x>>7u)&3u;
  if(!((a==0u&&b==1u)||(a==1u&&b==0u))){return;}
  let geo=geometry[10u*r]; if(geo.x>0.5||geo.z<0.0||geo.w<0.0006){return;}
  let tip=tails[u32(geo.z)*17u+16u].xyz; let clip=U.vp*vec4<f32>(tip,1.0);
  if(clip.w<=0.0){return;} let ndc=clip.xyz/clip.w;
  let pixel=(vec2<f32>(ndc.x,-ndc.y)*0.5+0.5)*U.size.xy;
  if(any(pixel<vec2<f32>(0.0))||any(pixel>=U.size.xy)||ndc.z<0.0||ndc.z>1.0){return;}
  let distance=length((pixel-U.pointer.xy)/U.size.zw);
  if(distance>U.pointer.z){return;}
  var front=1.0;
  for(var sample=0;sample<4;sample++){front=min(front,textureLoad(depth,vec2<i32>(pixel),sample));}
  if(ndc.z>front+0.00002){return;}
  atomicMin(&result.best,(u32(distance*256.0)<<16u)|r);
}
@compute @workgroup_size(1)
fn writeYarnPick(){
  let key=atomicLoad(&result.best);if(key==0xFFFFFFFFu){return;}
  let r=key&65535u;let geo=geometry[10u*r];
  result.record=runs[r];result.tip=tails[u32(geo.z)*17u+16u];result.root=geometry[10u*r+7u];result.geo=geo;result.valid=1u;
}
`;

export const yarnHandleRenderWGSL =
  yarnGripTypesWGSL +
  `
@group(0) @binding(13) var<uniform> YH: YarnHandle;
@group(0) @binding(14) var<uniform> YS: YarnState;
fn heldYarnMatches(ri: RunInfo) -> bool {
  if(YH.goal.w<0.5||YS.front.w>=3.0||ri.layer!=YH.id.x||ri.fam!=YH.id.y||ri.yarn!=YH.id.z){return false;}
  let fromA=YH.setup.z<0.0;
  let cut=select(ri.pos-1.0,ri.pos+ri.n,fromA);
  return u32(i32(cut))==YH.id.w && ((!ri.heldA&&!ri.heldB)||(ri.heldA==fromA&&ri.heldB!=fromA));
}
fn pinYarnEnd(ri: RunInfo,k:u32,len:f32){
  if(!heldYarnMatches(ri)||YH.setup.w<=1e-7){return;}
  let free = !ri.heldA&&!ri.heldB;
  let reverse=free&&YH.setup.z<0.0;
  let base=k*TAIL_SEGS_1;let h=len/f32(TAIL_SEGS);
  var point:array<vec3<f32>,TAIL_SEGS_1>;var before:array<vec3<f32>,TAIL_SEGS_1>;
  for(var j=0u;j<=TAIL_SEGS;j++){let i=select(j,TAIL_SEGS-j,reverse);point[j]=tails[base+i].xyz;before[j]=point[j];}
  let root=point[0];var goal=YH.goal.xyz;
  if(!free){
    let d=goal-root;let distance=length(d);goal=root+d*(min(distance,len)/max(distance,1e-9));
    if(distance>=0.999*len){for(var j=0u;j<=TAIL_SEGS;j++){point[j]=root+normalize(d+vec3<f32>(1e-12,0.0,0.0))*h*f32(j);}}
    else {
      for(var iteration=0u;iteration<20u;iteration++){
        point[TAIL_SEGS]=goal;
        for(var q=0u;q<TAIL_SEGS;q++){let j=TAIL_SEGS-1u-q;point[j]=point[j+1u]+normalize(point[j]-point[j+1u]+vec3<f32>(1e-12,0.0,0.0))*h;}
        point[0]=root;
        for(var j=0u;j<TAIL_SEGS;j++){point[j+1u]=point[j]+normalize(point[j+1u]-point[j]+vec3<f32>(1e-12,0.0,0.0))*h;}
      }
    }
  }else{
    point[TAIL_SEGS]=goal;
    for(var q=0u;q<TAIL_SEGS;q++){let j=TAIL_SEGS-1u-q;point[j]=point[j+1u]+normalize(point[j]-point[j+1u]+vec3<f32>(1e-12,0.0,0.0))*h;}
  }
  // Find the record this invocation just solved; no second tailSlot claim.
  let identity=tailIdentity(ri);let hash=hash11(identity.x^hash11(identity.y));var slot=-1;
  for(var probe=0u;probe<16u;probe++){let s=(hash+probe)&(TAIL_HISTORY-1u);if(all(tailMemory[s].identity==identity)&&atomicLoad(&tailMemory[s].stamp)==u32(TF.params.w)+1u){slot=i32(s);break;}}
  for(var j=0u;j<=TAIL_SEGS;j++){
    let i=select(j,TAIL_SEGS-j,reverse);tails[base+i]=vec4<f32>(point[j],0.0);
    if(slot>=0){
      let dt=YH.setup.w;var v=tailMemory[slot].v[i].xyz;
      if(dt>1e-7){v+=(point[j]-before[j])/dt;v*=min(1.0,2.0/max(length(v),1e-9));}
      tailMemory[slot].p[i]=vec4<f32>(point[j],0.0);tailMemory[slot].v[i]=vec4<f32>(v,0.0);
    }
  }
}
`;

export function yarnSelection(record, position, scene) {
  const [word, packed, count] = record;
  const layer = word & 15,
    family = (word >>> 4) & 1,
    yarn = packed & 65535,
    start = packed >>> 16;
  const heldA = ((word >>> 5) & 3) === 0,
    heldB = ((word >>> 7) & 3) === 0;
  const endA = (word >>> 5) & 3,
    endB = (word >>> 7) & 3;
  if (
    !((endA === 0 && endB === 1) || (endA === 1 && endB === 0)) ||
    !count ||
    position.length !== 3 ||
    !position.every(Number.isFinite)
  )
    return null;
  const L = scene.layers[layer];
  if (!L) return null;
  const pitch = family === 0 ? L.material.pitchU / L.bundle[0] : L.material.pitchV / L.bundle[1];
  const front = heldA ? start - 1 : start + count;
  const cut = heldA ? start + count : start - 1;
  const length = (count + 0.5) * pitch;
  return { id: [layer, family, yarn, cut >>> 0], front, direction: heldA ? -1 : 1, length, position: [...position] };
}

export class YarnGrip {
  active = false;
  busy = false;
  constructor(device, solver, scene, common, releaseCode) {
    Object.assign(this, { device, solver, scene });
    const make = (size, usage) =>
      device.createBuffer({ size, usage: usage | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
    this.uniform = make(48, GPUBufferUsage.UNIFORM);
    this.state = make(64, GPUBufferUsage.STORAGE | GPUBufferUsage.UNIFORM);
    this.pickU = make(96, GPUBufferUsage.UNIFORM);
    this.pickOut = make(80, GPUBufferUsage.STORAGE);
    const buffers = [
      solver.simParams,
      solver.fieldU,
      solver.nodes,
      solver.x,
      solver.dx,
      solver.segs,
      solver.field,
      solver.fieldStrength,
      solver.ext,
      solver.counters,
      solver.fieldEvents,
      this.uniform,
      this.state,
    ];
    const uniform = [0, 1, 11],
      read = [2, 3, 4, 5, 7];
    const layout = device.createBindGroupLayout({
      entries: buffers.map((_, binding) => ({
        binding,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: uniform.includes(binding) ? "uniform" : read.includes(binding) ? "read-only-storage" : "storage",
        },
      })),
    });
    const pl = device.createPipelineLayout({ bindGroupLayouts: [layout] });
    const module = device.createShaderModule({
      label: "individual yarn grip",
      code: common + releaseCode + yarnGripWGSL,
    });
    this.advance = device.createComputePipeline({ layout: pl, compute: { module, entryPoint: "yarnAdvance" } });
    this.terms = device.createComputePipeline({ layout: pl, compute: { module, entryPoint: "yarnTerms" } });
    this.group = device.createBindGroup({
      layout,
      entries: buffers.map((buffer, binding) => ({ binding, resource: { buffer } })),
    });
    this.pickLayout = device.createBindGroupLayout({
      entries: [0, 1, 2, 3, 4, 5, 6].map((binding) =>
        binding === 6
          ? { binding, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "depth", multisampled: true } }
          : {
              binding,
              visibility: GPUShaderStage.COMPUTE,
              buffer: { type: binding === 0 ? "uniform" : binding === 5 ? "storage" : "read-only-storage" },
            },
      ),
    });
    const pickModule = device.createShaderModule({ label: "loose yarn end pick", code: yarnPickWGSL });
    const pickLayout = device.createPipelineLayout({ bindGroupLayouts: [this.pickLayout] });
    this.pickPipes = ["pickYarn", "writeYarnPick"].map((entryPoint) =>
      device.createComputePipeline({ layout: pickLayout, compute: { module: pickModule, entryPoint } }),
    );
  }
  async pick(renderer, vp, x, y, cssWidth, cssHeight, radius = 9) {
    if (this.busy || !renderer.msaaDepth) return null;
    this.busy = true;
    const rb = this.device.createBuffer({ size: 80, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
    try {
      const u = new Float32Array(24);
      u.set(vp);
      u.set([(x * renderer.width) / cssWidth, (y * renderer.height) / cssHeight, radius, 0], 16);
      u.set([renderer.width, renderer.height, renderer.width / cssWidth, renderer.height / cssHeight], 20);
      this.device.queue.writeBuffer(this.pickU, 0, u);
      const empty = new Uint32Array(20);
      empty[0] = 0xffffffff;
      this.device.queue.writeBuffer(this.pickOut, 0, empty);
      const entries = [
        this.pickU,
        renderer.runs,
        renderer.runGeo,
        renderer.tails,
        renderer.threadCount,
        this.pickOut,
      ].map((buffer, binding) => ({ binding, resource: { buffer } }));
      entries.push({ binding: 6, resource: renderer.msaaDepth.createView() });
      const group = this.device.createBindGroup({ layout: this.pickLayout, entries });
      const encoder = this.device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setBindGroup(0, group);
      for (let i = 0; i < 2; i++) {
        pass.setPipeline(this.pickPipes[i]);
        pass.dispatchWorkgroups(i ? 1 : 512);
      }
      pass.end();
      encoder.copyBufferToBuffer(this.pickOut, 0, rb, 0, 80);
      this.device.queue.submit([encoder.finish()]);
      await rb.mapAsync(GPUMapMode.READ);
      const data = rb.getMappedRange().slice(0),
        ui = new Uint32Array(data),
        f = new Float32Array(data);
      if (!ui[1]) return null;
      const hit = yarnSelection(Array.from(ui.slice(4, 8)), Array.from(f.slice(8, 11)), this.scene);
      return hit ? { ...hit, node: Math.round(f[15]), root: Array.from(f.slice(12, 15)) } : null;
    } finally {
      if (rb.mapState === "mapped") rb.unmap();
      rb.destroy();
      this.busy = false;
    }
  }
  hold(hit) {
    const u = new ArrayBuffer(48);
    new Uint32Array(u).set(hit.id);
    new Float32Array(u).set([...hit.position, 1, hit.front, hit.length, hit.direction, 0], 4);
    this.device.queue.writeBuffer(this.uniform, 0, u);
    const state = new Float32Array(16);
    state.set([hit.front, 0, 0, 1, ...hit.root, hit.length]);
    this.device.queue.writeBuffer(this.state, 0, state);
    this.active = true;
  }
  prepareRender(time) {
    const dt = this.renderTime === undefined ? 0 : Math.max(0, Math.min(0.12, time - this.renderTime));
    this.renderTime = time;
    this.device.queue.writeBuffer(this.uniform, 44, new Float32Array([dt]));
  }
  target(position) {
    if (this.active) this.device.queue.writeBuffer(this.uniform, 16, new Float32Array([...position, 1]));
  }
  release() {
    this.active = false;
    this.device.queue.writeBuffer(this.uniform, 28, new Float32Array([0]));
  }
  encodeAdvance(pass) {
    if (this.active) {
      pass.setPipeline(this.advance);
      pass.setBindGroup(0, this.group);
      pass.dispatchWorkgroups(1);
    }
  }
  encodeTerms(dispatch) {
    if (this.active) dispatch(this.terms, this.group, 1);
  }
}

// Precision grip: no automatic lift or cloth-patch gathering. A motionless
// pointer leaves the caught end exactly where it was. Input acceleration is
// bounded independently of the solver's physical/slow-motion clock.
export class YarnHand {
  constructor(position) {
    this.origin = [...position];
    this.target = [...position];
    this.velocity = [0, 0, 0];
  }
  step(dt, delta) {
    if (!(dt > 0)) return;
    const difference = delta.map((d, k) => this.origin[k] + d - this.target[k]);
    const distance = Math.hypot(...difference),
      speed = targetSpeed(distance, dt, 0.25, 2);
    const desired = difference.map((d) => (d * speed) / Math.max(distance, 1e-12));
    const change = desired.map((v, k) => v - this.velocity[k]);
    const length = Math.hypot(...change),
      scale = Math.min(1, (2 * dt) / Math.max(length, 1e-12));
    this.velocity = this.velocity.map((v, k) => v + change[k] * scale);
    this.target = this.target.map((v, k) => v + this.velocity[k] * dt);
  }
}
