$j.c({
  Search: {
    
    index: function () {
      
      $j.c.Config.init();
      $j.v.Search.init();
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
        url:  $j.c.Config.index_url,
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
      
      $j.v.Search.genes();
      
      $('#loading').fadeOut("fast");
      
      log.profile("[Search] Search pipe for '" + query + "'");
      
      return true;
      
    },
    
    handle_paging: function (new_page_index, pagination_container) {
      $j.c.Search.run( $('#query').val(), new_page_index );
      return false;
    }
    
  }
});