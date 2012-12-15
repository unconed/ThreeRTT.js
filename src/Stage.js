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
  this.scene = options.scene || new THREE.Scene();
  this.camera = ThreeRTT.Camera(options.camera);
	this.scene.add(this.camera);

  // Create virtual render target, passthrough options.
  this.target = new ThreeRTT.RenderTarget(renderer, options);

  // Prepare data structures.
  this.reset();
}

ThreeRTT.Stage.prototype = {

  options: function () {
    return this.target.options;
  },

  reset: function () {
    if (this.renderables) {
      _.each(this.renderables, function (surface) {
        this.scene.remove(surface);
      }.bind(this));
    }

    this.passes   = [];
    this.renderables = [];
  },

  // Add object render pass
  paint: function (object) {

    // Create root to hold all objects for this pass
    var root = new THREE.Object3D();
    root.frustumCulled = false;
    root.visible = true;

    // Create a surface to render the last frame
    var material = new ThreeRTT.FragmentMaterial(this, 'generic-fragment-texture');
    var surface = this._surface(material);
    root.add(surface);
    root.add(object);

    // Add root to scene and insert into pass list
    this.scene.add(root);
    this.passes.push(1);
    this.renderables.push(root);
  },

  // Add iteration pass
  iterate: function (n, material) {

    // Create a surface to render the pass with
    var surface = this._surface(material);
    surface.visible = false;

    // Add surface to scene and insert into pass list
    this.scene.add(surface);
    this.passes.push(n);
    this.renderables.push(surface);

    return this;
  },

  // Add regular fragment pass
  fragment: function (material) {
    this.iterate(1, material);

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

  // Return uniform for reading from this render target
  uniform: function () {
    return this.target.uniform();
  },

  // Render virtual render target.
  render: function () {
	  this.target.clear();

    function toggle(object, value) {
      object.visible = value;
      _.each(object.children, function (object) { toggle(object, value); });
    }

    _.each(this.passes, function (n, i) {
      toggle(this.renderables[i], true);
      _.loop(n, function (i) {
        this.target.render(this.scene, this.camera);
      }.bind(this));
      toggle(this.renderables[i], false);
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

    this.scene = null;
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
