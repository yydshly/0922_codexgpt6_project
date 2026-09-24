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
builder.TARGETS={'vesta':'4;','haumea':'136108;','makemake':'136472;','eris':'136199;','eros':'433;','achilles':'588;','aneas':'1172;','chariklo':'10199;','quaoar':'50000;','sedna':'90377;'}
builder.EXPECTED_NAMES={'vesta':'4 Vesta','haumea':'136108 Haumea','makemake':'136472 Makemake','eris':'136199 Eris','eros':'433 Eros','achilles':'588 Achilles','aneas':'1172 Aneas','chariklo':'10199 Chariklo','quaoar':'50000 Quaoar','sedna':'90377 Sedna'}
builder.VERSION='horizons-small-bodies-2026-2027-v3'
if __name__=='__main__':
    builder.main()
