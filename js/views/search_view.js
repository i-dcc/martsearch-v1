$j.v({
  Search: {
    
    /*
    *
    */
    init: function () {
      
      // Make the page tabbed
      $('#tabs').tabs({ fx: { opacity: 'toggle' } });
      
      $('#about_link').click(function() {
          $('#tabs').tabs('select', 4); // switch to about (5th) tab
          return false;
      });
      
      // Override the submit function on the form
      $('#mart_search').submit( function(){
        $j.c.Search.run( $('#query').val(), 0 );
        return false;
      });
      
      // Focus the users input
      $('#query').focus();
      
      // Fill the other tabs...
      new EJS({ url: $j.c.Config.base_url + '/templates/browse_by_symbol.ejs' }).update( 'browse_by_symbol', {} );
      new EJS({ url: $j.c.Config.base_url + '/templates/browse_by_chr.ejs' }).update( 'browse_by_chr', {} );
      new EJS({ url: $j.c.Config.base_url + '/templates/configure.ejs' }).update( 'configure', {} );
      new EJS({ url: $j.c.Config.base_url + '/templates/help.ejs' }).update( 'help', {} );
      new EJS({ url: $j.c.Config.base_url + '/templates/about.ejs' }).update( 'about', {} );
      
      // Make form buttons respond to mouse interaction
      $(".ui-button:not(.ui-state-disabled)")
        .hover(
          function(){ 
            $(this).addClass("ui-state-hover"); 
          },
          function(){ 
            $(this).removeClass("ui-state-hover"); 
          }
        )
        .mousedown(function(){
          $(this).parents('.ui-buttonset-single:first').find(".ui-button.ui-state-active").removeClass("ui-state-active");
          if( $(this).is('.ui-state-active.ui-button-toggleable, .ui-buttonset-multi .ui-state-active') ){ $(this).removeClass("ui-state-active"); }
          else { $(this).addClass("ui-state-active"); }	
        })
        .mouseup(function(){
          if(! $(this).is('.ui-button-toggleable, .ui-buttonset-single .ui-button,  .ui-buttonset-multi .ui-button') ){
            $(this).removeClass("ui-state-active");
          }
        });
    },
    
    /*
    *
    */
    clear_results: function () {
      $('#results_pager').html("");
      $('#result_list').html("");
    },
    
    /*
    *
    */
    genes: function () {
      
      var Gene = $j.m.Gene.model;
      var genes = Gene.find({});
      $.each( genes, function (index) {
        var html = new EJS({ url: $j.c.Config.base_url + '/templates/search_results/gene.ejs' }).render( genes[index] );
        $('#result_list').append( html );
      });
      
      $(".accordion").accordion({ header: "h4", active: false, collapsible: true });
      
    }
    
  }
});