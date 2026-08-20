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

// Canvas HTML5 — dessin sur l'image, export via postMessage (pas de Modal, intégré dans le parent)
const EDITOR_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1.0,user-scalable=no">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#111;height:100vh;overflow:hidden}
body{display:flex;flex-direction:column}
#ca{flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#111}
canvas{display:block;touch-action:none}
#tb{display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 16px 16px;background:rgba(0,0,0,0.95);flex-wrap:wrap}
.cb{width:30px;height:30px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);cursor:pointer;flex-shrink:0}
.cb.a{border:3px solid #10B981;transform:scale(1.15)}
.sep{width:1px;height:24px;background:rgba(255,255,255,0.2);margin:0 4px;flex-shrink:0}
.bb{width:38px;height:38px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.bb.a{background:rgba(255,255,255,0.25);border-color:rgba(255,255,255,0.6)}
.bd{border-radius:50%;background:#fff}
</style>
</head>
<body>
<div id="ca"><canvas id="c"></canvas></div>
<div id="tb"></div>
<script>
var C=['#FFFFFF','#EF4444','#FBBF24','#10B981','#60A5FA','#000000'];
var B=[{s:5,d:8},{s:14,d:16}];
var col='#FFFFFF',bs=5,dr=false,lx=0,ly=0,hist=[];
var cv=document.getElementById('c'),cx=cv.getContext('2d');
var area=document.getElementById('ca'),tb=document.getElementById('tb');
C.forEach(function(c,i){
  var b=document.createElement('div');
  b.className='cb'+(i===0?' a':'');
  b.style.background=c;
  b.onclick=function(){col=c;document.querySelectorAll('.cb').forEach(function(x){x.classList.remove('a')});b.classList.add('a')};
  tb.appendChild(b);
});
var sp=document.createElement('div');sp.className='sep';tb.appendChild(sp);
B.forEach(function(b,i){
  var btn=document.createElement('div');
  btn.className='bb'+(i===0?' a':'');
  var dot=document.createElement('div');
  dot.className='bd';dot.style.width=dot.style.height=b.d+'px';
  btn.appendChild(dot);
  btn.onclick=function(){bs=b.s;document.querySelectorAll('.bb').forEach(function(x){x.classList.remove('a')});btn.classList.add('a')};
  tb.appendChild(btn);
});
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
cv.addEventListener('touchstart',function(e){
  e.preventDefault();
  hist.push(cx.getImageData(0,0,cv.width,cv.height));
  if(hist.length>30)hist.shift();
  dr=true;var p=gp(e);lx=p[0];ly=p[1];
  cx.beginPath();cx.arc(lx,ly,bs/2,0,Math.PI*2);cx.fillStyle=col;cx.fill();
},{passive:false});
cv.addEventListener('touchmove',function(e){
  e.preventDefault();
  if(!dr)return;
  var p=gp(e),x=p[0],y=p[1];
  cx.beginPath();cx.moveTo(lx,ly);cx.lineTo(x,y);
  cx.strokeStyle=col;cx.lineWidth=bs;cx.lineCap='round';cx.lineJoin='round';cx.stroke();
  lx=x;ly=y;
},{passive:false});
cv.addEventListener('touchend',function(e){e.preventDefault();dr=false;},{passive:false});
function undo(){if(hist.length>1){hist.pop();cx.putImageData(hist[hist.length-1],0,0);}}
function validate(){
  var ow=1080,oh=1920;
  var out=document.createElement('canvas');
  out.width=ow;out.height=oh;
  var octx=out.getContext('2d');
  octx.fillStyle='#000';
  octx.fillRect(0,0,ow,oh);
  var sc=Math.min(ow/cv.width,oh/cv.height);
  var dw=Math.round(cv.width*sc);
  var dh=Math.round(cv.height*sc);
  var dx=Math.round((ow-dw)/2);
  var dy=Math.round((oh-dh)/2);
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
        <Text style={{ flex: 1, color: '#fff', fontSize: 16, fontFamily: 'Quicksand-Bold' }}>
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
              <Text style={{ color: '#fff', fontFamily: 'Quicksand-Bold', fontSize: 14 }}>
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
