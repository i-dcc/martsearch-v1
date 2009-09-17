#!/usr/bin/env ruby -wKU

# Author::    Darren Oakley  (mailto:daz.oakley@gmail.com)
# Copyright:: Copyright (c) 2009 Darren Oakley
#
# This script is used to re-generate the XML files used to 
# create the I-DCC Search index.
#
# We produce one file per chromosome in the mouse genome (according 
# to the KOMP-DCC biomart) with all of the associated fields from 
# the related marts being attached to their associated gene entries 
# (therefore this is currently a gene-centric search index - this 
# could quite easily change in the future!)
#
# NOTE: THERE IS A TEMPORARY HACK IN HERE TO USE A LOCAL FILE FOR THE 
# DCC MART DATA AS THE DCC MART IS CURRENTLY OFFLINE.

require "../lib/array"
require "../lib/biomart"
require "../lib/document"
require "net/http"

#
# Declare globals
#

@@http_agent = Net::HTTP::Proxy( "wwwcache.sanger.ac.uk", 3128 )
#@@http_agent = Net::HTTP::Proxy( "localhost", 3128 )

#
# Declare methods
#

# Main method for generating a 'doc' XML file for a chromosome.
#
# *_Parameters_*
# *query*::       The chromosome name/number to build the XML file for.
# *filename*::    The name of the file to produce.

def build_chromosome_xml( query, filename )
  
  documents = {}
  
  # KOMP-DCC Biomart
  dcc_mart = Biomart.new(
    :url        => "http://www.sanger.ac.uk/htgt/biomart/martservice",
    :http       => @@http_agent,
    :dataset    => "dcc",
    :attributes => [
      "marker_symbol",
      "marker_name",
      "mgi_accession_id",
      "chromosome",
      "strand",
      "start",
      "end",
      "synonym",
      "ensembl_gene_id",
      "vega_gene_id",
      "entrez_gene_id",
      "ccds_id",
      "omim_id"
    ]
  )
  dcc_data = dcc_mart.search( ["chromosome"], query )
  
  # Read in our temporarily hacked gene file, extract the gene info 
  # for this chromosome, and proceed as normal...
  #chr_data = ""
  #file = File.open( "genes.txt", "r" ) do |file|
  #  while line = file.gets
  #    data_elements = line.split("\t")
  #    if data_elements[2].to_s == query.to_s
  #      chr_data.insert( chr_data.length, line )
  #    end
  #  end
  #end
  #dcc_data = dcc_mart.tsv2array( chr_data )
  
  dcc_data.each { |data|
    document = documents[ data["marker_symbol"] ]

    if document == nil
      document = Document.new( data["marker_symbol"] )
    end

    # Put in the singular data...
    document.mgi_accession_id    = data["mgi_accession_id"]
    document.type                = data["marker_type"]
    document.chromosome          = data["chromosome"]
    document.coord_start         = data["start"]
    document.coord_end           = data["end"]
    document.strand              = data["strand"]

    # Now the multi-valued data...
    add_to_multivalued_field( data["marker_name"], document.marker_names )
    add_to_multivalued_field( data["synonym"], document.synonyms )
    add_to_multivalued_field( data["ensembl_gene_id"], document.ensembl_gene_ids )
    add_to_multivalued_field( data["vega_gene_id"], document.vega_gene_ids )
    add_to_multivalued_field( data["entrez_gene_id"], document.entrez_gene_ids )
    add_to_multivalued_field( data["ccds_id"], document.ccds_ids )
    add_to_multivalued_field( data["omim_id"], document.omim_ids )
    
    documents[ data["marker_symbol"] ] = document
  }

  # Search the related marts for info...
  documents = search_product_marts( documents )

  output = "<add>\n"
  documents.values.each { |doc|
    if doc.marker_symbol
      output += doc.xml
    end
  }
  output += "</add>\n"

  File.open( filename, "w" ) { |f| f.write(output) }

end

# Secondary method to add extra fields to the 'gene' records from 
# the associated marts.
#
# *_Parameters_*
# *documents*::   An array containing all the 'Document' objects represented 
#                 by this chromosome.

