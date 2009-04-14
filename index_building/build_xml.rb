#!/usr/bin/env ruby -wKU

require "lib/array"
require "lib/biomart"
require "lib/document"

def build_chromosome_xml( query, filename )
  
  documents = {}
  
  # KOMP-DCC Biomart
  dcc_mart = Biomart.new(
    :url        => "http://htgt.internal.sanger.ac.uk:9002/biomart/martservice",
    :dataset    => "dcc",
    :attributes => [
      "marker_symbol",
      "marker_names",
      "mgi_accession_id",
      "chromosome",
      "coord_start",
      "coord_end",
      "strand",
      "marker_type",
      "synonyms",
      "ensembl_gene_ids",
      "vega_gene_ids",
      "entrez_gene_ids",
      "ccds_ids",
      "omim_ids"
    ]
  )
  dcc_data = dcc_mart.search( ["chromosome"], query )

  dcc_data.each { |data|
    document = documents[ data['marker_symbol'] ]

    if document == nil
      document = Document.new( data['marker_symbol'] )
    end

    # Put in the singular data...
    document.mgi_accession_id    = data['mgi_accession_id']
    document.type                = data['gene_type']
    document.chromosome          = data['chromosome']
    document.coord_start         = data['coord_start']
    document.coord_end           = data['coord_end']
    document.strand              = data['strand']

    # Now the multi-valued data...
    add_to_multivalued_field( data['marker_names'], document.marker_names, '; ' )
    add_to_multivalued_field( data['synonyms'], document.synonyms, ', ' )
    add_to_multivalued_field( data['ensembl_gene_ids'], document.ensembl_gene_ids, ',' )
    add_to_multivalued_field( data['vega_gene_ids'], document.vega_gene_ids, ',' )
    add_to_multivalued_field( data['entrez_gene_ids'], document.entrez_gene_ids, ',' )
    add_to_multivalued_field( data['ccds_ids'], document.ccds_ids, ',' )
    add_to_multivalued_field( data['omim_ids'], document.omim_ids, ',' )
    
    documents[ data['marker_symbol'] ] = document
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

  File.open( filename, 'w' ) { |f| f.write(output) }

end

def search_product_marts( documents )
  
  # HTGT_TARG Biomart
  targ_mart = Biomart.new(
    :url        => "http://htgt.internal.sanger.ac.uk:9002/biomart/martservice",
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
    :url => "http://htgt.internal.sanger.ac.uk:9002/biomart/martservice",
    :dataset => "htgt_trap",
    :attributes => [
      "marker_symbol",
      "escell_clone_name"
    ]
  )
  
  # Chunk the gene symbols into groups of 100 so that we don't 
  # swamp the martservices
  doc_chunks = documents.keys.chunk( documents.keys.size % 100 )
  
  # Process the chunks one at a time...
  doc_chunks.each { |chunk|
    
    # HTGT_TARG search
    targ_data = targ_mart.search( ["marker_symbol"], chunk.join(',') )
    targ_data.each { |data|
      document = documents[ data['marker_symbol'] ]

      if document == nil
        document = Document.new( data['marker_symbol'] )
      end

      if ! ( data['design_plate'].to_s.empty? && data['design_well'].to_s.empty? )
        document.targeting_designs.push( data['design_plate'] + '_' + data['design_well'] )
      end

      if ! ( data['intvec_plate'].to_s.empty? && data['intvec_well'].to_s.empty? )
        document.intermediate_vectors.push( data['intvec_plate'] + '_' + data['intvec_well'] )
      end

      if ! ( data['targvec_plate'].to_s.empty? && data['targvec_well'].to_s.empty? )
        document.targeting_vectors.push( data['targvec_plate'] + '_' + data['targvec_well'] )
      end

      if ! data['allele_name'].to_s.empty?
        document.alleles.push( data['allele_name'] )
      end

      if ! data['escell_clone_name'].to_s.empty?
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
    
  }
  
  return documents
  
end

def add_to_multivalued_field( data, target, splitter )
  
  if data != nil
    data.split( splitter ).each do |entry|
      target.push( entry )
    end
  end
  
end

dcc_mart = Biomart.new( 
  :url => "http://htgt.internal.sanger.ac.uk:9002/biomart/martservice", 
  :dataset => "dcc",
  :attributes => ["chromosome"]
)
#dcc_data = dcc_mart.search( ["marker_symbol"], "Cbx1" )
dcc_data = dcc_mart.search( ["chromosome"], "" )

dcc_data.each { |chr|
  puts "Building XML for chromosome #{chr["chromosome"]}"
  filename = "chr" + chr["chromosome"] + ".xml"
  #build_chromosome_xml( "Cbx1,Cbx2,Cbx3", filename )
  build_chromosome_xml( chr["chromosome"], filename )
}
