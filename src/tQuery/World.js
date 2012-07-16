/**
 * Handle a world for rendering to texture (tQuery).
 *
 * @param world (object) World to sync rendering to.
 */
ThreeRTT.World  = function (world, options) {
  // Handle parameters.
  options  = _.extend({
    autoRendering: true,
    autoSize:      true,
    order:         10000,
    scaleFactor:   1,
  }, options);

  // Remember creation state.
  this._options = options;
  this._world   = world;
  this._autoRendering  = options.autoRendering;

  // Copy renderer.
  this._renderer = world.tRenderer();

  // Create an RTT stage, pass-thru options.
  this._stage = new ThreeRTT.Stage(this._renderer, options);

  // Expose scene and camera
  this._scene  = this._stage.scene;
  this._camera = this._stage.camera;

  // Bind to world resize event for ThreeBox + autoSize.
  if (options.autoSize) {
    world.on('resize', function (width, height) {
      this.size(width * this.scaleFactor, height * this.scaleFactor);
    }.bind(this));
  }

  // Add to RTT queue at specified order.
  this.queue = ThreeRTT.RenderQueue(world);
  this.queue.add(this);
};

ThreeRTT.World.prototype = _.extend({}, tQuery.World.prototype, {

  // Return the stage object.
  stage: function () {
    return this._stage;
  },

  // Return the virtual render target object.
  target: function () {
    return this._stage.target;
  },

  // Resize the RTT texture.
  size: function (width, height) {
    this._stage.size(width, height);
  },

  // Return the virtual texture for reading from this RTT stage.
  read: function (n) {
    return this._stage.read(n);
  },

  // Render this world.
  render: function () {

  	// Render the scene 
  	if (this._autoRendering) {
      // Render to write target.
  	  this._stage.render();
	  }

    return this;
  },

  // Destroy/unlink this world.
  destroy: function () {
    // Remove stage.
    this._stage.destroy();
    this._stage = null;

  	// Remove self from rendering queue.
    this.queue.remove(this);

  	// Microevent.js notification
  	this.trigger('destroy');

    return this;
  },
});
