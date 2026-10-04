import * as T from "three";
export class World{
 constructor(scene:T.Scene,R:any,physics:any){
  const ground=new T.Mesh(new T.PlaneGeometry(320,320),new T.MeshStandardMaterial({color:0x465149,roughness:1}));
  ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  physics.createCollider(R.ColliderDesc.cuboid(160,.05,160));
  for(let x=-60;x<=60;x+=15) for(let z=-60;z<=60;z+=15){
   if(Math.abs(x)<16&&Math.abs(z)<16)continue;
   const h=5+(Math.abs(x*13+z*7)%6)*2;
   const b=new T.Mesh(new T.BoxGeometry(8,h,8),new T.MeshStandardMaterial({color:0x59636b,roughness:.9}));
   b.position.set(x,h/2,z);b.castShadow=true;b.receiveShadow=true;scene.add(b);
   physics.createCollider(R.ColliderDesc.cuboid(4,h/2,4).setTranslation(x,h/2,z));
  }
  const road=new T.Mesh(new T.BoxGeometry(34,.02,320),new T.MeshStandardMaterial({color:0x25292d,roughness:1}));road.position.y=.01;scene.add(road);
  const cross=road.clone();cross.rotation.y=Math.PI/2;scene.add(cross);
 }
}