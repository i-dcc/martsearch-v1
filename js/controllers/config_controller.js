$j.c({
  Config: {
    
    index_url: '/solr/select',
    items_per_page: 10,
    
    init: function () {
      
      try {
        
        ActiveRecord.connect();
        
        // Initialise tables...
        $j.m.Gene.init();
        $j.m.TargetedConstruct.init();
        $j.m.OtherMutation.init();
        $j.m.Microinjection.init();
        
        return true;
        
      } catch ( error ) {
        
        log.error('[ $j.c.Config.init() ] ' + error.description );
        return false;
        
      }
      
    },
    
    clear_results: function () {
      
      try {
        
        // Re-initialise tables...
        $j.m.Gene.re_init();
        $j.m.TargetedConstruct.re_init();
        $j.m.OtherMutation.re_init();
        $j.m.Microinjection.re_init();
        
      } catch ( error ) {
        log.error('[ $j.c.Config.clear_all() ] ' + error.description );
        return false;
      }
      
      return true;
      
    }
    
  }
});