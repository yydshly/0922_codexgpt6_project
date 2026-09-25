"""Convert archived PDS NEAR MSI plate model; no network or mesh deformation."""
from pathlib import Path
from collections import Counter
import json, hashlib, math
root=Path(__file__).resolve().parents[1]
source=root/'data-sources/eros-shape'
vertices=[];facets=[]
for line in (source/'eros007790.tab').read_text().splitlines():
    flag,*values=line.split()
    if flag=='v': vertices.append(list(map(float,values)))
    elif flag=='f': facets.append(list(map(int,values)))
    else: raise ValueError('Unknown record')
assert len(vertices)==3897 and len(facets)==7790
assert all(len(v)==3 and all(math.isfinite(n) for n in v) for v in vertices)
assert all(len(set(f))==3 and all(0<=n<len(vertices) for n in f) for f in facets)
edges=Counter();directed=Counter();volume=0
for a,b,c in facets:
    for i,j in [(a,b),(b,c),(c,a)]:edges[tuple(sorted((i,j)))]+=1;directed[(i,j)]+=1
    x,y,z=vertices[a],vertices[b],vertices[c]
    cross=[y[1]*z[2]-y[2]*z[1],y[2]*z[0]-y[0]*z[2],y[0]*z[1]-y[1]*z[0]]
    volume+=sum(x[i]*cross[i] for i in range(3))/6
assert all(n==2 for n in edges.values())
assert all(directed[(j,i)]==n for (i,j),n in directed.items())
assert len(vertices)-len(edges)+len(facets)==2
reverse=volume<0
if reverse:facets=[list(reversed(f)) for f in facets]
volume=abs(volume)
base='https://sbnarchive.psi.edu/pds3/near/NEAR_A_5_COLLECTED_MODELS_V1_0/'
meta={'bodyId':'eros','version':'NEARMOD-EROS007790-200204','modelDate':'2001-01-12','baseSolution':'2001012','units':'km','frame':'Eros body-fixed: x prime meridian, z north pole, y=z cross x', 'vertices':len(vertices),'facets':len(facets),'boundsKm':[[min(v[i] for v in vertices),max(v[i] for v in vertices)] for i in range(3)],'volumeKm3':volume,'equivalentRadiusKm':(3*volume/(4*math.pi))**(1/3),'maxRadiusKm':max(math.sqrt(sum(n*n for n in v)) for v in vertices),'reversedWinding':reverse,'poleRaDeg':11.350,'poleDecDeg':17.216,'primeMeridianDeg':326.027,'rotationRateDegPerDay':1639.38864745,'epochJd':2451545.0,'sources':[{'file':name,'url':base+sub+name,'sha256':hashlib.sha256((source/name).read_bytes()).hexdigest()} for name,sub in [('eros007790.tab','data/msi/'),('eros007790.lbl','data/msi/'),('msieros.txt','document/')]],'limits':['Reduced-resolution optical reconstruction, not a live image or current attitude measurement.','Archive label gives about 10 m origin agreement; dataset documentation gives within 50 m. Use the conservative bound, not exact center coincidence.','Vertex precision and original model errors are not accuracy guarantees for this coarse mesh.','Bounds are model axis-aligned extents, not fitted ellipsoid axes.']}
out=root/'public/data/eros-shape';out.mkdir(parents=True,exist_ok=True)
(out/'model.json').write_text(json.dumps({'metadata':meta,'positionsKm':[n for v in vertices for n in v],'indices':[n for f in facets for n in f]},separators=(',',':'))+'\n')
(out/'manifest.json').write_text(json.dumps(meta,indent=2)+'\n')
print(json.dumps({k:meta[k] for k in ['vertices','facets','boundsKm','volumeKm3','equivalentRadiusKm','maxRadiusKm','reversedWinding']},indent=2))
