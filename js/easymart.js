
// jQuery extension to allow us to extract the keys out of a hash object.
$.extend({
  keys: function(obj){
    var a = [];
    $.each(obj, function(k){ a.push(k) });
    return a;
  }
});

/*
* easymart - everything is enclosed within this object in order to avoid namespace 
* clashes if/when we make this thing available as a widget/plugin...
*/
var easymart = {
  
  debug: true,
  
  conf: {
    marts: {
      ensembl:    '/config/ensembl.json',
      htgt_targ:  '/config/htgt_targ.json'
      //htgt_trap:  '/config/htgt_trap.json',
    },
    search: [
      {
        name:     'ensembl',
        children: [
          {
            name:     'htgt_targ',
            join_on:  'ensembl_gene_id'
          }
        ]
      }
    ]
  },
  
  // init - Function to be fired on initial page load to set-up the interface.
  init: function() {
    
    // Load in the configuration files and configure the interface
    log.profile('config loading');
    easymart.config.load();
    log.profile('config loading');
    
    // Focus the input on the search bar
    $('#query').focus();
    
    // Attach an error reporter to the 'msg' div on the page
    $('#msg').ajaxError( function(event, request, settings){
      $('#loading').hide();
      $(this).append("<div class='error'>Sorry, error has occured requesting '" + settings.url + "'<br />Please re-submit your request.</div>");
    });
    
    // TODO: Put in a proper error reporting function using the 'error' param from the $.ajax function

    // Attach ajax listeners to the 'loading' div (don't you just love jQuery?!?!?)
    $("#loading").ajaxStart(function(){ $(this).show(); });
    $("#loading").ajaxStop(function(){ $(this).hide(); });
    
    // Override the submit function on the form
    $('#easymart_search').submit( function(){
      easymart.search.run( $('#query').val() );
      return false;
    });
    
  },
  
  // config - Function group used to configure the application.
  config: {
    
    // config.load - Function to load and process the mart configuration files.
    load: function () {
      $.each( easymart.conf.marts, function (name, url) {
        $.getJSON( url, function (json) {
          easymart.conf.marts[name] = json;
        });
      });
    },
    
    // config.build - Function to build the configuration page.
    build: function () {
      var configuration_page = '';
      
      // TODO: Complete the configuration builder function...
      $.each( easymart.conf.marts, function (name, conf) {
        
      });
    }
    
  },
  
  // search - Function group that handles all aspects of the search.
  search: {
    
    // search.run - Controller function to kick off the search
    run: function ( queryStr ) {
      
      // Clean up the page
      $('#msg').html('');
      $('#results').html('');
      
      // TODO: We need to make easymart.conf.search and easymart.conf.marts generated dynamically from user prefs
      $.each( easymart.conf.search, function () {
        easymart.search.submit( easymart.conf.marts[this.name], this, queryStr );
      });
      
    },
    
    // search.submit - Fnuction for submitting the searches
    submit: function ( mart, search_path, queryStr, filter_override ) {
      
      $.ajax({
        type:     "POST",
        url:      mart.url,
        data:     { query: easymart.search.build_biomart_xml( mart, queryStr, filter_override ) },
        success:  function (data) {
          if (data) {
            
            // Do something with the data...
            var json_data = easymart.search.csv2json( mart, data );
            
            // TODO: Need to do something more with the data here...
            $('#results').append( data );
            
            // Now see if we need to submit any child searches
            if ( search_path.children ) {
              
              $.each( search_path.children, function (i) {

                var child_mart = easymart.conf.marts[ search_path.children[i].name ];
                var child_query = {};

                // Extract the info that we are going to query the second mart by
                $.each( json_data, function (j) {
                  if ( this[ search_path.children[i].join_on ] ) {
                    child_query[ this[ search_path.children[i].join_on ] ] = '';
                  };
                });
                
                easymart.search.submit( child_mart, search_path.children[i], $.keys(child_query).join(","), search_path.children[i].join_on );
                
              });
              
            };
            
          } else {
            $('#results').append('<span class="no-results">Sorry, no results were returned by your search.</span>');
          };
        }
      });
      
      
    },
    
    // search.build_results - Function to build and display the results structure
    build_results: function () {
      // body...
    },
    
    // search.build_biomart_xml - Helper for writing the biomart XML to a variable
    build_biomart_xml: function ( mart, query, filter_override ) {
      var xml = '';
      xml += '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE Query>';
      xml += '<Query  virtualSchemaName="default" formatter="CSV" header="0" uniqueRows="1" count="" datasetConfigVersion="' + mart.datasetConfigVersion + '" >';
      xml += '<Dataset name="' + mart.dataset_name + '" interface="default" >';

      var params = [];
      
      if ( filter_override ) {
        params.push('<Filter name="'+ filter_override +'" value="'+ query +'"/>');
      } else {
        
        for (var i=0; i < mart.filters.length; i++) {
          if ( mart.filters[i].enabled ) {
            params.push('<Filter name="' + mart.filters[i].name + '" value="'+ query +'"/>');
          };
        };
        
      };
      
      for (var i=0; i < mart.attributes.length; i++) {
        if ( mart.attributes[i].enabled ) {
          params.push('<Attribute name="' + mart.attributes[i].name + '" />');
        };
      };
      
      xml += params.join('');
      xml += '</Dataset>';
      xml += '</Query>';
      return xml;
    },
    
    // search.csv2json - Helper to convert a CSV file to a JSON object
    csv2json: function ( mart, data ) {
      // First we'll figure out our keys for our JSON objects - this
      // is the 'pretty' property of each variable in our mart config
      var names = [];
      for (var i=0; i < mart.attributes.length; i++) {
        if ( mart.attributes[i].enabled ) {
          names.push(mart.attributes[i].name);
        };
      };

      // Now split the csv string on newlines, then each line on commas
      // before building into the JSON output
      var json = [];
      var data_by_line = data.split("\n");
      for (var i=0; i < data_by_line.length; i++) {
        var intermediate_hash = new Object();
        var data_by_item = data_by_line[i].split(",");
        for (var j=0; j < data_by_item.length; j++) {
          intermediate_hash[names[j]] = data_by_item[j];
        };
        json.push(intermediate_hash);
      };

      return json;
    }
    
  },
  
};

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
