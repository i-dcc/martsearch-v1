module("support");

test("jQuery hash.keys extension", function() {
  expect(2);
  var hash = { "one":"foo", "two":"bar", "three":"baz" };
  equals( $.keys(hash).length, 3, "should return 3 keys " );
  equals( hash[$.keys(hash)[1]], "bar", "return the correct key/value ");
});

