module("model");

ActiveRecord.logging = true;

test( "Gene model - general functions", function () {
  equals( $j.m.Gene._table_name, "genes", "the table has the correct name " );
  ok( $j.m.Gene.model, "got a model object " );
  ok( $j.m.Gene._drop(), "dropped the storage table " );
  ok( $j.m.Gene._define(), "re-created the storage table " );
  
  var Gene = $j.m.Gene.model;
  var g = Gene.create({ symbol: "Cbx1", chromosome: "11" });
  var g2 = Gene.build({ symbol: "Cbx1", chromosome: "11" });
  g2.save();
  
  ok( Gene, "got a gene model object " );
  ok( g, "created a test gene entry " );
  equals( g.get("symbol"), "Cbx1", "got correct symbol name " );
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
  ok( $j.m.Gene._drop(), "dropped the storage table " );
  ok( $j.m.Gene._define(), "re-created the storage table " );
  var Gene = $j.m.Gene.model;
  
  var mart = $j.m.Gene._marts.dcc;
  equals( mart['dataset_name'], 'dcc', "_marts() - got correct dataset name " );
  
  var raw_results = $j.m.Gene._biomart_search( 'Cbx1', mart );
  ok( raw_results.length > 0, "_biomart_search() - got some results from the biomart " );
  
  var preprocessed_results = $j.m.Gene._biomart_tsv2json_ah( raw_results, mart );
  ok( preprocessed_results.length > 0, "_biomart_tsv2json_ah() - pre-processing results ok " );
  
  var processed_results = $j.m.Gene._biomart_prep_storage( preprocessed_results, mart );
  ok( processed_results.length > 0, "_biomart_prep_storage() - process results for storage ok " );
  
  var save_status = $j.m.Gene._save( processed_results );
  var status = save_status[0];
  var errors = save_status[1];
  ok( status, "_save() - gene was stored ok " );
  ok( errors.length == 0, "_save() - no errors recieved from storage " );
  
  var save_status2 = $j.m.Gene._save( processed_results );
  var status2 = save_status2[0];
  var errors2 = save_status2[1];
  ok( status2, "_save() - duplicate gene was handled appropriately " );
  ok( errors2.length == 0, "_save() - no errors fired for duplicate gene (it should be handled internally by the model) " );
  
  var cbx1_list = Gene.find({ where: { symbol: 'Cbx1' } });
  ok( cbx1_list.length == 1, "_save() - still only one entry for Cbx1 " );
  
  ok( $j.m.Gene.search('Art4'), "search() - search pipe for Art4 ok " );
});

test( "TargetedConstruct model - general functions", function () {
  equals( $j.m.TargetedConstruct._table_name, "targeted_constructs", "the table has the correct name " );
  ok( $j.m.TargetedConstruct.model, "got a model object " );
  ok( $j.m.TargetedConstruct._drop(), "dropped the storage table " );
  ok( $j.m.TargetedConstruct._define(), "re-created the storage table " );

  var Gene = $j.m.Gene.model;
  var cbx1 = Gene.find({ first: true, where: { symbol: 'Cbx1' } });
  var TargetedConstruct = $j.m.TargetedConstruct.model;
  var tc = TargetedConstruct.create({ gene_id: cbx1.id, project: "EUCOMM", status: "ES Cells - Targeting Confirmed", project_id: "35505" });
  var tc2 = TargetedConstruct.build({ gene_id: cbx1.id, project: "EUCOMM", status: "ES Cells - Targeting Confirmed", project_id: "35505" });
  tc2.save();

  ok( TargetedConstruct, "got a model object " );
  ok( tc.id != undefined, "created a test entry " );
  equals( tc.getGene().symbol, "Cbx1", "got correct parent symbol name " );
  ok( tc2.getErrors().length > 0, "caught error when trying to insert duplicate genes " );
});

