
/*
* @namespace {DataSet}
* 
* Dataset class - used to represent a biomart dataset
*/
function DataSet( params ) {
  this.url                = params.url;
  this.full_url           = params.full_url;
  this.mart_dataset       = params.mart_dataset;
  this.display_name       = params.display_name;
  this.joined_index_field = params.joined_index_field;
  this.joined_filter      = params.joined_filter;
  this.mart_conf_version  = params.mart_conf_version ? params.mart_conf_version : "0.6";
  this.default_attributes = params.default_attributes;
  
  /*
  * 
  */
  fetch_all_attributes = function() {
    log.debug('martsearch.conf.base_url - '+martsearch.conf.base_url);
    log.debug('this.url - '+this.url);
    
    var martservice_url = martsearch.conf.base_url + this.url + "/martservice";
    
    var attributes = {};
    
    jQuery.ajax({
      url:      martservice_url,
      type:     'GET',
      async:    true,
      data:     { type: "attributes", dataset: this.mart_dataset },
      success:  function ( data ) {
        attributes = data;
      }
    });
    
    return attributes;
  }
  
  this.attributes = fetch_all_attributes();
  
};


/*
* Index class - used to represent the index used in the searches
*/
function Index() {};


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
  * @alias    MartSearch.init()
  * @return   {Boolean}
  */
  init: function () {
    
    // First load in the dataset config files
    
    jQuery.ajax({
      url:      martsearch.conf.base_url + "/bin/dataset-feed.pl",
      type:     'GET',
      dataType: 'json',
      async:    false,
      success: function (datasets) {
        for (var i=0; i < datasets.length; i++) {
          ds = new DataSet( datasets[i] );
          martsearch.conf.datasets.push(ds)
        };
        
        log.info('[config] finished loading datasets');
      }
    });
    
  }
  
  
};

// jQuery extension to allow us to extract the keys out of a hash object.
jQuery.extend({
  keys: function(obj){
    var a = [];
    jQuery.each(obj, function(k){ a.push(k) });
    return a;
  }
});

// Dummy log variable to stop errors when blackbird is not loaded.
var log = {
  toggle:   function() {},
  move:     function() {},
  resize:   function() {},
  clear:    function() {},
  debug:    function() {},
  info:     function() {},
  warn:     function() {},
  error:    function() {},
  profile:  function() {}
};
