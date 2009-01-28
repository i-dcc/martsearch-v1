
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
      htgt_targ:  '/config/htgt_targ.json',
      htgt_trap:  '/config/htgt_trap.json',
      kermits:    '/config/kermits.json'
    },
    search: [
      {
        level:    0,
        name:     'ensembl',
        join_on:  'mgi_symbol',
        results:  '',
        children: [
          {
            level:    1,
            name:     'htgt_targ',
            join_on:  'ensembl_gene_id',
            results:  '',
            children: [
              {
                level:    2,
                name:     'kermits',
                join_on:  'escell_clone_name',
                results:  ''
              }
            ]
          },
          {
            level:    1,
            name:     'htgt_trap',
            join_on:  'ensembl_gene_id',
            results:  '',
            children: [
              {
                level:    2,
                name:     'kermits',
                join_on:  'escell_clone_name',
                results:  ''
              }
            ]
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
    
    log.profile('[config] easymart.config.build()');
    easymart.config.build();
    log.profile('[config] easymart.config.build()');
    
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
        $.ajax({
          url:      url,
          type:     'GET',
          dataType: 'json',
          async:    false,
          success: function (json) {
            easymart.conf.sources[name] = json;
            log.info('[config] loaded ' + name);
          }
        });
      });
    },
    
    // config.build - Function to build the configuration page.
    build: function () {
      // Draw the default search to screen...
      $.each( easymart.conf.search, function ( row_index ) {
        easymart.config.build_deafult_search( this, row_index );
      });
      
      // Add any datasources that aren't in the default search
      easymart.config.build_other_sources();
      
      // After the build is finished, add a listener to the 'Configuration' link...
      $('#config_toggle').click( function () {
        $('#search').slideToggle('fast');
        $('#config').slideToggle('fast');
      })
      
      // Then make the query builder draggable/sortable...
      $('#config ul.source_list').sortable({ connectWith: ['ul.source_list'] });
    },
    
    // config.build_deafult_search - Helper function to put the default search config onto the page.
    build_deafult_search: function ( search_path, row_index ) {
      var source = easymart.conf.sources[search_path.name];
      var template = '<li id="'+search_path.name+'" class="source"><strong>'+source.name+'</strong></li>';
      $('#search_template #search_row_'+row_index+' #search-level-'+row_index+'-'+search_path.level).append(template);
      
      if ( search_path.children ) {
        $.each( search_path.children, function() {
          easymart.config.build_deafult_search( this, row_index );
        });
      };
    },
    
    // config.build_other_sources - Helper function to add other available sources onto the page.
    build_other_sources: function () {
      $.each( easymart.conf.sources, function( name, source ) {
        
        var test = $('#search_template li#'+name);
        if ( test.length == 1 ) {
          // do nothing - this source is in the default search
        } else {
          var template = '<li id="'+name+'" class="source"><strong>'+source.name+'</strong></li>';
          $('ul#other_sources').append(template);
        };
        
      });
    }
    
  },
  
  // search - Function group that handles all aspects of the search.
  search: {
    
    // search.results_cache - Placeholder variable that will be filled with the results from a search
    results_cache: {},
    
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
    
    clean_caches: function () {
      // TODO: write function to clean the caches at the beginning of each search so that old results are perged from memory.
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
            easymart.search.build_results_cache( source, search_path, filter_override );
            easymart.search.display_results();
            
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
            
          };
        }
      });
      
    },
    
    // search.build_results_cache - Function to build the results_cache object that contains the data to be displayed
    build_results_cache: function ( source, search_path, join_parent_on ) {
      
      log.info('[build_results_cache] - building cache for '+search_path.name);
      
      var search_results = {};
      search_results[ search_path.level ] = {};
      
      log.debug('working on '+search_path.name+' (level '+search_path.level+')');
      log.debug('merging on '+search_path.join_on);
      log.debug('got '+search_path.results.length+' result(s)');
      
      $.each( search_path.results, function( i, result ) {
        
        // First, see if we have any data returned except the joined value...
        var keep_this_result = false;
        $.each( result, function( type, value ) {
          if ( type.match( join_parent_on ) ) { /* If this is the joining value - ignore it */   } 
          else                                { if ( value != "" ) { keep_this_result = true; }; };
        });
        
        if ( keep_this_result ) {
          
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
          
        };
        
      });
      
      $.extend( true, easymart.search.results_cache, search_results );
      
    },
    
    // search.display_results - Function for drawing the results to the page
    display_results: function ( search_paths, parent_search ) {
      
      if ( search_paths ) {} 
      else                { search_paths = easymart.conf.search; };
      
      $.each( search_paths, function () {
        var search = this;
        var source = easymart.conf.sources[search.name];
        log.debug('[disp] working on '+search.name+' search');
        
        $.each( search.results, function() {
          var result = this;
          
          // See if we have any results left in the cache following filtering - if yes, display them...
          if ( easymart.search.results_cache[ search.level ][ result[search.join_on] ] ) {
            
            // If we're looking at a top-level resultset, also create the containing divs...
            if ( search.level == 0 ) {

              log.info('[display_results] working on '+search.name);

              var new_source_div = true;
              $('#results > div').each( function () {
                if ( this.id && this.id.match(result[search.join_on]+'__'+search.name) ) { new_source_div = false; };
              });

              if ( new_source_div ) {

                var template = 
                  '<div id="'+result[search.join_on]+'__'+search.name+'" class="level-'+search.level+' result">'+
                    '<span class="heading">'+
                      '<a class="show_data" onclick="easymart.search.show_results('+
                        "'"+'#'+result[search.join_on]+'__'+search.name+"'"+','+
                        "'"+search.name+"'"+','+
                        "'"+search.level+"'"+','+
                        "'"+result[search.join_on]+"'"+
                      ')">'+
                      result[search.join_on]+
                      '</a>';

                var no_results = easymart.search.results_cache[ search.level ][ result[search.join_on] ][ search.name ].length;
                if (no_results == 1) { template += ' <small>'+source.name+': ('+no_results+' result)</small>'; }
                else                 { template += ' <small>'+source.name+': ('+no_results+' results)</small>'; };

                template += '</span><div class="data" style="display:none;"></div ></div>';

                $('#results').append( template );
              };

              //$('#'+result[search.join_on]+'__'+search.name+' div.data').setTemplate( easymart.conf.sources[search.name].template );
              //$('#'+result[search.join_on]+'__'+search.name+' div.data').processTemplate( { source: easymart.conf.sources[search.name], results: easymart.search.results_cache[ search.level ][ result[search.join_on] ][ search.name ] } );

            }
            // We're not looking at a containing div, we need to sort things more carefully...
            else {

              log.info('[display_results] working on '+search.name+' - child of '+parent_search.name);

              // First we need to work out where we need to insert our results...
              var parent_result_mapping = {};
              $.each( easymart.search.results_cache[ parent_search.level ], function( parent_identifier, id_grouped_results ) {
                $.each( id_grouped_results, function (source, results) {
                  $.each( results, function(index, result) {
                    parent_result_mapping[ result[search.join_on] ] = parent_identifier+'__'+parent_search.name;
                  });
                });
              });

              var new_source_div = true;
              $('#'+parent_result_mapping[ result[search.join_on] ]+' div').each( function () {
                if ( this.id && this.id.match(result[search.join_on]+'__'+search.name) ) {
                  new_source_div = false;
                };
              });

              if ( new_source_div ) {
                var template = 
                  '<div id="'+result[search.join_on]+'__'+search.name+'" class="level-'+search.level+' result child">'+
                    '<span class="heading">'+
                    '<a class="show_data" onclick="easymart.search.show_results('+
                      "'"+'#'+result[search.join_on]+'__'+search.name+"'"+','+
                      "'"+search.name+"'"+','+
                      "'"+search.level+"'"+','+
                      "'"+result[search.join_on]+"'"+
                    ')">'+
                    result[search.join_on]+
                    '</a>';

                var no_results = easymart.search.results_cache[ search.level ][ result[search.join_on] ][ search.name ].length;
                if (no_results == 1) { template += ' <small>'+source.name+': ('+no_results+' result)</small>'; }
                else                 { template += ' <small>'+source.name+': ('+no_results+' results)</small>'; };

                template += '</span><div class="data" style="display:none;"></div ></div>';

                $('#'+parent_result_mapping[ result[search.join_on] ]).append( template );

              };

              //$('#'+parent_result_mapping[ result[search.join_on] ]+' div.data').setTemplate( easymart.conf.sources[search.name].template );
              //$('#'+parent_result_mapping[ result[search.join_on] ]+' div.data').processTemplate( { source: easymart.conf.sources[search.name], results: easymart.search.results_cache[ search.level ][ result[search.join_on] ][ search.name ] } );

            };
            
          };
          
        });
        
        // Do we have any children? - If yes, process them...
        if ( search.children ) {
          easymart.search.display_results( search.children, search );
        };
        
      });
      
    },
    
    // search.show_results - Helper function to reveal the full results for a dataset
    show_results: function ( id, dataset, level, join_on ) {
      
      if ( $(id+' > div.data').css('display') == 'none' ) {
        
        $(id+' > div.data').setTemplate( easymart.conf.sources[dataset].template );
        $(id+' > div.data').processTemplate( { source: easymart.conf.sources[dataset], results: easymart.search.results_cache[ level ][ join_on ][ dataset ] } );
        
      };
      
      $(id+' > div.data').toggle("fast");
      
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
        if ( mart.attributes[i].enabled ) {
          names.push(mart.attributes[i].name);
        };
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
