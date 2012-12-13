/**
 * Helper for making ShaderMaterials that raytrace in camera space per pixel.
 */
ThreeRTT.RaytraceMaterial = function (renderTarget, fragmentShader, textures, uniforms) {

  // Autoname texture uniforms as texture1, texture2, ...
  function textureName(j) {
    return 'texture' + (j + 1);
  }

  // Allow for array of textures.
  if (textures instanceof Array) {
    var object = {};
    _.each(textures, function (texture, j) {
      // Autoname texture uniforms as texture1, texture2, ...
      var key = textureName(j);
      object[key] = texture;
    });
  }
  // Allow passing single texture/object
  else if (textures instanceof THREE.Texture
        || textures instanceof ThreeRTT.World
        || textures instanceof THREE.WebGLRenderTarget) {
    textures = { texture1: textures };
  }

  // Accept both Stage and RenderTarget classes
  renderTarget = ThreeRTT.toTarget(renderTarget);

  // Add camera uniforms.
  uniforms = _.extend(uniforms || {}, {
    cameraViewport: {
      type: 'v2',
      value: new THREE.Vector2()//,
    },
    cameraWorld: {
      type: 'm4',
      value: new THREE.Matrix4()//,
    }//,
  });

  // Make uniforms for input textures.
  var i = 0;
  _.each(textures || [], function (texture, key) {
    uniforms[key] = {
      type: 't',
      value: i++,
      texture: ThreeRTT.toTexture(texture)//,
    };
  });

  // Update camera uniforms on render.
  renderTarget.on('render', function (scene, camera) {
    camera.updateMatrixWorld();
    if (camera.fov) {
      var tan = Math.tan(camera.fov * π / 360);
      uniforms.cameraViewport.value.set(tan * camera.aspect, tan);
    }
    if (camera.matrixWorld) {
      uniforms.cameraWorld.value = camera.matrixWorld;
    }
  });

  // Lookup shaders and build material
  return new THREE.ShaderMaterial({
    uniforms:       uniforms,
    vertexShader:   ThreeRTT.getShader('generic-vertex-screen'),
    fragmentShader: ThreeRTT.getShader(fragmentShader)//,
  });
};