/*
* @namespace {DataSet}
* 
* Dataset class - used to represent a biomart dataset
*/
DataSet = function( params, base_url ) {
  this.url                = params.url;
  this.full_url           = params.full_url;
  this.mart_dataset       = params.mart_dataset;
  this.display_name       = params.display_name;
  this.joined_index_field = params.joined_index_field;
  this.joined_filter      = params.joined_filter;
  this.mart_conf_version  = params.mart_conf_version ? params.mart_conf_version : "0.6";
  this.default_attributes = params.default_attributes;
  this.attributes         = base_url ? this.fetch_all_attributes( base_url + this.url ) : this.fetch_all_attributes( this.url );
};

DataSet.prototype = {
  
  /*
  * @alias  DataSet.fetch_all_attributes
  */
  fetch_all_attributes: function( url ) {
    var martservice_url = url + "/martservice";
    
    // save the attributes in a hash...
    //    attribute_name => attribute_display_name
    var attributes = {};
    
    jQuery.ajax({
      url:      martservice_url,
      type:     'GET',
      async:    true,
      data:     { type: "attributes", dataset: this.mart_dataset },
      success:  function ( data ) {
        var attrs = data.split("\n");
        for (var i=0; i < attrs.length; i++) {
          attr_info = attrs[i].split("\t");
          if ( attr_info[0] !== "" ) { attributes[ attr_info[0] ] = attr_info[1] };
        };
      },
      error:    function( XMLHttpRequest, textStatus, errorThrown ) {
        log.error( "Error fetching attribute descriptions for - " + this.mart_dataset + " (" + errorThrown + ")" );
      }
    });
    
    return attributes;
  }
  
};
