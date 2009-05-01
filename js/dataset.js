/*
* @namespace {DataSet}
* 
* Dataset class - used to represent a biomart dataset
*/
DataSet = function( params, base_url ) {
  this.internal_name      = params.internal_name;
  this.base_url           = base_url ? base_url : "";
  this.url                = this.base_url + params.url;
  this.full_url           = params.full_url;
  this.mart_dataset       = params.mart_dataset;
  this.display_name       = params.display_name;
  this.joined_index_field = params.joined_index_field;
  this.joined_filter      = params.joined_filter;
  this.mart_conf_version  = params.mart_conf_version ? params.mart_conf_version : "0.6";
  this.enabled_attributes = params.enabled_attributes;
  
  this.template           = params.template ? this.base_url+'/js/templates/'+params.template : this.base_url+'/js/templates/default.ejs';
  
  this.message            = new Message({ base_url: base_url });
  //this.attributes         = this.fetch_all_attributes();
};

DataSet.prototype = {
  
  /*
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
        log.error( "Error fetching attribute descriptions for - "+ this.mart_dataset +" ("+ errorThrown +")" );
        ds.message.add( 
          "Error fetching attribute descriptions for - "+ this.mart_dataset +" ("+ errorThrown +")",
          "error"
        );
      }
    });
    
    return attributes;
  },
  
  /*
  * Main search function to submit a query to the biomart server and 
  * process the results ready to be displayed.
  *
  * @name     search
  * @param    {String}  The query string to be used.
  * @return   {String}  Tab-separated results from a biomart search
  */
  search: function ( query ) {
    var ds = this;
    log.profile("[mart - '"+ ds.mart_dataset +"']: "+ query);
    var results = '';
    
    $.ajax({
      type:     "POST",
      url:      ds.url + "/martservice",
      async:    true,
      data:     { "query": ds._biomart_xml( query ) },
      success:  function ( data ) {
        
        results = ds._biomart_tsv2json_hh( data );
        
        console.log(results);
        
        var keys = jQuery.keys(results);
        for (var i=0; i < keys.length; i++) {
          var template = new EJS({ url: ds.template }).render({ result: results[ keys[i] ] });
          jQuery( "#"+keys[i] ).html(template);
        };
        
      },
      error:    function( XMLHttpRequest, textStatus, errorThrown ) {
        log.error( "Error querying biomart '"+ this.mart_dataset +"' for '"+ query +"' ("+ errorThrown +")" );
        ds.message.add(
          "Error querying biomart '"+ this.mart_dataset +"' for '"+ query +"' ("+ errorThrown +")",
          "error"
        );
      }
    });
    
    log.profile("[mart - '"+ ds.mart_dataset +"']: "+ query);
    return results;
  },
  
  /*
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
  
  /*
  * Convert the tab separated results from a biomart search into a JSON 
  * array of objects.
  * 
  * @private
  * @name     _biomart_tsv2json_hh
  * @param    {String}  A tab separated data from a biomart search.
  * @return   {Object}  A JSON hash of result objects (keyed by the content_id 
  *                     used within the DOM of the results list).
  */
  _biomart_tsv2json_hh: function ( data ) {
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
    
    console.log(array_of_hashes);
    
    // Now manipulate this into a hash of objects (hashes) keyed by the 
    // main linking - this will match the DOM id in the docs.ejs template...
    var hash_of_hashes = {};
    for (var i=0; i < array_of_hashes.length; i++) {
      var content_id = array_of_hashes[i][ this.joined_filter ];
      if ( typeof content_id != 'string' ) { content_id = content_id.join('_'); };
      content_id = content_id.substr(0,20);
      hash_of_hashes[ this.internal_name + '_' + content_id ] = array_of_hashes[i];
    };
    
    return hash_of_hashes;
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
