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
          mgi_id:       '',
          symbol:       '',
          chromosome:   '',
          coord_start:  '',
          coord_end:    '',
          strand:       '',
          type:         ''
        },
        {
          valid: function () {
            if ( Gene.findByMgiId( this.mgi_id ) ) {
              this.addError( 'This MGI ID: ' + this.mgi_id + ' has already been defined.' );
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
            if ( entry.length > 0 ) {
              this.addError( 'This external id: ('+entry.gene_id+':'+entry.value+':'+entry.source+') has already been defined.' );
            }
          }
        }
      );
      
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
        var gene = model.find({ first: true, where: { mgi_id: data_entry.mgi_id } });
        if ( gene.id ) {
          // There is already an entry, extend it with any additional info we have...
          // TODO: finish this extension
        } else {
          log.debug('Creating new gene entry for ' + data_entry.symbol);
          // No entry - create one...
          gene = model.build({
            mgi_id:       data_entry.mgi_id,
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
          log.debug('Creating new ext_gene_id entry for ' + data_entry.symbol + ' - ' + ext_id_entry.value);
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
          {"display":"Gene Symbol","name":"gene_symbol","enabled":true},
          {"display":"MGI Accession ID","name":"mgi_accession_id","enabled":false},
          {"display":"Ensembl Gene ID","name":"ensembl_gene_id","enabled":false},
          {"display":"Vega Gene ID","name":"vega_gene_id","enabled":false},
          {"display":"Entrez Gene ID","name":"entrez_gene_id","enabled":false},
          {"display":"Chromosome","name":"chromosome","enabled":false},
          {"display":"Start Position (==)","name":"start_position_eq","enabled":false},
          {"display":"Start Position (>=)","name":"start_position_gt","enabled":false},
          {"display":"Start Position (<=)","name":"start_position_lt","enabled":false},
          {"display":"End Position (<=)","name":"end_position_lt","enabled":false},
          {"display":"End Position (>=)","name":"end_position_gt","enabled":false},
          {"display":"End Position (==)","name":"end_position_eq","enabled":false},
          {"display":"Strand","name":"strand","enabled":false}
        ],
        attributes: [
          {"display":"Gene Symbol","name":"gene_symbol","enabled":true},
          {"display":"MGI Accession ID","name":"mgi_accession_id","enabled":true},
          {"display":"Chromosome","name":"chromosome","enabled":true},
          {"display":"Start Position","name":"start_position","enabled":true},
          {"display":"End Position","name":"end_position","enabled":true},
          {"display":"Strand","name":"strand","enabled":true},
          {"display":"Gene Type","name":"gene_type","enabled":true},
          {"display":"Ensembl Gene ID","name":"ensembl_gene_id","enabled":true},
          {"display":"Vega Gene ID","name":"vega_gene_id","enabled":true},
          {"display":"Entrez Gene ID","name":"entrez_gene_id","enabled":true},
          {"display":"CCDS ID","name":"ccds_id","enabled":true},
          {"display":"OMIM ID","name":"omim_id","enabled":true}
          /*,
          {"display":"Vector Design ID (Ordering Info Link)","name":"komp_csd_project_id","enabled":true},
          {"display":"Status","name":"komp_csd_status","enabled":true},
          {"display":"Date Status Assigned","name":"komp_csd_date_status_asigned","enabled":true},
          {"display":"Vector Design ID (Ordering Info Link)","name":"komp_regeneron_velocigene_id","enabled":true},
          {"display":"Status","name":"komp_regeneron_status","enabled":true},
          {"display":"Date Status Assigned","name":"komp_regeneron_data_status_assigned","enabled":true},
          {"display":"Status","name":"eucomm_status","enabled":true},
          {"display":"Status","name":"norcomm_status","enabled":true},
          {"display":"# International Mouse Strain Resource (IMSR)","name":"imsr_count","enabled":true},
          {"display":"# International Gene Trap Consortium (IGTC)","name":"igtc_count","enabled":true},
          {"display":"# Trapped Mutations (TIGM)","name":"tigm_trapped_count","enabled":true},
          {"display":"# Trapped Mutations (MGI)","name":"mgi_trapped_mutations_count","enabled":true},
          {"display":"# Targeted Mutations (MGI)","name":"mgi_targeted_mutations_count","enabled":true},
          {"display":"# Other Mutations (MGI)","name":"mgi_other_mutations_count","enabled":true}
          */
        ],
        map_to_storage: function ( data ) {
          // Sort the gene information...
          var gene_data = {
            mgi_id:       data.mgi_accession_id,
            symbol:       data.gene_symbol,
            chromosome:   data.chromosome,
            coord_start:  data.start_position,
            coord_end:    data.end_position,
            strand:       data.strand,
            type:         data.type,
            ext_gene_ids: []
          };
          
          // Now the external gene identifiers
          if ( data.ensembl_gene_id !== "" ) { gene_data.ext_gene_ids.push({ source: 'ensembl', value: data.ensembl_gene_id }); };
          if ( data.vega_gene_id !== "" )    { gene_data.ext_gene_ids.push({ source: 'vega', value: data.vega_gene_id }); };
          if ( data.entrez_gene_id !== "" )  { gene_data.ext_gene_ids.push({ source: 'entrez', value: data.entrez_gene_id }); };
          if ( data.ccds_id !== "" )         { gene_data.ext_gene_ids.push({ source: 'ccds', value: data.ccds_id }); };
          if ( data.omim_id !== "" )         { gene_data.ext_gene_ids.push({ source: 'omim', value: data.omim_id }); };
          
          return gene_data;
        }
      }
      
    }
    
  }
);