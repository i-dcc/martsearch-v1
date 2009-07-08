select
	g.symbol as "marker_symbol",
	g.mgiid as "mgi_accession_id",
	g.chr as "chromosome",
	g.coord_start ,
	g.coord_end,
	g.strand,
	g.type as "marker_type",
	gns.names as "marker_names",
	gns.synonyms,
	gns.ensembl_gene_ids,
	gns.vega_gene_ids,
	gns.ncbi_ids as "entrez_gene_ids",
	gns.ccds_ids,
	gns.omim_ids,
	egns.names as "expired_marker_names",
	egns.synonyms as "expired_synonyms",
	egns.ensembl_gene_ids as "expired_ensembl_gene_ids",
	egns.vega_gene_ids as "expired_vega_gene_ids",
	egns.ncbi_ids as "expired_entrez_gene_ids",
	egns.ccds_ids as "expired_ccds_ids",
	egns.omim_ids as "expired_omim_ids"
from
	gene g
	join combined_gene_ids_and_names gns on g._gene_key = gns._gene_key
	join old_combined_gene_ids_and_names egns on g._gene_key = egns._gene_key
where
 	(
			g.type = 'Gene'
		or 	g.type = 'Pseudogene'
		or 	g.type = 'microRNA'
	)
	and 	gns.names not like '%predicted gene%'