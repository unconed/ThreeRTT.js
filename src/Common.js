// Check dependencies.
(function (deps) {
  for (i in deps) {
    if (!window[i]) throw "Error: ThreeRTT requires " + deps[i];
  }
})({
  'THREE': 'Three.js',
});

// Namespace
window.ThreeRTT = window.ThreeRTT || {};

// Fetch shader from <script> tag by id
// or pass through string if not exists.
ThreeRTT.getShader = function (id) {
  var elem = document.getElementById(id);
  return elem && elem.innerText || id;
};

// Simple array/object iterator.
// (can be replaced with underscore.js)
window._ = window._ || {};
_.each = _.each || function (object, callback) {
  if (object.forEach) {
    return object.forEach(callback);
  }
  for (key in object) {
    callback(object[key], key, object);
  }
};

// Simple object extender
// (can be replaced with underscore.js)
_.extend = _.extend || function (destination) {
  _.each([].slice.call(arguments, 1), function (source) {
    for (var key in source) {
      destination[key] = source[key];
    }
  });
  return destination;
}

// Simple object mapper
// (can be replaced with underscore.js)
_.map = _.map || function (object, callback) {
  var result = [];
  if (object) {
    _.each(object, function (value, key) {
      result.push(callback(value, key));
    });
  }
  return result;
};

// Simple loop helper
_.loop = function (n, callback) {
  for (var i = 0; i < n; ++i) callback(i);
};

// Fetch shader from <script> tag by id
ThreeRTT.getShader = function (id) {
  var elem = document.getElementById(id);
  return elem && elem.innerText || id;
};
// Check for a power of two.
ThreeRTT.isPowerOfTwo = function (value) {
	return (value & (value - 1)) === 0;
};

// Convert World/Stage into RenderTarget if necessary.
ThreeRTT.toTarget = function (rtt) {
  // Stage object
  if (ThreeRTT.Stage && (rtt instanceof ThreeRTT.Stage)) return rtt.target;
  // tQuery world
  if (ThreeRTT.World && (rtt instanceof ThreeRTT.World)) return rtt.target();
  // RenderTarget
  return rtt;
}

// Convert World/Stage/RenderTarget into Texture if necessary.
ThreeRTT.toTexture = function (rtt) {
  // Convert World/Stage
  rtt = ThreeRTT.toTarget(rtt);
  // Convert virtual RenderTarget object
  if (ThreeRTT.RenderTarget && (rtt instanceof ThreeRTT.RenderTarget)) return rtt.read();
  return rtt;
}

// Make microevent methods chainable.
MicroEvent.prototype.on   = function () { MicroEvent.prototype.bind.apply(this, arguments);    return this; }
MicroEvent.prototype.emit = function () { MicroEvent.prototype.trigger.apply(this, arguments); return this; }
MicroEvent.mixin	= function(destObject){
	var props	= ['bind', 'unbind', 'trigger', 'on', 'emit'];
	for(var i = 0; i < props.length; i ++){
		destObject.prototype[props[i]]	= MicroEvent.prototype[props[i]];
	}
}
