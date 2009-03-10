$j.c({
  Config: {
    
    init: function () {
      
      try {
        
        ActiveRecord.connect();
        
        // Initialise tables...
        $j.m.Gene.init();
        $j.m.TargetedConstruct.init();
        $j.m.OtherMutation.init();
        
        return true;
        
      } catch ( error ) {
        
        log.error('[ $j.c.Config.init() ] ' + error.description );
        return false;
        
      }
      
    }
    
  }
});