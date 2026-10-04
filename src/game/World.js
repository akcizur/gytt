import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ASSETS,CITY_BUILDINGS } from "./AssetRegistry.js";

export class World{
  constructor(T,R){
    this.T=T;this.R=R;this.scene=new T.Scene();
    this.camera=new T.PerspectiveCamera(62,innerWidth/innerHeight,.1,1400);
    this.renderer=new T.WebGLRenderer({canvas:document.querySelector("#game"),antialias:true,powerPreference:"high-performance"});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;
    this.renderer.setSize(innerWidth,innerHeight);this.renderer.outputColorSpace=T.SRGBColorSpace;
    this.world=new R.World({x:0,y:-18,z:0});this.loader=new GLTFLoader();this.cache=new Map();
    addEventListener("resize",()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight)});
  }
  async asset(url){if(this.cache.has(url))return this.cache.get(url);const p=this.loader.loadAsync(url).then(g=>g.scene);this.cache.set(url,p);return p}
  async clone(url){const base=await this.asset(url),m=base.clone(true);m.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return m}
  addBoxCollider(mesh){
    const box=new this.T.Box3().setFromObject(mesh);if(!isFinite(box.min.x))return;
    const size=box.getSize(new this.T.Vector3()),center=box.getCenter(new this.T.Vector3());
    if(size.x<.1||size.y<.1||size.z<.1)return;
    const rb=this.world.createRigidBody(this.R.RigidBodyDesc.fixed().setTranslation(center.x,center.y,center.z));
    this.world.createCollider(this.R.ColliderDesc.cuboid(size.x/2,size.y/2,size.z/2),rb);
  }
  build(){
    const T=this.T,s=this.scene;s.background=new T.Color(0x8aa6bd);s.fog=new T.Fog(0x8aa6bd,150,650);
    s.add(new T.HemisphereLight(0xd8eaff,0x35404a,2.4));
    const sun=new T.DirectionalLight(0xffe3b8,3.2);sun.position.set(120,180,80);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);s.add(sun);
    const ground=new T.Mesh(new T.PlaneGeometry(700,700),new T.MeshStandardMaterial({color:0x314238,roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;s.add(ground);
    const rb=this.world.createRigidBody(this.R.RigidBodyDesc.fixed().setTranslation(0,-.12,0));
    this.world.createCollider(this.R.ColliderDesc.cuboid(350,.12,350),rb);
    this.buildAssetCity();
  }
  async buildAssetCity(){
    const tile=24,range=10,loads=[];
    for(let z=-range;z<=range;z++)for(let x=-range;x<=range;x++){
      const roadName=(x%5===0&&z%5===0)?"road-crossroad":(x%5===0||z%5===0)?"road-straight":null;
      if(!roadName)continue;
      loads.push(this.clone(ASSETS.road(roadName)).then(m=>{m.position.set(x*tile,0,z*tile);if(z%5===0&&x%5!==0)m.rotation.y=Math.PI/2;this.scene.add(m)}).catch(()=>{}));
    }
    const lots=[];
    for(let z=-range;z<range;z++)for(let x=-range;x<range;x++){if(x%5===4||z%5===4)continue;lots.push([x,z])}
    for(let i=0;i<lots.length;i+=6){
      const batch=lots.slice(i,i+6).map(([x,z],j)=>{
        const name=CITY_BUILDINGS[(i+j)%CITY_BUILDINGS.length];
        return this.clone(ASSETS.building(name)).then(m=>{m.position.set(x*tile+12,0,z*tile+12);m.rotation.y=((i+j)%4)*Math.PI/2;this.scene.add(m);this.addBoxCollider(m)}).catch(()=>{});
      });
      await Promise.all(batch);
    }
    const trees=["tree-default","tree-oak","tree-pinegrounda","tree-palm","tree-small"];
    await Promise.all(Array.from({length:55},(_,i)=>this.clone(ASSETS.tree(trees[i%trees.length])).then(m=>{const a=i*2.399,r=80+(i%7)*13;m.position.set(Math.cos(a)*r,0,Math.sin(a)*r);m.scale.setScalar(.8+(i%4)*.18);this.scene.add(m)}).catch(()=>{})));
    this.addStreetProps();await Promise.all(loads);
  }
  async addStreetProps(){
    const props=["traffic-light","light-square","electricity-pole"];
    await Promise.all(Array.from({length:24},(_,i)=>this.clone(ASSETS.road(props[i%props.length])).then(m=>{const a=i%4,p=96;const x=a<2?(i%6-3)*48:(a===2?p:-p),z=a<2?(a===0?p:-p):(i%6-3)*48;m.position.set(x,0,z);this.scene.add(m)}).catch(()=>{})));
  }
  update(){this.world.timestep=Math.min(.033,Math.max(.001,arguments[0]??.016));this.world.step()}
  render(){this.renderer.render(this.scene,this.camera)}
}