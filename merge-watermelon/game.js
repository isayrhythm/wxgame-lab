(() => {
  const FRUITS = [
    { name:'蓝莓', r:16, color:'#6d62c9', edge:'#4b3ca7', score:2 },
    { name:'樱桃', r:21, color:'#eb4f5f', edge:'#bf3044', score:4 },
    { name:'葡萄', r:27, color:'#9b5cc5', edge:'#6f3c9a', score:8 },
    { name:'橘子', r:34, color:'#f69a3a', edge:'#df6d23', score:16 },
    { name:'柠檬', r:41, color:'#f4cf45', edge:'#d7aa28', score:30 },
    { name:'猕猴桃', r:49, color:'#86b957', edge:'#5e8e39', score:55 },
    { name:'蜜桃', r:58, color:'#f58e88', edge:'#dd656d', score:90 },
    { name:'椰子', r:68, color:'#b97a4d', edge:'#855236', score:140 },
    { name:'哈密瓜', r:80, color:'#95ca63', edge:'#5d9f4c', score:220 },
    { name:'大西瓜', r:94, color:'#42a969', edge:'#267c4e', score:360 },
  ];

  const ui = {
    score:document.querySelector('#score'), best:document.querySelector('#best'), next:document.querySelector('#nextFruit'),
    overlay:document.querySelector('#overlay'), title:document.querySelector('#overlayTitle'), text:document.querySelector('#overlayText'),
    primary:document.querySelector('#primaryButton'), pause:document.querySelector('#pauseButton')
  };
  let scene;

  class MergeScene extends Phaser.Scene {
    constructor(){super('merge')}
    create(){
      scene=this; this.state={playing:false,paused:false,score:0,best:Number(localStorage.getItem('watermelonBest')||0),next:0,held:0,canDrop:true,overflowAt:0};
      ui.best.textContent=this.state.best; this.makeFruitTextures(); this.drawStage(); this.fruits=this.add.group();
      this.matter.world.on('collisionstart',this.onCollision,this);
      this.input.on('pointermove',p=>this.moveHeld(p.x)); this.input.on('pointerdown',p=>this.moveHeld(p.x)); this.input.on('pointerup',()=>this.dropHeld());
      this.scale.on('resize',()=>this.scene.restart()); this.prepareFruit();
    }
    drawStage(){
      const w=this.scale.width,h=this.scale.height; this.dangerY=Math.max(136,Math.min(166,h*.2));
      const g=this.add.graphics().setDepth(-1); g.fillStyle(0xfffcf2,.72);g.fillRoundedRect(13,this.dangerY-6,w-26,h-this.dangerY-10,14);g.lineStyle(2,0xffffff,.85);g.strokeRoundedRect(13,this.dangerY-6,w-26,h-this.dangerY-10,14);g.lineStyle(2,0xe97563,.55);g.lineBetween(20,this.dangerY,w-20,this.dangerY);
      this.matter.add.rectangle(5,h/2,20,h,{isStatic:true});this.matter.add.rectangle(w-5,h/2,20,h,{isStatic:true});this.matter.add.rectangle(w/2,h-7,w,18,{isStatic:true});
    }
    makeFruitTextures(){
      FRUITS.forEach((f,i)=>{
        const key=`fruit-${i}`;
        if(this.textures.exists(key))return;
        const size=f.r*2+16,c=this.textures.createCanvas(key,size,size),x=c.context,mid=size/2;
        x.clearRect(0,0,size,size);x.save();x.shadowColor='rgba(62,48,34,.22)';x.shadowBlur=7;x.shadowOffsetY=4;
        const grad=x.createRadialGradient(mid-f.r*.35,mid-f.r*.4,f.r*.1,mid,mid,f.r*1.05);grad.addColorStop(0,this.lighten(f.color,34));grad.addColorStop(.62,f.color);grad.addColorStop(1,f.edge);x.fillStyle=grad;x.beginPath();x.arc(mid,mid,f.r,0,Math.PI*2);x.fill();x.restore();
        x.save();x.beginPath();x.arc(mid,mid,f.r-2,0,Math.PI*2);x.clip();this.decorateFruit(x,i,mid,f.r);x.restore();
        x.fillStyle='rgba(255,255,255,.5)';x.beginPath();x.ellipse(mid-f.r*.34,mid-f.r*.38,f.r*.18,f.r*.1,-.65,0,Math.PI*2);x.fill();
        if(f.r>=27){x.fillStyle='#293b32';x.beginPath();x.arc(mid-f.r*.22,mid+f.r*.05,Math.max(2,f.r*.045),0,Math.PI*2);x.arc(mid+f.r*.22,mid+f.r*.05,Math.max(2,f.r*.045),0,Math.PI*2);x.fill();x.strokeStyle='#293b32';x.lineWidth=Math.max(1.5,f.r*.035);x.beginPath();x.arc(mid,mid+f.r*.12,f.r*.13,.2,Math.PI-.2);x.stroke()}
        if([1,3,4,6,8,9].includes(i)){x.strokeStyle='#5f7138';x.lineWidth=Math.max(2,f.r*.055);x.beginPath();x.moveTo(mid,mid-f.r*.88);x.quadraticCurveTo(mid+2,mid-f.r*1.12,mid+f.r*.12,mid-f.r*1.18);x.stroke();x.fillStyle='#65a64b';x.beginPath();x.ellipse(mid+f.r*.22,mid-f.r*1.02,f.r*.22,f.r*.1,-.45,0,Math.PI*2);x.fill()}
        c.refresh();
      });
    }
    decorateFruit(x,i,m,r){
      if(i===2){x.fillStyle='rgba(255,255,255,.16)';for(let a=0;a<6;a++)for(let b=0;b<4;b++){x.beginPath();x.arc(m-r*.55+a*r*.22,m-r*.42+b*r*.27,r*.09,0,Math.PI*2);x.fill()}}
      if(i===4){x.strokeStyle='rgba(255,255,255,.25)';x.lineWidth=2;for(let a=-2;a<=2;a++){x.beginPath();x.moveTo(m+a*r*.24,m-r);x.lineTo(m+a*r*.1,m+r);x.stroke()}}
      if(i===5){x.fillStyle='rgba(54,76,36,.28)';for(let a=0;a<28;a++){const q=a*2.4,rr=r*(.25+(a%4)*.16);x.beginPath();x.arc(m+Math.cos(q)*rr,m+Math.sin(q)*rr,1.5,0,7);x.fill()}}
      if(i===6){x.fillStyle='rgba(255,214,168,.35)';x.beginPath();x.arc(m+r*.2,m-r*.2,r*.72,-1.2,1.85);x.fill()}
      if(i===7){x.strokeStyle='rgba(72,41,26,.2)';x.lineWidth=3;for(let a=-3;a<=3;a++){x.beginPath();x.moveTo(m-r,m+a*r*.22);x.lineTo(m+r,m+a*r*.31);x.stroke()}}
      if(i===8){x.strokeStyle='rgba(255,245,190,.42)';x.lineWidth=2;for(let a=-4;a<=4;a++){x.beginPath();x.moveTo(m+a*r*.22,m-r);x.lineTo(m-a*r*.08,m+r);x.stroke();x.beginPath();x.moveTo(m-r,m+a*r*.22);x.lineTo(m+r,m-a*r*.08);x.stroke()}}
      if(i===9){x.strokeStyle='rgba(29,106,64,.65)';x.lineWidth=r*.08;for(let a=-2;a<=2;a++){x.beginPath();x.arc(m+a*r*.28,m,r*1.05,-1.2,1.2);x.stroke()}}
    }
    lighten(hex,n){const v=parseInt(hex.slice(1),16),r=Math.min(255,(v>>16)+n),g=Math.min(255,((v>>8)&255)+n),b=Math.min(255,(v&255)+n);return `rgb(${r},${g},${b})`}
    startGame(){this.state.playing=true;this.state.paused=false;this.state.score=0;this.state.overflowAt=0;ui.score.textContent='0';this.fruits.clear(true,true);this.prepareFruit()}
    randomStarter(){const n=Math.random();return n<.42?0:n<.72?1:n<.91?2:3}
    prepareFruit(){if(!this.state)return;this.state.held=this.state.next;this.state.next=this.randomStarter();this.drawNext();if(this.heldSprite)this.heldSprite.destroy();const r=FRUITS[this.state.held].r;this.heldX=Phaser.Math.Clamp(this.scale.width/2,r+17,this.scale.width-r-17);this.heldSprite=this.add.image(this.heldX,this.dangerY-46,`fruit-${this.state.held}`).setDepth(4).setAlpha(this.state.playing?1:.35);this.guide=this.guide||this.add.graphics().setDepth(3);this.drawGuide()}
    drawNext(){const c=ui.next,x=c.getContext('2d'),f=FRUITS[this.state.next];x.clearRect(0,0,56,56);const g=x.createRadialGradient(21,18,2,28,28,21);g.addColorStop(0,this.lighten(f.color,35));g.addColorStop(1,f.edge);x.fillStyle=g;x.beginPath();x.arc(28,28,Math.min(19,f.r*.48),0,7);x.fill();x.fillStyle='rgba(255,255,255,.55)';x.beginPath();x.arc(22,21,4,0,7);x.fill()}
    moveHeld(x){if(!this.state.playing||this.state.paused||!this.state.canDrop||!this.heldSprite)return;const r=FRUITS[this.state.held].r;this.heldX=Phaser.Math.Clamp(x,r+17,this.scale.width-r-17);this.heldSprite.x=this.heldX;this.drawGuide()}
    drawGuide(){if(!this.guide||!this.heldSprite)return;this.guide.clear();this.guide.lineStyle(2,0x547866,.16);this.guide.lineBetween(this.heldX,this.dangerY-20,this.heldX,this.scale.height-24)}
    dropHeld(){if(!this.state.playing||this.state.paused||!this.state.canDrop)return;this.state.canDrop=false;const level=this.state.held,x=this.heldX;this.heldSprite.destroy();this.heldSprite=null;this.guide.clear();this.addFruit(x,this.dangerY-42,level);this.time.delayedCall(430,()=>{if(!this.state.playing)return;this.state.canDrop=true;this.prepareFruit()})}
    addFruit(x,y,level){const f=FRUITS[level],obj=this.matter.add.image(x,y,`fruit-${level}`,null,{shape:{type:'circle',radius:f.r},restitution:.12,friction:.008,frictionAir:.008,density:.0018});obj.setDepth(2);obj.fruitLevel=level;obj.bornAt=this.time.now;obj.merging=false;obj.setBounce(.12);this.fruits.add(obj);return obj}
    onCollision(event){if(!this.state.playing)return;event.pairs.forEach(pair=>{const a=pair.bodyA.gameObject,b=pair.bodyB.gameObject;if(!a||!b||a.fruitLevel===undefined||a.fruitLevel!==b.fruitLevel||a.merging||b.merging||a.fruitLevel>=FRUITS.length-1)return;a.merging=b.merging=true;const level=a.fruitLevel+1,x=(a.x+b.x)/2,y=(a.y+b.y)/2,vx=(a.body.velocity.x+b.body.velocity.x)/2,vy=(a.body.velocity.y+b.body.velocity.y)/2;this.time.delayedCall(0,()=>{if(!a.active||!b.active)return;a.destroy();b.destroy();const merged=this.addFruit(x,y,level);merged.setVelocity(vx,vy-1.4);this.addScore(FRUITS[level].score,x,y,FRUITS[level].color)})})}
    addScore(value,x,y,color){this.state.score+=value;this.state.best=Math.max(this.state.best,this.state.score);ui.score.textContent=this.state.score;ui.best.textContent=this.state.best;localStorage.setItem('watermelonBest',this.state.best);const t=this.add.text(x,y-12,`+${value}`,{fontFamily:'system-ui',fontSize:'18px',fontStyle:'bold',color:'#2c5740',stroke:'#fffaf0',strokeThickness:4}).setOrigin(.5).setDepth(8);this.tweens.add({targets:t,y:y-58,alpha:0,duration:720,ease:'Cubic.Out',onComplete:()=>t.destroy()});for(let i=0;i<9;i++){const p=this.add.circle(x,y,Phaser.Math.Between(2,5),Phaser.Display.Color.HexStringToColor(color).color,.82).setDepth(7);const a=i/9*Math.PI*2;this.tweens.add({targets:p,x:x+Math.cos(a)*Phaser.Math.Between(24,48),y:y+Math.sin(a)*Phaser.Math.Between(24,48),alpha:0,scale:.2,duration:520,onComplete:()=>p.destroy()})}}
    update(){if(!this.state.playing||this.state.paused)return;const crowded=this.fruits.getChildren().some(f=>f.active&&this.time.now-f.bornAt>1500&&f.y-FRUITS[f.fruitLevel].r<this.dangerY+3&&Math.abs(f.body.velocity.y)<.65);if(crowded){if(!this.state.overflowAt)this.state.overflowAt=this.time.now;if(this.time.now-this.state.overflowAt>1800)this.gameOver()}else this.state.overflowAt=0}
    gameOver(){this.state.playing=false;this.matter.world.pause();ui.title.textContent='果篮装满啦';ui.text.textContent=`本局 ${this.state.score} 分 · 最高 ${this.state.best} 分`;ui.primary.textContent='再来一局';ui.overlay.classList.remove('hidden')}
    togglePause(){if(!this.state.playing)return;this.state.paused=!this.state.paused;if(this.state.paused){this.matter.world.pause();ui.title.textContent='暂停一下';ui.text.textContent='水果们会在这里等你。';ui.primary.textContent='继续游戏';ui.overlay.classList.remove('hidden')}else{this.matter.world.resume();ui.overlay.classList.add('hidden')}}
  }

  const game=new Phaser.Game({type:Phaser.CANVAS,parent:'game',transparent:true,physics:{default:'matter',matter:{gravity:{y:1.15},enableSleeping:true}},scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[MergeScene],render:{antialias:true,roundPixels:false}});
  ui.primary.addEventListener('click',()=>{if(!scene)return;if(scene.state.paused){scene.togglePause();return}ui.overlay.classList.add('hidden');ui.primary.textContent='开始游戏';scene.matter.world.resume();scene.startGame()});
  ui.pause.addEventListener('click',()=>scene&&scene.togglePause());
})();
