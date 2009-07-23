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
  
  // Custom template?
  this.template            = params.template ? this.base_url+'/js/templates/'+params.template : this.base_url+'/js/templates/default_dataset.ejs';
  
  // Do we need to fetch all the attr details from the mart?
  if ( params.template === undefined || params.fetch_attribute_conf ) {
    this.fetch_all_attributes();
  }
  
  // Custom functions
  this.custom_result_parser = params.custom_result_parser;
  this.pre_display_hook     = params.pre_display_hook;
  this.post_display_hook    = params.post_display_hook;
  
  // Initiate messaging
  this.message             = new Message({ base_url: base_url });
  
  // Test/debug mode?
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
    ds.attributes = {};
    
    var run_async = true;
    if ( ds.test_mode ) { run_async = false; }
    var results = false;
    
    /**
    * Unfortunatley this is a work-around for IE...
    * It just won't parse the XML sent back from biomart so we have to 
    * revert to using tab separated attribute info which doesn't contain 
    * any linking information - therefore the basic marts in MartSearch 
    * will be REALLY basic under IE.
    */
    if ( jQuery.browser.msie ) {
      
      jQuery.ajax({
        url:      ds.url + "/martservice",
        type:     "GET",
        async:    run_async,
        data:     { type: "attributes", dataset: ds.mart_dataset },
        success:  function ( data ) {
            var attrs = data.split("\n");
            for (var i=0; i < attrs.length; i++) {
              attr_info = attrs[i].split("\t");
              if ( attr_info[0] !== "" ) {
                ds.attributes[ attr_info[0] ] = {
                  displayname: attr_info[1]
                };
                //attributes[ attr_info[0] ] = attr_info[1]
              }
            }
        },
        error:    function( XMLHttpRequest, textStatus, errorThrown ) {
          var error_msg = "Error fetching configuration for - "+ ds.mart_dataset +" ("+ XMLHttpRequest.status +")";
          log.error( error_msg );
          ds.message.add( error_msg, "error", XMLHttpRequest.responseText );
        }
      });
      
    }
    else {
      
      jQuery.ajax({
        url:      ds.url + "/martservice",
        type:     "GET",
        async:    run_async,
        data:     { type: "configuration", dataset: ds.mart_dataset },
        //dataType: (jQuery.browser.msie) ? "xml" : "text/xml",
        success:  function ( xml ) {
          jQuery(xml).find("attributedescription").each( function() {
            ds.attributes[ jQuery(this).attr("internalname") ] = {
              displayname: jQuery(this).attr("displayname"),
              description: jQuery(this).attr("description"),
              linkouturl:  jQuery(this).attr("linkouturl")
            };
          });
        },
        error:    function( XMLHttpRequest, textStatus, errorThrown ) {
          var error_msg = "Error fetching configuration for - "+ ds.mart_dataset +" ("+ XMLHttpRequest.status +")";
          log.error( error_msg );
          ds.message.add( error_msg, "error", XMLHttpRequest.responseText );
        }
      });
      
    }
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
    if ( ds.test_mode ) { run_async = false; }
    var results = false;
    
    jQuery.ajax({
      type:     "POST",
      url:      ds.url + "/martservice",
      async:    run_async,
      data:     { "query": ds._biomart_xml( query ) },
      success:  function ( data ) {
        
        // Catch a Biomart error (as biomart doesn't send 500 messages...)
        if ( data.search(/Query ERROR/) >= 0 ) {
          var error_msg = "Error querying biomart '"+ ds.mart_dataset +"' for '"+ query.toString().substr(0,30) +"...' (Biomart Error)";
          log.error( error_msg );
          ds.message.add( error_msg, "error", data );
        }
        else {
          
          // Parse the returned results
          if ( ds.custom_result_parser === undefined ) { results = ds._parse_biomart_data( data, docs ); }
          else                                         { results = ds.custom_result_parser( data, docs ); }
          if ( ds.debug_mode ) { if ( typeof console.log !== "undefined" ) { console.log(results); } }
          
          // Now display the results for each 'doc'
          for (var i=0; i < docs.length; i++) {
            
            var content_id = ms._content_id( ds, docs[i][ ds.joined_index_field ] );
            if ( content_id ) {

              // Figure out the DOM id
              if ( ds.debug_mode ) { log.debug('processing '+ content_id); }

              if ( results[ content_id ] !== undefined && results[ content_id ].length !== 0 ) {
                // Run any pre display functions
                if ( ds.pre_display_hook ) { ds.pre_display_hook( content_id ); }
                
                var template = new EJS({ url: ds.template }).render({ 'results': results[ content_id ], dataset: ds, 'content_id': content_id });
                jQuery( "#"+content_id ).html(template);
                
                // Run any post display functions
                if ( ds.post_display_hook ) { ds.post_display_hook( content_id ); }
                
                // If we're using the default template, add some table sorting/pagination...
                if ( ds.template.match("default_dataset.ejs") ) {
                  jQuery( "#"+content_id + "_table" ).tablesorter({ widgets: ['zebra'] });
                  
                  // If more than 10 entries - paginate the table
                  if ( results[content_id].length > 10 ) {
                    jQuery( "#"+content_id + "_table_pager" ).show();
                    jQuery( "#"+content_id + "_table" ).tablesorterPager(
                      {
                        container: jQuery( "#"+content_id + "_table_pager" ), 
                        positionFixed: false, 
                        size: 10 
                      }
                    );
                  }
                  
                }
              }
              else {
                jQuery( "#"+content_id ).parent().parent().fadeOut("fast");
                jQuery( "#"+content_id+'_is_present' ).fadeOut("fast");
              }

            }
          }
        }
        
      },
      error:    function( XMLHttpRequest, textStatus, errorThrown ) {
        var error_msg = "Error querying biomart '"+ ds.mart_dataset +"' for '"+ query +"' ("+ XMLHttpRequest.status +")";
        log.error( error_msg );
        ds.message.add( error_msg, "error", XMLHttpRequest.responseText );
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
    }
    
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
    var data_by_line = data.split("\n");
    data_by_line.pop(); // Remove the last entry - this is always empty
    
    if ( data_by_line.length > 0 ) {
      
      // Create a hash, keyed by the 'joined_index_field' where each value 
      // contains an array of hashes representing the returned data rows 
      // related to the 'joined_index_field'.
      // 
      // This allows us to handle both types of Biomarts that are expected to 
      // be one-to-one mapped with the index, and one-to-many with the same 
      // data structure.
      // 
      // Also at the same time, (in this loop) if we have defined a field 
      // that MUST be present filter out the data rows that do not have 
      // these values...
      var data_by_joined_field = {};
      for (var i=0; i < data_by_line.length; i++) {
          var tmp_hash = {};
          var data_by_item = data_by_line[i].split("\t");
          for (var j=0; j < data_by_item.length; j++) {
            tmp_hash[ ds.enabled_attributes[j] ] = data_by_item[j];
          }

          // Filter out unwanted rows...
          var save_this_row = true;
          if ( ds.required_attributes !== undefined ) {
            for (var k=0; k < ds.required_attributes.length; k++) {
              if ( tmp_hash[ ds.required_attributes[k] ] === "" ) {
                save_this_row = false;
              }
            }
          }

          if ( save_this_row ) {
            if ( data_by_joined_field[ tmp_hash[ ds.joined_filter ] ] === undefined ) {
              data_by_joined_field[ tmp_hash[ ds.joined_filter] ] = [];
            }
            data_by_joined_field[ tmp_hash[ ds.joined_filter ] ].push(tmp_hash);
          }
      }
      
      // Finally, if we have any results to show manipulate these array elements 
      // into a hash keyed by the content_id that would be generated by the docs 
      // in the index...
      // 
      // I apologise now for the horrendous nested de-referencing...
      var data_to_return = {};
      if ( jQuery.keys(data_by_joined_field).length > 0 ) {
        for (var l=0; l < docs.length; l++) {

          // Calculate the content_id - The unique DOM element identifier that this
          // returned data will be injected into
          var content_id = ms._content_id( ds, docs[l][ ds.joined_index_field ] );
          
          // If we have a content_id, process our data
          if ( content_id ) {
            // Set up a temp array to put all of our info into...
            var tmp_array = [];

            // Now collect each row of data that matches this 'joined_index_field'
            if ( typeof docs[l][ ds.joined_index_field ] == 'string' ) {
              // We only have a single value to match to...
              var index_item = docs[l][ ds.joined_index_field ];
              if ( data_by_joined_field[ index_item ] !== undefined ) {
                for (var m=0; m < data_by_joined_field[ index_item ].length; m++) {
                  tmp_array.push( data_by_joined_field[ index_item ][m] );
                }
              }
            }
            else {
              // We have an array of values to match to...
              for (var n=0; n < docs[l][ ds.joined_index_field ].length; n++) {
                var index_item_element = docs[l][ ds.joined_index_field ][n];

                if ( data_by_joined_field[ index_item_element ] !== undefined ) {
                  for (var o=0; o < data_by_joined_field[ index_item_element ].length; o++) {
                    tmp_array.push( data_by_joined_field[ index_item_element ][o] );
                  }
                }
              }
            }

            data_to_return[ content_id ] = tmp_array;
          }
        }

      }
      else {
        data_to_return = false;
      }

      return data_to_return;
      
    }
    else {
      return false;
    }
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
        }
        array_of_hashes.push(intermediate_hash);
    }
    
    return array_of_hashes;
  },
  
  /**
  *
  */
  _fix_superscript_text_in_attribute: function ( attribute ) {
    if ( attribute.match("<.+>.+</.+>") ) {
      // HTML code - leave alone...
    }
    else if ( attribute.match("<.+>") ) {
      var match = /(.+)<(.+)>(.*)/.exec(attribute);
      attribute = match[1] + "<sup>" + match[2] + "</sup>" + match[3];
    }
    
    return attribute;
  },
  
  /**
  *
  */
  search_link_url: function ( query ) {
    var url = this.full_url + "/martview?VIRTUALSCHEMANAME=default";
    
    var attrs = [];
    for (var i=0; i < this.enabled_attributes.length; i++) {
      attrs.push(this.mart_dataset +'.default.attributes.'+ this.enabled_attributes[i]);
    }
    url += "&ATTRIBUTES=" + attrs.join("|");
    url += "&FILTERS=";
    url += this.mart_dataset +'.default.filters.'+ this.joined_filter +'.&quot;'+ query +'&quot;';
    url += "&VISIBLEPANEL=resultspanel";
    
    return url;
  }
  
};
