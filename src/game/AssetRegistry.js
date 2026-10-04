const ROOT="https://raw.githubusercontent.com/Hidencod/tge-assets/main/packs";
const HERO="https://raw.githubusercontent.com/programasweights/avatar/main/public/assets/character.glb";
const UAL1="https://raw.githubusercontent.com/Barbatos6669/elderforge/main/assets/animations/universal_animation_library_1/UAL1_Standard.glb";
const UAL2="https://raw.githubusercontent.com/Barbatos6669/elderforge/main/assets/animations/universal_animation_library_2/UAL2_Standard.glb";
export const ASSETS={
  root:ROOT,
  hero:HERO,
  animationPacks:[UAL1,UAL2],
  road:(name)=>ROOT+"/city-kit-roads/"+name+".glb",
  building:(name)=>ROOT+"/city-kit-suburban/"+name+".glb",
  commercial:(name)=>ROOT+"/city-kit-commercial/"+name+".glb",
  tree:(name)=>ROOT+"/nature-kit/"+name+".glb",
  car:(name)=>ROOT+"/car-kit/"+name+".glb",
  pedestrian:(name)=>ROOT+"/mini-characters/"+name+".glb"
};
export const CITY_ROADS=["road-straight","road-crossroad","road-intersection","road-curve","road-bend","road-roundabout"];
export const CITY_BUILDINGS=Array.from({length:21},(_,i)=>"building-type-"+String.fromCharCode(97+i));
export const PEDESTRIANS=["character-male-a","character-male-b","character-male-c","character-male-d","character-female-a","character-female-b","character-female-c","character-female-d"];