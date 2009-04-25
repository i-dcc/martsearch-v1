#! /bin/bash

rm -rf /Users/$USER/projects/martsearch2/test_coverage &&
cd /Users/$USER/projects &&
jscoverage --no-instrument=test --no-instrument=js/utils martsearch2 test_coverage &&
mv test_coverage martsearch2/