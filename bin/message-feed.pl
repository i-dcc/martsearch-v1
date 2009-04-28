#! /usr/local/bin/perl

# == message-feed.pl
# 
# Simple CGI script to read the contents of the "/messages" 
# directory a bunch of text files formatted in either HTML, MarkDown, 
# or Textile and return a formatted list of messages ready for display 
# to the users.
# 
# This allows a more flexible approach to messaging and will stop us 
# having to change the contents of the code repository to add a new 
# message to the site.

use strict;
use warnings;
use CGI qw(:standard);
#use CGI::Carp qw(fatalsToBrowser);
use Text::Markdown qw(markdown);
use Text::Textile qw(textile);

# Print the header - disable caching...
print header(
  -type          => 'text/html',
  -cache_control => 'no-cache',
  -expires       => '-1d',
  -charset       => 'utf-8'
);

# Change directory
chdir('../messages');

my $messages = [];

# Push each message into our message array with the correct formatting
foreach my $file ( <*> ) {
  
  local $/=undef;
  open( FILE, $file ) or die "Couldn't open file: $!";
  binmode FILE;
  my $file_string = <FILE>;
  close FILE;
  
  # Determine what to do with the file...
  $file =~ /^\d+-(\w+)-\w+\.(\w+)$/;
  
  my $status = $1;
  my $format = $2;
  
  my $formatted_message = '';
  
  if    ( $format eq 'markdown' ) { $formatted_message = markdown( $file_string ); }
  elsif ( $format eq 'textile' )  { $formatted_message = textile( $file_string ); }
  else                            { $formatted_message = $file_string; }
  
  push( @{$messages}, wrap_message( $formatted_message, $status, $file ) );
  
}

print join( "\n", @{$messages} );

exit(0);

sub wrap_message {
  my ( $message, $status, $file ) = @_;
  
  my $return = qq[
    <!-- User message from file: $file -->
    <div class="ui-state-$status ui-corner-all ">
  ];
  
  if ( $status eq 'error' ) {
    $return .= q[
        <span class="ui-icon ui-icon-alert"></span>
    ];
  } elsif ( $status eq 'highlight' ) {
    $return .= q[
        <span class="ui-icon ui-icon-info"></span>
    ];
  }
  
  $return .= '<p>' . $message;
  
  $return .= q[
      </p>
    </div>
  ];
  
  return $return;
}
