"""Reproducible Horizons states for a quasi-satellite reference-frame lesson."""
import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('monthly_builder',Path(__file__).with_name('prepare-dwarf-data.py'))
builder=importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
builder.CACHE=builder.ROOT/'data-sources'/'coorbital'
builder.OUT=builder.ROOT/'public'/'data'/'coorbital'
builder.TARGETS={'sun':'10','earth':'399','kamo':'469219;'}
builder.EXPECTED_NAMES={'sun':'Sun (10)','earth':'Earth (399)','kamo':'469219 Kamo'}
builder.VERSION='horizons-coorbital-2026-2027-v1'
if __name__=='__main__':builder.main()
