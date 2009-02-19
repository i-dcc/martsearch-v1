$j.c({
  Config: {
    
    init: function () {
      
      try {
        
        ActiveRecord.connect();
        return true;
        
      } catch ( error ) {
        
        log.error('[ $j.c.Config.init() ] ' + error.description );
        return false;
        
      }
      
    }
    
  }
});