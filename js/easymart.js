
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
  
  conf: {
    sources: {
      ensembl:    '/config/ensembl.json',
      htgt_targ:  '/config/htgt_targ.json'
      //htgt_trap:  '/config/htgt_trap.json',
    },
    search: [
      {
        level:    0,
        name:     'ensembl',
        join_on:  'mgi_symbol',
        results: '',
        children: [
          {
            level:    1,
            name:     'htgt_targ',
            join_on:  'ensembl_gene_id',
            results:  ''
          }
        ]
      }
    ]
  },
  
  // init - Function to be fired on initial page load to set-up the interface.
  init: function() {
    
    // Load in the configuration files and configure the interface
    log.profile('[config] easymart.config.load()');
    easymart.config.load();
    log.profile('[config] easymart.config.load()');
    
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
    
    // config.load - Function to load and process the source configuration files.
    load: function () {
      $.each( easymart.conf.sources, function (name, url) {
        $.getJSON( url, function (json) {
          easymart.conf.sources[name] = json;
          log.info('[config] loaded ' + name);
        });
      });
    },
    
    // config.build - Function to build the configuration page.
    build: function () {
      var configuration_page = '';
      
      // TODO: Complete the configuration builder function...
      $.each( easymart.conf.sources, function (name, conf) {
        
      });
    }
    
  },
  
  // search - Function group that handles all aspects of the search.
  search: {
    
    // search.results - Placeholder variable that will be filled with the results from a search
    results: {},
    
    // search.run - Controller function to kick off the search
    run: function ( queryStr ) {
      
      // Clean up the page
      $('#msg').html('');
      $('#results').html('');
      
      // TODO: We need to make easymart.conf.search and easymart.conf.sources generated dynamically from user prefs
      $.each( easymart.conf.search, function () {
        easymart.search.submit( easymart.conf.sources[this.name], this, queryStr );
      });
      
    },
    
    // search.submit - Fnuction for submitting the searches
    submit: function ( source, search_path, queryStr, filter_override ) {
      
      log.debug('[search] searching for \'' + queryStr + '\' - ' + source.name);
      log.profile('[search] easymart.search $.ajax request - ' + source.name);
      $.ajax({
        type:     "POST",
        url:      source.url,
        data:     { query: easymart.search.biomart_xml( source, queryStr, filter_override ) },
        success:  function (data) {
          if (data) {
            
            log.profile('[search] easymart.search $.ajax request - ' + source.name);
            
            // Do something with the data...
            
            var json_data = easymart.search.biomart_tsv2json_ah( source, data );
            search_path.results = json_data;
            easymart.search.build_results( source, search_path, filter_override );
            //easymart.search.display_results();
            
            // Now see if we need to submit any child searches
            if ( search_path.children ) {
              
              $.each( search_path.children, function (i) {
                
                var child_source = easymart.conf.sources[ search_path.children[i].name ];
                var child_query_hash = {};
                
                // Extract the info that we are going to query the second source by
                $.each( json_data, function (j) {
                  if ( this[ search_path.children[i].join_on ] ) {
                    child_query_hash[ this[ search_path.children[i].join_on ] ] = '';
                  };
                });
                
                // Submit the child search
                easymart.search.submit( child_source, search_path.children[i], $.keys(child_query_hash).join(","), search_path.children[i].join_on );
                
              });
              
            };
            
          } else {
            $('#results').append('<span class="no-results">Sorry, no results were returned by your search.</span>');
          };
        }
      });
      
    },
    
    // search.build_results - Function to build the results object...
    build_results: function ( source, search_path, join_parent_on ) {
      
      var search_results = {};
      search_results[ search_path.level ] = {};
      
      log.debug('working on '+ search_path.name + ' (level ' + search_path.level + ')');
      log.debug('merging on '+ search_path.join_on);
      log.debug('got '+ search_path.results.length + ' result(s)');
      
      $.each( search_path.results, function( i, result ) {
        
        log.debug(result[search_path.join_on]);
        
        if ( search_results[ search_path.level ][ result[search_path.join_on] ] ) {
          if ( search_results[ search_path.level ][ result[search_path.join_on] ][ search_path.name ] ) {
          } else {
            search_results[ search_path.level ][ result[search_path.join_on] ][ search_path.name ] = [];
          };
        } else {
          search_results[ search_path.level ][ result[search_path.join_on] ] = {};
          search_results[ search_path.level ][ result[search_path.join_on] ][ search_path.name ] = [];
        };
        
        search_results[ search_path.level ][ result[search_path.join_on] ][ search_path.name ].push(result);
        
      });
      
      $.extend( true, easymart.search.results, search_results );
      
      
      
    },
    
    // search.display_results - Function to draw the results object to screen
    display_results: function () {
      
      // FIXME: display_results is fooked - needs to be redesigned to accomodate the new results obj
      
      $.each( easymart.search.results, function(focus_val, sources) {
        
        // Do we need to add a new holding div for the focus object?
        var new_holding_div = true;
        $('#results div.container').each( function () {
          if ( this.id && this.id.match(focus_val) ) {
            new_holding_div = false;
          };
        });
        
        if ( new_holding_div ) {
          $('#results').append('<div id="'+focus_val+'" class="container"><div class="span-4">'+focus_val+'</div><div class="span-20 last"></div></div>')
        };
        
        $.each( sources, function (source, results) {
          
          var new_source_div = true;
          $('#results #'+focus_val+' .span-20 div').each( function () {
            if ( this.id && this.id.match(focus_val+'_'+source) ) {
              new_source_div = false;
            };
          });
          
          if ( new_source_div ) {
            $('#results #'+focus_val+' .span-20').append('<div id="'+focus_val+'_'+source+'"></div>');
          };
          
          $('#'+focus_val+'_'+source).setTemplate( easymart.conf.sources[source].template );
          $('#'+focus_val+'_'+source).processTemplate( { source: easymart.conf.sources[source], results: results } );
          
        });
        
      });
      
    },
    
    // search.build_biomart_xml - Helper for writing the biomart XML to a variable
    biomart_xml: function ( mart, query, filter_override ) {
      var xml = '';
      xml += '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE Query>';
      xml += '<Query  virtualSchemaName="default" formatter="TSV" header="0" uniqueRows="1" count="" datasetConfigVersion="' + mart.datasetConfigVersion + '" >';
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
    
    // search.biomart_tsv2json_aa - Helper to convert a biomart TSV file to a JSON object (array of arrays)
    biomart_tsv2json_aa: function ( mart, data ) {
      // Split the tsv string on newlines, then each line on tabs
      // before building into the JSON output
      var json = [];
      var data_by_line = data.split("\n");
      data_by_line.pop(); // Remove the last entry - this is always empty

      for (var i=0; i < data_by_line.length; i++) {
        var intermediate_array = [];
        var data_by_item = data_by_line[i].split("\t");
        for (var j=0; j < data_by_item.length; j++) {
          intermediate_array.push(data_by_item[j]);
        };
        json.push(intermediate_array);
      };

      return json;
    },
    
    // search.biomart_tsv2json_ah - Helper to convert a biomart TSV file to a JSON object (array of hashes)
    biomart_tsv2json_ah: function ( mart, data ) {
      // First we'll figure out our keys for our JSON objects
      var names = new Array();
      for (var i=0; i < mart.attributes.length; i++) {
        names.push(mart.attributes[i].name);
      };

      // Now split the tsv string on newlines, then each line on tabs
      // before building into the JSON output
      var json = [];
      var data_by_line = data.split("\n");
      data_by_line.pop(); // Remove the last entry - this is always empty
      
      for (var i=0; i < data_by_line.length; i++) {
          var intermediate_hash = {};
          var data_by_item = data_by_line[i].split("\t");
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
