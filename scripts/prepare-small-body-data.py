"""JPL geometric states for selected main-belt / trans-Neptunian representatives.
Uses shared six-hour packs and independent three-hour held-out checkpoints.
"""
import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('monthly_builder',Path(__file__).with_name('prepare-dwarf-data.py'))
builder=importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
builder.CACHE=builder.ROOT/'data-sources'/'small-bodies'
builder.OUT=builder.ROOT/'public'/'data'/'small-bodies'
builder.TARGETS={'vesta':'4;','haumea':'136108;','makemake':'136472;','eris':'136199;'}
builder.EXPECTED_NAMES={'vesta':'4 Vesta','haumea':'136108 Haumea','makemake':'136472 Makemake','eris':'136199 Eris'}
builder.VERSION='horizons-small-bodies-2026-2027-v1'
if __name__=='__main__':
    builder.main()
