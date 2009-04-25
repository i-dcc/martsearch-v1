#!/usr/bin/env ruby -wKU

# Author::    Darren Oakley  (mailto:daz.oakley@gmail.com)
# Copyright:: Copyright (c) 2009 Darren Oakley
#
# This script is used test the coverage of the I-DCC Search index.
#
# We get lists of ALL variables contained within the marts that are 
# supposed to be in the index (marker_symbol, product ids etc), and 
# submit a query to the index webservive to see if the value is there. 
# The output for this script is a HTML page generated from the ERB 
# template file 'test_index.rhtml'.

require "lib/biomart"
require "lib/array"
require "net/http"
require "erb"
require "cgi"
require "rubygems"
require "json"

#
# Declare global variables
#

@@http_agent = Net::HTTP::Proxy( "localhost", 3128 )
@@index_url = "http://www.i-dcc.org/dev/martsearch/solr/select"
#@@index_url = "http://localhost:8983/solr/select"

# Set the number of threads to use to query the index
@@number_of_query_threads = 20

#
# TEMP ADDITION TO THE BIOMART CLASS WHILE THE DCC MART IS OFF
#

class DccBiomart < Biomart
  def initialize(args)
    @url        = args[:url]
    @http       = args[:http]
    @dataset    = args[:dataset]
    @attributes = args[:attributes]
    
    tsvdata = ''
    file = File.open( 'genes.txt', 'r' ) do |file|
      while line = file.gets
        tsvdata.insert( tsvdata.length, line )
      end
    end
    
    @processed_data = self.tsv2array( tsvdata )
  end
  
  def get_all_values_for_attribute( attribute )
    data_to_return = {}
    @processed_data.each do |d|
      data_to_return[ d[ attribute ] ] = ''
    end
    
    return data_to_return.keys
  end
end

#
# Set-up the marts
#

dcc_mart = DccBiomart.new( 
  :url        => "http://www.i-dcc.org/dev/martsearch/htgtdev/biomart/martservice", 
  :dataset    => "dcc",
  :attributes => [
    "marker_symbol",
    "mgi_accession_id",
    "chromosome",
    "coord_start",
    "coord_end",
    "strand",
    "marker_type",
    "marker_names",
    "synonyms",
    "ensembl_gene_ids",
    "vega_gene_ids",
    "entrez_gene_ids",
    "ccds_ids",
    "omim_ids",
    "expired_marker_names",
    "expired_synonyms",
    "expired_ensembl_gene_ids",
    "expired_vega_gene_ids",
    "expired_entrez_gene_ids",
    "expired_ccds_ids",
    "expired_omim_ids"
  ],
  :http       => @@http_agent
)

targ_mart = Biomart.new(
  :url        => "http://www.i-dcc.org/dev/martsearch/htgtdev/biomart/martservice",
  :dataset    => "htgt_targ",
  :attributes => [
    "marker_symbol",
    "design_plate",
    "design_well",
    "intvec_plate",
    "intvec_well",
    "targvec_plate",
    "targvec_well",
    "allele_name",
    "escell_clone_name"
  ],
  :http       => @@http_agent
)

trap_mart = Biomart.new(
  :url        => "http://www.i-dcc.org/dev/martsearch/htgtdev/biomart/martservice",
  :dataset    => "htgt_trap",
  :attributes => [
    "marker_symbol",
    "escell_clone_name"
  ],
  :http       => @@http_agent
)

#
# Declare methods
#

# Batch function to submit the webservice queries to the index.  These tests are 
# performed in batches, (number dictated by the global variable @@number_of_query_threads), 
# in multiple threads to speed up the process.
#
# *_Parameters_*
# *data*::          Array of values to test.
# *index_field*::   The index field to test against.
#
# *_Output_*
#
# A hash with three key/value pairs:
#
#   {
#     :total    => total number of data values
#     :found    => number of values found in the index
#     :missing  => An array of the missing values (if any)
#   }

