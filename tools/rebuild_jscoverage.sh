#! /bin/bash

rm -rf /Users/do2/projects/easymart/test_coverage &&
cd /Users/do2/projects &&
jscoverage --no-instrument=test easymart test_coverage &&
mv test_coverage easymart/