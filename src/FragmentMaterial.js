/**
 * Helper for making ShaderMaterials that read from textures and write out processed fragments.
 */
ThreeRTT.FragmentMaterial = function (renderTarget, fragmentShader, textures, uniforms) {
  textures = textures || {};
  var i = 0;

  // Accept both Stage and RenderTarget classes
  renderTarget = ThreeRTT.toTarget(renderTarget);

  // Add sample step uniform.
  uniforms = _.extend(uniforms || {}, {
    sampleStep: {
      type: 'v2',
      value: new THREE.Vector2()//,
    }//,
  });

  // Make uniforms for input textures.
  _.each(textures, function (texture, key) {
    uniforms[key] = {
      type: 't',
      value: i++,
      texture: texture//,
    };
  });

  // Use render target as input texture by default.
  if (!uniforms.texture) {
    uniforms.texture = {
      type: 't',
      value: i++,
      texture: renderTarget.read()//,
    };
  }

  // Update sampleStep uniform on render.
  renderTarget.on('render', function () {
    var value = uniforms.sampleStep.value;

    value.x = 1 / (renderTarget.width - 1);
    value.y = 1 / (renderTarget.height - 1)
  });

  // Lookup shaders and build material
  var material = new THREE.ShaderMaterial({
    uniforms:       uniforms,
    vertexShader:   ThreeRTT.getShader('generic-vertex-screen'),
    fragmentShader: ThreeRTT.getShader(fragmentShader || 'generic-fragment-texture')//,
  });

  // Disable depth buffer for RTT operations.
  //material.depthTest = false;
  //material.depthWrite = false;
  //material.transparent = true;

  return material;
};