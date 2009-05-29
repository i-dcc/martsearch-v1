/**
* @namespace {DataSet}
* 
* Dataset class - used to represent a biomart dataset
*/
DataSet = function( params, base_url ) {
  this.internal_name       = params.internal_name;
  this.base_url            = base_url ? base_url : "";
  this.url                 = this.base_url + params.url;
  this.full_url            = params.full_url;
  this.mart_dataset        = params.mart_dataset;
  this.display_name        = params.display_name;
  this.joined_index_field  = params.joined_index_field;
  this.joined_filter       = params.joined_filter;
  this.mart_conf_version   = params.mart_conf_version ? params.mart_conf_version : "0.6";
  this.enabled_attributes  = params.enabled_attributes;
  this.required_attributes = params.required_attributes;
  
  this.template            = params.template ? this.base_url+'/js/templates/'+params.template : this.base_url+'/js/templates/default_dataset.ejs';
  if ( params.template === undefined ) {
    this.attributes = this.fetch_all_attributes();
  };
  
  this.custom_result_parser = params.custom_result_parser;
  
  this.message             = new Message({ base_url: base_url });
  
  this.test_mode           = params.test_mode ? params.test_mode : false;
  this.debug_mode          = params.debug_mode ? params.debug_mode : false;
};

DataSet.prototype = {
  
  /**
  * @alias    DataSet.fetch_all_attributes
  * @return   {Object}  A hash containing the short attribute names as the keys
  *                     and the full display names as the values.
  */
  fetch_all_attributes: function() {
    var ds = this;
    var attributes = {};
    
    jQuery.ajax({
      url:      ds.url + "/martservice",
      type:     "GET",
      async:    false,
      data:     { type: "attributes", dataset: ds.mart_dataset },
      success:  function ( data ) {
        var attrs = data.split("\n");
        for (var i=0; i < attrs.length; i++) {
          attr_info = attrs[i].split("\t");
          if ( attr_info[0] !== "" ) { attributes[ attr_info[0] ] = attr_info[1] };
        };
      },
      error:    function( XMLHttpRequest, textStatus, errorThrown ) {
        log.error( "Error fetching attribute descriptions for - "+ ds.mart_dataset +" ("+ XMLHttpRequest.status +")" );
        ds.message.add( 
          "Error fetching attribute descriptions for - "+ ds.mart_dataset +" ("+ XMLHttpRequest.status +")",
          "error",
          XMLHttpRequest.responseText
        );
      }
    });
    
    return attributes;
  },
  
  /**
  * Main search function to submit a query to the biomart server and 
  * process the results ready to be displayed.
  *
  * @name     search
  * @param    {String}  The query string to be used.
  * @param    {String}  
  * @return   {String}  Tab-separated results from a biomart search.
  */
  search: function ( query, docs, primary_index_field ) {
    var ds = this;
    log.profile("[mart - '"+ ds.mart_dataset +"']: "+ query);
    
    var run_async = true;
    if ( ds.test_mode ) { run_async = false };
    var results = false;
    
    jQuery.ajax({
      type:     "POST",
      url:      ds.url + "/martservice",
      async:    run_async,
      data:     { "query": ds._biomart_xml( query ) },
      success:  function ( data ) {
        
        // Catch a Biomart error (as biomart doesn't send 500 messages...)
        if ( data.search(/Query ERROR/) >= 0 ) {
          log.error( "Error querying biomart '"+ ds.mart_dataset +"' for '"+ query.toString().substr(0,30) +"...' (Biomart Error)" );
          ds.message.add(
            "Error querying biomart '"+ ds.mart_dataset +"' for '"+ query.toString().substr(0,20) +"...' (Biomart Error)",
            "error",
            data
          );
        }
        else {
          
          if ( ds.custom_result_parser == undefined ) { results = ds._parse_biomart_data( data, docs ); }
          else                                        { results = ds.custom_result_parser( data, ds ); };

          if ( results ) {
            console.log(results);
            
            for (var i=0; i < docs.length; i++) {
              var content_id = docs[i][ ds.joined_index_field ];
              if ( content_id !== undefined && content_id !== "" ) {

                // Figure out the DOM id
                if ( typeof content_id != 'string' ) { content_id = content_id.join('_'); };
                content_id = content_id.replace( /\(/g, "-" ).replace( /\)/g, "-" ).substr(0,20);
                content_id = ds.internal_name + '_' + content_id;
                if ( ds.debug_mode ) { log.debug('processing '+ content_id); };

                if ( results[ content_id ] ) {
                  var template = new EJS({ url: ds.template }).render({ 'results': results[ content_id ], dataset: ds });
                  jQuery( "#"+content_id ).html(template);
                }
                else {
                  jQuery( "#"+content_id ).parent().hide();
                };

              };
            };
          };
          
        };
        
      },
      error:    function( XMLHttpRequest, textStatus, errorThrown ) {
        log.error( "Error querying biomart '"+ ds.mart_dataset +"' for '"+ query +"' ("+ XMLHttpRequest.status +")" );
        ds.message.add(
          "Error querying biomart '"+ ds.mart_dataset +"' for '"+ query +"' ("+ XMLHttpRequest.status +")",
          "error",
          XMLHttpRequest.responseText
        );
      }
    });
    
    log.profile("[mart - '"+ ds.mart_dataset +"']: "+ query);
    return results;
  },
  
  /**
  * Create the XML file to pass to a biomart for querying
  *
  * @private
  * @name     _biomart_xml
  * @param    {String}  The query string to be used in the filter.
  * @return   {String}  The biomart query XML in a string.
  */
  _biomart_xml: function( query ) {
    var xml = '';
    xml += '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE Query>';
    xml += '<Query  virtualSchemaName="default" formatter="TSV" header="0" uniqueRows="1" count="" datasetConfigVersion="' + this.mart_conf_version + '" >';
    xml += '<Dataset name="' + this.mart_dataset + '" interface="default" >';
    xml += '<Filter name="' + this.joined_filter + '" value="'+ query +'"/>';
    
    for (var i=0; i < this.enabled_attributes.length; i++) {
      xml += '<Attribute name="' + this.enabled_attributes[i] + '" />';
    };
    
    xml += '</Dataset>';
    xml += '</Query>';
    return xml;
  },
  
  /**
  * Convert the tab separated results from a biomart search into a JSON 
  * hash of arrays.
  * 
  * The main key for the hash is the 'content_id' that matches the DOM id's 
  * generated by the initial index results.  The values are arrays of result 
  * hashes signifying the data returned from the mart...
  * 
  * i.e.
  *   'Cbx1' => [
  *     { marker_symbol: 'Cbx1', synonym: 'foo' },
  *     { marker_symbol: 'Cbx1', synonym: 'bar' }
  *   ]
  * 
  * @name     _parse_biomart_data
  * @param    {String}  Tab separated data from a biomart search.
  * @param    {Array}   The 'docs' array from the index query.
  * @return   {Object}  A JSON hash of result objects - keyed by the content_id 
  *                     used within the DOM of the results list.
  */
  _parse_biomart_data: function ( data, docs ) {
    var ds = this;
    
    // Split the tsv string on newlines, then each line on tabs
    // before building into the JSON output
    var array_of_hashes = [];
    
    var data_by_line = data.split("\n");
    data_by_line.pop(); // Remove the last entry - this is always empty
    
    /** 
    * Create a hash, keyed by the 'joined_index_field' where each value 
    * contains an array of hashes representing the returned data rows 
    * related to the 'joined_index_field'.
    * 
    * This allows us to handle both types of Biomarts that are expected to 
    * be one-to-one mapped with the index, and one-to-many with the same 
    * data structure.
    * 
    * Also at the same time, (in this loop) if we have defined a field 
    * that MUST be present filter out the data rows that do not have 
    * these values...
    */
    var data_by_joined_field = {};
    for (var i=0; i < data_by_line.length; i++) {
        var tmp_hash = {};
        var data_by_item = data_by_line[i].split("\t");
        for (var j=0; j < data_by_item.length; j++) {
          tmp_hash[ ds.enabled_attributes[j] ] = data_by_item[j];
        };
        
        // Filter out unwanted rows...
        var save_this_row = true;
        if ( ds.required_attributes !== undefined ) {
          for (var j=0; j < ds.required_attributes.length; j++) {
            if ( tmp_hash[ ds.required_attributes[j] ] === "" ) {
              save_this_row = false;
            };
          };
        };
        
        if ( save_this_row ) {
          if ( data_by_joined_field[ tmp_hash[ ds.joined_filter ] ] === undefined ) {
            data_by_joined_field[ tmp_hash[ ds.joined_filter] ] = [];
          };
          data_by_joined_field[ tmp_hash[ ds.joined_filter ] ].push(tmp_hash);
        };
    };
    console.log("data_by_joined_field");
    console.log(data_by_joined_field);
    
    /**
    * Finally, if we have any results to show manipulate these array elements 
    * into a hash keyed by the content_id that would be generated by the docs 
    * in the index...
    * 
    * I apologise now for the horrendous nested de-referencing...
    */
    var data_to_return = {};
    if ( jQuery.keys(data_by_joined_field).length > 0 ) {
      for (var i=0; i < docs.length; i++) {

        // Calculate the content_id - The unique DOM element identifier that this
        // returned data will be injected into
        var content_id = docs[i][ ds.joined_index_field ];
        if ( typeof content_id != 'string' ) { content_id = content_id.join('_'); };
        content_id = content_id.replace( /\(/g, "-" ).replace( /\)/g, "-" ).substr(0,20);

        // Set up a temp array to put all of our info into...
        var tmp_array = [];

        // Now collect each row of data that matches this 'joined_index_field'
        if ( typeof docs[i][ ds.joined_index_field ] == 'string' ) {
          // We only have a single value to match to...
          var index_item = docs[i][ ds.joined_index_field ];
          if ( data_by_joined_field[ index_item ] != undefined ) {
            for (var j=0; j < data_by_joined_field[ index_item ].length; j++) {
              tmp_array.push( data_by_joined_field[ index_item ][j] );
            };
          };
        }
        else {
          // We have an array of values to match to...
          for (var j=0; j < docs[i][ ds.joined_index_field ].length; j++) {
            var index_item = docs[i][ ds.joined_index_field ][j];

            if ( data_by_joined_field[ index_item ] != undefined ) {
              for (var k=0; k < data_by_joined_field[ index_item ].length; k++) {
                tmp_array.push( data_by_joined_field[ index_item ][k] );
              };
            };
          };
        };

        data_to_return[ ds.internal_name + '_' + content_id ] = tmp_array;
      };
      
    }
    else {
      data_to_return = false;
    };
    
    return data_to_return;
  },
  
  /**
  * Convert the tab separated results from a biomart search into a JSON 
  * array of hashes.  Can be used if a dataset needs a custom parser.
  * 
  * @name     _biomart_tsv2json_ah
  * @param    {String}  A tab separated data from a biomart search.
  * @return   {Object}  A JSON array of result objects.
  */
  _biomart_tsv2json_ah: function ( data ) {
    // Split the tsv string on newlines, then each line on tabs
    // before building into the JSON output
    var array_of_hashes = [];
    
    var data_by_line = data.split("\n");
    data_by_line.pop(); // Remove the last entry - this is always empty
    
    // Create an array of hashes that contain the returned values, 
    // keyed by the attribute name
    for (var i=0; i < data_by_line.length; i++) {
        var intermediate_hash = {};
        var data_by_item = data_by_line[i].split("\t");
        for (var j=0; j < data_by_item.length; j++) {
          intermediate_hash[ this.enabled_attributes[j] ] = data_by_item[j];
        };
        array_of_hashes.push(intermediate_hash);
    };
    
    return array_of_hashes;
  },
  
  /**
  *
  */
  search_link_url: function ( query ) {
    var url = this.full_url + "/martview?VIRTUALSCHEMANAME=default";
    
    var attrs = [];
    for (var i=0; i < this.enabled_attributes.length; i++) {
      attrs.push(this.mart_dataset +'.default.attributes.'+ this.enabled_attributes[i]);
    };
    url += "&ATTRIBUTES=" + attrs.join("|");
    url += "&FILTERS=";
    url += this.mart_dataset +'.default.filters.'+ this.joined_filter +'.&quot;'+ query +'&quot;';
    url += "&VISIBLEPANEL=resultspanel";
    
    return url;
  }
  
};
