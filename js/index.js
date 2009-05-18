/*
* @namespace    {DataSet}
* 
* Index class - used to represent the index used in the searches
*/
Index = function ( params ) {
  this.base_url       = params.base_url ? params.base_url : ""
  this.url            = this.base_url + params.url;
  this.primary_field  = params.primary_field;
  this.docs_per_page  = params.docs_per_page;
  this.message        = new Message({ base_url: this.base_url });
  
  this.raw_results    = {};
};

Index.prototype = {
  
  /*
  * Simple heartbeat function to determine if the index 
  * service is alive.
  * 
  * @alias    Index.is_alive
  * @return   {Boolean}
  */
  is_alive: function () {
    var ping_url = this.url + "/admin/ping";
    var status   = false;
    
    jQuery.ajax({
      type:     "GET",
      url:      ping_url,
      async:    false,
      dataType: "json",
      data:     { "wt": "json" },
      success:  function ( data ) {
        if ( data.status === "OK" ) { status = true; };
      },
      error:    function( XMLHttpRequest, textStatus, errorThrown ) {
        log.error( "Error pinging index at '"+ ping_url +"' ("+ textStatus +":"+ errorThrown +")" );
      }
    });
    
    return status;
  },
  
  /*
  * Wrapper function to submit a search to the index, then 
  * fire off the resulting JSON object to a callback function.
  * 
  * @alias    Index.search
  * @param    {String}    The query string to search for.
  * @param    {Integer}   The start position for the search results.
  */
  search: function ( query, start_pos ) {
    var search_url = this.url + "/select";
    var search_results = {};
    
    jQuery.ajax({
      type:     "POST",
      url:      search_url,
      async:    false,
      dataType: "json",
      data: {
        wt:         "json",
        q:          query,
        start:      start_pos,
        rows:       this.docs_per_page
      },
      success:  function ( json ) {
        search_results = json;
      }
    });
    
    this.raw_results = search_results;
    return search_results;
  },
  
  /**
  * Helper function to process the results of the JSON response and 
  * extract the fields from each doc into a hash.
  * 
  * @alias    Index.grouped_query_terms
  */
  grouped_query_terms: function () {
    var grouped_terms = {};
    
    for (var i=0; i < this.raw_results.response.docs.length; i++) {
      var doc = this.raw_results.response.docs[i];
      var fields = jQuery.keys(doc);
      
      for (var j=0; j < fields.length; j++) {
        // Find or create a key/value pair for this field type
        if ( grouped_terms[ fields[j] ] == undefined ) { grouped_terms[ fields[j] ] = []; };
        
        if ( typeof doc[ fields[j] ] == "string" ) {
          grouped_terms[ fields[j] ].push( doc[ fields[j] ] );
        } else {
          for (var k=0; k < doc[ fields[j] ].length; k++) {
            grouped_terms[ fields[j] ].push( doc[ fields[j] ][k] );
          };
        };
      };
    };
    
    /**
    * Remove duplicate entries... 
    * For this we use the jQuery.protify plugin to mimic Prototype's 
    * (prototype.js) array manipulation capabilities.
    */
    var fields = jQuery.keys(grouped_terms);
    for (var i=0; i < fields.length; i++) {
      grouped_terms[ fields[i] ] = jQuery.protify( grouped_terms[ fields[i] ] ).uniq();
    };
    
    this.grouped_terms = grouped_terms;
    return grouped_terms;
  }
  
};