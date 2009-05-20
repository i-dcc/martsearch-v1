module("dataset");

// Load in the dataset configs so we can check some details...
var datasets = [];
jQuery.ajax({
  url:      ms.base_url + "/bin/dataset-feed.pl",
  type:     'GET',
  dataType: 'json',
  async:    false,
  success:  function (sets) { datasets = sets; }
});

for (var i=0; i < ms.datasets.length; i++) {
  var ds = ms.datasets[i];
  var ds_chk = datasets[i];
  datasetTests(ds,ds_chk);
};

function datasetTests ( ds, ds_chk ) {
  
  ds.test_mode  = true;
  ds.debug_mode = true;
  
  // define search strings to test with...
  var safe_search = "cbx1";
  var not_so_safe_search = "chromosome:1";
  
  test( ds.display_name+" - Basic object attributes ", function() {
    expect(3);
    equals( ds.display_name, ds_chk.display_name, "Dataset 'display_name' is correct " );
    equals( ds.enabled_attributes instanceof Array, true, "'enabled_attributes' is an array " );
    equals( ds.mart_dataset, ds_chk.mart_dataset, "Pointing to the correct dataset " );
  });
  
  test( ds.display_name+" - Retrieving all biomart attributes dynamically ", function() {
    ds.fetch_all_attributes();

    expect(3);
    ok( jQuery.keys(ds.attributes).length > 0, "We returned some attributes " );
    equals( ds.attributes instanceof Object, true, "'attributes' is an object " );
    
    // Deliberatly fail the fetch...
    var real_url = ds.url;
    ds.url = '/foo';
    ds.fetch_all_attributes();
    ok( jQuery.keys(ds.attributes).length == 0, "We failed to fetch any attributes " );

    ds.url = real_url;
    ds.fetch_all_attributes();
  });
  
  test( ds.display_name+" - Simulating a safe search piece by piece: '"+safe_search+"' ", function() {
    // Query the index
    var index_response = ms.index.search( safe_search, 0 );
    ok( index_response instanceof Object, "Got an index response object " );
    if ( typeof console.log != "undefined" ) { console.log(index_response); };
    
    
    // Fetch the pre-computed mart search terms from the index search
    var index_values = ms.index.grouped_query_terms();
    ok( index_values instanceof Object, "Got a pre-computed mart search term object from the index " );
    if ( typeof console.log != "undefined" ) { console.log(index_values); };
    
    if ( index_values[ ds.joined_index_field ] ) {
      // Build the biomart XML
      var xml = ds._biomart_xml( index_values[ ds.joined_index_field ] );
      ok( typeof xml == "string", "Got an XML string " );
      
      // Post the biomart call
      var results = {};
      
      jQuery.ajax({
        type:     "POST",
        url:      ds.url + "/martservice",
        async:    false,
        data:     { query: xml },
        success:  function ( data ) {
          if ( ds.custom_result_parser == undefined ) {
            results = ds._parse_biomart_data( data, index_response.response.docs, ms.index.primary_field );
          }
          else {
            results = ds.custom_result_parser( data, ds );
          };
        }
      });
      
      ok( jQuery.keys(results).length > 0 || results === false, "Got some results or 'false' from the biomart query " );
      if ( typeof console.log != "undefined" ) { console.log(results); };
      
    };
    
  });
  
  test( ds.display_name+" - Simulating a not so safe search piece by piece: '"+not_so_safe_search+"' ", function() {
    // Query the index
    var index_response = ms.index.search( not_so_safe_search, 0 );
    ok( index_response instanceof Object, "Got an index response object " );
    if ( typeof console.log != "undefined" ) { console.log(index_response); };
    
    // Fetch the pre-computed mart search terms from the index search
    var index_values = ms.index.grouped_query_terms();
    ok( index_values instanceof Object, "Got a pre-computed mart search term object from the index " );
    if ( typeof console.log != "undefined" ) { console.log(index_values); };
    
    if ( index_values[ ds.joined_index_field ] ) {
      // Build the biomart XML
      var xml = ds._biomart_xml( index_values[ ds.joined_index_field ] );
      ok( typeof xml == "string", "Got an XML string " );
      
      // Post the biomart call
      var results = {};
      
      jQuery.ajax({
        type:     "POST",
        url:      ds.url + "/martservice",
        async:    false,
        data:     { query: xml },
        success:  function ( data ) {
          if ( ds.custom_result_parser == undefined ) {
            results = ds._parse_biomart_data( data, index_response.response.docs, ms.index.primary_field );
          }
          else {
            results = ds.custom_result_parser( data, ds );
          };
        }
      });
      
      ok( jQuery.keys(results).length > 0 || results === false, "Got some results or 'false' from the biomart query " );
      if ( typeof console.log != "undefined" ) { console.log(results); };
      
    };
    
  });
  
  test( ds.display_name+" - Running a safe search: '"+safe_search+"' ", function() {
    // Query the index
    var index_response = ms.index.search( safe_search, 0 );
    ok( index_response instanceof Object, "Got an index response object " );
    if ( typeof console.log != "undefined" ) { console.log(index_response); };
    
    // Fetch the pre-computed mart search terms from the index search
    var index_values = ms.index.grouped_query_terms();
    ok( index_values instanceof Object, "Got a pre-computed mart search term object from the index " );
    if ( typeof console.log != "undefined" ) { console.log(index_values); };
    
    if ( index_values[ ds.joined_index_field ] ) {
      var results = ds.search( index_values[ ds.joined_index_field ], index_response.response.docs, ms.index.primary_field );
      ok( jQuery.keys(results).length > 0 || results === false, "Got some results or 'false' from the biomart query " );
      if ( typeof console.log != "undefined" ) { console.log(results); };
    }
  });
  
  test( ds.display_name+" - Running a not so safe search: '"+not_so_safe_search+"' ", function() {
    // Query the index
    var index_response = ms.index.search( not_so_safe_search, 0 );
    ok( index_response instanceof Object, "Got an index response object " );
    if ( typeof console.log != "undefined" ) { console.log(index_response); };
    
    // Fetch the pre-computed mart search terms from the index search
    var index_values = ms.index.grouped_query_terms();
    ok( index_values instanceof Object, "Got a pre-computed mart search term object from the index " );
    if ( typeof console.log != "undefined" ) { console.log(index_values); };
    
    if ( index_values[ ds.joined_index_field ] ) {
      var results = ds.search( index_values[ ds.joined_index_field ], index_response.response.docs, ms.index.primary_field );
      ok( jQuery.keys(results).length > 0 || results === false, "Got some results or 'false' from the biomart query " );
      if ( typeof console.log != "undefined" ) { console.log(results); };
    }
  });
  
  test( ds.display_name+" - Simulating a failed search: '"+safe_search+"' ", function() {
    // Deliberatley bork the dataset URL
    var real_url = ds.url;
    ds.url = "/foo";
    
    // Query the index
    var index_response = ms.index.search( safe_search, 0 );
    ok( index_response instanceof Object, "Got an index response object " );
    if ( typeof console.log != "undefined" ) { console.log(index_response); };
    
    // Fetch the pre-computed mart search terms from the index search
    var index_values = ms.index.grouped_query_terms();
    ok( index_values instanceof Object, "Got a pre-computed mart search term object from the index " );
    if ( typeof console.log != "undefined" ) { console.log(index_values); };
    
    if ( index_values[ ds.joined_index_field ] ) {
      var results = ds.search( index_values[ ds.joined_index_field ], index_response.response.docs, ms.index.primary_field );
      ok( jQuery.keys(results).length > 0 || results === false, "Got some results or 'false' from the biomart query " );
      if ( typeof console.log != "undefined" ) { console.log(results); };
    }
    
    // Set the URL back
    ds.url = real_url;
  });
  
  test( ds.display_name+" - Generating a Biomart search link url ", function() {
    expect(3);
    var url = ds.search_link_url( safe_search );
    ok( typeof url === "string", "Got a string back " );
    ok( url !== "", "String is not empty " );
    ok( url.match(/^http:\/\/.*/), "Got a valid url " );
  });
};
