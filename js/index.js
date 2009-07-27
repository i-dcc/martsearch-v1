/*
* @namespace    {DataSet}
* 
* Index class - used to represent the index used in the searches
*/
Index = function ( params ) {
  this.base_url       = params.base_url ? params.base_url : "";
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
        if ( data.status === "OK" ) { status = true; }
      },
      error:    function( XMLHttpRequest, textStatus, errorThrown ) {
        log.error( "Error pinging index at '"+ ping_url +"' ("+ textStatus +":"+ errorThrown +")" );
      }
    });
    
    return status;
  },
  
  /*
  * Wrapper function to submit a search to the index, then 
  * return the resulting JSON object -- returns false in the 
  * event of an error.
  * 
  * @alias    Index.search
  * @param    {String}    The query string to search for.
  * @param    {Integer}   The start position for the search results.
  */
  search: function ( query, start_pos ) {
    var idx = this;
    var search_results = {};
    
    jQuery.ajax({
      type:     "POST",
      url:      idx.url + "/select",
      async:    false,
      dataType: "json",
      data: {
        wt:         "json",
        q:          query,
        sort:       idx.primary_field + " asc",
        start:      start_pos,
        rows:       idx.docs_per_page
      },
      success:  function ( json ) {
        idx.raw_results = json;
        
        // Load the index results into the 'current_results' stash
        ms.current_results_total = json.response.numFound;
        for (var i=0; i < json.response.docs.length; i++) {
          var doc = json.response.docs[i];
          ms.current_results[ doc[idx.primary_field] ] = {};
          ms.current_results[ doc[idx.primary_field] ]['doc'] = doc;
        }
      },
      error:    function( XMLHttpRequest, textStatus, errorThrown ) {
        var error_msg = "Error querying index @ '"+ idx.url +"' for '"+ query +"' ("+ XMLHttpRequest.status +")";
        log.error( error_msg );
        idx.message.add( error_msg, "error", XMLHttpRequest.responseText );
        idx.raw_results = false;
        ms.current_results_total = 0;
        ms.current_results = {};
      }
    });
    
    return idx.raw_results;
  },
  
  /**
  * Helper function to process the results of the JSON response and 
  * extract the fields from each doc into a hash (which is returned) 
  * -- returns false in the event of an error, i.e. if the search 
  * results JSON object is non-existent.
  * 
  * @alias    Index.grouped_query_terms
  */
  grouped_query_terms: function () {
    var idx = this;
    
    if ( idx.raw_results !== false ) {
      var grouped_terms = {};
      
      for (var i=0; i < idx.raw_results.response.docs.length; i++) {
        var doc = idx.raw_results.response.docs[i];
        var fields = jQuery.keys(doc);

        for (var j=0; j < fields.length; j++) {
          // Find or create a key/value pair for this field type
          if ( grouped_terms[ fields[j] ] === undefined ) { grouped_terms[ fields[j] ] = []; }

          if ( typeof doc[ fields[j] ] == "string" ) {
            grouped_terms[ fields[j] ].push( doc[ fields[j] ] );
          } else {
            for (var k=0; k < doc[ fields[j] ].length; k++) {
              grouped_terms[ fields[j] ].push( doc[ fields[j] ][k] );
            }
          }
        }
      }

      // Remove duplicate entries... 
      var keys = jQuery.keys(grouped_terms);
      for (var l=0; l < keys.length; l++) {
        grouped_terms[ keys[l] ] = jQuery.uniq( grouped_terms[ keys[l] ] );
      }
      
      idx.grouped_terms = grouped_terms;
    }
    else {
      idx.grouped_terms = false;
    }
    
    return idx.grouped_terms;
  }
  
};