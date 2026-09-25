"""Eris primary and Dysnomia, from the SAME TNO satellite solution: JPL geometric SSB states, six-hour packs / held-out three-hour checks."""
import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('monthly_builder',Path(__file__).with_name('prepare-dwarf-data.py'))
builder=importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
builder.CACHE=builder.ROOT/'data-sources'/'eris-system'
builder.OUT=builder.ROOT/'public'/'data'/'eris-system'
builder.TARGETS={'eris':'920136199','dysnomia':'120136199'}
builder.EXPECTED_NAMES={'eris':'Eris (primary body) (920136199)','dysnomia':'Dysnomia (120136199)'}
builder.VERSION='horizons-eris-dysnomia-2026-2027-v1'
if __name__=='__main__':
    builder.main()
