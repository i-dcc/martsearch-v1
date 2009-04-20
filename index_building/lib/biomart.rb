#!/usr/bin/env ruby -wKU

# Author::    Darren Oakley  (mailto:daz.oakley@gmail.com)
# Copyright:: Copyright (c) 2009 Darren Oakley
#
# This class allows you to describe a Biomart dataset as a basic 
# ruby object and submit queries against it using the martservices 
# XML interface.

class Biomart
  require "rubygems"
  require "builder"
  require "uri"
  
  # Net::HTTP or Net::HTTP::Proxy object
  attr_accessor :http
  # URL for the biomart server
  attr_accessor :url
  # Biomart dataset name
  attr_accessor :dataset
  # Dataset attributes that are retrieved on each query
  attr_accessor :attributes
  
  # Define the basic details of the biomart dataset.
  def initialize(args)
    @url        = args[:url]
    @http       = args[:http]
    @dataset    = args[:dataset]
    @attributes = args[:attributes]
  end
  
  # Convenience method to prepare and perform a search against the dataset 
  # and return the results in an array of hashes.
  def search( filters, query )
    xml     = self.xml( filters, nil, query )
    #puts    "----\n#{xml}\n----"
    tsvdata = self.post_query( xml )
    #puts    "----\n#{tsvdata}\n----"
    tsvarray = self.tsv2array( tsvdata )
    #puts    "----\n#{tsvarray}\n----"
    return tsvarray
  end
  
  # Returns all values in the biomart dataset for a given attribute.
  def get_all_values_for_attribute( attribute )
    xml = self.xml( nil, attribute.to_a, nil )
    #puts    "----\n#{xml}\n----"
    tsvdata = self.post_query( xml )
    #puts    "----\n#{tsvdata}\n----"
    
    values = []
    data_by_line = tsvdata.split("\n")
    data_by_line.each do |d|
      values.push( d )
    end
    
    return values
  end
  
  # Generates the XML text to put into the post_query to be sent to biomart.
  def xml( filters_to_use, attributes_to_use, query )
    biomart_xml = ""
    xml = Builder::XmlMarkup.new( :target => biomart_xml, :indent => 2 )

    xml.instruct!
    xml.declare!( :DOCTYPE, :Query )
    xml.Query( :virtualSchemaName => "default", :formatter => "TSV", :header => "0", :uniqueRows => "1", :count => "", :datasetConfigVersion => "0.6" ) {
      xml.Dataset( :name => self.dataset, :interface => "default" ) {

        if filters_to_use
          filters_to_use.each do |f|
            xml.Filter( :name => f, :value => query )
          end
        end

        if attributes_to_use
          attributes_to_use.each do |a|
            xml.Attribute( :name => a )
          end
        else
          self.attributes.each do |a|
            xml.Attribute( :name => a )
          end
        end

      }
    }

    return biomart_xml
  end
  
  # Sends the generated xml query to biomart and retrieves tab-separated data back.
  def post_query( xml )
    url = URI.parse( self.url )
    response = self.http.post_form( url, { "query" => xml } )
    return response.body
  end
  
  # Transforms the tab-separated data retrieved from the post_query into a ruby 
  # array of hashes.
  def tsv2array( data )
    return_data = []  
    data_by_line = data.split("\n")
    
    data_by_line.each do |d|
      intermediate = {}
      data_by_item = d.split("\t")
      for i in 0 .. ( data_by_item.size() - 1 )
        intermediate[ self.attributes[i] ] = data_by_item[i]
      end
      return_data.push( intermediate )
    end
      
    return return_data
  end
end
