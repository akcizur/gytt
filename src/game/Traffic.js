import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ASSETS } from "./AssetRegistry.js";
export class Traffic{
  constructor(g){this.g=g;this.T=g.THREE;this.cars=[];this.loader=new GLTFLoader()}
  build(){this.spawn()}
  async spawn(){
    for(let n=0;n<12;n++){
      try{
        const gltf=await this.loader.loadAsync(ASSETS.car(["sedan","suv","taxi","truck"][n%4]));
        const m=gltf.scene;m.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
        const axis=n%2===0?"x":"z",lane=(n%4-1.5)*3.2;
        m.scale.setScalar(.95);this.g.world.scene.add(m);
        const c={m,axis,lane,v:4+n%5*1.4,dir:n%3?1:-1};
        if(axis==="x")m.position.set(-220,0,lane*18);else m.position.set(lane*18,0,-220);
        m.rotation.y=axis==="x"?(c.dir>0?Math.PI/2:-Math.PI/2):(c.dir>0?0:Math.PI);this.cars.push(c);
      }catch(e){console.warn("Traffic asset unavailable",e);break}
    }
  }
  update(dt){for(const c of this.cars){c.m.position[c.axis]+=c.v*c.dir*dt;if(c.m.position[c.axis]>240)c.m.position[c.axis]=-240;if(c.m.position[c.axis]<-240)c.m.position[c.axis]=240}}
}