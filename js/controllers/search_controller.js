$j.c({
  Search: {
    
    index: function () {
      
      $j.c.Config.init();
      $j.v.Search.init();
      
      $j.c.Search.load_product_counts();
      
      return true;
      
    },
    
    run: function ( query, page ) {
      
      log.profile("[Search] Search pipe for '" + query + "'");
      
      $('#loading').fadeIn("fast");
      
      $j.c.Config.clear_results();
      
      // Cope with pagination...
      var solr_start = 0;
      if ( page ) { solr_start = page * $j.c.Config.items_per_page; };
      
      var marker_symbols = [];
      var escell_clones  = []
      var num_results    = 0;
      
      // Fire a query to the lucene (Solr) index...
      $.ajax({
        type: "POST",
        url:  $j.c.Config.base_url + $j.c.Config.index_url,
        async: false,
        dataType: "json",
        data: {
          wt:         "json",
          indent:     "on",
          q:          query,
          "json.nl":  "flat",
          start:      solr_start,
          rows:       $j.c.Config.items_per_page
        },
        success: function ( json ) {
          //console.log(json);
          
          $.each( json.response.docs, function ( index, gene ) {
            
            marker_symbols.push( gene.marker_symbol );
            
            if ( gene.escell && gene.escell.length > 0 ) {
              $.each( gene.escell, function (index) {
                escell_clones.push( gene.escell[index] );
              });
            };
            
          });
          
          num_results = json.response.numFound;
        }
      });
      
      // Now fire the mart searches with the return from solr
      var marker_symbol_query_str = marker_symbols.join(",");
      var escell_clones_query_str = escell_clones.join(",");
      
      $j.m.Gene.search( marker_symbol_query_str );
      $j.m.TargetedConstruct.search( marker_symbol_query_str );
      $j.m.OtherMutation.search( marker_symbol_query_str );
      $j.m.Microinjection.search( escell_clones_query_str );
      
      $j.v.Search.clear_results();
      
      // See if we need to paginate results
      if ( num_results > $j.c.Config.items_per_page ) {
        $('#results_pager').pagination( num_results, {
          items_per_page:       $j.c.Config.items_per_page,
          num_edge_entries:     1,
          num_display_entries:  5,
          current_page:         page,
          callback:             $j.c.Search.handle_paging
        });
      };
      
      $('#product_counts').fadeOut("fast");
      
      $j.v.Search.genes();
      
      $('#loading').fadeOut("fast");
      
      log.profile("[Search] Search pipe for '" + query + "'");
      
      return true;
      
    },
    
    handle_paging: function (new_page_index, pagination_container) {
      $j.c.Search.run( $('#query').val(), new_page_index );
      return false;
    },
    
    /*
    * Function to run on initial page load (post index) to import and display
    * project counts to screen.
    */
    load_product_counts: function () {
      
      var filters = {
        "In Progress": {
          "Eucomm": { is_eucomm:   "1", is_latest_for_gene: "1", status: "Vector Construction in Progress" },
          "KOMP-CSD": { is_komp_csd: "1", is_latest_for_gene: "1", status: "Vector Construction in Progress" },
          "KOMP-Regeneron": { is_komp_regeneron: "1", is_latest_for_gene: "1", status: "Vector Construction in Progress" },
          "NorCOMM": { is_norcomm: "1", is_latest_for_gene: "1", status: "Vector Construction in Progress" }
        },
        "Vectors Available": {
          "Eucomm":   { is_eucomm:   "1", is_latest_for_gene: "1", status: "Vector Complete" },
          "KOMP-CSD": { is_komp_csd: "1", is_latest_for_gene: "1", status: "Vector Complete" },
          "KOMP-Regeneron": { is_komp_regeneron: "1", is_latest_for_gene: "1", status: "Vector Complete" },
          "NorCOMM": { is_norcomm: "1", is_latest_for_gene: "1", status: "Vector Complete" }
        },
        "ES Cells Available": {
          "Eucomm":   { is_eucomm:   "1", is_latest_for_gene: "1", status: "ES Cells - Targeting Confirmed" },
          "KOMP-CSD": { is_komp_csd: "1", is_latest_for_gene: "1", status: "ES Cells - Targeting Confirmed" },
          "KOMP-Regeneron": { is_komp_regeneron: "1", is_latest_for_gene: "1", status: "ES Cells - Targeting Confirmed" },
          "NorCOMM": { is_norcomm: "1", is_latest_for_gene: "1", status: "ES Cells - Targeting Confirmed" }
        },
        "Mice Available": {
          "Eucomm":   { is_eucomm:   "1", is_latest_for_gene: "1", status: "Mice Available" },
          "KOMP-CSD": { is_komp_csd: "1", is_latest_for_gene: "1", status: "Mice Available" },
          "KOMP-Regeneron": { is_komp_regeneron: "1", is_latest_for_gene: "1", status: "Mice Available" },
          "NorCOMM": { is_norcomm: "1", is_latest_for_gene: "1", status: "Mice Available" }
        }
      }
      
      new EJS({ url: '/templates/product_counts.ejs' }).update( 'product_counts_table', { data: filters } );
      
      $.each( filters, function ( product_type, projects ) {
        $.each( projects, function ( project, mart_filters ) {
          var dom_id = '#' + product_type.replace(/ /ig, "_") + '_' + project;
          $j.c.Search._product_count_search( dom_id, mart_filters );
        });
      });
      
      return true;
    },
    
    _product_count_search: function ( dom_element, filters) {
      // Build the XML file
      var xml = '';
      xml += '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE Query>';
      xml += '<Query  virtualSchemaName="default" formatter="TSV" header="0" uniqueRows="1" count="1" datasetConfigVersion="0.6" >';
      xml += '<Dataset name="htgt_targ" interface="default" >';
      
      $.each( filters, function ( filter, value ) {
        xml += '<Filter name="' + filter + '" value="'+ value +'"/>'
      });
      
      xml += '</Dataset>';
      xml += '</Query>';
      
      // Fire the mart search and update the table cell
      $.ajax({
        type: "POST",
        url: $j.c.Config.base_url + "/htgtdev/biomart/martservice",
        async: true,
        data: { "query": xml },
        success: function ( data ) { $(dom_element).html(data); }
      });
      
    }
    
  }
});