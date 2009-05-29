/*
* MartSearch - the main object.  This is the governing object for the 
* whole search application.
*/
MartSearch = function ( params ) {
  this.base_url = params.base_url ? params.base_url : "";
  
  // Configure and instantiate the index object
  var index_conf = {};
  if ( params.index_conf ) {
    index_conf = {
      base_url:       this.base_url,
      url:            params.index_conf.url ? params.index_conf.url : "/solr",
      primary_field:  params.primary_field,
      docs_per_page:  params.index_conf.docs_per_page ? params.index_conf.docs_per_page : 10
    };
  }
  else {
    index_conf = {
      base_url:       this.base_url,
      url:            "/solr",
      primary_field:  "marker_symbol",
      docs_per_page:  10
    }
  };
  this.index = new Index( index_conf );
  
  // Instantiate the messaging object
  this.message = new Message({ base_url: this.base_url });
  
  // Placeholder for dataset objects
  this.datasets = [];
  
  this.current_query = "";
}

MartSearch.prototype = {
  
  /*
  * Initializes the MartSearch application by loading config files and 
  * adding observers to the appropriate DOM elements.
  * 
  * @alias    MartSearch.init
  * @return   {Boolean}
  */
  init: function() {
    // scope the local object
    var ms = this;
    
    // Set a variable to determine the status of the function run
    var init_status = true;
    
    /*
    * Make the interface active...
    */
    
    // Make the page tabbed
    jQuery('#tabs').tabs({ fx: { opacity: 'toggle' } });
    
    // Override the submit function on the search form
    jQuery('#mart_search').submit( function(){
      ms.current_query = jQuery('#query').val();
      ms.search( ms.current_query, 0 );
      return false;
    });
    
    // Activate links between the tabs
    jQuery('a.help_link').click( function() { jQuery('#tabs').tabs('select', 4); return false; });
    jQuery('a.about_link').click(function() { jQuery('#tabs').tabs('select', 5); return false; });
    
    // Make form buttons respond to mouse interaction
    jQuery(".ui-button:not(.ui-state-disabled)")
      .hover(
        function(){ jQuery(this).addClass("ui-state-hover"); },
        function(){ jQuery(this).removeClass("ui-state-hover"); }
      )
      .mousedown(function(){
        jQuery(this).parents('.ui-buttonset-single:first').find(".ui-button.ui-state-active").removeClass("ui-state-active");
        if( jQuery(this).is('.ui-state-active.ui-button-toggleable, .ui-buttonset-multi .ui-state-active') ){ jQuery(this).removeClass("ui-state-active"); }
        else { jQuery(this).addClass("ui-state-active"); }	
      })
      .mouseup(function(){
        if(! jQuery(this).is('.ui-button-toggleable, .ui-buttonset-single .ui-button,  .ui-buttonset-multi .ui-button') ){
          jQuery(this).removeClass("ui-state-active");
        }
      });
    
    /*
    * Load in the dataset config files
    */
    
    jQuery.ajax({
      url:      ms.base_url + "/bin/dataset-feed.pl",
      type:     'GET',
      dataType: 'json',
      async:    false,
      success:  function (datasets) {
        for (var i=0; i < datasets.length; i++) {
          var ds = new DataSet( datasets[i], ms.base_url );
          ms.datasets.push(ds)
        };
        log.info('[config] finished loading datasets');
      },
      error:    function( XMLHttpRequest, textStatus, errorThrown ) {
        init_status = false;
        log.error( "Error initializing datasets - " + textStatus + " ("+ XMLHttpRequest.status +")" );
        ms.message.add(
          "Error initializing martsearch datasets - " + textStatus + " ("+ XMLHttpRequest.status +")",
          "error",
          XMLHttpRequest.responseText
        );
      }
    });
    
    /*
    * Make sure the index is up
    */
    if ( ms.index.is_alive() != true ) {
      ms.message.add(
          "Sorry the main search index is offline - this tool will not function without "
        + "the main search index. Please check back soon.  Sorry for any inconvenience caused.",
        "error",
        undefined
      );
    };
    
    /*
    * Finish up
    */
    
    // Focus the users input
    jQuery('#query').focus();
    
    // Load any stored messages
    ms.message.init();
    
    // If all goes well, return true.
    return init_status;
  },
  
  /**
  *
  */
  search: function ( search_string, page ) {
    
    // Set the scope
    var ms = this;
    
    // Show the loading indicator
    jQuery("#loading").show();
    
    // Calculate what our starting doc is
    var start_doc = 0;
    if ( page ) { start_doc = page * ms.index.docs_per_page; };
    
    // Clear any messages and previous results
    if ( jQuery("#messages").html() != "" ) { ms.message.clear(); };
    jQuery("#result_list").html("");
    
    // Query the index
    var index_response = ms.index.search( search_string, start_doc );
    
    // Only continue if the index has returned something... (No point otherwise!)
    if ( index_response ) {
      // Fetch the pre-computed mart search terms from the index search
      var index_values = ms.index.grouped_query_terms();
      
      // See if we need to paginate results
      // (Using the jquery.pagination plugin)
      if ( index_response.response.numFound > ms.index.docs_per_page ) {
        jQuery('#results_pager').pagination( 
          index_response.response.numFound,
          {
            items_per_page:       ms.index.docs_per_page,
            num_edge_entries:     1,
            num_display_entries:  5,
            current_page:         page,
            callback:             function(page,dom_elem){ ms.pager(page,dom_elem) }
          }
        );
      }
      else {
        jQuery("#results_pager").html("");
      };

      // Load in the doc skeleton...
      var docs = new EJS({ url: ms.base_url + "/js/templates/docs.ejs" }).render(
        {
          docs:           index_response.response.docs,
          primary_field:  ms.index.primary_field,
          datasets:       ms.datasets
        }
      );
      jQuery("#result_list").html(docs);

      // Load in each dataset...
      for (var i=0; i < ms.datasets.length; i++) {
        var ds = ms.datasets[i];
        if ( index_values[ ds.joined_index_field ] !== undefined && index_values[ ds.joined_index_field ] !== "" ) {
          ds.search( index_values[ ds.joined_index_field ], index_response.response.docs, ms.index.primary_field );
        };
      };
      
    };
    
    
    // Hide the loading indicator
    jQuery("#loading").hide();
    
    return false;
  },
  
  /**
  * Helper function to handle pagination of the search results
  * 
  */
  pager: function ( new_page_index, pagination_container ) {
    this.search( this.current_query, new_page_index );
    return false;
  }
  
  
};

