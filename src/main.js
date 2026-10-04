import "./style.css";
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { Game } from "./game/Game.js";

const base=import.meta.env.BASE_URL;
const app=document.querySelector("#app");

app.innerHTML=`
<canvas id="game"></canvas>
<div id="hud">
  <div class="brand"><b>GYTT</b><span>DISTRICT</span></div>
  <div class="stats"><span id="fps">60 FPS</span><span id="speed">0 km/h</span><span id="wanted">☆</span></div>
  <div class="mission"><small>FREE ROAM</small><strong id="mission">Loading district…</strong></div>
</div>
<div id="touch">
  <div id="joy-left" class="joy-zone" aria-label="Movement joystick"></div>
  <div id="joy-right" class="joy-zone" aria-label="Camera joystick"></div>
  <div class="actions"><button data-k="shift">RUN</button><button data-k="space">JUMP</button><button data-k="e">E</button><button data-k="r">RESET</button></div>
</div>
<div id="help">WASD move • E enter/exit • SHIFT sprint • SPACE jump • R reset</div>
<div id="fatal" hidden></div>`;

try{
  await RAPIER.init();
  const game=new Game({canvas:document.querySelector("#game"),THREE,RAPIER,base});
  await game.start();
}catch(error){
  console.error("GYTT startup failed",error);
  const fatal=document.querySelector("#fatal");
  if(fatal){
    fatal.hidden=false;
    fatal.textContent="GYTT se nepodařilo spustit. Obnov stránku.";
  }
}