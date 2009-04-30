/*
* @namespace {DataSet}
* 
* Dataset class - used to represent a biomart dataset
*/
DataSet = function( params, base_url ) {
  this.url                = base_url ? base_url + params.url : params.url;
  this.full_url           = params.full_url;
  this.mart_dataset       = params.mart_dataset;
  this.display_name       = params.display_name;
  this.joined_index_field = params.joined_index_field;
  this.joined_filter      = params.joined_filter;
  this.mart_conf_version  = params.mart_conf_version ? params.mart_conf_version : "0.6";
  this.enabled_attributes = params.enabled_attributes;
  this.message            = new Message({ base_url: base_url });
  
  this.attributes         = this.fetch_all_attributes();
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
    log.profile("mart query: "+ this.mart_dataset +" for "+ query);
    var results = '';
    var dataset = this;
    
    $.ajax({
      type:     "POST",
      url:      dataset.url + "/martservice",
      async:    false,  // FIXME: This query needs to be asyncronous!
      data:     { "query": this._biomart_xml( query ) },
      success:  function ( data ) {
        
        
        results = dataset._biomart_tsv2json_ah( data );
        
        /*
        * TODO:   Finish this function so that it updates a series 
        *         of DOM elements in the search results using the 
        *         dataset defined template.
        */
        
      },
      error:    function( XMLHttpRequest, textStatus, errorThrown ) {
        log.error( "Error querying biomart '"+ this.mart_dataset +"' for '"+ query +"' ("+ errorThrown +")" );
        ds.message.add(
          "Error querying biomart '"+ this.mart_dataset +"' for '"+ query +"' ("+ errorThrown +")",
          "error"
        );
      }
    });
    
    log.profile("mart query: "+ this.mart_dataset +" for "+ query);
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
  * @name     _biomart_tsv2json_ah
  * @param    {String}  A tab separated data from a biomart search.
  * @return   {Object}  A JSON array of result objects (keyed by attribute).
  */
  _biomart_tsv2json_ah: function ( data ) {
    // Split the tsv string on newlines, then each line on tabs
    // before building into the JSON output
    var json = [];
    
    var data_by_line = data.split("\n");
    data_by_line.pop(); // Remove the last entry - this is always empty
    
    for (var i=0; i < data_by_line.length; i++) {
        var intermediate_hash = {};
        var data_by_item = data_by_line[i].split("\t");
        for (var j=0; j < data_by_item.length; j++) {
          intermediate_hash[ this.enabled_attributes[j] ] = data_by_item[j];
        };
        json.push(intermediate_hash);
    };

    return json;
  }
  
};
