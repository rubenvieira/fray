import test from 'node:test';
import assert from 'node:assert/strict';
import { createKnife, disposeKnife } from '@rubenvieira/knife-atelier';
import { meshMaterialGroups } from '../src/atelier-knife.js';

test('single-material fittings and multi-material blade/handles retain every triangle and valid material', () => {
  const knife = createKnife('petty', { textures: false });
  for (const mesh of knife.children) {
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const groups = meshMaterialGroups(mesh, geometry);
    assert.equal(groups.reduce((sum, group) => sum + group.count, 0), geometry.attributes.position.count);
    assert.ok(groups.length <= materials.length);
    for (const group of groups) assert.ok(materials[group.materialIndex ?? 0]);
    if (geometry !== mesh.geometry) geometry.dispose();
  }
  disposeKnife(knife);
});
