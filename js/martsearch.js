/*
* MartSearch - the main object.  This is the governing object for the 
* whole search application.
*/
MartSearch = function ( params ) {
  this.base_url = params.base_url ? params.base_url : "";
  
  if ( params.index ) {
    this.index = {
      url:  params.index.url ? params.index.url : "/solr",
      full_url: params.index.full_url,
      docs_per_page: params.index.docs_per_page ? params.index.docs_per_page : 10
    };
  } 
  else {
    this.index = {
      url: "/solr",
      full_url: "",
      docs_per_page: 10
    };
  };
  
  this.datasets = [];
  
  this.message = new Message({ base_url: this.base_url });
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
    var martsearch = this;
    
    // Set a variable to determine the status of the function run
    var init_status = true;
    
    /*
    * Make the interface active...
    */
    
    // Make the page tabbed
    jQuery('#tabs').tabs({ fx: { opacity: 'toggle' } });
    
    // Override the submit function on the search form
    jQuery('#mart_search').submit( function(){
      //$j.c.Search.run( jQuery('#query').val(), 0 );
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
      url:      martsearch.base_url + "/bin/dataset-feed.pl",
      type:     'GET',
      dataType: 'json',
      async:    false,
      success:  function (datasets) {
        for (var i=0; i < datasets.length; i++) {
          var ds = new DataSet( datasets[i], martsearch.base_url );
          martsearch.datasets.push(ds)
        };
        log.info('[config] finished loading datasets');
      },
      error:    function( XMLHttpRequest, textStatus, errorThrown ) {
        init_status = false;
        log.error( "Error initializing datasets - " + textStatus + " (" + errorThrown + ")" );
        martsearch.message.add(
          "Error initializing martsearch datasets - " + textStatus + " (" + errorThrown + ")",
          "error"
        );
      }
    });
    
    /*
    * Finish up
    */
    
    // Focus the users input
    jQuery('#query').focus();
    
    // Load any stored messages
    martsearch.message.init();
    
    // If all goes well, return true.
    return init_status;
  }
  
};