test( "TargetedConstruct model - xml construction", function () {
  $.each( $j.m.TargetedConstruct._marts, function ( index, mart ) {
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

test( "TargetedConstruct model - 'htgt_targ' search example", function () {
  ok( $j.m.TargetedConstruct._drop(), "dropped the storage table " );
  ok( $j.m.TargetedConstruct._define(), "re-created the storage table " );
  var TargetedConstruct = $j.m.TargetedConstruct.model;
  
  var mart = $j.m.TargetedConstruct._marts.htgt_targ;
  equals( mart['dataset_name'], 'htgt_targ', "_marts() - got correct dataset name " );
  
  var raw_results = $j.m.TargetedConstruct._biomart_search( 'Cbx1', mart );
  ok( raw_results.length > 0, "_biomart_search() - got some results from the biomart " );
  
  var preprocessed_results = $j.m.TargetedConstruct._biomart_tsv2json_ah( raw_results, mart );
  ok( preprocessed_results.length > 0, "_biomart_tsv2json_ah() - pre-processing results ok " );
  
  var processed_results = $j.m.TargetedConstruct._biomart_prep_storage( preprocessed_results, mart );
  ok( processed_results.length > 0, "_biomart_prep_storage() - process results for storage ok " );
  
  var save_status = $j.m.TargetedConstruct._save( processed_results );
  var status = save_status[0];
  var errors = save_status[1];
  ok( status, "_save() - construct stored ok " );
  ok( errors.length == 0, "_save() - no errors recieved from storage " );
  
  var save_status2 = $j.m.TargetedConstruct._save( processed_results );
  var status2 = save_status2[0];
  var errors2 = save_status2[1];
  ok( status2, "_save() - duplicate entry was handled appropriately " );
  ok( errors2.length == 0, "_save() - no errors fired for duplicate entry (it should be handled internally by the model) " );
  
  var Gene = $j.m.Gene.model;
  var cbx1 = Gene.find({ first: true, where: { symbol: 'Cbx1' } });
  equals( cbx1.getTargetedConstructCount(), 1, "_save() - should only have one project for Cbx1 " );
  
  ok( $j.m.Gene.search('Art4'), "search() - search pipe for Art4 ok " );
});

test( "OtherMutation model - general functions", function () {
  equals( $j.m.OtherMutation._table_name, "other_mutations", "the table has the correct name " );
  ok( $j.m.OtherMutation.model, "got a model object " );
  ok( $j.m.OtherMutation._drop(), "dropped the storage table " );
  ok( $j.m.OtherMutation._define(), "re-created the storage table " );

  var Gene = $j.m.Gene.model;
  var cbx1 = Gene.find({ first: true, where: { symbol: 'Cbx1' } });
  var OtherMutation = $j.m.OtherMutation.model;
  var om = OtherMutation.create({ gene_id: cbx1.id, source: "EUCOMM Gene Trap", count: 20, source_id: "58524" });
  var om2 = OtherMutation.build({ gene_id: cbx1.id, source: "EUCOMM Gene Trap", count: 20, source_id: "58524" });
  om2.save();

  ok( OtherMutation, "got a model object " );
  ok( om.id != undefined, "created a test entry " );
  equals( om.getGene().symbol, "Cbx1", "got correct parent symbol name " );
  ok( om2.getErrors().length > 0, "caught error when trying to insert duplicate entries " );
});

test( "OtherMutation model - xml construction", function () {
  $.each( $j.m.OtherMutation._marts, function ( index, mart ) {
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

test( "OtherMutation model - 'htgt_trap' search example", function () {
  ok( $j.m.OtherMutation._drop(), "dropped the storage table " );
  ok( $j.m.OtherMutation._define(), "re-created the storage table " );
  var OtherMutation = $j.m.OtherMutation.model;
  
  var mart = $j.m.OtherMutation._marts.htgt_trap;
  equals( mart['dataset_name'], 'htgt_trap', "_marts() - got correct dataset name " );
  
  var raw_results = $j.m.OtherMutation._biomart_search( 'Cbx1', mart );
  ok( raw_results.length > 0, "_biomart_search() - got some results from the biomart " );
  
  var preprocessed_results = $j.m.OtherMutation._biomart_tsv2json_ah( raw_results, mart );
  ok( preprocessed_results.length > 0, "_biomart_tsv2json_ah() - pre-processing results ok " );
  
  var processed_results = $j.m.OtherMutation._biomart_prep_storage( preprocessed_results, mart );
  ok( processed_results.length > 0, "_biomart_prep_storage() - process results for storage ok " );
  
  var save_status = $j.m.OtherMutation._save( processed_results );
  var status = save_status[0];
  var errors = save_status[1];
  ok( status, "_save() - stored ok " );
  ok( errors.length == 0, "_save() - no errors recieved from storage " );
  
  var save_status2 = $j.m.OtherMutation._save( processed_results );
  var status2 = save_status2[0];
  var errors2 = save_status2[1];
  ok( status2, "_save() - duplicate entry was handled appropriately " );
  ok( errors2.length == 0, "_save() - no errors fired for duplicate entry (it should be handled internally by the model) " );
  
  var Gene = $j.m.Gene.model;
  var cbx1 = Gene.find({ first: true, where: { symbol: 'Cbx1' } });
  equals( cbx1.getOtherMutationCount(), 1, "_save() - should only have one entry for Cbx1 " );
  
  ok( $j.m.Gene.search('Art4'), "search() - search pipe for Art4 ok " );
});

test( "OtherMutation model - 'dcc' search example", function () {
  ok( $j.m.OtherMutation._drop(), "dropped the storage table " );
  ok( $j.m.OtherMutation._define(), "re-created the storage table " );
  var OtherMutation = $j.m.OtherMutation.model;
  
  var mart = $j.m.OtherMutation._marts.dcc;
  equals( mart['dataset_name'], 'dcc', "_marts() - got correct dataset name " );
  
  var raw_results = $j.m.OtherMutation._biomart_search( 'Cbx1', mart );
  ok( raw_results.length > 0, "_biomart_search() - got some results from the biomart " );
  
  var preprocessed_results = $j.m.OtherMutation._biomart_tsv2json_ah( raw_results, mart );
  ok( preprocessed_results.length > 0, "_biomart_tsv2json_ah() - pre-processing results ok " );
  
  var processed_results = $j.m.OtherMutation._biomart_prep_storage( preprocessed_results, mart );
  ok( processed_results.length > 0, "_biomart_prep_storage() - process results for storage ok " );
  
  var save_status = $j.m.OtherMutation._save( processed_results );
  var status = save_status[0];
  var errors = save_status[1];
  ok( status, "_save() - stored ok " );
  ok( errors.length == 0, "_save() - no errors recieved from storage " );
  
  var save_status2 = $j.m.OtherMutation._save( processed_results );
  var status2 = save_status2[0];
  var errors2 = save_status2[1];
  ok( status2, "_save() - duplicate entry was handled appropriately " );
  ok( errors2.length == 0, "_save() - no errors fired for duplicate entry (it should be handled internally by the model) " );
  
  var Gene = $j.m.Gene.model;
  var cbx1 = Gene.find({ first: true, where: { symbol: 'Cbx1' } });
  equals( cbx1.getOtherMutationCount(), 5, "_save() - should have 5 entries for Cbx1 " );
  
  ok( $j.m.Gene.search('Art4'), "search() - search pipe for Art4 ok " );
});

ActiveRecord.logging = false;