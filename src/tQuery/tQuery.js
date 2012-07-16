/**
 * Create a render-to-texture world in this world.
 */
tQuery.World.register('rtt', function (options) {
  return tQuery.createRTT(this, options);
});

/**
 * Create a fragment material in this world.
 */
ThreeRTT.World.register('fragment', function (fragmentShader, textures, uniforms) {
  var material = tQuery.createFragmentMaterial(this, fragmentShader, textures, uniforms);
  this.stage.material(material);
  return material;
});

/**
 * Create a raytrace material in this world.
 */
ThreeRTT.World.register('raytrace', function (fragmentShader, textures, uniforms) {
  var material = tQuery.createRaytraceMaterial(this, fragmentShader, textures, uniforms);
  this.stage.material(material);
  return material;
});

/**
 * Create a downsample material in this given world, sampling from the given world.
 */
ThreeRTT.World.register('downsample', function (worldFrom) {
  var material = tQuery.createFragmentMaterial(this, worldFrom);
  this.stage.material(material);
  return material;
});

/**
 * Create a render-to-texture world (static).
 */
tQuery.register('createRTT', function (world, options) {
  // Create new RTT world.
  var world = new ThreeRTT.World(options);

  // Add helper methods
});

/**
 * Create a FragmentMaterial.
 */
tQuery.register('createFragmentMaterial', function (world, fragmentShader, textures, uniforms) {
  return new ThreeRTT.FragmentMaterial(world.target(), fragmentShader, textures, uniforms);
});

/**
 * Create a RaytraceMaterial.
 */
tQuery.register('createRaytraceMaterial', function (world, fragmentShader, textures, uniforms) {
  return new ThreeRTT.RaytraceMaterial(world.target(), fragmentShader, textures, uniforms);
});

/**
 * Create a DownsampleMaterial.
 */
tQuery.register('createDownsampleMaterial', function (worldFrom, worldTo) {
  return new ThreeRTT.DownsampleMaterial(worldFrom.target(), worldTo.target());
});
