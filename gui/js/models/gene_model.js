/*
*
*/
$j.m.Gene = {};
$.extend( $j.m.Gene, $j.m.Generic );

$.extend( $j.m.Gene, 
  {
    
    _table_name: 'genes',
    
    /*
    *
    */
    _define: function () {
      // Define our gene model
      var Gene = ActiveRecord.define(
        this._table_name,
        {
          symbol:       '',
          chromosome:   '',
          coord_start:  '',
          coord_end:    '',
          strand:       '',
          type:         ''
        },
        {
          valid: function () {
            if ( Gene.findBySymbol( this.symbol ) ) {
              this.addError( 'This gene symbol: ' + this.symbol + ' has already been defined.' );
            }
          }
        }
      );
      
      // Define a model to cope with many external gene ids
      var ExtGeneId = ActiveRecord.define(
        'ext_gene_ids',
        {
          gene_id:  '',
          value:    '',
          source:   ''
        },
        {
          valid: function () {
            var entry = ExtGeneId.find({
              first: true,
              where: { gene_id: this.gene_id, value: this.value, source: this.source }
            });
            if ( entry ) {
              this.addError( 'This external id: ('+entry.gene_id+':'+entry.value+':'+entry.source+') has already been defined.' );
            }
          }
        }
      );
      
      // Add some event logging
      Gene.afterCreate( function (entry) {
        //log.debug('[Gene] new entry for ' + entry.symbol);
      });
      
      ExtGeneId.afterCreate( function (entry) {
        //log.debug('[ExtGeneId] new entry for '+ entry.getGene().symbol +': '+ entry.value +' ('+ entry.source  +')');
      });
      
      // Define the relations
      Gene.hasMany('ext_gene_ids');
      ExtGeneId.belongsTo('genes');
      
      this.model = Gene;
      return Gene;
    },
    
    /*
    *
    */
    _drop: function () {
      ActiveRecord.execute('DROP TABLE IF EXISTS ext_gene_ids');
      ActiveRecord.execute('DROP TABLE IF EXISTS genes');
      this.model = false;
      return true;
    },
    
    /*
    *
    */
    _save: function ( data ) {
      var model = this.model;
      var errors = [];
      
      $.each( data, function (index) {
        var data_entry = data[index];
        
        // Find or create our gene entry
        var gene = model.find({ first: true, where: { symbol: data_entry.symbol } });
        if ( gene.id ) {
          // There is already an entry, extend it with any additional info we have...
          // TODO: finish this extension
        } else {
          // No entry - create one...
          gene = model.build({
            symbol:       data_entry.symbol,
            chromosome:   data_entry.chromosome,
            coord_start:  data_entry.coord_start,
            coord_end:    data_entry.coord_end,
            strand:       data_entry.strand,
            type:         data_entry.type
          });
          gene.save();
          var tmp_errors = gene.getErrors();
          if ( tmp_errors.length > 0 ) { errors.push( tmp_errors ); };
        };
        
        // Now save any external identifiers we have
        $.each( data_entry.ext_gene_ids, function(index) {
          var ext_id_entry = data_entry.ext_gene_ids[index];
          gene.createExtGeneId({
            source:   ext_id_entry.source,
            value:    ext_id_entry.value
          });
          var tmp_errors = gene.getErrors();
          if ( tmp_errors.length > 0 ) { errors.push( tmp_errors ); };
        });
        
      });
      
      var status = true;
      if ( errors.length > 0 ) { status = false };
      return [ status, errors ];
    },
    
    _marts: {
      
      dcc: {
        url:                    "/htgtdev/biomart/martservice",
        dataset_name:           "dcc",
        name:                   "knockoutmouse.org",
        datasetConfigVersion:   "0.6",
        filters: [
          { name: "marker_symbol", enabled: true }
        ],
        attributes: [
          { name: "marker_symbol", enabled: true },
          { name: "marker_names", enabled: true },
          { name: "mgi_accession_id", enabled: true },
          { name: "chromosome", enabled: true },
          { name: "coord_start", enabled: true },
          { name: "coord_end", enabled: true },
          { name: "strand", enabled: true },
          { name: "marker_type", enabled: true },
          { name: "synonyms", enabled: true },
          { name: "ensembl_gene_ids", enabled: true },
          { name: "vega_gene_ids", enabled: true },
          { name: "entrez_gene_ids", enabled: true },
          { name: "ccds_ids", enabled: true },
          { name: "omim_ids", enabled: true }
        ],
        map_to_storage: function ( data ) {
          // Sort the gene information...
          var gene_data = {
            symbol:       data.marker_symbol,
            chromosome:   data.chromosome,
            coord_start:  data.coord_start,
            coord_end:    data.coord_end,
            strand:       data.strand,
            type:         data.marker_type,
            ext_gene_ids: []
          };
          
          // Now the external gene identifiers
          if ( data.mgi_accession_id !== "" )  { gene_data.ext_gene_ids.push({ source: 'mgi', value: data.mgi_accession_id }); };
          
          if ( data.synonyms !== "" ) {
            $.each( data.synonyms.split(", "), function ( index, val ) {
              gene_data.ext_gene_ids.push({ source: 'synonym', value: val });
            })
          }
          
          if ( data.marker_names !== "" ) {
            $.each( data.marker_names.split("; "), function ( index, val ) {
              gene_data.ext_gene_ids.push({ source: 'name', value: val });
            })
          }
          
          if ( data.ensembl_gene_ids !== "" ) {
            $.each( data.ensembl_gene_ids.split(","), function ( index, val ) {
              gene_data.ext_gene_ids.push({ source: 'ensembl', value: val });
            })
          }
          
          if ( data.vega_gene_ids !== "" ) {
            $.each( data.vega_gene_ids.split(","), function ( index, val ) {
              gene_data.ext_gene_ids.push({ source: 'vega', value: val });
            })
          }
          
          if ( data.entrez_gene_ids !== "" ) {
            $.each( data.entrez_gene_ids.split(","), function ( index, val ) {
              gene_data.ext_gene_ids.push({ source: 'entrez', value: val });
            })
          }
          
          if ( data.ccds_ids !== "" ) {
            $.each( data.ccds_ids.split(","), function ( index, val ) {
              gene_data.ext_gene_ids.push({ source: 'ccds', value: val });
            })
          }
          
          if ( data.omim_ids !== "" ) {
            $.each( data.omim_ids.split(","), function ( index, val ) {
              gene_data.ext_gene_ids.push({ source: 'omim', value: val });
            })
          }
          
          return gene_data;
        }
      }
      
    }
    
  }
);