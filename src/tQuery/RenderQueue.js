/**
 * Priority queue for render-to-texture stages (tQuery).
 *
 * Attach a weighted queue to the given world, rendered before the world itself.
 */
ThreeRTT.RenderQueue = function (world) {
  this.world = world;
  this.queue = [];
  this.callback = null;

  this.renderer = world.tRenderer();
};

ThreeRTT.RenderQueue.prototype = {
  // Add render stage to queue
  add: function (stage) {
    this.queue.push(stage);
    this.sort();
    this.init();
  },

  // Remove render stage from queue.
  remove: function (stage) {
    this.queue.splice(this.queue.indexOf(stage), 1);
    this.cleanup();
  },

  // Ensure we are hooked into the world's rendering pipeline.
  init: function () {
    var queue = this.queue,
        world = this.world;

    if (queue.length && !this.callback) {
      world.loop().hookPreRender(this.callback = function () {
        _.each(queue, function (stage) {
          stage.render();
        });
      });
    }
  },

  // Unhook from world if no longer needed.
  cleanup: function () {
    var queue = this.queue,
        world = this.world;

    if (!queue.length && this.callback) {
      world.loop().unhookPreRender(this.callback);
      this.callback = null;
    }
  },

  // Sort queue by given order.
  sort: function () {
    this.queue.sort(function (a, b) {
      return a.order - b.order;
    });
  }
};

/**
 * Helper to return the single RenderQueue associated with a world.
 */
ThreeRTT.RenderQueue.bind = function (world) {
  var key = '__rttRenderQueue';

  // Singleton attached to world.
  if (world[key]) {
    return world[key];
  }
  return (world[key] = new ThreeRTT.RenderQueue(world));
}
