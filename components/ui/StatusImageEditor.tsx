import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

interface StatusImageEditorProps {
  imageBase64: string;
  onConfirm: (editedBase64: string) => void;
  onClose: () => void;
}

// Canvas HTML5 — dessin + recadrage, export via postMessage
const EDITOR_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1.0,user-scalable=no">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#111;height:100vh;overflow:hidden}
body{display:flex;flex-direction:column}
#ca{flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#111}
#cv-wrap{display:flex;align-items:center;justify-content:center;will-change:transform}
canvas{display:block;touch-action:none}
#tb{display:flex;flex-direction:column;align-items:center;background:rgba(0,0,0,0.95);padding-bottom:14px}
#tb-main{display:flex;align-items:center;justify-content:center;gap:16px;padding:10px 16px 10px}
#draw-opts{display:none;align-items:center;justify-content:center;gap:8px;padding:0 16px 4px;flex-wrap:wrap}
#draw-opts.show{display:flex}
#crop-ctrls{display:none;align-items:center;justify-content:space-between;width:100%;padding:10px 24px 4px;gap:12px}
#crop-ctrls.show{display:flex}
.cb{width:30px;height:30px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);cursor:pointer;flex-shrink:0}
.cb.a{border:3px solid #10B981;transform:scale(1.15)}
.sep{width:1px;height:24px;background:rgba(255,255,255,0.2);margin:0 4px;flex-shrink:0}
.mb{width:48px;height:48px;border-radius:14px;border:1.5px solid rgba(255,255,255,0.25);background:rgba(255,255,255,0.06);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;gap:3px}
.mb.a{background:rgba(16,185,129,0.3);border-color:#10B981}
.mb span{font-size:9px;color:rgba(255,255,255,0.6);font-family:sans-serif;letter-spacing:0.3px}
.mb.a span{color:#10B981}
.bb{width:34px;height:34px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.bb.a{background:rgba(255,255,255,0.2);border-color:#fff}
.bd{border-radius:50%;background:#fff}
.rotbtn{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.crbtn{flex:1;padding:11px 0;border-radius:22px;font-size:14px;font-weight:700;font-family:sans-serif;border:none;cursor:pointer;text-align:center}
#crp-ok{background:#10B981;color:#fff}
#crp-no{background:rgba(255,255,255,0.12);color:#fff;border:1px solid rgba(255,255,255,0.25)}
</style>
</head>
<body>
<div id="ca"><div id="cv-wrap"><canvas id="c"></canvas></div></div>
<div id="tb">
  <div id="tb-main"></div>
  <div id="draw-opts"></div>
  <div id="crop-ctrls">
    <div class="rotbtn" id="rot-ccw"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></div>
    <button class="crbtn" id="crp-no">Annuler</button>
    <button class="crbtn" id="crp-ok">Recadrer</button>
    <div class="rotbtn" id="rot-cw"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg></div>
  </div>
</div>
<script>
var C=['#FFFFFF','#EF4444','#FBBF24','#10B981','#60A5FA','#000000'];
var B=[{s:5,d:8},{s:14,d:16}];
var col='#FFFFFF',bs=5,dr=false,lx=0,ly=0,hist=[];
var drawMode=false,cropMode=false,rotating=false;
var crop={x:0,y:0,w:0,h:0},cropHdl=null,cropOrigin=null,cropTouchStart=null;
var MIN_CROP=40,HIT=22;
var cv=document.getElementById('c'),cx=cv.getContext('2d');
var area=document.getElementById('ca'),cvWrap=document.getElementById('cv-wrap');
var tbMain=document.getElementById('tb-main'),drawOpts=document.getElementById('draw-opts');
var cropCtrls=document.getElementById('crop-ctrls');

/* ── Bouton Peinture ── */
var paintBtn=document.createElement('div');
paintBtn.className='mb';
paintBtn.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-.985 0-1.5.5-1.5 1.5S11 19 11 20c0 1.105.895 2 2 2h-1Z"/><circle cx="6.5" cy="11.5" r="1.5" fill="white" stroke="none"/><circle cx="9.5" cy="7.5" r="1.5" fill="white" stroke="none"/><circle cx="14.5" cy="7.5" r="1.5" fill="white" stroke="none"/><circle cx="17.5" cy="11.5" r="1.5" fill="white" stroke="none"/></svg><span>Dessin</span>';
paintBtn.onclick=function(){drawMode?exitDraw():enterDraw();};
tbMain.appendChild(paintBtn);

/* ── Bouton Recadrage ── */
var cropBtn=document.createElement('div');
cropBtn.className='mb';
cropBtn.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 2 6 6 2 6"/><polyline points="18 22 18 18 22 18"/><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg><span>Recadrer</span>';
cropBtn.onclick=function(){cropMode?exitCrop():enterCrop();};
tbMain.appendChild(cropBtn);

/* ── Options dessin ── */
C.forEach(function(c,i){
  var b=document.createElement('div');b.className='cb'+(i===0?' a':'');
  b.style.background=c;
  b.onclick=function(){col=c;document.querySelectorAll('.cb').forEach(function(x){x.classList.remove('a')});b.classList.add('a')};
  drawOpts.appendChild(b);
});
var sp=document.createElement('div');sp.className='sep';drawOpts.appendChild(sp);
B.forEach(function(b,i){
  var btn=document.createElement('div');btn.className='bb'+(i===0?' a':'');
  var dot=document.createElement('div');dot.className='bd';dot.style.width=dot.style.height=b.d+'px';
  btn.appendChild(dot);
  btn.onclick=function(){bs=b.s;document.querySelectorAll('.bb').forEach(function(x){x.classList.remove('a')});btn.classList.add('a')};
  drawOpts.appendChild(btn);
});

function enterDraw(){
  if(cropMode)exitCrop();
  drawMode=true;paintBtn.classList.add('a');drawOpts.classList.add('show');
}
function exitDraw(){
  drawMode=false;dr=false;paintBtn.classList.remove('a');drawOpts.classList.remove('show');
}

/* ── Image ── */
var img=new Image();
img.onload=function(){
  var aw=area.clientWidth,ah=area.clientHeight;
  var sc=Math.min(aw/img.naturalWidth,ah/img.naturalHeight,1);
  cv.width=Math.round(img.naturalWidth*sc);
  cv.height=Math.round(img.naturalHeight*sc);
  cx.drawImage(img,0,0,cv.width,cv.height);
  hist=[cx.getImageData(0,0,cv.width,cv.height)];
};
img.src='DATA_URL_PLACEHOLDER';

function gp(e){
  var r=cv.getBoundingClientRect(),t=e.changedTouches?e.changedTouches[0]:e;
  return[(t.clientX-r.left)*cv.width/r.width,(t.clientY-r.top)*cv.height/r.height];
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

/* ── Recadrage ── */
function handles(){
  var c=crop;
  return{tl:[c.x,c.y],tr:[c.x+c.w,c.y],bl:[c.x,c.y+c.h],br:[c.x+c.w,c.y+c.h],
         tc:[c.x+c.w/2,c.y],bc:[c.x+c.w/2,c.y+c.h],
         lc:[c.x,c.y+c.h/2],rc:[c.x+c.w,c.y+c.h/2]};
}
function hitHdl(px,py){
  var h=handles(),scale=cv.width/cv.getBoundingClientRect().width;
  var hit=HIT*scale;
  for(var k in h){var dx=px-h[k][0],dy=py-h[k][1];if(dx*dx+dy*dy<hit*hit)return k;}
  if(px>crop.x&&px<crop.x+crop.w&&py>crop.y&&py<crop.y+crop.h)return'move';
  return null;
}
function applyHdl(hdl,dx,dy){
  var c={x:cropOrigin.x,y:cropOrigin.y,w:cropOrigin.w,h:cropOrigin.h};
  if(hdl==='move'){c.x=clamp(c.x+dx,0,cv.width-c.w);c.y=clamp(c.y+dy,0,cv.height-c.h);}
  else if(hdl==='tl'){var nx=clamp(c.x+dx,0,c.x+c.w-MIN_CROP),ny=clamp(c.y+dy,0,c.y+c.h-MIN_CROP);c.w+=c.x-nx;c.h+=c.y-ny;c.x=nx;c.y=ny;}
  else if(hdl==='tr'){c.w=clamp(c.w+dx,MIN_CROP,cv.width-c.x);var ny=clamp(c.y+dy,0,c.y+c.h-MIN_CROP);c.h+=c.y-ny;c.y=ny;}
  else if(hdl==='bl'){var nx=clamp(c.x+dx,0,c.x+c.w-MIN_CROP);c.w+=c.x-nx;c.x=nx;c.h=clamp(c.h+dy,MIN_CROP,cv.height-c.y);}
  else if(hdl==='br'){c.w=clamp(c.w+dx,MIN_CROP,cv.width-c.x);c.h=clamp(c.h+dy,MIN_CROP,cv.height-c.y);}
  else if(hdl==='tc'){var ny=clamp(c.y+dy,0,c.y+c.h-MIN_CROP);c.h+=c.y-ny;c.y=ny;}
  else if(hdl==='bc'){c.h=clamp(c.h+dy,MIN_CROP,cv.height-c.y);}
  else if(hdl==='lc'){var nx=clamp(c.x+dx,0,c.x+c.w-MIN_CROP);c.w+=c.x-nx;c.x=nx;}
  else if(hdl==='rc'){c.w=clamp(c.w+dx,MIN_CROP,cv.width-c.x);}
  crop=c;
}
function drawCropUI(){
  cx.putImageData(hist[hist.length-1],0,0);
  /* Overlay sombre hors crop */
  cx.save();
  cx.fillStyle='rgba(0,0,0,0.55)';
  cx.beginPath();cx.rect(0,0,cv.width,cv.height);cx.rect(crop.x,crop.y,crop.w,crop.h);
  cx.fill('evenodd');
  /* Bordure blanche */
  cx.strokeStyle='#FFFFFF';cx.lineWidth=2;
  cx.strokeRect(crop.x,crop.y,crop.w,crop.h);
  /* Grille en tiers */
  cx.strokeStyle='rgba(255,255,255,0.3)';cx.lineWidth=0.8;
  cx.beginPath();
  cx.moveTo(crop.x+crop.w/3,crop.y);cx.lineTo(crop.x+crop.w/3,crop.y+crop.h);
  cx.moveTo(crop.x+crop.w*2/3,crop.y);cx.lineTo(crop.x+crop.w*2/3,crop.y+crop.h);
  cx.moveTo(crop.x,crop.y+crop.h/3);cx.lineTo(crop.x+crop.w,crop.y+crop.h/3);
  cx.moveTo(crop.x,crop.y+crop.h*2/3);cx.lineTo(crop.x+crop.w,crop.y+crop.h*2/3);
  cx.stroke();
  /* Poignées coins */
  var h=handles();
  ['tl','tr','bl','br'].forEach(function(k){
    cx.fillStyle='#FFFFFF';cx.beginPath();cx.arc(h[k][0],h[k][1],8,0,Math.PI*2);cx.fill();
  });
  /* Poignées bords */
  ['tc','bc','lc','rc'].forEach(function(k){
    cx.fillStyle='rgba(255,255,255,0.85)';cx.beginPath();cx.arc(h[k][0],h[k][1],5,0,Math.PI*2);cx.fill();
  });
  cx.restore();
}
function enterCrop(){
  if(drawMode)exitDraw();
  cropMode=true;crop={x:0,y:0,w:cv.width,h:cv.height};
  cropBtn.classList.add('a');
  tbMain.style.display='none';
  cropCtrls.classList.add('show');
  drawCropUI();
}
function exitCrop(){
  cropMode=false;cropBtn.classList.remove('a');
  cropCtrls.classList.remove('show');
  tbMain.style.display='';
  cx.putImageData(hist[hist.length-1],0,0);
}
function applyCrop(){
  /* Copie l'état courant (avec dessins éventuels) dans un canvas temporaire */
  var tmp=document.createElement('canvas');tmp.width=cv.width;tmp.height=cv.height;
  tmp.getContext('2d').putImageData(hist[hist.length-1],0,0);
  var nw=Math.round(crop.w),nh=Math.round(crop.h);
  cv.width=nw;cv.height=nh;
  cx.drawImage(tmp,crop.x,crop.y,crop.w,crop.h,0,0,nw,nh);
  hist=[cx.getImageData(0,0,cv.width,cv.height)];
  exitCrop();
}
function rotateCanvas(dir){
  if(rotating)return;rotating=true;
  cvWrap.style.transition='transform 0.35s cubic-bezier(0.4,0,0.2,1)';
  cvWrap.style.transform='rotate('+(dir*90)+'deg)';
  cvWrap.addEventListener('transitionend',function handler(){
    cvWrap.removeEventListener('transitionend',handler);
    cvWrap.style.transition='none';
    cvWrap.style.transform='';
    /* Source propre : hist[last] au lieu de cv qui peut avoir le crop UI dessiné dessus */
    var cleanSrc=document.createElement('canvas');
    cleanSrc.width=cv.width;cleanSrc.height=cv.height;
    cleanSrc.getContext('2d').putImageData(hist[hist.length-1],0,0);
    var tw=cv.height,th=cv.width;
    var tmp=document.createElement('canvas');tmp.width=tw;tmp.height=th;
    var tctx=tmp.getContext('2d');
    tctx.translate(tw/2,th/2);tctx.rotate(dir*Math.PI/2);
    tctx.drawImage(cleanSrc,-cleanSrc.width/2,-cleanSrc.height/2);
    cv.width=tw;cv.height=th;cx.drawImage(tmp,0,0);
    hist=[cx.getImageData(0,0,cv.width,cv.height)];
    crop={x:0,y:0,w:cv.width,h:cv.height};
    rotating=false;
    requestAnimationFrame(function(){if(cropMode)drawCropUI();});
  });
}
document.getElementById('crp-ok').onclick=applyCrop;
document.getElementById('crp-no').onclick=exitCrop;
document.getElementById('rot-cw').onclick=function(){rotateCanvas(1);};
document.getElementById('rot-ccw').onclick=function(){rotateCanvas(-1);};

/* ── Touch ── */
cv.addEventListener('touchstart',function(e){
  e.preventDefault();
  var p=gp(e);
  if(cropMode){
    cropHdl=hitHdl(p[0],p[1]);
    cropTouchStart=[p[0],p[1]];
    cropOrigin={x:crop.x,y:crop.y,w:crop.w,h:crop.h};
    return;
  }
  if(!drawMode)return;
  hist.push(cx.getImageData(0,0,cv.width,cv.height));
  if(hist.length>30)hist.shift();
  dr=true;lx=p[0];ly=p[1];
  cx.beginPath();cx.arc(lx,ly,bs/2,0,Math.PI*2);cx.fillStyle=col;cx.fill();
},{passive:false});
cv.addEventListener('touchmove',function(e){
  e.preventDefault();
  var p=gp(e);
  if(cropMode){
    if(!cropHdl||!cropTouchStart)return;
    applyHdl(cropHdl,p[0]-cropTouchStart[0],p[1]-cropTouchStart[1]);
    drawCropUI();return;
  }
  if(!drawMode||!dr)return;
  cx.beginPath();cx.moveTo(lx,ly);cx.lineTo(p[0],p[1]);
  cx.strokeStyle=col;cx.lineWidth=bs;cx.lineCap='round';cx.lineJoin='round';cx.stroke();
  lx=p[0];ly=p[1];
},{passive:false});
cv.addEventListener('touchend',function(e){
  e.preventDefault();
  if(cropMode){cropHdl=null;cropTouchStart=null;return;}
  dr=false;
},{passive:false});

function undo(){if(cropMode){exitCrop();return;}if(hist.length>1){hist.pop();cx.putImageData(hist[hist.length-1],0,0);}}
function validate(){
  if(cropMode)return;
  var ow=1080,oh=1920;
  var out=document.createElement('canvas');out.width=ow;out.height=oh;
  var octx=out.getContext('2d');
  octx.fillStyle='#000';octx.fillRect(0,0,ow,oh);
  var sc=Math.min(ow/cv.width,oh/cv.height);
  var dw=Math.round(cv.width*sc),dh=Math.round(cv.height*sc);
  var dx=Math.round((ow-dw)/2),dy=Math.round((oh-dh)/2);
  octx.drawImage(cv,dx,dy,dw,dh);
  var b64=out.toDataURL('image/jpeg',0.85).split(',')[1];
  window.ReactNativeWebView.postMessage(JSON.stringify({type:'confirm',base64:b64}));
}
</script>
</body>
</html>`;

// Composant View pure (pas de Modal) — à intégrer dans le modal parent
export function StatusImageEditor({
  imageBase64,
  onConfirm,
  onClose,
}: StatusImageEditorProps) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);

  const htmlWithImage = EDITOR_HTML.replace(
    'DATA_URL_PLACEHOLDER',
    `data:image/jpeg;base64,${imageBase64}`
  );

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'confirm' && data.base64) {
        onConfirm(data.base64 as string);
      }
    } catch {}
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 10,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#000',
        }}
      >
        <TouchableOpacity onPress={onClose} style={{ padding: 6, marginRight: 8 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ flex: 1, color: '#fff', fontSize: 16, fontFamily: 'Poppins-Bold' }}>
          Modifier la photo
        </Text>
        <TouchableOpacity
          onPress={() => webViewRef.current?.injectJavaScript('undo(); true;')}
          style={{ padding: 8, marginRight: 6 }}
        >
          <Ionicons name="arrow-undo" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => webViewRef.current?.injectJavaScript('validate(); true;')}
          disabled={isLoading}
          style={{
            backgroundColor: isLoading ? 'rgba(16,185,129,0.5)' : '#10B981',
            borderRadius: 20,
            paddingHorizontal: 18,
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontFamily: 'Poppins-Bold', fontSize: 14 }}>
                Valider
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Canvas WebView */}
      <WebView
        ref={webViewRef}
        source={{ html: htmlWithImage }}
        onMessage={handleMessage}
        onLoad={() => setIsLoading(false)}
        style={{ flex: 1, backgroundColor: '#111' }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        originWhitelist={['*']}
        mixedContentMode="always"
        allowFileAccess
      />
    </View>
  );
}
