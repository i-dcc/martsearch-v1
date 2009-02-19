/*
*
*/
$j.m({
  
  Generic: {
    
    /*
    * ActiveRecord associated functions...
    */
    
    obj: function () {
      if ( this._model ) {
        return this._model;
      } else {
        this._drop();
        this._model = this._define();
        return this._model;
      }
    },
    
    _table_name: '',
    
    _model: false,
    
    _define: function () {
      return this._model;
    },
    
    _drop: function () {
      ActiveRecord.execute('DROP TABLE IF EXISTS ' + this._table_name );
      this._model = false;
      return true;
    },
    
    /*
    * Dataset (mart) associated functions...
    */
    
    _marts: {},
    
    search: function ( query ) {
      
    }
    
  }
  
});

