$j.v({
  Search: {
    
    /*
    *
    */
    init: function () {
      
      // Make the page tabbed
      $('#tabs').tabs({ fx: { opacity: 'toggle' } });
      
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
      
      // Attach ajax listeners to the 'loading' div (don't you just love jQuery?!?!?)
      // TODO: Change this to a full jQuery UI progress bar
      $("#loading").ajaxStart(function(){ $(this).show(); });
      $("#loading").ajaxStop(function(){ $(this).hide(); });
      
      // Override the submit function on the form
      $('#mart_search').submit( function(){
        $j.c.Search.run( $('#query').val() );
        return false;
      });
      
    },
    
    /*
    *
    */
    genes: function () {
      
      var Gene = $j.m.Gene.model;
      var genes = Gene.find({});
      $.each( genes, function (index) {
        var html = new EJS({ url: 'templates/search_results/gene.ejs' }).render( this );
        $('#result_list').append( html );
      });
      
      $(".accordion").accordion({ header: "h4", active: false, collapsible: true });
      
    }
    
  }
});