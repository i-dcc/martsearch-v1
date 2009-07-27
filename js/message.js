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
        if ( data !== "" ) { jQuery(".messages").append( data ); }
      },
      error:    function( XMLHttpRequest, textStatus, errorThrown ) {
        status = false;
        var error_txt = "Error initializing martsearch messaging - " + textStatus + " ("+ XMLHttpRequest.status +")";
        log.error( error_txt );
        message.add( error_txt, "error", XMLHttpRequest.responseText );
      }
    });
    
    return status;
  },
  
  /*
  * 
  * @alias  Message.clear
  */
  clear: function() {
    jQuery(".messages").hide("fast");
    jQuery(".messages").html("");
    jQuery(".messages").show("fast");
  },
  
  /*
  * 
  * @alias  Message.add
  * @param  {String} 
  * @param  {String} 
  */
  add: function( message, state, error_msg ) {
    var timestamp = new Date().getTime();
    var message_string = '<div class="ui-state-'+state+' ui-corner-all">';
    
    if ( state === 'error' ) {
      message_string += '<span class="ui-icon ui-icon-alert"></span>';
      message_string += '<p>' + message;
      if ( error_msg !== undefined || error_msg !== "" ) {
        message_string += ' <small><a id="'+ms.current_mode+'_errortoggle'+timestamp+'" href="#" class="error_toggle">full error message</a></small></p>';
        message_string += '<div id="'+ms.current_mode+'_errormsg'+timestamp+'" class="error_msg" style="display:none;">'+ error_msg +'</div>';
        message_string += '</div>';
      }
      else {
        message_string += '</p></div>';
      }
    }
    else if ( state === 'highlight' ) {
      message_string += '<span class="ui-icon ui-icon-info"></span>';
      message_string += '<p>' + message + '</p></div>';
    }
    
    jQuery('#'+ms.current_mode+'_messages').append( message_string ).show("fast");
    jQuery('#'+ms.current_mode+'_errortoggle'+timestamp).toggleControl('#'+ms.current_mode+'_errormsg'+timestamp);
  }
};
