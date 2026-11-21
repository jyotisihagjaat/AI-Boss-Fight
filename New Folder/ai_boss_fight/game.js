(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const $ = id => document.getElementById(id);
  const keys = new Set(), mouse = {x:W/2,y:H/2,down:false};
  let running=false,paused=false,last=0,elapsed=0,level=1,frame=0,toastTimer=0,levelBanner=0;
  let player,boss,playerShots=[],bossShots=[],particles=[],floaters=[];
  let stats,lastPlayerPos,shotTimes=[],cameraShake=0;
  const MAX_LEVEL=8;
  const levelNames=['TRAINING ARENA','NEON DOCKS','THE FACTORY','CYBER DISTRICT','CORE CHAMBER','NIGHTFALL','THE OVERLORD','FINAL PROTOCOL'];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const rand=(a,b)=>a+Math.random()*(b-a);

  function freshStats(){return {left:0,right:0,up:0,down:0,moveSamples:0,still:0,shoots:0};}
  function resetGame(){
    level=1;elapsed=0;stats=freshStats();shotTimes=[];
    player={x:W/2,y:H-100,r:15,hp:120,maxHp:120,speed:260,invuln:0,dash:0,shootCd:0,walk:0,face:0};
    playerShots=[];bossShots=[];particles=[];floaters=[];
    spawnBoss();updateHud();levelBanner=2.3;
  }
  function spawnBoss(){
    const hp=125+(level-1)*38;
    boss={x:W/2,y:105,r:37,hp,maxHp:hp,shootCd:1.0,phase:0,walk:0,face:Math.PI/2,hit:0,attack:0};
    player.x=W/2;player.y=H-100;
  }
  function updateHud(){
    $('playerHp').textContent=Math.ceil(player.hp);
    $('playerBar').style.width=clamp(player.hp/player.maxHp*100,0,100)+'%';
    $('bossHp').textContent=Math.ceil(boss.hp);
    $('bossBar').style.width=clamp(boss.hp/boss.maxHp*100,0,100)+'%';
    $('round').textContent=String(level).padStart(2,'0')+' / '+MAX_LEVEL;
    const m=Math.floor(elapsed/60),s=Math.floor(elapsed%60);
    $('timer').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
    const total=stats.left+stats.right+stats.up+stats.down;
    const h=stats.left+stats.right,v=stats.up+stats.down;
    let pref='Collecting data…';
    if(total>10)pref=h>v*1.2?(stats.left>stats.right?'LEFT':'RIGHT'):v>h*1.2?(stats.up>stats.down?'UP':'DOWN'):(stats.left+stats.up>stats.right+stats.down?'LEFT / UP':'RIGHT / DOWN');
    $('dodgeRead').textContent=pref;
    $('stillRead').textContent=stats.moveSamples?Math.round(stats.still/stats.moveSamples*100)+'% stationary':'Collecting data…';
    $('shootRead').textContent=stats.shoots?(stats.shoots>elapsed*1.25?'Rapid fire':'Measured fire'):'No shots yet';
    $('levelNote').textContent='LEVEL '+level+' · '+levelNames[level-1];
  }
  function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');toastTimer=1.7;}
  function overlay(title,text,button){$('overlayTitle').textContent=title;$('overlayText').textContent=text;$('startBtn').textContent=button;$('overlay').classList.remove('hidden');}
  function start(){resetGame();running=true;paused=false;last=performance.now();$('pauseBtn').textContent='Pause';$('overlay').classList.add('hidden');requestAnimationFrame(loop);}
  function firePlayer(){
    if(!running||paused||player.shootCd>0)return;
    const a=Math.atan2(mouse.y-player.y,mouse.x-player.x);player.face=a;
    const muzzle=humanGunTip(player);
    playerShots.push({x:muzzle.x,y:muzzle.y,vx:Math.cos(a)*690,vy:Math.sin(a)*690,r:4,life:1.5});
    player.shootCd=.16;stats.shoots++;shotTimes.push(elapsed);shotTimes=shotTimes.filter(t=>elapsed-t<7);
    burst(muzzle.x,muzzle.y,'#ffe49b',2,45);
  }
  function humanGunTip(unit){
    const a=unit.face||0;
    return {x:unit.x+Math.cos(a)*28,y:unit.y+Math.sin(a)*28-5};
  }
  function bossFire(){
    const dx=player.x-boss.x,dy=player.y-boss.y;
    const h=stats.left+stats.right,v=stats.up+stats.down;
    let leadX=0,leadY=0;
    if(h+v>9){if(stats.left>stats.right*1.12)leadX=-105;else if(stats.right>stats.left*1.12)leadX=105;if(stats.up>stats.down*1.12)leadY=-90;else if(stats.down>stats.up*1.12)leadY=90;}
    const aim=Math.atan2(dy+leadY,dx+leadX);
    const stationary=stats.moveSamples?stats.still/stats.moveSamples:0;
    const rapid=shotTimes.length>=7;
    const count=stationary>.46?5:(level>=4?3:1);
    const spread=rapid?.23:.13,speed=235+level*22;
    boss.face=aim;boss.attack=0.3;
    for(let i=0;i<count;i++){
      const a=aim+(i-(count-1)/2)*spread;
      bossShots.push({x:boss.x+Math.cos(a)*28,y:boss.y+Math.sin(a)*25,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:level>=6?7:6,life:4});
    }
    if(stationary>.46)$('bossThought').textContent='“You keep holding position. I will cover the whole lane.”';
    else if(rapid)$('bossThought').textContent='“That firing rhythm is predictable. I am adjusting.”';
    else if(h+v>9)$('bossThought').textContent='“I remember your favourite escape direction.”';
    else $('bossThought').textContent='“Analysing your next move…”';
  }
  function burst(x,y,color,n=8,power=170){for(let i=0;i<n;i++){const a=rand(0,Math.PI*2),v=rand(35,power);particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.22,.65),max:.65,color,size:rand(2,4)});}}
  function damagePlayer(amount){if(player.invuln>0)return;player.hp-=amount;player.invuln=.55;cameraShake=7;burst(player.x,player.y,'#ff587c',12,220);floaters.push({x:player.x,y:player.y-28,text:'-'+amount,color:'#ff7795',life:.7});}
  function nextLevel(){
    if(level>=MAX_LEVEL){running=false;overlay('FINAL PROTOCOL CLEARED!','You beat all eight levels — and kept changing your strategy faster than the boss could learn.','Play Campaign Again');return;}
    level++;bossShots=[];playerShots=[];player.hp=Math.min(player.maxHp,player.hp+24);spawnBoss();
    levelBanner=2.5;toast('LEVEL '+level+' UNLOCKED · '+levelNames[level-1]);updateHud();
  }
  function update(dt){
    elapsed+=dt;frame++;
    const ox=player.x,oy=player.y;
    let dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
    let dy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
    const mag=Math.hypot(dx,dy)||1;dx/=mag;dy/=mag;
    let speed=player.speed;
    if(keys.has('shift')&&player.dash<=0&&(dx||dy)){speed=720;player.dash=1.1;player.invuln=.24;burst(player.x,player.y,'#65e8ff',9,100);}
    player.x=clamp(player.x+dx*speed*dt,25,W-25);player.y=clamp(player.y+dy*speed*dt,45,H-25);
    const moved=Math.hypot(player.x-ox,player.y-oy);stats.moveSamples++;
    if(moved<.7)stats.still++;else{if(Math.abs(player.x-ox)>Math.abs(player.y-oy)){if(player.x<ox)stats.left++;else stats.right++;}else{if(player.y<oy)stats.up++;else stats.down++;}}
    if(moved>1){player.walk+=dt*13;player.face=Math.atan2(mouse.y-player.y,mouse.x-player.x);}
    player.shootCd=Math.max(0,player.shootCd-dt);player.dash=Math.max(0,player.dash-dt);player.invuln=Math.max(0,player.invuln-dt);
    if(keys.has(' ')||mouse.down)firePlayer();

    boss.phase+=dt;boss.walk+=dt*4;boss.hit=Math.max(0,boss.hit-dt);boss.attack=Math.max(0,boss.attack-dt);
    boss.x=W/2+Math.sin(boss.phase*(.62+level*.025))*(205+level*5);
    boss.y=105+Math.sin(boss.phase*1.25)*28;boss.face=Math.atan2(player.y-boss.y,player.x-boss.x);
    boss.shootCd-=dt;if(boss.shootCd<=0){bossFire();boss.shootCd=Math.max(.42,1.3-level*.085);}
    for(const s of playerShots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(dist(s,boss)<boss.r+s.r&&s.life>0){s.life=0;boss.hp-=10;boss.hit=.12;burst(s.x,s.y,'#67f3ff',4,95);}}
    for(const s of bossShots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(dist(s,player)<player.r+s.r&&s.life>0){s.life=0;damagePlayer(8+Math.floor(level/3));}}
    playerShots=playerShots.filter(s=>s.life>0&&s.x>-30&&s.x<W+30&&s.y>-30&&s.y<H+30);
    bossShots=bossShots.filter(s=>s.life>0&&s.x>-40&&s.x<W+40&&s.y>-40&&s.y<H+40);
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;p.vx*=.975;p.vy*=.975;}
    particles=particles.filter(p=>p.life>0);
    for(const f of floaters){f.y-=28*dt;f.life-=dt;}floaters=floaters.filter(f=>f.life>0);
    if(boss.hp<=0){burst(boss.x,boss.y,'#ff5c86',45,300);nextLevel();}
    if(player.hp<=0){running=false;overlay('THE BOSS OUTLEARNED YOU','Try switching dodge directions, keep moving, and time your shots. The boss tracks patterns during each campaign run.','Retry Campaign');}
    if(frame%7===0)updateHud();
    if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').classList.remove('show');}
    levelBanner=Math.max(0,levelBanner-dt);cameraShake=Math.max(0,cameraShake-dt*22);
  }

  // Draw a stylised human fighter with head, torso, arms, legs and a visible handgun.
  function drawFighter(unit,isBoss=false){
    const x=unit.x,y=unit.y,walk=Math.sin(unit.walk)*5,aim=unit.face||0;
    const skin=isBoss?'#e7b49a':'#dba98d', suit=isBoss?'#8e234b':'#176b83', trim=isBoss?'#ff668e':'#72f5ff';
    ctx.save();ctx.translate(x,y);ctx.rotate(aim+Math.PI/2);
    if(unit.invuln>0&&Math.floor(elapsed*20)%2===0&&!isBoss)ctx.globalAlpha=.45;
    // ground shadow
    ctx.fillStyle='#02050b99';ctx.beginPath();ctx.ellipse(0,12,19,9,0,0,Math.PI*2);ctx.fill();
    // legs, animated stride
    ctx.lineCap='round';ctx.lineWidth=isBoss?8:7;ctx.strokeStyle=isBoss?'#40172f':'#163449';
    ctx.beginPath();ctx.moveTo(-6,5);ctx.lineTo(-8+walk,18);ctx.lineTo(-10+walk,24);ctx.moveTo(6,5);ctx.lineTo(8-walk,18);ctx.lineTo(10-walk,24);ctx.stroke();
    // boots
    ctx.strokeStyle='#a9bfd4';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-10+walk,24);ctx.lineTo(-15+walk,24);ctx.moveTo(10-walk,24);ctx.lineTo(15-walk,24);ctx.stroke();
    // torso / jacket
    ctx.fillStyle=suit;ctx.beginPath();ctx.roundRect(-11,-10,22,23,6);ctx.fill();
    ctx.strokeStyle=trim;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(0,8);ctx.stroke();
    // belt
    ctx.fillStyle='#d9e5ef';ctx.fillRect(-10,8,20,3);
    // arms angled forward, hands and gun
    ctx.strokeStyle=skin;ctx.lineWidth=6;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(-8,-5);ctx.lineTo(-13,-1);ctx.lineTo(-8,-1);ctx.moveTo(8,-5);ctx.lineTo(13,-1);ctx.lineTo(8,-1);ctx.stroke();
    ctx.fillStyle=skin;ctx.beginPath();ctx.arc(-8,-1,3,0,Math.PI*2);ctx.arc(8,-1,3,0,Math.PI*2);ctx.fill();
    // neck and head
    ctx.fillStyle=skin;ctx.fillRect(-4,-15,8,7);ctx.beginPath();ctx.arc(0,-20,9,0,Math.PI*2);ctx.fill();
    // hair / helmet
    ctx.fillStyle=isBoss?'#1b1023':'#182637';ctx.beginPath();ctx.arc(0,-23,9,Math.PI,Math.PI*2);ctx.fill();
    ctx.fillRect(-9,-23,18,4);
    // eye visor
    ctx.fillStyle=trim;ctx.fillRect(-6,-21,12,2);
    // handgun aligned toward aim (local forward is down due rotation)
    ctx.save();ctx.translate(0,-1);ctx.fillStyle='#242d3d';ctx.fillRect(-3,-3,6,14);ctx.fillStyle=trim;ctx.fillRect(-2,-1,4,8);ctx.fillStyle='#111827';ctx.fillRect(-2,9,4,6);ctx.restore();
    // boss shoulder armor
    if(isBoss){ctx.fillStyle='#ff668e';ctx.beginPath();ctx.arc(-11,-7,5,0,Math.PI*2);ctx.arc(11,-7,5,0,Math.PI*2);ctx.fill();}
    ctx.restore();
    // boss/player halo
    ctx.save();ctx.globalAlpha=.22;ctx.strokeStyle=trim;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,25,31,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  function draw(){
    ctx.save();if(cameraShake>0)ctx.translate(rand(-cameraShake,cameraShake),rand(-cameraShake,cameraShake));
    const palettes=[['#080e1b','#152544'],['#101020','#302044'],['#071a20','#16434a'],['#17101d','#4a1d3b'],['#080c1a','#1c3151'],['#171322','#4a3151'],['#100b19','#5a193c'],['#080d18','#23415b']];
    const pal=palettes[level-1];ctx.clearRect(0,0,W,H);ctx.fillStyle=pal[0];ctx.fillRect(0,0,W,H);
    // atmospheric floor grid and glowing lanes
    const offset=(elapsed*18)%40;ctx.strokeStyle=pal[1];ctx.lineWidth=1;
    for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=-40+offset;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.strokeStyle='#8beaff18';ctx.setLineDash([5,12]);ctx.beginPath();ctx.arc(W/2,H/2,215,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    // animated background lights
    for(let i=0;i<14;i++){const px=(i*83+elapsed*12)%W,py=(i*137)%H;ctx.fillStyle='#9deeff25';ctx.fillRect(px,py,2,2);}
    drawFighter(boss,true);drawFighter(player,false);
    // projectiles glow
    for(const s of playerShots){ctx.save();ctx.shadowBlur=14;ctx.shadowColor='#63efff';ctx.fillStyle='#d5ffff';ctx.beginPath();ctx.ellipse(s.x,s.y,4,8,Math.atan2(s.vy,s.vx)+Math.PI/2,0,Math.PI*2);ctx.fill();ctx.restore();}
    for(const s of bossShots){ctx.save();ctx.shadowBlur=16;ctx.shadowColor='#ff4e82';ctx.fillStyle='#ff9ab2';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();ctx.restore();}
    for(const p of particles){ctx.globalAlpha=clamp(p.life/(p.max||.65),0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size||3,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    for(const f of floaters){ctx.globalAlpha=clamp(f.life/.7,0,1);ctx.fillStyle=f.color;ctx.font='bold 16px Inter';ctx.fillText(f.text,f.x,f.y);}ctx.globalAlpha=1;
    // reticle
    ctx.strokeStyle='#d7f8ff99';ctx.lineWidth=1;ctx.beginPath();ctx.arc(mouse.x,mouse.y,9,0,Math.PI*2);ctx.moveTo(mouse.x-14,mouse.y);ctx.lineTo(mouse.x+14,mouse.y);ctx.moveTo(mouse.x,mouse.y-14);ctx.lineTo(mouse.x,mouse.y+14);ctx.stroke();
    if(levelBanner>0){ctx.save();ctx.globalAlpha=Math.min(1,levelBanner*1.6);ctx.fillStyle='#050a15bb';ctx.fillRect(0,H/2-53,W,106);ctx.textAlign='center';ctx.fillStyle='#65efff';ctx.font='12px DM Mono';ctx.fillText('CAMPAIGN PROGRESSION',W/2,H/2-20);ctx.fillStyle='#ffffff';ctx.font='bold 38px Barlow Condensed';ctx.fillText('LEVEL '+level+' — '+levelNames[level-1],W/2,H/2+23);ctx.restore();}
    ctx.restore();
  }
  function loop(now){if(!running)return;const dt=Math.min((now-last)/1000,.032);last=now;if(!paused)update(dt);draw();requestAnimationFrame(loop);}
  window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys.add(k);if(k===' '&&running)firePlayer();});
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();mouse.x=(e.clientX-r.left)*W/r.width;mouse.y=(e.clientY-r.top)*H/r.height;});
  canvas.addEventListener('mousedown',()=>{mouse.down=true;firePlayer();});window.addEventListener('mouseup',()=>mouse.down=false);
  $('startBtn').addEventListener('click',start);$('restartBtn').addEventListener('click',start);
  $('pauseBtn').addEventListener('click',()=>{if(!running)return;paused=!paused;$('pauseBtn').textContent=paused?'Resume':'Pause';if(!paused){last=performance.now();requestAnimationFrame(loop);}else toast('PAUSED');});
  resetGame();draw();
})();