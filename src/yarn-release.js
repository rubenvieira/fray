// Rate fits for a graphic yarn model. Strength/crimp/friction still determine
// whether a yarn can fail or slip; physical time determines how it gets there.
export const pullMemoryBytes = (crossings) => 4 * (Math.ceil(crossings / 16) + 4 * crossings);

export const releaseWGSL = `
fn fractureTime(crimp: f32) -> f32 { return 0.003 + 0.02 * crimp; }
// Irreversible cohesive softening in physical time. Knife cuts bypass this law.
fn advanceCohesion(old: f32, limit: f32, dt: f32, tau: f32) -> f32 {
  return old + max(0.0, limit - old) * (1.0 - exp(-max(0.0, dt) / tau));
}
// Fraction of a crossing traversed by a slipping free end. The force excess is
// normalized by friction; bounded mobility is a fit, not a measured velocity.
// Unloaded ends stick instead of self-unzipping.
fn advancePull(old: f32, drive: f32, dt: f32, crimp: f32) -> f32 {
  let rate = 5.0 + 18.0 * max(0.0, drive) / (1.0 + max(0.0, drive));
  let mobility = 1.0 / (1.0 + 8.0 * crimp);
  return min(1.0, old + select(0.0, rate * mobility * max(0.0, dt), drive > 0.0));
}
`;
