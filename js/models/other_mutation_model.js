/*
*
*/

$j.m.OtherMutation = {};
$.extend( $j.m.OtherMutation, $j.m.Generic );

$.extend( $j.m.OtherMutation, 
  {
    
    _table_name: 'other_mutations',
    
    _define: function () {
      var OtherMutation = ActiveRecord.define(
        this._table_name,
        {
          gene_id:   '',
          source:    '',
          count:     '',
          source_id: ''
        },
        {
          valid: function () {
            if ( OtherMutation.find({ first: true, where: { gene_id: this.gene_id, source: this.source } }) ) {
              this.addError( 'This gene/source combination has already been defined.' );
            }
          }
        }
      );
      
      // Define relationships
      var Gene = $j.m.Gene.model;
      Gene.hasMany(this._table_name);
      OtherMutation.belongsTo('genes');
      
      // Add some event logging
      OtherMutation.afterCreate( function (entry) {
        log.debug('[OtherMutation] new entry for '+ entry.getGene().symbol +': '+ entry.source +' ('+ entry.count + ')');
      });
      
      this.model = OtherMutation;
      return OtherMutation;
    },
    
    _save: function ( data ) {
      var errors = [];
      
      for (var index=0; index < data.length; index++) {
        if ( $.isArray(data[index]) ) {
          for (var i=0; i < data[index].length; i++) {
            var tmp_errors = this._save_helper( data[index][i] );
            if ( tmp_errors != undefined && tmp_errors.length > 0 ) { errors.push( tmp_errors ); };
          };
        } else {
          var tmp_errors = this._save_helper( data[index] );
          if ( tmp_errors != undefined && tmp_errors.length > 0 ) { errors.push( tmp_errors ); };
        };
      };
      
      var status = true;
      if ( errors.length > 0 ) { status = false };
      return [ status, errors ];
    },
    
    _save_helper: function ( data ) {
      var model = this.model;
      var entry = model.find({ first: true, where: { gene_id: data.gene_id, source: data.source } });
      
      if ( entry.id ) {
        // There is already an entry, extend it with any additional info we have...
        // TODO: finish this extension
      } else {
        // No entry - create one...
        entry = model.build({
          gene_id:    data.gene_id,
          source:     data.source,
          count:      data.count,
          source_id:  data.source_id
        });
        entry.save();
        var tmp_errors = entry.getErrors();
        if ( tmp_errors.length > 0 ) { return tmp_errors; };
      };
      
    },
    
    _marts: {
      
      htgt_trap: {
        url:                    "/htgtdev/biomart/martservice",
        dataset_name:           "htgt_trap",
        name:                   "EUCOMM Gene Trap Constructs",
        datasetConfigVersion:   "0.6",
        filters: [
          { name: 'marker_symbol', enabled: true },
          { name: 'marker_name', enabled: false },
          { name: 'mgi_accession_id', enabled: false },
          { name: 'ensembl_gene_id', enabled: false },
          { name: 'vega_gene_id', enabled: false },
          { name: 'entrez_gene_id', enabled: false },
          { name: 'is_trapped', enabled: true, 'default': '1' }
        ],
        attributes: [
          { name: 'marker_symbol', enabled: true },
          { name: 'marker_name', enabled: false },
          { name: 'mgi_accession_id', enabled: false },
          { name: 'ensembl_gene_id', enabled: false },
          { name: 'vega_gene_id', enabled: false },
          { name: 'entrez_gene_id', enabled: false },
          { name: 'htgt_project_id', enabled: true },
          { name: 'project_gene_trap_well_count', enabled: true }
        ],
        map_to_storage: function ( data ) {
          // Look up the parent gene
          var Gene = $j.m.Gene.model;
          var gene = Gene.find({ first: true, where: { symbol: data.marker_symbol } });
          
          // return the data...
          return {
            gene_id:    gene.id,
            source:     'EUCOMM Gene Traps',
            count:      data.project_gene_trap_well_count,
            source_id:  data.htgt_project_id
          };
        }
      },
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
          { name: "imsr_count", enabled: true },
          { name: "igtc_count", enabled: true },
          { name: "tigm_trapped_count", enabled: true },
          { name: "mgi_trapped_mutations_count", enabled: true },
          { name: "mgi_targeted_mutations_count", enabled: true },
          { name: "mgi_other_mutations_count", enabled: true }
        ],
        map_to_storage: function ( data ) {
          // Look up the parent gene
          var Gene = $j.m.Gene.model;
          var gene = Gene.find({ first: true, where: { symbol: data.marker_symbol } });
          
          var mutants = [];
          
          if ( data.imsr_count != 0 || "" ) {
            mutants.push({ 
              gene_id: gene.id, 
              source: 'International Mouse Strain Resource (IMSR)', 
              count: data.imsr_count 
            });
          };
          
          if ( data.igtc_count != 0 || "" ) { 
            mutants.push({ 
              gene_id: gene.id, 
              source: 'International Gene Trap Consortium (IGTC)', 
              count: data.igtc_count 
            });
          };
          
          if ( data.tigm_trapped_count != 0 || "" ) {
            mutants.push({
              gene_id: gene.id,
              source: 'Trapped Mutations (TIGM)',
              count: data.tigm_trapped_count
            });
          };
          
          if ( data.mgi_trapped_mutations_count != 0 || "" ) {
            mutants.push({
              gene_id: gene.id,
              source: 'Trapped Mutations Reported in MGI',
              count: data.mgi_trapped_mutations_count
            });
          };
          
          if ( data.mgi_targeted_mutations_count != 0 || "" ) {
            mutants.push({
              gene_id: gene.id,
              source: 'Targeted Mutations Reported in MGI',
              count: data.mgi_targeted_mutations_count
            });
          };
          
          if ( data.mgi_other_mutations_count != 0 || "" ) {
            mutants.push({
              gene_id: gene.id,
              source: 'Other Mutations Reported in MGI',
              count: data.mgi_other_mutations_count
            });
          };
          
          return mutants;
        }
      }
      
    }
    
  }
);