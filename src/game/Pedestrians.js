import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ASSETS,PEDESTRIANS } from "./AssetRegistry.js";

export class Pedestrians{
  constructor(g){this.g=g;this.T=g.THREE;this.people=[]}
  build(){this.spawn()}
  async spawn(){
    const loader=new GLTFLoader();
    for(let i=0;i<18;i++){
      try{
        const name=PEDESTRIANS[i%PEDESTRIANS.length],gltf=await loader.loadAsync(ASSETS.pedestrian(name)),m=gltf.scene;
        m.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
        const a=i*2.618,r=35+(i%5)*9;m.position.set(Math.cos(a)*r,0,Math.sin(a)*r);m.scale.setScalar(.9);this.g.world.scene.add(m);
        this.people.push({mesh:m,angle:a,radius:r,speed:.35+(i%4)*.08,phase:i*.7});
      }catch(e){console.warn("Pedestrian asset unavailable",e);break}
    }
  }
  update(dt){
    for(const p of this.people){
      p.angle+=p.speed*dt/p.radius;
      p.mesh.position.x=Math.cos(p.angle)*p.radius;p.mesh.position.z=Math.sin(p.angle)*p.radius;
      p.mesh.rotation.y=-p.angle+Math.PI/2;
    }
  }
}