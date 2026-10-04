import "./style.css";
import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import { Game } from "./Game.js";

const app=document.querySelector("#app");
app.innerHTML=`
<canvas id="game"></canvas>
<div id="boot"><div class="boot-logo">GYTT</div><div class="boot-bar"><i></i></div><small>INITIALIZING CITY</small></div>
<div id="hud">
  <header><div><b>GYTT</b><span>FREE ROAM</span></div><div class="hud-stats"><span id="speed">0 KM/H</span><span id="wanted">☆</span></div></header>
  <section class="mission"><small id="mission-kind">FREE ROAM</small><strong id="mission">Explore the city</strong><em id="objective"></em></section>
  <div id="interaction"></div>
  <footer><span id="money">$ 2,500</span><span id="fps">60 FPS</span></footer>
</div>
<div id="mobile">
  <div id="move-zone" class="stick-zone"><span>MOVE</span></div>
  <div id="look-zone" class="stick-zone"><span>LOOK</span></div>
  <div class="actions">
    <button data-action="run">RUN</button><button data-action="jump">JUMP</button>
    <button data-action="interact">USE</button><button data-action="reset">RESET</button>
  </div>
</div>
<div id="toast"></div>
<div id="crosshair">·</div>
<div id="dev">DEV • <span id="dev-state">READY</span></div>
`;

await RAPIER.init();
const game=new Game({THREE,RAPIER,canvas:document.querySelector("#game")});
await game.start();
window.GYTT=game;
