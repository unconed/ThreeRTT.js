/**
 * Helper for making ShaderMaterials that read from textures and write out processed fragments.
 */
ThreeRTT.FragmentMaterial = function (renderTargets, fragmentShader, textures, uniforms) {

  var material = new ThreeRTT.ShaderMaterial(
                  renderTargets, 'generic-vertex-screen', fragmentShader, textures, uniforms);

  // Disable depth buffer for RTT fragment operations by default.
  material.side = THREE.DoubleSide;
  material.depthTest = false;
  material.depthWrite = false;
  material.transparent = true;
  material.blending = THREE.NoBlending;

  return material;
};
