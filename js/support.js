/*
* Support Functions
*/

/**
* Simple jQuery extensions...
*   - keys: used to extract the keys out of a hash
*   - uniq: used to extract the uniq values out of an array
*/
jQuery.extend({
  keys: function ( obj ) {
    var a = [];
    jQuery.each(obj, function(k){ a.push(k); });
    return a;
  },
  uniq: function ( array ) {
    var k = {};
    for (var i=0; i < array.length; i++) {
      k[ array[i] ] = "";
    }
    return jQuery.keys(k);
  }
});

// Dummy log variable to stop errors when blackbird is not loaded.
var log = {
  toggle:   function() {},
  move:     function() {},
  resize:   function() {},
  clear:    function() {},
  debug:    function() {},
  info:     function() {},
  warn:     function() {},
  error:    function() {},
  profile:  function() {}
};

// Dummy console object for browsers that don't support console
if ( window.console === undefined ) {
  window.console = {
    log: function() {}
  };
}

