/*
*
*/

$j.m.TargetedConstruct = {};
$.extend( $j.m.TargetedConstruct, $j.m.Generic );

$.extend( $j.m.TargetedConstruct, 
  {
    
    _table_name: 'targeted_constructs',
    
    _define: function () {
      var TargetedConstruct = ActiveRecord.define(
        'targeted_constructs',
        {
          gene_id:    '',
          project:    '',
          status:     '',
          project_id: ''
        },
        {
          valid: function () {
            if ( TargetedConstruct.findByProjectId( this.project_id ) ) {
              this.addError( 'This project_id: ' + this.project_id + ' has already been defined.' );
            }
          }
        }
      );
      
      var Gene = $j.m.Gene.model;
      Gene.hasMany('targeted_constructs');
      TargetedConstruct.belongsTo('genes');
      
      this.model = TargetedConstruct;
      return TargetedConstruct;
    },
    
    _save: function ( data ) {
      var model = this.model;
      var errors = [];
      
      $.each( data, function (index) {
        
        // Find or create a construct entry
        var construct = model.find({ first: true, where: { project_id: this.project_id } });
        if ( construct.id ) {
          // There is already an entry, extend it with any additional info we have...
          // TODO: finish this extension
        } else {
          log.debug('Creating new targeted_construct entry');
          // No entry - create one...
          construct = model.build({
            gene_id:    this.gene_id,
            project:    this.project,
            status:     this.status,
            project_id: this.project_id
          });
          construct.save();
          var tmp_errors = construct.getErrors();
          if ( tmp_errors.length > 0 ) { errors.push( tmp_errors ); };
        };
        
      });
      
      var status = true;
      if ( errors.length > 0 ) { status = false };
      return [ status, errors ];
    },
    
    _marts: {
      
      htgt_targ: {
        url:                    "/htgtdev/biomart/martservice",
        dataset_name:           "htgt_targ",
        name:                   "Gene Targeting Constructs",
        datasetConfigVersion:   "0.6",
        filters: [
          { name: 'marker_symbol',          enabled: true },
          { name: 'marker_name',            enabled: false },
          { name: 'mgi_accession_id',       enabled: false },
          { name: 'ensembl_gene_id',        enabled: false },
          { name: 'vega_gene_id',           enabled: false },
          { name: 'entrez_gene_id',         enabled: false },
                                            
		      { name: 'is_latest_for_gene',     enabled: true,		default: '1' },
                                            
          { name: 'pcs_distribute',         enabled: false },
          { name: 'targvec_distribute',     enabled: false },
          { name: 'epd_distribute',         enabled: false }
        ],
        attributes: [
          { name: 'is_eucomm',              enabled: true },
          { name: 'is_komp_csd',            enabled: true },
          { name: 'is_mgp',                 enabled: false },
          { name: 'is_norcomm',             enabled: true },
          { name: 'is_komp_regeneron',      enabled: false },
                                            
          { name: 'marker_symbol',          enabled: true },
          { name: 'marker_name',            enabled: false },
          { name: 'mgi_accession_id',       enabled: false },
          { name: 'ensembl_gene_id',        enabled: false },
          { name: 'vega_gene_id',           enabled: false },
          { name: 'entrez_gene_id',         enabled: false },
                                            
          { name: 'status',                 enabled: true },
		      { name: 'htgt_project_id',        enabled: true },
          { name: 'is_latest_for_gene',     enabled: false },
                                            
          { name: 'design_plate_name',      enabled: false },
          { name: 'design_well_name',       enabled: false },
          { name: 'design_id',              enabled: false },
          { name: 'bac',                    enabled: false },
                                            
          { name: 'intvec_plate_name',      enabled: false },
          { name: 'intvec_well_name',       enabled: false },
          { name: 'intvec_pass_level',      enabled: false },
          { name: 'pc_qctest_result_id',    enabled: false },
          { name: 'pcs_distribute',         enabled: false },
                                            
          { name: 'targvec_plate_name',     enabled: false },
          { name: 'targvec_well_name',      enabled: false },
          { name: 'backbone',               enabled: false },
          { name: 'cassette',               enabled: false },
          { name: 'targvec_pass_level',     enabled: false },
          { name: 'pg_qctest_result_id',    enabled: false },
          { name: 'targvec_distribute',     enabled: false },

          { name: 'allele_name',            enabled: false },
          { name: 'escell_clone_name',      enabled: false },
          { name: 'es_cell_line',           enabled: false },
          { name: 'colonies_picked',        enabled: false },
          { name: 'total_colonies',         enabled: false },
          { name: 'epd_pass_level',         enabled: false },
          { name: 'epd_qctest_result_id',   enabled: false },
          { name: 'epd_distribute',         enabled: false }
        ],
        map_to_storage: function ( data ) {
          // Look up the parent gene
          var Gene = $j.m.Gene.model;
          var gene = Gene.find({ first: true, where: { symbol: data.marker_symbol } });
          
          // Figure out which project this belongs to
          var ko_project = '';
          if      ( data.is_eucomm == 1 )   { ko_project = 'EUCOMM' }
          else if ( data.is_komp_csd == 1 ) { ko_project = 'KOMP' }
          else if ( data.is_norcomm == 1 )  { ko_project = 'NorCOMM' };
          
          // return the data...
          return {
            gene_id:    gene.id,
            project:    ko_project,
            status:     data.status,
            project_id: data.htgt_project_id
          };
        }
      }
      
    }
    
  }
);