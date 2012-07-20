/**
 * Render-to-texture stage. Contains scene/camera/target + optional full screen quad.
 */
ThreeRTT.Stage = function (renderer, options) {
  options = _.extend({
    history:  0,
    camera:   {},
    material: false, 
    scene:    null,
  }, options);

  // Prefill aspect ratio.
  options.camera.aspect = options.camera.aspect || (options.width / options.height);

  // Create internal scene and default camera.
  this.scene = options.scene || new THREE.Scene();
  this.camera = ThreeRTT.Camera(options.camera);
	this.scene.add(this.camera);

  // Create virtual render target, passthrough options.
  this.target = new ThreeRTT.RenderTarget(renderer, options);

  // If using buffered mode, draw the last rendered frame as background 
  // to avoid flickering unless overridden.
  if (options.history >= 0) {
    options.material = options.material || new ThreeRTT.FragmentMaterial(this);
  }

  // Prepare full-screen quad to help render every pixel once (baking textures).
  if (options.material) {
    this.material(true, options.material);
  }
}

ThreeRTT.Stage.prototype = {

  // Set/remove the default full-screen quad surface material
  material: function (material) {
    if (material) {
      // Spawn fullscreen quad.
      if (!this._surface) {
        this._surface = new THREE.Mesh(new ThreeRTT.ScreenGeometry(), {});
        this.scene.add(this._surface);
      }
      this._surface.material = material;
    }
    else {
      // Remove fullscreen quad.
      this.scene.remove(this._surface);
      this._surface = null;
    }

    return this;
  },

  // Resize render-to-texture
  size: function (width, height) {
    this.camera.aspect = width / height;
    this.target.size(width, height);
    return this;
  },

  // Get texture for render-to-texture output delayed by n frames.
  read: function (n) {
    return this.target.read(n);
  },

  // Render virtual render target.
  render: function () {
	  this.target.clear();
    this.target.render(this.scene, this.camera);
    return this;
  },

  // Clear virtual render target.
  clear: function () {
    this.target.clear();
    return this;
  },

  // Cleanup resources.
  destroy: function () {
    this.target.deallocate();

    this.scene = null;
    this.camera = null;
    this.target = null;
  },
}
