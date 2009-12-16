#!/usr/bin/env ruby -wKU

# Author::    Darren Oakley  (mailto:daz.oakley@gmail.com)
# Copyright:: Copyright (c) 2009 Darren Oakley
#
# Simple wrapper script that uses a system call to 'curl' to upload 
# all .xml files in the current directory to the index.

#index_update_url = "http://www.i-dcc.org/dev/martsearch/solr/update"
index_update_url = "http://htgt.internal.sanger.ac.uk:8983/solr/update"

files = Dir.glob("solr-xml-*.xml")

files.each do |file|
  puts "POSTing #{file}"
  system("curl #{index_update_url} --data-binary @#{file} -H 'Content-type:text/xml; charset=utf-8'")
end

system("curl #{index_update_url} --data-binary '<commit/>' -H 'Content-type:text/xml; charset=utf-8'")
