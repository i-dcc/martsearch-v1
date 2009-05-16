module("dataset");

// Load in the dataset configs so we can check some details...
var datasets = [];
jQuery.ajax({
  url:      ms.base_url + "/bin/dataset-feed.pl",
  type:     'GET',
  dataType: 'json',
  async:    false,
  success:  function (ds) {
    datasets = ds;
  }
});

for (var i=0; i < ms.datasets.length; i++) {
  var ds = ms.datasets[i];
  var ds_chk = datasets[i];
  
  test( ds.display_name+" - Basic object attributes ", function() {
    expect(3);
    equals( ds.display_name, ds_chk.display_name, "Dataset 'display_name' is correct " );
    equals( ds.enabled_attributes instanceof Array, true, "'enabled_attributes' is an array " );
    equals( ds.mart_dataset, ds_chk.mart_dataset, "Pointing to the correct dataset " );
  });

  test( ds.display_name+" - Retrieving all biomart attributes dynamically ", function() {
    ds.attributes = ds.fetch_all_attributes();

    expect(3);
    ok( jQuery.keys(ds.attributes).length > 0, "We returned some attributes " );
    equals( ds.attributes instanceof Object, true, "'attributes' is an object " );
    
    // Deliberatly fail the fetch...
    var real_url = ds.url;
    ds.url = '/foo';
    ds.attributes = ds.fetch_all_attributes();
    ok( jQuery.keys(ds.attributes).length == 0, "We failed to fetch any attributes " );

    ds.url = real_url;
    ds.attributes = ds.fetch_all_attributes();
  });
  
  
};


