#! /usr/bin/perl

# == dataset-feed.pl
# 
# Simple CGI script to read the contents of the "/datasets" 
# directory (a bunch of JSON files) and return it as a single 
# JSON array.
# 
# This allows a more flexible approach to the MartSearch 
# configuration mechanics.

use strict;
use warnings;
use CGI qw/:standard/;
#use CGI::Carp qw/fatalsToBrowser/;

# Print the header - Enable browsers to cache the resulting JSON 
# string for 24 hours...
print header(
  -type          => 'text/plain',
  -type          => 'application/json',
  -cache_control => 'max-age=86400',
  -expires       => '+1d',
  -charset       => 'utf-8'
);

# Change directory
chdir('../conf/datasets');

my $return_arrayref;

# Push each dataset object onto our json_object array
foreach my $file ( <*.json> ) {
  
  local $/=undef;
  open( FILE, $file ) or die "Couldn't open file: $!";
  binmode FILE;
  my $file_string = <FILE>;
  close FILE;
  
  push( @{$return_arrayref}, $file_string );
  
}

my $return_string = "[";
$return_string .= join( ",", @{$return_arrayref} );
$return_string .= "]";

print $return_string;

exit(0);