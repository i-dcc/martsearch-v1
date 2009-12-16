#!/usr/bin/env ruby -wKU

require "rubygems"
require "json"
require "erb"

# Read in our monstorous config file
json_conf = IO.read("config.json")
CONF = JSON.parse(json_conf)

# Open the ERB template
template = File.open( 'schema.xml.erb', 'r' )
erb = ERB.new( template.read )

# Open our output file
output = File.open( 'schema.xml', 'w' )
output.write( erb.result( binding ) )
