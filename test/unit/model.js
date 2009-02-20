ActiveRecord.connect();

module("model");

test( "Gene model - general functions", function () {
  equals( $j.m.Gene._table_name, "genes", "the table has the correct name " );
  ok( $j.m.Gene.obj(), "got a gene model object " );
  ok( $j.m.Gene._drop(), "dropped the gene storage table " );
  ok( $j.m.Gene._define(), "re-created the gene storage table " );
  
  var Gene = $j.m.Gene.obj();
  var g = Gene.create({ mgi_id: "MGI:105369", symbol: "Cbx1", chromosome: "11" });
  var g2 = Gene.build({ mgi_id: "MGI:105369", symbol: "Cbx1", chromosome: "11" });
  g2.save();
  
  ok( Gene, "got a gene model object " );
  ok( g, "created a test gene entry " );
  equals( g.get('symbol'), "Cbx1", "got correct symbol name " );
  ok( g2.getErrors().length > 0, "caught error when trying to insert duplicate genes " );
});

test( "Gene model - xml construction", function () {
  $.each( $j.m.Gene._marts, function ( index, mart ) {
    var no_expected_filters = 0;
    var no_expected_attributes = 0;
    $(mart.filters).each( function(i) { if ( this.enabled ) { no_expected_filters += 1; }; });
    $(mart.attributes).each( function(i) { if ( this.enabled ) { no_expected_attributes = no_expected_attributes + 1; }; });

    var mart_xml = $j.m.Gene._biomart_xml( 'Foo', mart );
    ok( mart_xml, "got a returned object from " + mart.dataset_name + " " );
    equals( $(mart_xml).find("Filter").length, no_expected_filters, "got the expected no. of filters from " + mart.dataset_name + " " );
    equals( $(mart_xml).find("Attribute").length, no_expected_attributes, "got the expected no. of attributes from " + mart.dataset_name + " " );
  });
});

test( "Gene model - 'dcc' search example", function () {
  ok( $j.m.Gene._drop(), "dropped the gene storage table " );
  ok( $j.m.Gene._define(), "re-created the gene storage table " );
  
  var mart = $j.m.Gene._marts.dcc;
  var raw_results = $j.m.Gene._biomart_search( 'Cbx1', mart );
  var preprocessed_results = $j.m.Gene._biomart_tsv2json_ah( raw_results, mart );
  var processed_results = $j.m.Gene._biomart_prep_storage( preprocessed_results, mart );
  var [ entry, errors ] = $j.m.Gene._save_entry(processed_results[0]);
  var [ entry2, errors2 ] = $j.m.Gene._save_entry(processed_results[0]);
  
  equals( 'dcc', mart['dataset_name'], "got correct dataset name " );
  ok( raw_results.length > 0, "got some results from the biomart " );
  ok( preprocessed_results.length > 0, "pre-processing results ok " );
  ok( processed_results.length > 0, "process results for storage ok " );
  equals( entry.mgi_id, "MGI:105369", "got the correct MGI accession for gene " );
  ok( errors.length == 0, "no errors recieved from storage " );
  equals( entry2.mgi_id, "MGI:105369", "got the correct MGI accession for second gene entry " );
  ok( errors2.length > 0, "caught error for unique MGI accession id " );
  
  ok( $j.m.Gene.search('Art4'), "search pipe for Art4 ok " );
});
