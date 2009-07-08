module("support");

test("jQuery hash.keys extension", function() {
  expect(2);
  var hash = { "one":"foo", "two":"bar", "three":"baz" };
  equals( jQuery.keys(hash).length, 3, "should return 3 keys " );
  equals( hash[jQuery.keys(hash)[1]], "bar", "return the correct key/value ");
});

test("jQuery array.uniq extension", function() {
  expect(3);
  var array = [ "0", "0", "1", "2", "2", "2", "3", "4" ];
  equals( jQuery.uniq(array).length, 5, "should return 5 unique elements " );
  equals( jQuery.uniq(array)[0], 0, "got the correct array return ");
  equals( jQuery.uniq(array)[3], 3, "got the correct array return ");
});

test("Logging", function() {
  expect(1);
  equals( log instanceof Object, true, "log is an active object " );
});