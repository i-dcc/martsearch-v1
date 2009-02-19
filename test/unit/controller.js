module("controller");

test("Search.index()", function () {
  ok( $j.c.Search.index(), "Seach.index() ran successfully " );
});

test("Search.run('Cbx1')", function () {
  ok( $j.c.Search.run("Cbx1"), "Seach.run('Cbx1') ran successfully " );
});


test("Config.init()", function () {
  ok( $j.c.Config.init(), "init ran successfully " );
});

