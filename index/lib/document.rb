#!/usr/bin/env ruby -wKU

# Author::    Darren Oakley  (mailto:daz.oakley@gmail.com)
# Copyright:: Copyright (c) 2009 Darren Oakley
#
# This class provides facilities for the basic description of a 
# 'Document' object used by the Solr index and a method for generating 
# the document XML.
#
# == Example Usage
#
#   document = Document.new( 'Cbx1' )
#
#   document.mgi_accession_id    = 'MGI:105369'
#   document.marker_name         = 'chromobox homolog 1 (Drosophila HP1 beta)'
#   document.type                = 'Gene'
#   document.chromosome          = '11'
#   document.coord_start         = '96650441'
#   document.coord_end           = '96669954'
#   document.strand              = '+'
#
#   puts document.xml()

class Document
  require "rubygems"
  require "builder"
  
  # Single value accessor
  attr_accessor :mgi_accession_id, :marker_symbol, :type, 
    :chromosome, :coord_start, :coord_end, :strand
  
  # Multi Value accessor
  attr_accessor :marker_names, :synonyms, :secondary_mgi_accession_id,
    :ensembl_gene_ids, :ensembl_peptide_ids, :ensembl_transcript_ids,
    :vega_gene_ids, :entrez_gene_ids, :ccds_ids, :omim_ids, :targeting_designs, 
    :intermediate_vectors, :targeting_vectors, :alleles, :escells, 
    :phenotype, :phenotype_comments, :mp_terms, :colony_prefixes,
    :gene_biotype, :transcript_biotype
  
  # Sets the marker_symbol and initializes the multi-valued fields.
  def initialize( symbol )
    @marker_symbol              = symbol
    @marker_names               = []
    @synonyms                   = []
    @secondary_mgi_accession_id = []
    @ensembl_gene_ids           = []
    @ensembl_peptide_ids        = []
    @ensembl_transcript_ids     = []
    @vega_gene_ids              = []
    @entrez_gene_ids            = []
    @ccds_ids                   = []
    @omim_ids                   = []
    @targeting_designs          = []
    @intermediate_vectors       = []
    @targeting_vectors          = []
    @alleles                    = []
    @escells                    = []
    @phenotype                  = []
    @phenotype_comments         = []
    @mp_terms                   = []
    @colony_prefixes            = []
    @gene_biotype               = []
    @transcript_biotype         = []
  end
  
  # Builds and returns the Solr document XML for this Document.
  def xml
    solr_xml = ""
    xml = Builder::XmlMarkup.new( :target => solr_xml, :indent => 2 )

    if ! self.marker_symbol.empty?
      
      xml.doc {
        self.xml_singleValue( xml, self.marker_symbol,     "marker_symbol_key" )
        self.xml_singleValue( xml, self.mgi_accession_id,  "mgi_accession_id" )
        self.xml_singleValue( xml, self.type,              "type" )
        self.xml_singleValue( xml, self.chromosome,        "chromosome" )
        self.xml_singleValue( xml, self.coord_end,         "coord_end" )
        self.xml_singleValue( xml, self.strand,            "strand" )
             
        self.xml_multiValue( xml, @marker_names,                "marker_name" )
        self.xml_multiValue( xml, @synonyms,                    "synonym" )
        self.xml_multiValue( xml, @secondary_mgi_accession_id,  "secondary_mgi_accession_id" )
        self.xml_multiValue( xml, @ensembl_gene_ids,            "ensembl_gene_id" )
        self.xml_multiValue( xml, @ensembl_peptide_ids,         "ensembl_peptide_id" )
        self.xml_multiValue( xml, @ensembl_transcript_ids,      "ensembl_transcript_id" )
        self.xml_multiValue( xml, @vega_gene_ids,               "vega_gene_id" )
        self.xml_multiValue( xml, @entrez_gene_ids,             "entrez_gene_id" )
        self.xml_multiValue( xml, @ccds_ids,                    "ccds_id" )
        self.xml_multiValue( xml, @omim_ids,                    "omim_id" )
        self.xml_multiValue( xml, @targeting_designs,           "targeting_design" )
        self.xml_multiValue( xml, @intermediate_vectors,        "intermediate_vector" )
        self.xml_multiValue( xml, @targeting_vectors,           "targeting_vector" )
        self.xml_multiValue( xml, @alleles,                     "allele" )
        self.xml_multiValue( xml, @escells,                     "escell" )
        self.xml_multiValue( xml, @phenotype,                   "phenotype" )
        self.xml_multiValue( xml, @phenotype_comments,          "phenotype_comment" )
        self.xml_multiValue( xml, @mp_terms,                    "mp_term" )
        self.xml_multiValue( xml, @colony_prefixes,             "colony_prefix" )
        self.xml_multiValue( xml, @gene_biotype,                "gene_biotype" )
        self.xml_multiValue( xml, @transcript_biotype,          "transcript_biotype" )
      }
      
    end

    return solr_xml
  end
  
  # Utility method for generating a single field entry in the xml.
  def xml_singleValue( xml, value, label )
    if value && !value.empty?
      xml.field( value, :name => label )
    end
  end
  
  # Utility method for generating multi-field entries in the xml.
  def xml_multiValue( xml, array, label )
    array.uniq.each { |a|
      if ! a.to_s.empty?
        xml.field( a.to_s, :name => label )
      end
    }
  end
  
end