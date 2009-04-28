
/*
* Index class - used to represent the index used in the searches
*/
Index = function() {};


/*
* MartSearch - the main object.  This is the governing object for the 
* whole search application.
*/

var martsearch = {
  
  /*
  * Object to contain configuration options for the application.
  */
  conf: {
    /* URLs for the application */
    base_url:   "",
    index_url:  "/solr/select",

    /* Pagination options */
    items_per_page: 10,
    
    /* Placeholder for datasets */
    datasets: []
  },
  
  /*
  * Initializes the MartSearch application by loading config files and 
  * adding observers to the appropriate DOM elements.
  * 
  * @alias    martsearch.init
  * @return   {Boolean}
  */
  init: function() {
    
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
      url:      martsearch.conf.base_url + "/bin/dataset-feed.pl",
      type:     'GET',
      dataType: 'json',
      async:    false,
      success:  function (datasets) {
        for (var i=0; i < datasets.length; i++) {
          var ds = new DataSet( datasets[i], martsearch.conf.base_url );
          martsearch.conf.datasets.push(ds)
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
  },
  
  /*
  * Functions for controlling user the messaging system 
  * within the app.
  */
  message: {
    /*
    * Init function to run on page load - loads any messages 
    * stored on the server and puts them on screen.
    * @alias  martsearch.message.init
    */
    init: function() {
      var status = true;
      jQuery.ajax({
        url:      martsearch.conf.base_url + "/bin/message-feed.pl",
        type:     "GET",
        async:    true,
        data:     {},
        success:  function( data ) {
          if ( data != "" ) { jQuery("#messages").html( data ); };
        },
        error:    function( XMLHttpRequest, textStatus, errorThrown ) {
          status = false;
          log.error( "Error initializing martsearch messaging - " + textStatus + " (" + errorThrown + ")" );
          martsearch.message.add(
            "Error initializing martsearch messaging - " + textStatus + " (" + errorThrown + ")",
            "error"
          );
        }
      });
      
      return status;
    },
    
    /*
    * 
    * @alias  martsearch.message.clear
    */
    clear: function() {
      jQuery("#messages").html('');
    },
    
    /*
    * 
    * @alias  martsearch.message.add
    * @param  {String} 
    * @param  {String} 
    */
    add: function( message, state ) {
      var message_string = '<div class="ui-state-'+state+' ui-corner-all">';
      
      if ( state === 'error' ) {
        message_string += '<span class="ui-icon ui-icon-alert"></span>';
      } else if ( state === 'highlight' ) {
        message_string += '<span class="ui-icon ui-icon-info"></span>';
      };
      
      message_string += '<p>' + message + '</p></div>';
      jQuery("#messages").append( message_string );
    }
    
  }
  
  
};
