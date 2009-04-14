/*
*
*/
$j.m.Microinjection = {};
$.extend( $j.m.Microinjection, $j.m.Generic );

$.extend( $j.m.Microinjection, 
  {
    
    _table_name: 'microinjections',
    
    /*
    *
    */
    _define: function () {
      // Define our gene model
      var Microinjection = ActiveRecord.define(
        this._table_name,
        {
          gene_id:               '',
          project:               '',
          escell_clone_name:     '',
          escell_line_strain:    '',
          mi_centre:             '',
          mi_date:               '',
          status:                ''
        },
        {
          valid: function () {
            if ( 
              Microinjection.find({ 
                first: true, 
                where: { 
                  escell_clone_name: this.escell_clone_name, 
                  mi_date: this.mi_date, 
                  mi_centre: this.mi_centre 
                } 
              }) 
            ) {
              this.addError( 'This mi combination: '+ this.escell_clone_name +'/'+ this.mi_date +'/'+ this.mi_centre +' has already been defined.' );
            }
          }
        }
      );
      
      // Add some event logging
      Microinjection.afterCreate( function (entry) {
        //log.debug('[Gene] new entry for ' + entry.symbol);
      });
      
      // Define the relations
      var Gene = $j.m.Gene.model;
      Gene.hasMany('microinjections');
      
      this.model = Microinjection;
      return Microinjection;
    },
    
    /*
    *
    */
    _save: function ( data ) {
      var model = this.model;
      var errors = [];
      
      $.each( data, function (index) {
        
        // Find or create a entry
        var microinjection = model.find({
          first: true, 
          where: { 
            escell_clone_name:  this.escell_clone_name, 
            mi_date:            this.mi_date, 
            mi_centre:          this.mi_centre 
          } 
        });
        
        if ( microinjection.id ) {
          // There is already an entry, extend it with any additional info we have...
          // TODO: finish this extension
        } else {
          // No entry - create one...
          microinjection = model.build({
            gene_id:              this.gene_id,
            project:              this.project,
            escell_clone_name:    this.escell_clone_name, 
            escell_line_strain:   this.escell_line_strain, 
            mi_centre:            this.mi_centre,
            mi_date:              this.mi_date,
            status:               this.status
          });
          microinjection.save();
          var tmp_errors = microinjection.getErrors();
          if ( tmp_errors.length > 0 ) { errors.push( tmp_errors ); };
        };
        
      });
      
      var status = true;
      if ( errors.length > 0 ) { status = false };
      return [ status, errors ];
    },
    
    _marts: {
      
      kermits: {
        url:                    "/htgtdev/biomart/martservice",
        dataset_name:           "kermits",
        name:                   "Kermits",
        datasetConfigVersion:   "0.6",
        filters: [
          { name: "escell_clone_name", enabled: true }
        ],
        attributes: [
          { name: "sponsor", enabled: true },
          { name: "gene_symbol", enabled: true },
          { name: "escell_clone_name", enabled: true },
          { name: "escell_line_strain", enabled: true },
          { name: "mi_centre", enabled: true },
          { name: "mi_date", enabled: true },
          { name: "num_with_cct", enabled: true },
          { name: "num_with_glt", enabled: true }
        ],
        map_to_storage: function ( data ) {
          
          // Only store entries with an mi_date/centre...
          if ( data.mi_date && data.mi_centre ) {
            
            // Look up the parent gene
            var Gene = $j.m.Gene.model;
            var gene = Gene.find({ first: true, where: { symbol: data.gene_symbol } });

            // Figure out the status
            var mi_status = '';
            if      ( data.num_with_glt > 0 ) { mi_status = 'Genotype confirmed' }
            else if ( data.num_with_cct > 0 ) { mi_status = 'Germline transmission confirmed' }
            else                              { mi_status = 'Microinjection in progress' };

            // return the data...
            return {
              gene_id:            gene.id,
              project:            data.sponsor,
              escell_clone_name:  data.escell_clone_name,
              escell_line_strain: data.escell_line_strain,
              mi_centre:          data.mi_centre,
              mi_date:            data.mi_date,
              status:             mi_status
            };
            
          } else {
            
            return false;
            
          };
          
        }
      }
      
    }
    
  }
);