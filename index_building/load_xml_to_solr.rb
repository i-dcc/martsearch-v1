#!/usr/bin/env ruby -wKU

index_update_url = "http://www.i-dcc.org/dev/martsearch/solr/update"
#index_update_url = "http://localhost:8983/solr/update"

files = Dir.glob("*.xml")

files.each do |file|
  puts "POSTing #{file}"
  system("curl #{index_update_url} --data-binary @#{file} -H 'Content-type:text/xml; charset=utf-8'")
end

system("curl #{index_update_url} --data-binary '<commit/>' -H 'Content-type:text/xml; charset=utf-8'")
