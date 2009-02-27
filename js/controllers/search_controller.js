$j.c({
  Search: {
    
    index: function () {
      
      $j.c.Config.init();
      $j.v.Search.init();
      return true;
      
    },
    
    run: function ( query ) {
      
      // Clear the page...
      $j.v.Search.clear();
      
      return true;
      
    }
    
  }
});