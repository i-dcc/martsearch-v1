#! /bin/bash

rm -rf /Users/$USER/projects/martsearch/test_coverage &&
cd /Users/$USER/projects &&
jscoverage --no-instrument=test --no-instrument=js/utils martsearch test_coverage &&
mv test_coverage martsearch/