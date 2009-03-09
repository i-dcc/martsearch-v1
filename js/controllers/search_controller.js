$j.c({
  Search: {
    
    index: function () {
      
      $j.c.Config.init();
      $j.v.Search.init();
      return true;
      
    },
    
    run: function ( query ) {
      
      $j.m.Gene.search( query );
      $j.m.TargetedConstruct.search( query );

      $j.v.Search.genes();
      
      return true;
      
    }
    
  }
});