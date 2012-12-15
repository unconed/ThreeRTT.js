/**
 * Compose render-to-textures into a scene by adding a full screen quad
 * that uses the textures as inputs.
 */
ThreeRTT.Compose = function (rtts, fragmentShader, textures, uniforms) {
  THREE.Object3D.call(this);

  // Create full screen quad.
  var material = new ThreeRTT.FragmentMaterial(rtts, fragmentShader, textures, uniforms);
  var geometry = new ThreeRTT.ScreenGeometry();
  var mesh = this.mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;

  this.add(mesh);
}

ThreeRTT.Compose.prototype = new THREE.Object3D();
