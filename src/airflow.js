// One physical airflow field shared by cloth and its reconstructed free tails.
export const airflowWGSL = `struct WindU {
  // direction (xyz, unit), current speed (m/s)
  dir: vec4<f32>,
  // time (s), gust length (m), local jet radius (m), local jet speed (m/s)
  params: vec4<f32>,
  // Up to four air brushes: world position xyz, smoothly rising strength w.
  jets: array<vec4<f32>, 4>,
  // Tool-frame camera-ray dx/dz, dy/dz; w = 1 on hanging cloth. Follow each fold's depth.
  aims: array<vec4<f32>, 4>,
};

@group(0) @binding(11) var<uniform> WD: WindU;

fn airflowAt(p: vec3<f32>) -> vec3<f32> {
  let t = WD.params.x;
  let k = 6.2831853 / max(WD.params.y, 0.01);
  // Coherent travelling eddies: neighbouring threads see neighbouring air,
  // rather than independent random impulses. Time is the cloth's physical time.
  let a = k * (p.x + 0.3 * p.y) - 2.1 * t;
  let b = 0.53 * k * (p.y - 0.4 * p.x) + 1.3 * t;
  let gust = 0.65 + 0.22 * sin(a) + 0.13 * sin(b);
  let eddy = vec3<f32>(0.12 * sin(b), 0.18 * cos(a), 0.28 * sin(a + b) + 0.16 * cos(1.7 * b));
  var air = WD.dir.w * (gust * WD.dir.xyz + eddy);
  for (var j = 0u; j < 4u; j++) {
    let jet = WD.jets[j];
    if (jet.w <= 0.0) { continue; }
    let worldDelta = p - jet.xyz;
    let hanging = WD.aims[j].w > 0.5;
    let delta = select(worldDelta, vec3<f32>(worldDelta.x, worldDelta.z, -worldDelta.y), hanging);
    let across = delta.xy - delta.z * WD.aims[j].xy;
    // Compact smooth footprint, spreading and losing speed as it rises.
    let rise = max(0.0, delta.z);
    let radius = max(WD.params.z, 0.001) + 0.18 * rise;
    let r2 = dot(across, across) / (radius * radius);
    let falloff = max(0.0, 1.0 - r2);
    let height = 1.0 / (1.0 + 18.0 * rise * rise);
    let spread = vec3<f32>(across / radius * 0.22, 1.0);
    let flow = spread * (WD.params.w * jet.w * falloff * falloff * height);
    air += select(flow, vec3<f32>(flow.x, -flow.z, flow.y), hanging);
  }
  // Overlapping brushes must not multiply the air speed without limit.
  return air * min(1.0, 12.0 / max(length(air), 1e-6));
}
`;
