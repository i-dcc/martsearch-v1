var easymart = {
  
  conf: {
    marts: {
      ensembl:    '/config/ensembl.json',
      htgt_targ:  '/config/htgt_targ.json',
      htgt_trap:  '/config/htgt_trap.json',
    },
    // FIXME: Need a way to define the 'flow' of the searches through the marts
    search: [
      
    ]
  },
  
  // init - Function to be fired on initial page load to set-up the interface.
  init: function() {
    
    // Load in the configuration files and configure the interface
    easymart.config.load();
    
    // Focus the input on the search bar
    $('#query').focus();
    
    // Attach an error reporter to the 'msg' div on the page
    $('#msg').ajaxError( function(event, request, settings){
      $('#loading').hide();
      $(this).append("<div class='error'>Sorry, error has occured requesting '" + settings.url + "'<br />Please re-submit your request.</div>");
    });

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
      
      // TODO: Complete this function...
      $.each( easymart.conf.marts, function (name, conf) {
        
      });
    },
    
  },
  
  // search - Function group that handles all aspects of the search.
  search: {
    
    // search.run - Function to run the user query
    run: function ( queryStr ) {
      
      // Clean up the page
      $('#msg').html('');
      $('#results').html(queryStr);
      
    },
    
    // search.build_biomart_xml - Helper for writing the biomart XML to a variable
    build_biomart_xml: function ( mart, query ) {
      var xml = '';
      xml += '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE Query>';
      xml += '<Query  virtualSchemaName = "default" formatter = "CSV" header = "0" uniqueRows = "1" count = "" datasetConfigVersion = "' + mart.datasetConfigVersion + '" >';
      xml += '<Dataset name = "' + mart.dataset_name + '" interface = "default" >';

      var filt_n_attrs = new Array();

      for (var i=0; i < mart.vars.length; i++) {
        var variable = mart.vars[i];
        if ( variable.filter ) { filt_n_attrs.unshift('<Filter name = "' + variable.name + '" value = "'+ query +'"/>'); }
        if ( variable.attribute ) { filt_n_attrs.push('<Attribute name = "' + variable.name + '" />'); }
      };

      xml += filt_n_attrs.join('');
      xml += '</Dataset>';
      xml += '</Query>';
      return xml;
    },
    
    // search.csv2json - Helper to convert a CSV file to a JSON object
    csv2json: function ( mart, data ) {
      // First we'll figure out our keys for our JSON objects - this
      // is the 'pretty' property of each variable in our mart config
      var names = new Array();
      for (var i=0; i < mart.vars.length; i++) {
        names.push(mart.vars[i].pretty);
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
    
  }
  
}