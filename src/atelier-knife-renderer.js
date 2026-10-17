import { Matrix4, Vector3 } from 'three';

const shader = `
struct Frame { viewProj: mat4x4f, lightViewProj: mat4x4f, camera: vec4f, key: vec4f, keyAxis: vec4f, ambient: vec4f, viewport: vec4f, params: vec4f }
struct Material { model: mat4x4f, color: vec4f, finish: vec4f }
@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var<uniform> material: Material;
@group(0) @binding(2) var albedo: texture_2d<f32>;
@group(0) @binding(3) var linearSampler: sampler;
struct Vertex { @builtin(position) clip: vec4f, @location(0) world: vec3f, @location(1) normal: vec3f, @location(2) uv: vec2f }
@vertex fn vertexMain(@location(0) p: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f) -> Vertex {
  var out: Vertex;
  let world = material.model * vec4f(p, 1.);
  out.clip = frame.viewProj * world; out.world = world.xyz;
  out.normal = normalize((material.model * vec4f(n, 0.)).xyz); out.uv = uv;
  return out;
}
@vertex fn shadowMain(@location(0) p: vec3f) -> @builtin(position) vec4f {
  return frame.lightViewProj * material.model * vec4f(p, 1.);
}
@fragment fn fragmentMain(in: Vertex) -> @location(0) vec4f {
  let map = textureSample(albedo, linearSampler, in.uv);
  if (map.a < .1) { discard; }
  let base = material.color.rgb * map.rgb;
  let n = normalize(in.normal); let v = normalize(frame.camera.xyz - in.world);
  let l = normalize(frame.key.xyz - in.world); let h = normalize(l + v);
  let rough = material.finish.x; let metal = material.finish.y;
  let diffuse = max(dot(n, l), 0.);
  let spec = pow(max(dot(n, h), 0.), mix(180., 12., rough)) * (1. - rough);
  let fresnel = .04 + .96 * pow(1. - max(dot(n, v), 0.), 5.);
  let reflection = mix(vec3f(.18, .16, .13), vec3f(.95), smoothstep(-.25, .45, reflect(-v,n).z));
  let color = base * (1.-metal*.85) * (frame.ambient.rgb + diffuse * .9) + mix(vec3f(1.),base,metal) * (spec + reflection * mix(fresnel*.4,.8,metal));
  return vec4f(color * frame.params.x, 1.);
}`;

export class AtelierKnifeRenderer {
  visible = false;
  released = null;
  position = [0, 0, 0];
  constructor(renderer, parts, metadata) {
    this.device = renderer.device; this.metadata = metadata;
    const d = this.device, shared = renderer.shared();
    const module = d.createShaderModule({ code: shader, label: 'Knife Atelier' });
    const layout = d.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: {} },
      { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: {} },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: {} },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
    ] });
    const pipelineLayout = d.createPipelineLayout({ bindGroupLayouts: [layout] });
    const buffers = [{ arrayStride: 32, attributes: [
      { shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x3' },
      { shaderLocation: 2, offset: 24, format: 'float32x2' },
    ] }];
    const primitive = { topology: 'triangle-list', cullMode: 'none' };
    this.main = d.createRenderPipeline({ layout: pipelineLayout,
      vertex: { module, entryPoint: 'vertexMain', buffers }, fragment: { module, entryPoint: 'fragmentMain', targets: [{ format: shared.hdrFormat }] },
      primitive, depthStencil: { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'less' }, multisample: { count: shared.samples } });
    this.shadow = d.createRenderPipeline({ layout: pipelineLayout, vertex: { module, entryPoint: 'shadowMain', buffers },
      primitive, depthStencil: { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'less', depthBias: 2 } });
    const sampler = d.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'repeat', addressModeV: 'repeat' });
    this.parts = parts.map(part => {
      const buffer = d.createBuffer({ size: part.vertices.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
      d.queue.writeBuffer(buffer, 0, part.vertices);
      const uniform = d.createBuffer({ size: 96, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      const map = part.bitmap, texture = d.createTexture({ size: map ? [map.width, map.height] : [1, 1], format: 'rgba8unorm-srgb',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
      if (map) { d.queue.copyExternalImageToTexture({ source: map, flipY: true }, { texture }, [map.width, map.height]); map.close(); }
      else d.queue.writeTexture({ texture }, new Uint8Array([255, 255, 255, 255]), { bytesPerRow: 4 }, [1, 1]);
      const group = frame => d.createBindGroup({ layout, entries: [
        { binding: 0, resource: { buffer: frame } }, { binding: 1, resource: { buffer: uniform } },
        { binding: 2, resource: texture.createView() }, { binding: 3, resource: sampler },
      ] });
      return { ...part, buffer, uniform, texture, count: part.vertices.length / 8,
        mainGroup: group(shared.frameU), keyGroup: group(shared.frameU), overGroup: group(shared.frameOverU) };
    });
    this.model = new Matrix4(); this.normal = new Vector3(0, 0, 1); this.along = new Vector3(1, 0, 0);
  }
  contact(point, direction, mount, now = performance.now()) {
    this.position = [...point]; this.released = null; this.visible = true;
    this.normal.set(...(mount === 'hanging' ? [0, -1, 0] : [0, 0, 1]));
    if (direction && new Vector3(...direction).lengthSq() > 1e-10) this.along.set(...direction).multiplyScalar(-1).projectOnPlane(this.normal).normalize();
    if (Math.abs(this.along.dot(this.normal)) > .01) this.along.set(1, 0, 0);
    this.update(now);
  }
  release(now = performance.now()) { if (this.visible) this.released = now; }
  hide() { this.visible = false; this.released = null; }
  update(now) {
    if (!this.visible) return;
    const age = this.released === null ? 0 : Math.max(0, (now - this.released) / 250);
    if (age >= 1) { this.hide(); return; }
    const cross = new Vector3().crossVectors(this.along, this.normal).normalize();
    this.model.makeBasis(this.along, this.normal, cross).setPosition(new Vector3(...this.position).addScaledVector(this.normal, .0005 + age * .035));
    for (const part of this.parts) this.device.queue.writeBuffer(part.uniform, 0,
      new Float32Array([...this.model.elements, ...part.color, 1, part.roughness, part.metal, 0, 0]));
  }
  drawMain(pass) { this.draw(pass, this.main, 'mainGroup'); }
  drawShadow(pass, light) { this.draw(pass, this.shadow, light === 'over' ? 'overGroup' : 'keyGroup'); }
  draw(pass, pipeline, group) {
    if (!this.visible) return;
    pass.setPipeline(pipeline);
    for (const part of this.parts) { pass.setBindGroup(0, part[group]); pass.setVertexBuffer(0, part.buffer); pass.draw(part.count); }
  }
  dispose() { for (const part of this.parts) { part.buffer.destroy(); part.uniform.destroy(); part.texture.destroy(); } }
}
