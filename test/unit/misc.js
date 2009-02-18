test("jQuery hash.keys extension", function() {
  expect(2);
  var hash = { "one":"foo", "two":"bar", "three":"baz" };
  equals( 3, $.keys(hash).length, "should return 3 keys " );
  equals( "bar", hash[$.keys(hash)[1]], "return the correct key/value ");
});