def batch_tests( data, index_field )
  
  if data.size > 100
    data = data[ 0 .. 100 ]
  end
  
  # Set-up the result store
  result = {
    :total    => data.size,
    :found    => 0,
    :missing  => []
  }
  
  # Chunk the values into groups of 10 so we can submit 
  # multiple requests at once
  data_chunks = data.chunk( @@number_of_query_threads )
  
  # Define the index to test (if not specified)
  if index_field == nil
    index_field = attribute
  end
  
  # Set the counter
  count = 0
  
  # Now run through the data, one chunk at a time
  for chunk in data_chunks
    threads = [ ]
    
    for test_var in chunk
      
      if test_var.empty?
        
        # Skip empty entries, and reduce the total number of 
        # variables to look for by one
        result[:total] -= 1
        puts "\t\t\t #{index_field}:#{test_var}"
        
      else
        
        # Use a seperate thread per test
        threads << Thread.new(test_var) do |test|
          begin
            count += 1
            puts "\t\t\t #{index_field}:#{test}"

            if test_index( "#{index_field}:#{test}" )
              result[:found] += 1
            else
              result[:missing].push( test )
            end
          rescue TimeoutError => e
            retry
          end
        end
        
      end
      
    end
    
    # Allow each thread to complete before moving on
    threads.each { |thr| thr.join }
    puts "\t\t #{count}/#{result[:total]}"
    
  end
  
  # Return the result
  return result
  
end

# The main function to submit the webservice queries to the index (this performs 
# the actual POST request).
#
# *_Parameters_*
# *query*::          The query string to pass to the index.
#
# *_Output_*
#
# True/False depending on whether the query is found in the index.

def test_index( query )
  
  url = URI.parse( @@index_url )
  response = @@http_agent.post_form( url, { :q => "#{query}", :wt => "json" } )
  
  query_result = JSON.parse response.body
  
  if query_result['response']['numFound'].to_int > 0
    return true
  else
    return false
  end
  
end

# Helper function for submitting grouped (comma-delimited and the like) id values 
# from the DCC mart to the index for testing.
#
# *_Parameters_*
# *mart*::          The Biomart object.
# *attribute*::     The (biomart) attribute to retrieve and test.
# *index_field*::   The index field to test against.
# *delimiter*::     The delimiter used in the attribute data.
#
# *_Output_*
#
# A hash with three key/value pairs (from the batch_tests function):
#
#   {
#     :total    => total number of data values
#     :found    => number of values found in the index
#     :missing  => An array of the missing values (if any)
#   }

def grouped_id_test_wrapper( mart, attribute, index_field, delimiter )
  
  data = []
  tmp_data = mart.get_all_values_for_attribute( attribute )
  tmp_data.each do |d|
    if ( d != nil )
      d.split(delimiter).each { |tmp| data.push(tmp) }
    end
  end
  return batch_tests( data, index_field )
  
end

# Helper function for submitting plate_well values from the HTGT_TARG mart 
# to the index for testing.
#
# *_Parameters_*
# *mart*::          The Biomart object.
# *plate_attr*::    The (biomart) attribute for the plate name.
# *well_attr*::     The (biomart) attribute for the well name.
# *index_field*::   The index field to test against.
#
# *_Output_*
#
# A hash with three key/value pairs (from the batch_tests function):
#
#   {
#     :total    => total number of data values
#     :found    => number of values found in the index
#     :missing  => An array of the missing values (if any)
#   }

def grouped_plate_well_test_wrapper( mart, plate_attr, well_attr, index_field )
  data = []
  tmp_data = mart.get_all_values_for_attribute( [ plate_attr, well_attr ] )
  tmp_data.each do |d|
    if ( d != nil )
      data.push( d.split("\t").join( '_' ) )
    end
  end
  return batch_tests( data, index_field )
end

#
# Main body of script
#

results = {
  'dcc'       => {},
  'htgt_targ' => {},
  'htgt_trap' => {}
}

#
# KOMP-DCC Mart first...
#

puts "Processing KOMP-DCC mart"

puts "\t marker_symbol..."
data = []
tmp_data = dcc_mart.get_all_values_for_attribute( 'marker_symbol' )
tmp_data.each { |d| data.push( d.gsub( "\;", "%3B" ) ) }
results['dcc']['marker_symbol'] = batch_tests( data, 'marker_symbol' )

