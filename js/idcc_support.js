
// jQuery extension to allow us to extract the keys out of a hash object.
$.extend({
  keys: function(obj){
    var a = [];
    $.each(obj, function(k){ a.push(k) });
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
