ActiveRecord.connect();

module("model");

test( "Gene model", function () {
  var Gene = $j.m.Gene.obj();
  var g = Gene.create({ mgi_id: "MGI:105369", symbol: "Cbx1", chromosome: "11" });
  
  equals( "genes", $j.m.Gene._table_name, "the table has the correct name " );
  ok( Gene, "got a gene model object " );
  ok( g, "created a test gene entry " );
  equals( "Cbx1", g.get('symbol'), "got correct symbol name " );
  
  var g2 = Gene.build({ mgi_id: "MGI:105369", symbol: "Cbx1", chromosome: "11" });
  g2.save();
  ok( g2.getErrors().length > 0, "caught error when trying to insert duplicate genes " );
  
  ok( $j.m.Gene._drop(), "dropped the gene storage table " );
  ok( $j.m.Gene._define(), "re-created the gene storage table " );
  ok( $j.m.Gene.obj(), "got a gene model object again " );
});