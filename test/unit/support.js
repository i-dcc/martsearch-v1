module("support");

test("jQuery hash.keys extension", function() {
  expect(2);
  var hash = { "one":"foo", "two":"bar", "three":"baz" };
  equals( jQuery.keys(hash).length, 3, "should return 3 keys " );
  equals( hash[jQuery.keys(hash)[1]], "bar", "return the correct key/value ");
});

test("Logging", function() {
  expect(1);
  equals( log instanceof Object, true, "log is an active object " );
});