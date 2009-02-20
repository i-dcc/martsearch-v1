/*
*
*/
$j.m.Gene = $.extend( $j.m.Generic, 
  {
    
    _table_name: 'genes',
    
    _define: function () {
      var Gene = ActiveRecord.define(
        this._table_name,
        {
          mgi_id:        '',
          symbol:       '',
          chromosome:   '',
          coord_start:  '',
          coord_end:    '',
          strand:       ''
        },
        {
          valid: function () {
            if ( Gene.findByMgiId( this.mgi_id ) ) {
              this.addError( 'This MGI ID: ' + this.mgi_id + ' has already been defined.' );
            }
          }
        }
      );
      this._model = Gene;
      return Gene;
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
          {"display":"Ensembl Gene ID","name":"ensembl_gene_id","enabled":true},
          {"display":"Vega Gene ID","name":"vega_gene_id","enabled":true},
          {"display":"Entrez Gene ID","name":"entrez_gene_id","enabled":true},
          {"display":"CCDS ID","name":"ccds_id","enabled":true},
          {"display":"OMIM ID","name":"omim_id","enabled":true},
          {"display":"Gene Type","name":"gene_type","enabled":true},
          {"display":"Chromosome","name":"chromosome","enabled":true},
          {"display":"Start Position","name":"start_position","enabled":true},
          {"display":"End Position","name":"end_position","enabled":true},
          {"display":"Strand","name":"strand","enabled":true}
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
          return {
            mgi_id:       data.mgi_accession_id,
            symbol:       data.gene_symbol,
            chromosome:   data.chromosome,
            coord_start:  data.start_position,
            coord_end:    data.end_position,
            strand:       data.strand
          };
        }
      }
      
    }
    
  }
);