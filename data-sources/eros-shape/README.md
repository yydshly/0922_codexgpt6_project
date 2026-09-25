# Eros NEAR MSI shape archive

Downloaded 2026-09-25 from the NASA PDS Small Bodies Node archive at PSI, using a standard User-Agent. Files are unchanged response bytes; hashes and full URLs appear in `public/data/eros-shape/manifest.json`.

- `eros007790.tab`: original vertices (km, Eros body-fixed) and **zero-based** facets.
- `eros007790.lbl`: detached PDS label, product `NEARMOD-EROS007790-200204`.
- `msieros.txt`: model reconstruction and reference pole/spin documentation.

Run `python scripts/prepare-eros-shape.py` to reproduce the local model and manifest offline. No vertices are invented, smoothed, normalized per axis or recentered. Browser vertex normals are shading normals only. Color is illustrative. The script checks closed, consistently wound topology before computing volume and bounds.

Origin accuracy differs between label (about 10 m) and dataset description (within 50 m); the product reports the conservative 50 m, not exact center coincidence. Original reconstruction errors do not guarantee this reduced-resolution mesh's accuracy. Current reference orientation is extrapolated from the archived pole and linear rotation, not newly observed.
