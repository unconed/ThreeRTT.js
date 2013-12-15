/**
 * Helper for making ShaderMaterials that raytrace in camera space per pixel.
 */
ThreeRTT.RaytraceMaterial = function (renderTargets, camera, fragmentShader, textures, uniforms) {

  // Accept one or more render targets as input for reading.
  if (!(renderTargets instanceof Array)) {
    renderTargets = [renderTargets];
  }

  var material = new ThreeRTT.ShaderMaterial(
                  renderTargets, 'raytrace-vertex-screen', fragmentShader, textures, uniforms);

  // Add camera uniforms.
  uniforms = _.extend(material.uniforms || {}, {
    raytraceViewport: {
      type: 'v2',
      value: new THREE.Vector2(),
    },
    raytracePosition: {
      type: 'v3',
      value: new THREE.Vector3(),
    },
    raytraceMatrix: {
      type: 'm4',
      value: new THREE.Matrix4(),
    },
  });

  // Update camera uniforms on render.
  var renderTarget = ThreeRTT.toTarget(renderTargets[0]);
  var zero = new THREE.Vector3();
  renderTarget.on('render', function (scene) {
    camera.updateMatrixWorld();
    if (camera.fov) {
      var tan = Math.tan(camera.fov * π / 360);
      uniforms.raytraceViewport.value.set(tan * camera.aspect, tan);
    }
    if (camera.matrixWorld) {
      uniforms.raytraceMatrix.value.copy(camera.matrixWorld);
      uniforms.raytraceMatrix.value.setPosition(zero);
      uniforms.raytracePosition.value.getPositionFromMatrix(camera.matrixWorld);
    }
  });

  // Lookup shaders and build material
  return material;
};