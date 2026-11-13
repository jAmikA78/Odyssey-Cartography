/* Offline Three.js terrain starter. Coordinates: x east, y up, z south; all meters. */
(async()=>{
try{
 const get=async p=>{const r=await fetch('data/'+p);if(!r.ok)throw Error(p+': '+r.status);return r};
 const [meta,buf,route]=await Promise.all([(await get('metadata.json')).json(),(await get('elevation.f32')).arrayBuffer(),(await get('example_route.geojson')).json()]);
 const elev=new Float32Array(buf),W=meta.width,H=meta.height,[dx,dy]=meta.cell_size_m;
 if(elev.length!==W*H)throw Error('Elevation dimensions do not match metadata');
 const width=(W-1)*dx,height=(H-1)*dy,base=meta.min_elevation_m;
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x161b21);
 const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,5,40000);
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));document.body.appendChild(renderer.domElement);
 const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI/2-0.04;controls.minDistance=500;controls.maxDistance=22000;
 function reset(){camera.position.set(4800,5400,6500);controls.target.set(0,400,0);controls.update()}reset();
 scene.add(new THREE.AmbientLight(0xffffff,0.75));const sun=new THREE.DirectionalLight(0xffead2,0.6);sun.position.set(-4000,7000,-4000);scene.add(sun);
 const geom=new THREE.PlaneGeometry(width,height,W-1,H-1),pos=geom.attributes.position;
 for(let i=0;i<elev.length;i++){const planeY=pos.getY(i);pos.setXYZ(i,pos.getX(i),elev[i]-base,-planeY)}const uv=geom.attributes.uv;for(let r=0;r<H;r++)for(let c=0;c<W;c++)uv.setXY(r*W+c,(c+0.5)/W,1-(r+0.5)/H);geom.computeVertexNormals();
 const loader=new THREE.TextureLoader();const textures={};
 async function texture(name){if(!textures[name])textures[name]=await new Promise((ok,bad)=>loader.load('data/'+name,ok,undefined,bad));return textures[name]}
 const material=new THREE.MeshLambertMaterial({map:await texture('texture_ctx.jpg'),side:THREE.DoubleSide});
 const terrain=new THREE.Mesh(geom,material);scene.add(terrain);
 const routeGroup=new THREE.Group();scene.add(routeGroup);
 const pts=route.features.filter(f=>f.geometry.type==='Point').map(f=>({r:f.properties.row,c:f.properties.col}));
 // Piecewise linear cells, then sample DEM for a terrain-conforming synthetic line.
 let linePoints=[];
 for(let j=0;j<pts.length-1;j++){const a=pts[j],b=pts[j+1],steps=Math.max(Math.abs(a.r-b.r),Math.abs(a.c-b.c))*2;for(let k=0;k<=steps;k++){const t=k/steps,r=Math.round(a.r+(b.r-a.r)*t),c=Math.round(a.c+(b.c-a.c)*t);linePoints.push(new THREE.Vector3((c-(W-1)/2)*dx,elev[r*W+c]-base+20,(r-(H-1)/2)*dy))}}
 routeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePoints),new THREE.LineBasicMaterial({color:0x49ffe2,depthTest:false})));
 for(const p of pts){const m=new THREE.Mesh(new THREE.SphereGeometry(26,10,8),new THREE.MeshBasicMaterial({color:0xffd260}));m.position.set((p.c-(W-1)/2)*dx,elev[p.r*W+p.c]-base+25,(p.r-(H-1)/2)*dy);routeGroup.add(m)}
 const north=new THREE.ArrowHelper(new THREE.Vector3(0,0,-1),new THREE.Vector3(-2600,200,2100),850,0xff7777,180,90);scene.add(north);
 const labelCanvas=document.createElement('canvas');labelCanvas.width=128;labelCanvas.height=128;const ctx=labelCanvas.getContext('2d');ctx.fillStyle='#ff7777';ctx.font='bold 90px sans-serif';ctx.textAlign='center';ctx.fillText('N',64,95);const n=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(labelCanvas),depthTest:false}));n.position.set(-2600,200,1000);n.scale.set(250,250,1);scene.add(n);
 document.querySelector('#layer').onchange=async e=>{material.map=await texture(e.target.value);material.needsUpdate=true};
 document.querySelector('#exaggeration').oninput=e=>{const ex=Number(e.target.value);terrain.scale.y=routeGroup.scale.y=ex;document.querySelector('#exValue').textContent=ex+'x'};
 document.querySelector('#route').onchange=e=>routeGroup.visible=e.target.checked;
 document.querySelector('#reset').onclick=reset;
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
 function draw(){requestAnimationFrame(draw);controls.update();renderer.render(scene,camera)}draw();
 document.querySelector('#status').textContent=`Ready offline: ${W} x ${H} cells. Elevation ${Math.round(meta.min_elevation_m)} to ${Math.round(meta.max_elevation_m)} m.`;
 window.galeReady=true;window.galeDebug={renderer,scene,camera,controls,terrain,routeGroup,meta};
}catch(e){document.querySelector('#status').textContent='Could not load: '+e.message+'. Serve this folder with python -m http.server 8000. WebGL must be enabled.';console.error(e)}
})();
