/*
* Support Functions
*/

// jQuery extension to allow us to extract the keys out of a hash object.
jQuery.extend({
  keys: function(obj){
    var a = [];
    jQuery.each(obj, function(k){ a.push(k) });
    return a;
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
};

