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
  require "net/http"
  
  attr_accessor :url, :proxy, :dataset, :filters, :attributes
  
  # Define the basic details of the biomart dataset.
  def initialize(args)
    @url        = args[:url]
    @proxy      = args[:proxy]
    @dataset    = args[:dataset]
    @filters    = args[:filters]
    @attributes = args[:attributes]
  end
  
  # Convenience method to prepare and perform a search against the dataset,
  # and return the results in an array of hashes.
  def search( filters, query )
    xml     = self.xml( filters, query )
    #puts    "----\n#{xml}\n----"
    tsvdata = self.post_query( xml )
    #puts    "----\n#{tsvdata}\n----"
    tsvarray = self.tsv2array( tsvdata )
    #puts    "----\n#{tsvarray}\n----"
    return tsvarray
  end
  
  # Generates the XML text to put into the post_query to be sent to biomart.
  def xml( filters_to_use, query )
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

        self.attributes.each do |a|
          xml.Attribute( :name => a )
        end

      }
    }

    return biomart_xml
  end
  
  # Sends the generated xml query to biomart and retrieves tab-separated data back.
  def post_query( xml )
    tsv_data = ''
    proxy = Net::HTTP::Proxy( "localhost", 3128 )
    url = URI.parse( self.url )
    proxy.start(url.host, 9002) { |http|
      http.read_timeout=300
      resp, data = http.post( url.path, "query="+xml )
      tsv_data = data
    }
    return tsv_data
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
