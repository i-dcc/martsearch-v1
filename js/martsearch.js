/*
* MartSearch - the main object.  This is the governing object for the 
* whole search application.
* 
* @depends support.js
* @depends message.js
* @depends index.js
* @depends dataset.js
*/
MartSearch = function ( params ) {
  var ms = this;
  
  // Set the base url if appropriate
  ms.base_url = params.base_url ? params.base_url : "";
  
  // Instantiate the messaging object
  ms.message = new Message({ base_url: ms.base_url });
  
  // Load in the config file
  jQuery.ajax({
    url:      ms.base_url + "/conf/martsearch.json",
    type:     'GET',
    dataType: 'json',
    async:    false,
    success:  function (conf) {
      jQuery.extend( params, conf );
    },
    error:    function( XMLHttpRequest, textStatus, errorThrown ) {
      init_status = false;
      var error_msg = "Error initializing MartSearch - " + textStatus + " ("+ XMLHttpRequest.status +") please reload the page.";
      log.error( error_msg );
      ms.message.add( error_msg, "error", XMLHttpRequest.responseText );
    }
  });
  
  // Configure and instantiate the index object
  jQuery.extend( params.index_conf, { base_url: ms.base_url } );
  ms.index = new Index( params.index_conf );
  
  // Load the browsable content configuration
  ms.browsable_content = params.browsable_content;
  
  // Build the test_conf into the MartSearch object
  ms.test_conf = params.test_conf;
  
  // Custom functions
  ms.pre_search_hook  = params.pre_search_hook;
  ms.post_search_hook = params.post_search_hook;
  
  // Placeholder for dataset objects
  ms.datasets = [];
  
  // Placeholders for useful globals
  ms.current_query         = "";
  ms.current_results       = {};
  ms.current_results_total = 0;
  ms.current_mode          = undefined;
  ms.completed_searches    = 0;
};

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
      if ( jQuery('#query').val() !== "" ) {
        // Clear the intro text and submit the search
        jQuery('#intro_text').fadeOut("fast");
        ms.search( jQuery('#query').val(), 0, 'search' );
      } else {
        // Clear any messages and previous results
        if ( jQuery(".messages").html() !== "" ) { ms.message.clear(); }
        jQuery("#search_result_list").html("");
        jQuery("#search_results .pagination").html("");
        jQuery('#intro_text').fadeIn("fast");
      }
      return false;
    });
    
    // Activate links between the tabs
    jQuery('a.help_link').click( function()  { jQuery('#tabs').tabs('select', 2); return false; } );
    jQuery('a.about_link').click( function() { jQuery('#tabs').tabs('select', 3); return false; } );
    
    /**
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
          ms.datasets.push(ds);
        }
        log.info('[config] finished loading datasets');
      },
      error:    function( XMLHttpRequest, textStatus, errorThrown ) {
        init_status = false;
        var error_msg = "Error initializing martsearch datasets - " + textStatus + " ("+ XMLHttpRequest.status +")";
        log.error( error_msg );
        ms.message.add( error_msg, "error", XMLHttpRequest.responseText );
      }
    });
    
    /**
    * Make sure the index is up
    */
    if ( ms.index.is_alive() !== true ) {
      init_status = false;
      ms.message.add(
        "Sorry the main search index is offline - this tool will not function without the main search index. Please check back soon.  Sorry for any inconvenience caused.",
        "error",
        undefined
      );
    }
    
    /**
    * Finish up
    */
    
    // Focus the users input
    jQuery('#query').focus();
    
    // Load any stored messages
    ms.message.init();
    
    // Build the browsable content
    if ( ms.browsable_content ) {
      var browsers = new EJS({ url: ms.base_url + "/js/templates/martsearch_browse.ejs" }).render({ ms: ms });
      jQuery("#browse_controls").html(browsers);
      jQuery("#browse_controls ul.browse_list li").click( function() {
        ms.search( jQuery(this).find("a").attr("rel"), 0, "browse" );
      });
    }
    
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
    * Finally, build the Sanger statistics table...
    */
    ms.sanger_statistics();
    
    // If all goes well, return true.
    return init_status;
  },
  
  /**
  *
  */
  search: function ( search_string, page, search_or_browse ) {
    
    // Set the scope
    var ms = this;
    
    ms.current_query      = search_string;
    ms.current_mode       = search_or_browse;
    ms.searches_completed = 0;
    ms.current_results    = {};
    
    // Show the loading indicator
    jQuery("#"+ms.current_mode+"_loading").fadeIn("fast");
    
    // Calculate what our starting doc is
    var start_doc = 0;
    if ( page ) { start_doc = page * ms.index.docs_per_page; }
    
    // Clear any messages and previous results
    if ( jQuery(".messages").html() !== "" ) { ms.message.clear(); }
    jQuery("#"+ms.current_mode+"_result_list").html("");
    jQuery("#"+ms.current_mode+"_results .pagination").html("");
    
    // Run any pre search functions
    if ( ms.pre_search_hook ) { ms.pre_search_hook(); }
    
    // Query the index
    var index_response = ms.index.search( search_string, start_doc );
    
    // Only continue if the index has returned something... (No point otherwise!)
    if ( index_response ) {
      // Fetch the pre-computed mart search terms from the index search
      var index_values = ms.index.grouped_query_terms();
      
      // Load in the doc skeleton...
      var docs = new EJS({ url: ms.base_url + "/js/templates/docs.ejs" }).render(
        {
          ms:             ms,
          docs:           index_response.response.docs,
          primary_field:  ms.index.primary_field,
          datasets:       ms.datasets
        }
      );
      jQuery("#"+ms.current_mode+"_result_list").html(docs);
      
      // See if we need to paginate results (using the jquery.pagination plugin)
      if ( index_response.response.numFound > ms.index.docs_per_page ) {
        jQuery("#"+ms.current_mode+"_results .pagination").pagination( 
          index_response.response.numFound,
          {
            items_per_page:       ms.index.docs_per_page,
            num_edge_entries:     1,
            num_display_entries:  5,
            current_page:         page,
            callback:             function(page,dom_elem){ ms._pager(page,dom_elem); }
          }
        );
      }
      
      // Kick off each dataset search...
      for (var j=0; j < ms.datasets.length; j++) {
        var ds = ms.datasets[j];
        if ( index_values[ ds.joined_index_field ] !== undefined && index_values[ ds.joined_index_field ] !== "" ) {
          ds.search( index_values[ ds.joined_index_field ], index_response.response.docs, ms.index.primary_field );
        }
      }
      
      // Finally, load the index results into the 'current_results' stash
      ms.current_results_total = index_response.response.numFound;
      for (var i=0; i < index_response.response.docs.length; i++) {
        var doc = index_response.response.docs[i];
        ms.current_results[ doc[ms.index.primary_field] ] = {};
        ms.current_results[ doc[ms.index.primary_field] ]['doc'] = doc;
      }
      
    }
    else {
      
      // Cancel the loading/working indicator
      jQuery("#"+ms.current_mode+"_loading").fadeOut("fast");
      
    }
    
    return false;
  },
  
  /**
  * Helper function to be called after a biomart search has been completed. 
  * This will allow the use of custom post-search functions to interact with 
  * the returned data as a whole.
  */
  _search_completed: function () {
    var ms = this;
    
    // We're being called, so increment the completed_search count
    ms.completed_searches = ms.completed_searches + 1;
    
    if ( ms.completed_searches < ms.datasets.length ) {
      // Do nothing - we're still waiting!
    }
    else {
      // All searches completed!
      
      // Run any post search functions
      if ( ms.post_search_hook ) { ms.post_search_hook(); }
      
      // Make the dataset 'bubbles' toggleable
      jQuery('.dataset_title').toggleControl('.dataset_content', { hide: false, speed: "fast" });
      
      /**
      * Make the doc 'bubbles' toggleable, and if there is a lot of results 
      * to go through, collapse them...
      */
      if ( ms.current_results_total > ms.index.docs_per_page ) {
        jQuery('.doc_title').toggleControl('.doc_content', { speed: "fast" });
      }
      else {
        jQuery('.doc_title').toggleControl('.doc_content', { hide: false, speed: "fast" });
      }
      
      // Finally, hide the loading/working indicator
      jQuery("#"+ms.current_mode+"_loading").fadeOut("fast");
      
    }
    
  },
  
  /**
  * Helper function to handle pagination of the search results
  * 
  */
  _pager: function ( new_page_index, pagination_container ) {
    this.search( this.current_query, new_page_index, ms.current_mode );
    return false;
  },
  
  /**
  * Helper function to produce the 'content_id' for each mart 'bubble'
  * This is the unique DOM id of each 'bubble' so that we can know where to 
  * inject our results.  It is made up of the datasets internal_name and a 
  * string concatenation of the search terms used to search the mart in that 
  * 'bubble' - in theory this should be sufficiently unique for our purposes.
  */
  _content_id: function ( dataset, search_terms ) {
    var content_id = false;
    if ( search_terms !== undefined && search_terms !== "" ) {
      // Make the content_id equal to the search terms
      content_id = search_terms;
      
      // If we're presented with an array, join the elements into a string
      if ( typeof content_id != 'string' ) { content_id = content_id.join('_'); }
      
      // Now parse out some unpleasant characters
      content_id = content_id.replace( /\(/g, "-" ).replace( /\)/g, "-" ).replace( /\*/g, "-" ).replace( /\;/g, "-" ).replace( /\./g, "-" );
      
      // Shrink the string to something manageable
      content_id = content_id.substr(0,30);
      
      // Finally, prepend the dataset identifier
      content_id = dataset.internal_name + '_' + content_id;
    }
    return content_id;
  },
  
  /**
  * Sanger specific function to generate the overall statistics table on page load.
  * 
  */
  sanger_statistics: function () {
    var ms = this;
    
    // Define the searches we're going to perform for our counts...
    var searches = {
      "Phenotyping": {
        funding: [
          { name: "WTSI",    url: "http://www.sanger.ac.uk/Teams/Team109/" },
          { name: "EUMODIC", url: "http://www.eumodic.org/" }
        ],
        dataset: "phenotyping",
        url: ms.base_url + "/htgtdev",
        filters: {}
      },
      "Mice": {
        funding: [
          { name: "WTSI",    url: "http://www.sanger.ac.uk/Teams/Team109/" },
          { name: "EUMODIC", url: "http://www.eumodic.org/" }
        ],
        dataset: "kermits",
        url: ms.base_url + "/htgt",
        filters: {
          status_code: "GC"
        }
      },
      "Targeted ES Cells": {
        funding: [
          { name: "KOMP",   url: "http://www.knockoutmouse.org/" },
          { name: "EUCOMM", url: "http://www.eucomm.org/" }
        ],
        dataset: "htgt_targ",
        url: ms.base_url + "/htgt",
        filters: {
          status: "Mice - Genotype confirmed,Mice - Germline transmission,Mice - Microinjection in progress,ES Cells - Targeting Confirmed"
        }
      },
      "Gene Targeting Vectors": {
        funding: [
          { name: "KOMP",   url: "http://www.knockoutmouse.org/" },
          { name: "EUCOMM", url: "http://www.eucomm.org/" }
        ],
        dataset: "htgt_targ",
        url: ms.base_url + "/htgt",
        filters: {
          status: "Mice - Genotype confirmed,Mice - Germline transmission,Mice - Microinjection in progress,ES Cells - Targeting Confirmed,ES Cells - No QC Positives,ES Cells - Electroporation Unsuccessful,ES Cells - Electroporation in Progress,Vector - DNA Not Suitable for Electroporation,Vector Complete"
        }
      },
      "MICER": {
        funding: [
          { name: "WT", url: "http://www.wellcome.ac.uk/" }
        ],
        dataset: "bacs",
        url: ms.base_url + "/htgtdev",
        filters: {
          library: "MICER"
        }
      },
      "C57Bl/6J BACs": {
        funding: [
          { name: "WT", url: "http://www.wellcome.ac.uk/" }
        ],
        dataset: "bacs",
        url: ms.base_url + "/htgtdev",
        filters: {
          library: "C57Bl/6J"
        }
      },
      "129S7 BACs": {
        funding: [
          { name: "WT", url: "http://www.wellcome.ac.uk/" }
        ],
        dataset: "bacs",
        url: ms.base_url + "/htgtdev",
        filters: {
          library: "129S7"
        }
      }
    };
    
    // Draw the table skeleton...
    var content = new EJS({ url: ms.base_url + "/js/templates/sanger_statistics.ejs" }).render({ searches: searches });
    jQuery('#summary_statistics').html(content);
    
    // Prep and fire the searches...
    jQuery.each( searches, function ( product_type, search_definition ) {
      var dom_id = "#stats_" + product_type.replace(/ /ig, "_").replace( /\//ig, "_");
      
      // Build the XML file
      var xml = '';
      xml += '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE Query>';
      xml += '<Query  virtualSchemaName="default" formatter="TSV" header="0" uniqueRows="1" count="1" datasetConfigVersion="0.6" >';
      xml += '<Dataset name="' + search_definition.dataset + '" interface="default" >';
      
      jQuery.each( search_definition.filters, function ( filter, value ) {
        xml += '<Filter name="' + filter + '" value="'+ value +'"/>';
      });
      
      xml += '</Dataset>';
      xml += '</Query>';
      
      // Fire the mart search and update the table cell
      jQuery.ajax({
        type: "POST",
        url: search_definition.url + "/biomart/martservice",
        async: true,
        data: { "query": xml },
        success: function ( data ) { jQuery(dom_id).html(data); }
      });
    });
  }
};