def search_product_marts( documents )
  
  # HTGT_TARG Biomart
  targ_mart = Biomart.new(
    :url        => "http://www.sanger.ac.uk/htgt/biomart/martservice",
    :http       => @@http_agent,
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
    ]
  )
  
  # HTGT_TRAP Biomart
  trap_mart = Biomart.new(
    :url        => "http://www.sanger.ac.uk/htgt/biomart/martservice",
    :http       => @@http_agent,
    :dataset    => "htgt_trap",
    :attributes => [
      "marker_symbol",
      "escell_clone_name"
    ]
  )
  
  # Kermits Biomart
  kermits_mart = Biomart.new(
    :url        => "http://www.sanger.ac.uk/htgt/biomart/martservice",
    :http       => @@http_agent,
    :dataset    => "kermits",
    :attributes => [
      "marker_symbol",
      "colony_prefix"
    ]
  )
  
  # Phenotyping Biomart
  pheno_mart = Biomart.new(
    :url        => "http://www.sanger.ac.uk/htgt/biomart/martservice",
    :http       => @@http_agent,
    :dataset    => "phenotyping",
    :attributes => [
      "marker_symbol",
      "abr",
      "abr_comment",
      "adult_expression",
      "adult_expression_comment",
      "blood_pressure",
      "blood_pressure_comment",
      "body_weight_curve",
      "body_weight_curve_comment",
      "body_weight_curve_normal_chow",
      "body_weight_curve_normal_chow_comment",
      "brain_histology",
      "brain_histology_comment",
      "calorimetry",
      "calorimetry_comment",
      "citrobacter_challenge",
      "citrobacter_challenge_comment",
      "core_temperature",
      "core_temperature_comment",
      "dexa",
      "dexa_comment",
      "dysmorphology",
      "dysmorphology_comment",
      "embryo_expression",
      "embryo_expression_comment",
      "eye_morphology",
      "eye_morphology_comment",
      "fasted_clinical_chemistry",
      "fasted_clinical_chemistry_comment",
      "fertility",
      "fertility_comment",
      "full_clinical_chemistry",
      "full_clinical_chemistry_comment",
      "grip_strength",
      "grip_strength_comment",
      "haematology",
      "haematology_comment",
      "heart_histology",
      "heart_histology_comment",
      "heart_weights",
      "heart_weights_comment",
      "histology",
      "histology_comment",
      "homozygote_viability",
      "homozygote_viability_comment",
      "hot_plate",
      "hot_plate_comment",
      "insulin",
      "insulin_comment",
      "ip_gtt",
      "ip_gtt_comment",
      "micronuclei",
      "micronuclei_comment",
      "modified_shirpa",
      "modified_shirpa_comment",
      "number_of_hits",
      "number_of_hits_comment",
      "open_field",
      "open_field_comment",
      "peripheral_blood_lymphocytes",
      "peripheral_blood_lymphocytes_comment",
      "prepulse_inhibition",
      "prepulse_inhibition_comment",
      "recessive_lethal_study",
      "recessive_lethal_study_comment",
      "rotarod",
      "rotarod_comment",
      "salmonella_challenge",
      "salmonella_challenge_comment",
      "serum_immunoglobulins",
      "serum_immunoglobulins_comment",
      "skin_screen",
      "skin_screen_comment",
      "tail_length",
      "tail_length_comment",
      "x_ray_imaging",
      "x_ray_imaging_comment"
    ]
  )
  
  # EnsemblMart
  ensembl_mart = Biomart.new(
    :url        => "http://www.ensembl.org/biomart/martservice",
    :http       => @@http_agent,
    :dataset    => "mmusculus_gene_ensembl",
    :attributes => [
      "external_gene_id",
      "ensembl_transcript_id",
      "ensembl_peptide_id",
      "human_ensembl_gene",
      "human_homolog_ensembl_peptide",
      "zebrafish_ensembl_gene",
      "zebrafish_homolog_ensembl_peptide",
      "rat_ensembl_gene",
      "rat_homolog_ensembl_peptide"
    ]
  )
  
  ensembl_mart2 = Biomart.new(
    :url        => "http://www.ensembl.org/biomart/martservice",
    :http       => @@http_agent,
    :dataset    => "mmusculus_gene_ensembl",
    :attributes => [
      "external_gene_id",
      "gene_biotype",
      "transcript_biotype"
    ]
  )
  
  # Chunk the gene symbols into groups of 100 so that we don't 
  # swamp the martservices
  no_of_chunks = documents.keys.size / 100
  if no_of_chunks > 0
    doc_chunks = documents.keys.chunk( no_of_chunks.round )
  else
    doc_chunks = documents
  end
  
  
  # Process the chunks one at a time...
  doc_chunks.each { |chunk|
    
    # HTGT_TARG search
    targ_data = targ_mart.search( ["marker_symbol"], chunk.join(',') )
    targ_data.each { |data|
      document = documents[ data['marker_symbol'] ]
    
      if document == nil
        document = Document.new( data['marker_symbol'] )
      end
    
      unless ( data['design_plate'].to_s.empty? && data['design_well'].to_s.empty? )
        document.targeting_designs.push( data['design_plate'] + '_' + data['design_well'] )
      end
    
      unless ( data['intvec_plate'].to_s.empty? && data['intvec_well'].to_s.empty? )
        document.intermediate_vectors.push( data['intvec_plate'] + '_' + data['intvec_well'] )
      end
    
      unless ( data['targvec_plate'].to_s.empty? && data['targvec_well'].to_s.empty? )
        document.targeting_vectors.push( data['targvec_plate'] + '_' + data['targvec_well'] )
      end
    
      unless data['allele_name'].to_s.empty?
        document.alleles.push( data['allele_name'] )
      end
    
      unless data['escell_clone_name'].to_s.empty?
        document.escells.push( data['escell_clone_name'] )
      end
    
      documents[ data['marker_symbol'] ] = document
    }
    
    # HTGT_TRAP search
    trap_data = trap_mart.search( ["marker_symbol"], chunk.join(',') )
    trap_data.each { |data|
      document = documents[ data['marker_symbol'] ]
    
      if document == nil
        document = Document.new( data['marker_symbol'] )
      end
    
      document.escells.push( data['escell_clone_name'] )
    
      documents[ data['marker_symbol'] ] = document
    }
    
    # Kermits search
    kermits_data = kermits_mart.search( ["marker_symbol"], chunk.join(',') )
    kermits_data.each do |data|
      document = documents[ data['marker_symbol'] ]
    
      if document == nil
        document = Document.new( data['marker_symbol'] )
      end
    
      document.colony_prefixes.push( data['colony_prefix'] )
    
      documents[ data['marker_symbol'] ] = document
    end
    
    # Phenotyping search
    pheno_data = pheno_mart.search( ["marker_symbol"], chunk.join(',') )
    pheno_data.each do |data|
      document = documents[ data["marker_symbol"] ]
    
      if document == nil
        document = Document.new( data["marker_symbol"] )
      end
    
      # Go through each of the pheno tests to see if we have a 
      # positive result - if yes, index the test name and any comments
      pheno_mart.attributes.each do |attribute|
    
        unless attribute.match(/marker_symbol|comment/)
    
          if data[ attribute ] == "significant_difference"
            document.phenotype.push( attribute.sub( "ip_gtt", "ip-gtt" ).sub( "x_ray", "x-ray" ).gsub( "_", " " ) )
    
            unless data[ attribute + "_comment" ].to_s.empty?
              document.phenotype_comments.push( data[ attribute + "_comment" ] )
    
              # Also, extract the MP terms
              if data[ attribute + "_comment" ].to_s.match(/MP\:\d+/)
                document.mp_terms.push( data[ attribute + "_comment" ].to_s.match(/MP\:\d+/)[0] )
              end
            end
    
          end
    
        end
    
      end
    
      documents[ data["marker_symbol"] ] = document
    end
    
    # EnsemblMart search
    ensembl_search_ids = []
    chunk.each do |symbol|
      document = documents[symbol]
      if document
        document.ensembl_gene_ids.each do |e|
          ensembl_search_ids.push(e)
        end
      end
    end
    
    if ensembl_search_ids.size > 0
      ensembl_data = ensembl_mart.search( ["ensembl_gene_id"], ensembl_search_ids.join(',') )
      ensembl_data.each do |data|
        document = documents[ data["external_gene_id"] ]

        if document != nil
          document.ensembl_gene_ids.push( data["human_ensembl_gene"] )
          document.ensembl_gene_ids.push( data["zebrafish_ensembl_gene"] )
          document.ensembl_gene_ids.push( data["rat_ensembl_gene"] )

          document.ensembl_transcript_ids.push( data["ensembl_transcript_id"] )

          document.ensembl_peptide_ids.push( data["ensembl_peptide_id"] )
          document.ensembl_peptide_ids.push( data["human_homolog_ensembl_peptide"] )
          document.ensembl_peptide_ids.push( data["zebrafish_homolog_ensembl_peptide"] )
          document.ensembl_peptide_ids.push( data["rat_homolog_ensembl_peptide"] )

          documents[ data["external_gene_id"] ] = document
        end
      end

      ensembl_data2 = ensembl_mart2.search( ["ensembl_gene_id"], ensembl_search_ids.join(',') )
      ensembl_data2.each do |data|
        document = documents[ data["external_gene_id"] ]

        if document != nil
          document.gene_biotype.push( data["gene_biotype"] )
          document.transcript_biotype.push( data["transcript_biotype"] )

          documents[ data["external_gene_id"] ] = document
        end
      end
    end
    
  }
  
  return documents
  
end

# Helper method to add multi-valued fields (i.e. CSV or otherwise delimited) 
# pulled from a biomart return into an array attribute on a Document object.
#
# *_Parameters_*
# *data*::        The delimited data to be processed.
# *target*::      The Document attribute (array) that the data is to be pushed onto.

def add_to_multivalued_field( data, target )
  if data != nil and data != ""
    target.push( data )
  end
end

#
# Main body of script
#

dcc_mart = Biomart.new( 
  :url => "http://www.sanger.ac.uk/htgt/biomart/martservice", 
  :dataset => "dcc",
  :attributes => ["chromosome"],
  :http => @@http_agent
)
dcc_data = dcc_mart.search( ["chromosome"], "" )

dcc_data.each { |chr|
  filename = "chr#{chr['chromosome']}.xml"
  puts "Building XML for chromosome #{chr['chromosome']} > #{filename}"
  build_chromosome_xml( chr['chromosome'], filename )
}
