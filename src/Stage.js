/**
 * Render-to-texture stage. Contains scene/camera/target + optional full screen quad.
 */
ThreeRTT.Stage = function (renderer, options) {
  options = _.extend({
    history:  0,
    camera:   {},
    scene:    null,
  }, options);

  // Prefill aspect ratio.
  options.camera.aspect = options.camera.aspect || (options.width / options.height);

  // Create internal scene and default camera.
  this.camera = ThreeRTT.Camera(options.camera);

  // Create virtual render target, passthrough options.
  this.target = new ThreeRTT.RenderTarget(renderer, options);

  // Prepare data structures.
  this.reset();

  // Set size and aspect
  this.size(options.width, options.height);
}

ThreeRTT.Stage.prototype = {

  options: function () {
    return this.target.options;
  },

  reset: function () {
    this.scenes   = [];
    this.passes   = [];
  },

  // Add object render pass
  paint: function (object, empty) {

    // Create root to hold all objects for this pass
    var root = new THREE.Scene();

    // Create a surface to render the last frame
    if (!empty) {
      var material = new ThreeRTT.FragmentMaterial(this, 'generic-fragment-texture');
      var surface = this._surface(material);
      root.add(surface);
    }

    // Add object
    root.add(object);

    // Add root to scene and insert into pass list
    this.scenes.push(root);
    this.passes.push(1);
  },

  // Add iteration pass
  iterate: function (n, material) {

    // Create a surface to render the pass with
    var surface = this._surface(material);

    // Create root to hold all objects for this pass
    var root = new THREE.Scene();
    root.add(surface);

    // Add surface to scene and insert into pass list
    this.scenes.push(root);
    this.passes.push(n);

    return this;
  },

  // Add regular fragment pass
  fragment: function (material) {
    this.iterate(1, material);

    return this;
  },

  // Resize render-to-texture
  size: function (width, height) {
    width = Math.floor(width);
    height = Math.floor(height);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.target.size(width, height);
    return this;
  },

  // Get texture for render-to-texture output delayed by n frames.
  read: function (n) {
    return this.target.read(n);
  },

  // Return uniform for reading from this render target
  uniform: function () {
    return this.target.uniform();
  },

  // Render virtual render target.
  render: function () {
	  this.target.clear();

    _.each(this.passes, function (n, i) {
      _.loop(n, function (j) {
        this.target.render(this.scenes[i], this.camera);
      }.bind(this));
    }.bind(this));

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

    this.scenes = [];
    this.passes = [];
    this.camera = null;
    this.target = null;
  },

  // Generate full screen surface with default properties.
  _surface: function (material) {
    var surface = new THREE.Mesh(new ThreeRTT.ScreenGeometry(), {});
    surface.frustumCulled = false;
    surface.material = material;
    surface.renderDepth = Infinity;

    return surface;
  },

}
