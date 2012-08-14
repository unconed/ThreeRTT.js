/**
 * Compose render-to-textures into a scene by adding a full screen quad
 * that uses the textures as inputs.
 */
ThreeRTT.Compose = function (scene, rtts, fragmentShader, textures, uniforms) {
  // Create full screen quad.
  var material = new ThreeRTT.FragmentMaterial(rtts, fragmentShader, textures, uniforms);
  var geometry = new ThreeRTT.ScreenGeometry();
  var mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  // Remember scene/mesh association.
  this.scene = scene;
  this.mesh = mesh;
}

// Remove fullscreen quad
ThreeRTT.Compose.prototype.remove = function () {
  this.scene.remove(this.mesh);
};
