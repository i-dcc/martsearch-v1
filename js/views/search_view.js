$j.v({
  Search: {
    
    /*
    *
    */
    init: function () {
      // Focus the input on the search bar
      $('#query').focus();
      
      // Attach an error reporter to the 'msg' div on the page
      $('#msg').ajaxError( function(event, request, settings){
        $('#loading').hide();
        $(this).append("<div class='error'>Sorry, error has occured requesting '" + settings.url + "'<br />Please re-submit your request.</div>");
      });
      
      // Attach ajax listeners to the 'loading' div (don't you just love jQuery?!?!?)
      $("#loading").ajaxStart(function(){ $(this).show(); });
      $("#loading").ajaxStop(function(){ $(this).hide(); });
      
      // Override the submit function on the form
      $('#mart_search').submit( function(){
        $j.c.Search.run( $('#query').val() );
        return false;
      });
    },
    
    // Clean up the page
    clear: function () {
      $('#msg').html('');
      $('#results').html('');
    }
    
  }
});