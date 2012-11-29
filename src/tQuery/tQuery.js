/**
 * Create a render-to-texture world for this world.
 */
tQuery.World.registerInstance('rtt', function (options) {
  return tQuery.createRTT(this, options);
});

/**
 * Add a surface showing a render-to-texture surface to this world.
 */
tQuery.World.registerInstance('compose', function (rtts, fragmentShader, textures, uniforms) {
  tQuery.composeRTT(this, rtts, fragmentShader, textures, uniforms);
  return this;
});

/**
 * Apply a fragment material to this RTT world.
 */
ThreeRTT.World.registerInstance('fragment', function (fragmentShader, textures, uniforms) {
  this.material(tQuery.createFragmentMaterial(this, fragmentShader, textures, uniforms));
  return this;
});

/**
 * Apply a raytrace material to this RTT world.
 */
ThreeRTT.World.registerInstance('raytrace', function (fragmentShader, textures, uniforms) {
  this.material(tQuery.createRaytraceMaterial(this, fragmentShader, textures, uniforms));
  return this;
});

/**
 * Apply a downsample material to this RTT world, sampling from the given world.
 */
ThreeRTT.World.registerInstance('downsample', function (worldFrom) {
  // Force this world to right scale (will autosize)
  var scale = worldFrom.scale();
  this.scale(scale * 2);

  // Force this world to right size now if not autosizing
  if (!worldFrom.autoSize) {
    var size = worldFrom.size();
    this.size(size.width / 2, size.height / 2);
  }

  this.material(tQuery.createDownsampleMaterial(worldFrom, this));
  return this;
});

/**
 * Create a render-to-texture world (static).
 */
tQuery.registerStatic('createRTT', function (world, options) {
  // Create new RTT world.
  return new ThreeRTT.World(world, options);
});

/**
 * Create a surface showing a render-to-texture image in this world.
 */
tQuery.registerStatic('composeRTT', function (world, rtts, fragmentShader, textures, uniforms) {
  return new ThreeRTT.Compose(world.tScene(), rtts, fragmentShader, textures, uniforms);
});

/**
 * Create a FragmentMaterial.
 */
tQuery.registerStatic('createFragmentMaterial', function (worlds, fragmentShader, textures, uniforms) {
  return new ThreeRTT.FragmentMaterial(worlds, fragmentShader, textures, uniforms);
});

/**
 * Create a RaytraceMaterial.
 */
tQuery.registerStatic('createRaytraceMaterial', function (world, fragmentShader, textures, uniforms) {
  return new ThreeRTT.RaytraceMaterial(world, fragmentShader, textures, uniforms);
});

/**
 * Create a DownsampleMaterial.
 */
tQuery.registerStatic('createDownsampleMaterial', function (worldFrom, worldTo) {
  return new ThreeRTT.DownsampleMaterial(worldFrom, worldTo);
});
