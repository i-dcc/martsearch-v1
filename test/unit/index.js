module("index");

var index = ms.index;

test("Ping the index ", function() {
  expect(2);
  
  // First, just make sure the initially configured index is ok
  ok( index.is_alive(), "Initially configured index is alive " );
  
  // Change the index url to deliberately make the ping fail...
  var real_url = index.url;
  index.url = '/foo';
  equals( index.is_alive(), false, "Bad index ping returned false " );
  index.url = real_url;
});

test("Searching with the index  - something that works ", function() {
  var results = index.search( "cbx", 0 );
  ok( results instanceof Object, "Got a results object " );
  ok( results.response.numFound >= 0, "numFound is returning a number " );
  ok( results.response.docs instanceof Array, "Got the 'docs' array " );
});

test("Searching with the index  - something that should fail ", function() {
  expect(2);
  var results = index.search( "chromosome:!", 0 );
  ok( results === false, "Got a results object " );
  ok( index.grouped_query_terms() === false, "Refused to process results from a bad search " );
});