/**
 * Helper for making ShaderMaterials that read from textures and write out processed fragments.
 */
ThreeRTT.ShaderMaterial = function (renderTargets, vertexShader, fragmentShader, textures, uniforms) {

  // Autoname texture uniforms as texture1, texture2, ...
  function textureName(j) {
    return 'texture' + (j + 1);
  }

  // Allow for array of textures.
  if (textures instanceof Array) {
    var object = {};
    _.each(textures, function (texture, j) {
      object[textureName(i)] = texture;
    });
    textures = object;
  }
  // Allow passing single texture/object
  else if (textures instanceof THREE.Texture
        || textures instanceof ThreeRTT.World
        || textures instanceof THREE.WebGLRenderTarget) {
    textures = { texture1: textures };
  }

  // Accept one or more render targets as input for reading.
  if (!(renderTargets instanceof Array)) {
    renderTargets = [renderTargets];
  }

  // Accept World/Stage/RenderTarget classes
  renderTargets = _.map(renderTargets, function (target) {
    return ThreeRTT.toTarget(target);
  });

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
      value: ThreeRTT.toTexture(texture)//,
    };
  });

  // Use render targets as input textures unless overridden.
  _.each(renderTargets, function (target, j) {
    // Create texture1, texture2, ... uniforms.
    var key = textureName(j);
    if (target.read && !uniforms[key]) {
      uniforms[key] = {
        type: 't',
        value: target.read()//,
      };
    }
  });

  // Alias 'texture1' to 'texture'.
  if (uniforms.texture1 && !uniforms.texture) {
    uniforms.texture = uniforms.texture1;
  }

  // Update sampleStep uniform on render of source.
  var callback;
  renderTargets[0].on('render', callback = function () {
    var texture = renderTargets[0].options.texture;
    var wrapS = texture.wrapS;
    var wrapT = texture.wrapT;

    var offset = {
      1000: 0, // repeat
      1001: 1, // clamp
      1002: 0, // mirrored
    };

    var value = uniforms.sampleStep.value;

    value.x = 1 / (renderTargets[0].width - (offset[wrapS]||0));
    value.y = 1 / (renderTargets[0].height - (offset[wrapT]||0));
  });

  // Lookup shaders and build material
  var material = new THREE.ShaderMaterial({
    uniforms:       uniforms,
    vertexShader:   ThreeRTT.getShader(vertexShader || 'generic-vertex'),
    fragmentShader: ThreeRTT.getShader(fragmentShader || 'generic-fragment-texture')//,
  });

  return material;
};
