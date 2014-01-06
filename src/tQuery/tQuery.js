/**
 * Create a render-to-texture world for this world.
 */
tQuery.World.registerInstance('rtt', function (options) {
  return tQuery.createRTT(this, options);
});

/**
 * Add a surface composing a render-to-texture to the screen.
 */
tQuery.World.registerInstance('compose', function (rtts, fragmentShader, textures, uniforms) {
  var compose = tQuery.createComposeRTT(rtts, fragmentShader, textures, uniforms);
  this.add(compose);
  return compose;
});

/**
 * Add a surface showing a render-to-texture surface to this world.
 */
tQuery.World.registerInstance('display', function (targets, gx, gy) {
  var display = tQuery.createDisplayRTT(targets, gx, gy);
  this.add(display);
  return display;
});

/**
 * Create a render-to-texture world (static).
 */
tQuery.registerStatic('createRTT', function (world, options) {
  // Create new RTT world.
  return new ThreeRTT.World(world, options);
});

/**
 * Composite a render-to-texture image full screen
 */
tQuery.registerStatic('createComposeRTT', function (rtts, fragmentShader, textures, uniforms) {
  return new ThreeRTT.Compose(rtts, fragmentShader, textures, uniforms);
});

/**
 * Create a display surface showing one or more textures in a grid.
 */
tQuery.registerStatic('createDisplayRTT', function (targets, gx, gy) {
  return new ThreeRTT.Display(targets, gx, gy);
});

/**
 * Create a ShaderMaterial.
 */
tQuery.registerStatic('createShaderMaterial', function (worlds, vertexShader, fragmentShader, textures, uniforms) {
  return new ThreeRTT.FragmentMaterial(worlds, vertexShader, fragmentShader, textures, uniforms);
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
tQuery.registerStatic('createRaytraceMaterial', function (world, camera, fragmentShader, textures, uniforms) {
  return new ThreeRTT.RaytraceMaterial(world, camera, fragmentShader, textures, uniforms);
});

/**
 * Create a DownsampleMaterial.
 */
tQuery.registerStatic('createDownsampleMaterial', function (worldFrom, worldTo) {
  return new ThreeRTT.DownsampleMaterial(worldFrom, worldTo);
});

/**
 * Create a UpsampleMaterial.
 */
tQuery.registerStatic('createUpsampleMaterial', function (worldFrom, worldTo) {
  return new ThreeRTT.UpsampleMaterial(worldFrom, worldTo);
});

/**
 * Create a ScaleMaterial.
 */
tQuery.registerStatic('createScaleMaterial', function (worldFrom, worldTo, scale) {
  return new ThreeRTT.DownsampleMaterial(worldFrom, worldTo, scale);
});
