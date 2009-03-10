/*
*
*/
$j.m({
  
  Generic: {
    
    
    // ActiveRecord associated functions...
    
    
    /*
    *
    */
    init: function () {
      if ( this.model ) {
        return this.model;
      } else {
        this._drop();
        this._define();
        return this.model;
      }
    },
    
    /*
    *
    */
    _table_name: '',

    /*
    *
    */
    model: false,
    
    /*
    *
    */
    _define: function () {
      return this.model;
    },
    
    /*
    *
    */
    _drop: function () {
      ActiveRecord.execute('DROP TABLE IF EXISTS ' + this._table_name );
      this.model = false;
      return true;
    },
    
    /*
    *
    */
    _save: function ( data ) {
      var model = this.model;
      var errors = [];
      if ( $.isArray(data) ) {
        $.each( data, function (index) {
          var entry = model.build(this);
          entry.save();
          var tmp_errors = entry.getErrors();
          if ( tmp_errors.length > 0 ) { errors.push( tmp_errors ); };
        });
      } else {
        var entry = model.build(data);
        entry.save();
        var tmp_errors = entry.getErrors();
        if ( tmp_errors.length > 0 ) { errors.push( tmp_errors ); };
      };
      
      var status = true;
      if ( errors.length > 0 ) { status = false };
      return [ status, errors ];
    },
    
    
    // Dataset (mart) associated functions...
    
    
    /*
    *
    */
    _marts: {},
    
    /*
    *
    */
    search: function ( query ) {
      
      // Do not submit queries with a blank search string - this causes mart to return EVERYTHING!
      if ( query == "" ) {
        
        return false;
        
      } else {
        
        var model = this;
        var storage_errors = [];
        log.info("[Search] running '" + model._table_name + "' searches for " + query );

        $.each( model._marts, function ( index, mart ) {
          // Submit a POST query for each mart configured in the model.
          var raw_results = model._biomart_search( query, mart );

          // Convert the results to a JSON array of objects
          var preprocessed_results = model._biomart_tsv2json_ah( raw_results, mart );

          // Now into a series of objects suitable for storage
          var processed_results = model._biomart_prep_storage( preprocessed_results, mart );

          // Save the data to storage
          var save_status = model._save( processed_results );
          var storage_status = save_status[0];
          var errors = save_status[1];
          if ( errors.length ) { storage_errors.push(errors); };

          log.info("[Search] finished '" + mart.dataset_name + "' query for " + query);
        });

        if ( storage_errors.length > 0 ) { $.each( storage_errors, function(i) { log.error(this); }); return false; }
        else                             { return true; };
        
      };
      
    },
    
    /*
    * Helper function to submit the ajax post requests to the biomart servers.
    *
    * @private
    * @name _biomart_search
    * @param {String} the query string
    * @param {Object} biomart search configuration object
    * @return {String} tab separated results from a biomart search
    */
    _biomart_search: function ( query, mart ) {
      log.profile("mart query: " + mart.dataset_name + " for " + query);
      var results = '';
      $.ajax({
        type: "POST",
        url:  mart.url,
        async: false,
        data: { "query": this._biomart_xml( query, mart ) },
        success: function ( data ) { results = data; }
      });
      log.profile("mart query: " + mart.dataset_name + " for " + query);
      return results;
    },
    
    /*
    * Create the XML file to pass to a biomart for querying
    *
    * @private
    * @name _biomart_xml
    * @param {String} the query string to be used in the filters
    * @param {Object} biomart search configuration object
    * @return {String} the biomart query XML in a string
    */
    _biomart_xml: function ( query, mart ) {
      var xml = '';
      xml += '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE Query>';
      xml += '<Query  virtualSchemaName="default" formatter="TSV" header="0" uniqueRows="1" count="" datasetConfigVersion="' + mart.datasetConfigVersion + '" >';
      xml += '<Dataset name="' + mart.dataset_name + '" interface="default" >';

      var params = [];
      
      for (var i=0; i < mart.filters.length; i++) {
        if ( mart.filters[i].enabled ) {
			    if ( mart.filters[i]['default'] ) {
				    params.push('<Filter name="' + mart.filters[i].name + '" value="'+ mart.filters[i]['default'] +'"/>');
			    } else {
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
    
    /*
    * Convert the tab separated results from a biomart search into a JSON 
    * array of objects.
    * 
    * @private
    * @name _biomart_tsv2json_ah
    * @param {String} tab separated data from a biomart search
    * @param {Object} biomart search configuration object
    * @return {Object} JSON array of result objects (keyed by attribute)
    */
    _biomart_tsv2json_ah: function ( data, mart ) {
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
    },
    
    /*
    * Converts a raw biomart JSON string (output from _biomart_tsv2json_ah) 
    * to something that is suitable for putting into the client-side storage.
    *
    * @private
    * @name _biomart_prep_storage
    * @param {Object} JSON array of results objects from _biomart_tsv2json_ah
    * @param {Object} biomart search configuration object
    * @return {Object} an array of processed objects ready for storage
    */
    _biomart_prep_storage: function ( data, mart ) {
      var processed_data = [];
      $.each( data, function (index) {
        var tmp = mart.map_to_storage(this);
        processed_data.push(tmp);
      });
      return processed_data;
    }
    
  }
  
});

