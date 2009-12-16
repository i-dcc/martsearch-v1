#!/usr/bin/env ruby -wKU

#
#
#
#

require "rubygems"
require "json"
require "biomart"
require "builder"
require "progressbar"

# Read in our monstorous config file
json_conf = IO.read("config.json")
CONF = JSON.parse(json_conf)

# Create a placeholder variable to store our docs in
@documents = {}

# And a cache variable for faster lookups if required...
@documents_by = {}

##
## Classes
##

# This is a small extension to the Array class to allow you 
# to iterate over an array in chunks of a defined size.
#
# Taken from "Why's (Poignant) Guide to Ruby" (http://poignantguide.net/ruby).
class Array
  # Splits an array into an array-of-arrays of the defined length
  def chunk( len )
    a = []
    each_with_index do |x,i|
      a << [] if i % len == 0
      a.last << x
    end
    a
  end
end

##
## Methods
##

def new_document()
  doc = {}
  
  CONF["index"]["schema"]["fields"].each do |key,detail|
    doc[key] = []
  end
  
  return doc
end

def clean_document( doc )
  doc.each do |key,value|
    if value.size > 0
      doc[key] = value.uniq
    end
  end
end

def cache_documents_by( field )
  unless @documents_by[field]
    puts "Caching documents by '#{field}'"
    @documents_by[field] = {}
    
    # Cache the keys for given fields to allow MUCH faster lookup
    # - the initial overhead of doing this should be worth it...
    pbar = ProgressBar.new( field, @documents.size )
    @documents.each do |key,values|
      values[field].each do |value|
        @documents_by[field][value] = key
      end
      pbar.inc
    end
    pbar.finish
    puts ""
  end
end

def find_document( field, search_term )
  if field == CONF["index"]["schema"]["unique_key"]
    return @documents[search_term]
  else
    if @documents_by[field][search_term]
      return @documents[ @documents_by[field][search_term] ]
    else
      return nil
    end
  end
end

def extract_value_to_index( attr_name, attr_value, attr_options, mart_data )
  options        = attr_options[attr_name]
  value_to_index = attr_value
  
  if options["if_attr_equals"]
    unless options["if_attr_equals"].include?( attr_value )
      value_to_index = nil
    end
  end
  
  if options["index_attr_name"]
    if value_to_index
      value_to_index = attr_name
    end
  end
  
  if options["if_other_attr_indexed"]
    other_attr       = options["if_other_attr_indexed"]
    other_attr_value = mart_data[ other_attr ]
    
    unless extract_value_to_index( other_attr, other_attr_value, attr_options, mart_data )
      value_to_index = nil
    end
  end
  
  return value_to_index
end

def create_xml_from_documents( docs )
  solr_xml = ""
  xml = Builder::XmlMarkup.new( :target => solr_xml, :indent => 2 )
  
  xml.add {
    
    docs.each do |doc_name,doc|
      xml.doc {
        CONF["index"]["schema"]["fields"].each do |field,field_info|
          if doc[field] and doc[field].size > 0
            doc[field].each do |term|
              xml.field( term, :name => field )
            end
          end
        end
      }
    end
    
  }
  
  return solr_xml
end

##
## Main body of script
##

# Build the dataset objects - I apologise for the complexity of
# this 'ere code, but it's a complicated task i'm trying to achieve!
CONF["datasets"].each do |dataset|
  if dataset["index"]
    puts "Fetching data from dataset: '#{dataset['display_name']}'"
    
    # Instanciate a Biomart::Dataset object
    mart = Biomart::Dataset.new( dataset["url"], { :name => dataset["dataset_name"] } )
    
    attribute_map = {}
    primary_attribute = nil
    map_to_index_field = nil
    
    # Extract all of the needed index mapping data from "attribute_map"
    # - The "attribute_map" defines how the biomart attributes relate to the index "fields"
    # - The "primary_attribute" is the biomart attribute used to associate a set of biomart 
    #   results to an index "doc" - using the "map_to_index_field" field as the link.
    dataset["indexing"]["attribute_map"].each_index do |i|
      mapping_obj = dataset["indexing"]["attribute_map"][i]
      
      if mapping_obj["use_to_map"]
        primary_attribute  = mapping_obj["attr"]
        map_to_index_field = mapping_obj["idx"]
      end
      
      attribute_map[ mapping_obj["attr"] ] = mapping_obj
    end
    
    unless primary_attribute
      raise StandardError "You have not specified an attribute to map to the index with in #{dataset["dataset_name"]}!"
    end
    
    # Do we need to cache lookup data?
    unless map_to_index_field == CONF["index"]["schema"]["unique_key"]
      cache_documents_by( map_to_index_field )
    end
    
    # Perform the biomart search and retrieve all the data it holds
    results = mart.search( :attributes => attribute_map.keys )
    
    # Figure out the position of the primary_attribute in the results array
    primary_attribute_pos = nil
    results[:headers].each_index do |position|
      if results[:headers][position] == primary_attribute
        primary_attribute_pos = position
      end
    end
    
    # Now loop through the results building up document structures
    puts "Processing #{results[:data].size} rows of Biomart results"
    pbar = ProgressBar.new( dataset['display_name'], results[:data].size )
    results[:data].each do |data_row|
      # First check we have something to map back to the index with - if not, move along...
      if data_row[primary_attribute_pos]
      
        # Find us a doc object to map to...
        doc = find_document( map_to_index_field, data_row[primary_attribute_pos] )
        
        # If we can't find one - see if we're able to create one
        unless doc
          if dataset["indexing"]["allow_document_creation"]
            @documents[ data_row[primary_attribute_pos] ] = new_document()
            doc = @documents[ data_row[primary_attribute_pos] ]
          end
        end
        
        # Okay, if we have a doc - process the biomart attributes
        if doc
          # First, create a hash out of the data_row
          data_obj = {}
          results[:headers].each_index do |position|
            data_obj[ results[:headers][position] ] = data_row[position]
          end
          
          # Now do the processing
          data_obj.each do |attr_name,attr_value|
            
            # Extract and index our initial data return
            value_to_index = extract_value_to_index( attr_name, attr_value, attribute_map, data_obj )
            if value_to_index && doc[ attribute_map[attr_name]["idx"] ]
              doc[ attribute_map[attr_name]["idx"] ].push( value_to_index )
            end
            
            # Any further metadata to be extracted from here? (i.e. MP terms in comments)
            if value_to_index and attribute_map[attr_name]["extract"]
              regexp = Regexp.new( attribute_map[attr_name]["extract"]["regexp"] )
              matches = regexp.match( value_to_index )
              if matches
                doc[ attribute_map[attr_name]["extract"]["idx"] ].push( matches[0] )
              end
            end
            
          end
        end
      end
      pbar.inc
    end
    pbar.finish
    puts ""
  
    # Finally, remove duplicates from our documents - free up precious memory
    @documents.values.each do |d|
      clean_document(d)
    end
  end
end

# Now we have our document objects, chunk them into managable sized bits and print to XML
puts "Printing Solr XML files..."

doc_chunks   = @documents.keys.chunk( 1000 )
no_of_chunks = @documents.keys.size / 1000

pbar = ProgressBar.new( "solr-xml", no_of_chunks.round )

doc_chunks.each_index do |chunk_number|
  
  doc_names = doc_chunks[chunk_number]
  docs = {}
  
  doc_names.each do |name|
    docs[name] = @documents[name]
  end
  
  file = File.open( "solr-xml-#{chunk_number}.xml", "w" )
  file.print create_xml_from_documents(docs)
  file.close
  
  pbar.inc
  
end
pbar.finish

puts ""
puts "Completed"

