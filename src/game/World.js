import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from "three-mesh-bvh";
import { ASSETS,CITY_BUILDINGS } from "./AssetRegistry.js";
import { Streaming } from "./Streaming.js";
import { LODSystem } from "./LOD.js";

export class World{
  constructor(T,R){
    this.T=T;this.R=R;this.scene=new T.Scene();
    this.camera=new T.PerspectiveCamera(62,innerWidth/innerHeight,.1,1400);
    this.renderer=new T.WebGLRenderer({canvas:document.querySelector("#game"),antialias:true,powerPreference:"high-performance"});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;
    this.renderer.setSize(innerWidth,innerHeight);this.renderer.outputColorSpace=T.SRGBColorSpace;
    this.world=new R.World({x:0,y:-18,z:0});this.loader=new GLTFLoader();this.cache=new Map();
    this.streaming=new Streaming(this,{chunkSize:120,activeRadius:1,unloadRadius:2});
    this.lod=null;this.player=null;this.raycaster=new T.Raycaster();this.raycaster.firstHitOnly=true;
    T.BufferGeometry.prototype.computeBoundsTree=computeBoundsTree;
    T.BufferGeometry.prototype.disposeBoundsTree=disposeBoundsTree;
    T.Mesh.prototype.raycast=acceleratedRaycast;
    addEventListener("resize",()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight)});
  }
  async asset(url){
    if(this.cache.has(url))return this.cache.get(url);
    const p=this.loader.loadAsync(url).then(g=>{
      g.scene.traverse(o=>{if(o.isMesh&&o.geometry&&!o.geometry.boundsTree)o.geometry.computeBoundsTree({maxLeafSize:10})});
      return g.scene;
    });
    this.cache.set(url,p);return p;
  }
  async clone(url){const base=await this.asset(url),m=base.clone(true);m.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return m}
  addBoxCollider(mesh,chunk){
    const box=new this.T.Box3().setFromObject(mesh);if(!isFinite(box.min.x))return;
    const size=box.getSize(new this.T.Vector3()),center=box.getCenter(new this.T.Vector3());
    if(size.x<.1||size.y<.1||size.z<.1)return;
    const rb=this.world.createRigidBody(this.R.RigidBodyDesc.fixed().setTranslation(center.x,center.y,center.z));
    this.world.createCollider(this.R.ColliderDesc.cuboid(size.x/2,size.y/2,size.z/2),rb);
    chunk.colliders.push(rb);
  }
  async build(){
    const T=this.T,s=this.scene;
    s.background=new T.Color(0x8aa6bd);s.fog=new T.Fog(0x8aa6bd,170,650);
    s.add(new T.HemisphereLight(0xd8eaff,0x35404a,2.4));
    const sun=new T.DirectionalLight(0xffe3b8,3.2);sun.position.set(120,180,80);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);s.add(sun);
    const ground=new T.Mesh(new T.PlaneGeometry(1400,1400),new T.MeshStandardMaterial({color:0x314238,roughness:1}));
    ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;s.add(ground);
    const rb=this.world.createRigidBody(this.R.RigidBodyDesc.fixed().setTranslation(0,-.12,0));
    this.world.createCollider(this.R.ColliderDesc.cuboid(700,.12,700),rb);
    this.lod=new LODSystem(this.g);
    await this.streaming.update(new T.Vector3(0,0,0),{force:true});
  }
  async createChunk(cx,cz){
    const T=this.T,group=new T.Group();group.name="chunk:"+cx+":"+cz;group.userData.chunk={x:cx,z:cz};
    this.scene.add(group);const chunk={x:cx,z:cz,group,colliders:[],objects:[]};
    const tile=24,baseX=cx*5,baseZ=cz*5;
    const add=object=>{group.add(object);chunk.objects.push(object);return object};
    const jobs=[];
    for(let tz=0;tz<5;tz++)for(let tx=0;tx<5;tx++){
      const gx=baseX+tx,gz=baseZ+tz,roadX=gx%5===0,roadZ=gz%5===0;
      if(roadX||roadZ){
        const roadName=roadX&&roadZ?"road-crossroad":"road-straight";
        jobs.push(this.clone(ASSETS.road(roadName)).then(m=>{m.position.set(gx*tile,0,gz*tile);if(roadZ&&!roadX)m.rotation.y=Math.PI/2;add(m);this.lod.register(m,{near:210,far:420,hide:560})}).catch(()=>{}));
      }else{
        const name=CITY_BUILDINGS[Math.abs(gx*31+gz*17)%CITY_BUILDINGS.length];
        jobs.push(this.clone(ASSETS.building(name)).then(m=>{m.position.set(gx*tile+12,0,gz*tile+12);m.rotation.y=(Math.abs(gx+gz)%4)*Math.PI/2;add(m);this.addBoxCollider(m,chunk);this.lod.register(m,{near:180,far:390,hide:520})}).catch(()=>{}));
      }
    }
    const trees=["tree-default","tree-oak","tree-pinegrounda","tree-palm","tree-small"];
    for(let i=0;i<8;i++){
      const a=cx*13.17+cz*7.31+i*2.399,r=38+(i%4)*12;
      jobs.push(this.clone(ASSETS.tree(trees[Math.abs(cx+cz+i)%trees.length])).then(m=>{m.position.set(cx*120+Math.cos(a)*r,0,cz*120+Math.sin(a)*r);m.scale.setScalar(.8+(i%4)*.18);add(m);this.lod.register(m,{near:150,far:300,hide:430})}).catch(()=>{}));
    }
    await Promise.all(jobs);return chunk;
  }
  disposeChunk(chunk){
    for(const rb of chunk.colliders){try{this.world.removeRigidBody(rb)}catch{}}
    for(const object of chunk.objects)this.lod?.remove(object);
    chunk.group.traverse(o=>{if(o.isMesh)o.visible=false});
    this.scene.remove(chunk.group);
  }
  raycastFirst(origin,direction,far=500){this.raycaster.set(origin,direction);this.raycaster.far=far;return this.raycaster.intersectObjects(this.scene.children,true)[0]||null}
  update(dt=.016){
    this.world.timestep=Math.min(.033,Math.max(.001,dt));this.world.step();
    if(this.player)this.streaming.update(this.player.pos);
    this.lod?.update(dt);
  }
  render(){this.renderer.render(this.scene,this.camera)}
}
