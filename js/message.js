/*
* Functions for controlling user the messaging system 
* within the app.
*/
Message = function ( params ) {
  this.base_url = params.base_url ? params.base_url : "";
};

Message.prototype = {
  /*
  * Init function to run on page load - loads any messages 
  * stored on the server and puts them on screen.
  * @alias  Message.init
  */
  init: function() {
    var status = true;
    var message = this;
    jQuery.ajax({
      url:      message.base_url + "/bin/message-feed.pl",
      type:     "GET",
      async:    true,
      data:     {},
      success:  function( data ) {
        if ( data != "" ) { jQuery("#messages").append( data ); };
      },
      error:    function( XMLHttpRequest, textStatus, errorThrown ) {
        status = false;
        log.error( "Error initializing martsearch messaging - " + textStatus + " (" + errorThrown + ")" );
        message.add(
          "Error initializing martsearch messaging - " + textStatus + " (" + errorThrown + ")",
          "error"
        );
      }
    });
    
    return status;
  },
  
  /*
  * 
  * @alias  Message.clear
  */
  clear: function() {
    jQuery("#messages").html('');
  },
  
  /*
  * 
  * @alias  Message.add
  * @param  {String} 
  * @param  {String} 
  */
  add: function( message, state ) {
    var message_string = '<div class="ui-state-'+state+' ui-corner-all">';
    
    if ( state === 'error' ) {
      message_string += '<span class="ui-icon ui-icon-alert"></span>';
    } else if ( state === 'highlight' ) {
      message_string += '<span class="ui-icon ui-icon-info"></span>';
    };
    
    message_string += '<p>' + message + '</p></div>';
    jQuery("#messages").append( message_string );
  }
};
