/**
 * Specialized ShaderMaterial for downsampling a texture by a factor of 2 with anti-aliasing.
 */
ThreeRTT.DownsampleMaterial = function (renderTargetFrom, renderTargetTo) {
  var uniforms = {};

  // Accept both Stage and RenderTarget classes
  renderTargetFrom = ThreeRTT.toTarget(renderTargetFrom);
  renderTargetTo = ThreeRTT.toTarget(renderTargetTo);

  // Add uniforms.
  uniforms = _.extend(uniforms, {
    sampleAlignment: {
      type: 'v2',
      value: new THREE.Vector2()//,
    },
    texture: {
      type: 't',
      value: renderTargetFrom.read()//,
    }//,
  });

  // Update uniforms on render.
  renderTargetTo.on('render', function () {
    var from = renderTargetFrom,
        to = renderTargetTo;

    // Correction for odd downsample.
    var dx = (to.width * 2) / from.width,
        dy = (to.height * 2) / from.height;

    var value = uniforms.sampleAlignment.value;
    value.x = dx;
    value.y = dy;
  });

  // Lookup shaders and build material
  var material = new THREE.ShaderMaterial({
    uniforms:       uniforms,
    vertexShader:   ThreeRTT.getShader('rtt-vertex-downsample'),
    fragmentShader: ThreeRTT.getShader('generic-fragment-texture')//,
  });

  // Disable depth buffer for RTT operations by default.
  material.side = THREE.DoubleSide;
  material.depthTest = false;
  material.depthWrite = false;
  material.transparent = true;
  material.blending = THREE.NoBlending;

  return material;
};