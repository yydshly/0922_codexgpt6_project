"""Four small Pluto moons: JPL geometric SSB states, six-hour packs / held-out three-hour checks."""
import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('monthly_builder',Path(__file__).with_name('prepare-dwarf-data.py'))
builder=importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
builder.CACHE=builder.ROOT/'data-sources'/'pluto-moons'
builder.OUT=builder.ROOT/'public'/'data'/'pluto-moons'
builder.TARGETS={'styx':'905','nix':'902','kerberos':'904','hydra':'903'}
builder.EXPECTED_NAMES={'styx':'Styx (905)','nix':'Nix (902)','kerberos':'Kerberos (904)','hydra':'Hydra (903)'}
builder.VERSION='horizons-pluto-small-moons-2026-2027-v1'
if __name__=='__main__':
    builder.main()
