#! /usr/local/bin/ruby

require 'rubygems'
require 'hpricot'
require 'json'

if ARGV.size > 0
  xml = Hpricot.XML( open( ARGV[0] ) )
else
  raise 'No mart XML file defined'
  exit 1
end

##
## Slurp in the XML info...
##

json = {
  :url                  => '',
  :name                 => (xml/:DatasetConfig)[0].attributes['displayName'],
  :dataset_name         => (xml/:DatasetConfig)[0].attributes['dataset'],
  :datasetConfigVersion => (xml/:DatasetConfig)[0].attributes['softwareVersion'],
  :importables          => [],
  :exportables          => [],
  :filters              => [],
  :attributes           => []
}

# Importables
(xml/:Importable).each do |p|
  json[:importables] << { :name => p.attributes['name'] }
end

# Exportables
(xml/:Exportable).each do |p|
  json[:exportables] << { :name => p.attributes['name'] }
end

# Filters
(xml/:FilterDescription).each do |p|
  if p.attributes['hidden'].equal?('true')
    # Do nothing - this filter is hidden
  else
    new_filter = {
      :name    => p.attributes['internalName'],
      :display => p.attributes['displayName'],
      :enabled => false
    }
  end
  
  json[:filters] << new_filter
end

# Attributes
(xml/:AttributeDescription).each do |p|
  if p.attributes['hidden'].equal?('true')
    # Do nothing - this filter is hidden
  else
    new_filter = {
      :name    => p.attributes['internalName'],
      :display => p.attributes['displayName'],
      :enabled => true
    }
  end
  
  json[:attributes] << new_filter
end

##
## Now output the JSON string...
##

if ARGV[1]
  begin
    file = File.open(ARGV[1], 'w')
    file.write('(' + json.to_json + ')')
    file.close
  rescue
    raise "Error writing to output file: #{$!}"
  end
else
  puts '(' + json.to_json + ')'
end
