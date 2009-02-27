module("model");

ActiveRecord.logging = true;

test( "Gene model - general functions", function () {
  equals( $j.m.Gene._table_name, "genes", "the table has the correct name " );
  ok( $j.m.Gene.model, "got a gene model object " );
  ok( $j.m.Gene._drop(), "dropped the gene storage table " );
  ok( $j.m.Gene._define(), "re-created the gene storage table " );
  
  var Gene = $j.m.Gene.model;
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
  var Gene = $j.m.Gene.model;
  
  var mart = $j.m.Gene._marts.dcc;
  var raw_results = $j.m.Gene._biomart_search( 'Cbx1', mart );
  var preprocessed_results = $j.m.Gene._biomart_tsv2json_ah( raw_results, mart );
  var processed_results = $j.m.Gene._biomart_prep_storage( preprocessed_results, mart );
  
  var [ status, errors ] = $j.m.Gene._save( processed_results );
  var cbx1 = Gene.find({ first: true, where: { symbol: 'Cbx1' } });
  var [ status2, errors2 ] = $j.m.Gene._save( processed_results );
  var cbx1_list = Gene.find({ where: { symbol: 'Cbx1' } });
  
  equals( 'dcc', mart['dataset_name'], "_marts() - got correct dataset name " );
  ok( raw_results.length > 0, "_biomart_search() - got some results from the biomart " );
  ok( preprocessed_results.length > 0, "_biomart_tsv2json_ah() - pre-processing results ok " );
  ok( processed_results.length > 0, "_biomart_prep_storage() - process results for storage ok " );
  ok( status, "_save() - gene was stored ok " );
  ok( errors.length == 0, "_save() - no errors recieved from storage " );
  equals( cbx1.mgi_id, "MGI:105369", "_save() - got the correct MGI accession for gene " );
  
  ok( status2, "_save() - duplicate gene was handled appropriately " );
  ok( errors2.length == 0, "_save() - no errors fired for duplicate gene (it should be handled internally by the model) " );
  ok( cbx1_list.length == 1, "_save() - still only one entry for Cbx1 " );
  
  ok( $j.m.Gene.search('Art4'), "search() - search pipe for Art4 ok " );
});

ActiveRecord.logging = false;