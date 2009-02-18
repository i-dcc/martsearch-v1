module("config");

test("easymart.conf object", function() {
  expect(3);
  ok( easymart.conf, "we have a conf object " );
  ok( $.keys(easymart.conf.sources).length > 0, "we have some sources defined " );
  ok( easymart.conf.search, "we have a search path defined " );
});

test("easymart.config.load()", function() {
  var sources = $.keys(easymart.conf.sources);
  expect( sources.length );
  
  stop();
  easymart.config.load();
  start();
  
  $.each( sources, function(index) {
    ok( easymart.conf.sources[sources[index]]['dataset_name'], "config file '"+ sources[index] +"' loaded correctly ");
  });
});

