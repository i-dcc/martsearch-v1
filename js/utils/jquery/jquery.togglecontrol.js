/**
 * jQuery toggleControl 1.0
 * 
 * Copyright (c) 2008 Darren Oakley
 *
 * http://hocuspokus.net/
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
 */

(function(jQuery) {
  jQuery.fn.extend({
    toggleControl: function( element, opts ) {
      
      var defaults = {
        hide: true,
        speed: "normal",
        event: "click",
        openClass: "toggle-open",
        closeClass: "toggle-close"
      };
      
      var options = jQuery.extend(defaults, opts);
      
      return this.each( function( index ) {
        var obj = jQuery(this);
        
        jQuery(this).each( function ( i, toggle ) {
          
          if ( options.hide ) {
            jQuery(toggle).addClass( options.openClass );
            jQuery(element).slideUp( options.speed );
          } else {
            jQuery(toggle).addClass( options.closeClass );
          }
          
          jQuery(toggle).bind( options.event, function(event) {
            jQuery(toggle).toggleClass( options.openClass );
            jQuery(toggle).toggleClass( options.closeClass );
            jQuery(element).eq(index).slideToggle( options.speed );
          });
        });
        
      });
      
    }
  });
})(jQuery);