puts "\t mgi_accession_id..."
data = []
tmp_data = dcc_mart.get_all_values_for_attribute( 'mgi_accession_id' )
tmp_data.each { |d| data.push( d.gsub( "MGI\:", "MGI" ) ) }
results['dcc']['mgi_accession_id'] = batch_tests( data, 'mgi_accession_id' )

puts "\t chromosome..."
data = dcc_mart.get_all_values_for_attribute( 'chromosome' )
results['dcc']['chromosome'] = batch_tests( data, 'chromosome' )

puts "\t coord_start..."
data = dcc_mart.get_all_values_for_attribute( 'coord_start' )
results['dcc']['coord_start'] = batch_tests( data, 'coord_start' )

puts "\t coord_end..."
data = dcc_mart.get_all_values_for_attribute( 'coord_end' )
results['dcc']['coord_end'] = batch_tests( data, 'coord_end' )

puts "\t marker_type..."
data = dcc_mart.get_all_values_for_attribute( 'marker_type' )
results['dcc']['marker_type'] = batch_tests( data, 'type' )

ids_to_test = [
  'marker_names',
  'synonyms',
  'ensembl_gene_ids',
  'vega_gene_ids',
  'entrez_gene_ids',
  'ccds_ids',
  'omim_ids'
]

for id in ids_to_test
  
  delim = ','
  if id == 'marker_names'
    delim = '; '
  elsif id == 'synonyms'
    delim = ', '
  end
  
  # Test current ids first
  puts "\t #{id}..."
  results['dcc'][id] = grouped_id_test_wrapper( dcc_mart, id, id.sub( /s$/,"" ),  delim )
  
  # Then expired ids
  ex_id = 'expired_' + id
  puts "\t #{ex_id}..."
  results['dcc'][ex_id] = grouped_id_test_wrapper( dcc_mart, ex_id, id.sub( /s$/,"" ),  delim )
  
end

#
# htgt_targ...
#

puts "Processing Gene Targeting mart"

puts "\t marker_symbol..."
data = []
tmp_data = targ_mart.get_all_values_for_attribute( 'marker_symbol' )
tmp_data.each { |d| data.push( d.gsub( "\;", "%3B" ) ) }
results['htgt_targ']['marker_symbol'] = batch_tests( data, 'marker_symbol' )

puts "\t targeting_designs"
results['htgt_targ']['targeting_designs'] = grouped_plate_well_test_wrapper( targ_mart, 'design_plate', 'design_well', 'targeting_design' )

puts "\t intermediate_vectors"
results['htgt_targ']['intermediate_vectors'] = grouped_plate_well_test_wrapper( targ_mart, 'intvec_plate', 'intvec_well', 'intermediate_vector' )

puts "\t targeting_vectors"
results['htgt_targ']['targeting_vectors'] = grouped_plate_well_test_wrapper( targ_mart, 'targvec_plate', 'targvec_well', 'targeting_vector' )

#puts "\t alleles..."
#data = []
#tmp_data = targ_mart.get_all_values_for_attribute( 'allele_name' )
#tmp_data.each do |d|
#  tmp = d
#  tmp.gsub!( "<sup>", "" )
#  tmp.gsub!( "</sup>", "" )
#  data.push( tmp )
#end
#results['htgt_targ']['alleles'] = batch_tests( data, 'allele' )

puts "\t escell_clone_name..."
data = targ_mart.get_all_values_for_attribute( 'escell_clone_name' )
results['htgt_targ']['escell_clone_name'] = batch_tests( data, 'escell' )

#
# htgt_trap...
#

puts "Processing Gene Trapping mart"

puts "\t marker_symbol..."
data = []
tmp_data = trap_mart.get_all_values_for_attribute( 'marker_symbol' )
tmp_data.each { |d| data.push( d.gsub( "\;", "%3B" ) ) }
results['htgt_trap']['marker_symbol'] = batch_tests( data, 'marker_symbol' )

puts "\t escell_clone_name..."
data = trap_mart.get_all_values_for_attribute( 'escell_clone_name' )
results['htgt_trap']['escell_clone_name'] = batch_tests( data, 'escell' )

#
# Finally...
#

# Open the ERB template
template = File.open( 'test_index.rhtml', 'r' )
rhtml = ERB.new( template.read )

# Open our output file
output = File.open( 'index_status.html', 'w' )
output.write( rhtml.result( binding ) )

