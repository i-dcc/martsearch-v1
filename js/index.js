/*
* @namespace    {DataSet}
* 
* Index class - used to represent the index used in the searches
*/
Index = function ( params ) {
  this.base_url       = params.base_url ? params.base_url : ""
  this.url            = this.base_url + params.url;
  this.full_url       = params.full_url;
  this.docs_per_page  = params.docs_per_page;
  this.message        = new Message({ base_url: this.base_url });
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
  * @param    {Function}  Callback function to handle the results.
  */
  search: function ( query, start_pos, callback ) {
    var search_url = this.url + "/select";
    
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
        
        jQuery.each( json.response.docs, function ( index, gene ) {
          
          marker_symbols.push( gene.marker_symbol );
          
          if ( gene.escell && gene.escell.length > 0 ) {
            $.each( gene.escell, function (index) {
              escell_clones.push( gene.escell[index] );
            });
          };
          
        });
        
        num_results = json.response.numFound;
      }
    });
    
  }
  
};