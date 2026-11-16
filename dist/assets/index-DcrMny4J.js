(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))i(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const a of s.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&i(a)}).observe(document,{childList:!0,subtree:!0});function t(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(r){if(r.ep)return;r.ep=!0;const s=t(r);fetch(r.href,s)}})();/**
* @vue/shared v3.5.45
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/function Qa(n){const e=Object.create(null);for(const t of n.split(","))e[t]=1;return t=>t in e}const lt={},zi=[],Fn=()=>{},Yu=()=>!1,_o=n=>n.charCodeAt(0)===111&&n.charCodeAt(1)===110&&(n.charCodeAt(2)>122||n.charCodeAt(2)<97),vo=n=>n.startsWith("onUpdate:"),Rt=Object.assign,el=(n,e)=>{const t=n.indexOf(e);t>-1&&n.splice(t,1)},qh=Object.prototype.hasOwnProperty,rt=(n,e)=>qh.call(n,e),Ie=Array.isArray,gi=n=>cs(n)==="[object Map]",ni=n=>cs(n)==="[object Set]",Il=n=>cs(n)==="[object Date]",qe=n=>typeof n=="function",gt=n=>typeof n=="string",Bn=n=>typeof n=="symbol",at=n=>n!==null&&typeof n=="object",ju=n=>(at(n)||qe(n))&&qe(n.then)&&qe(n.catch),$u=Object.prototype.toString,cs=n=>$u.call(n),Yh=n=>cs(n).slice(8,-1),Ku=n=>cs(n)==="[object Object]",tl=n=>gt(n)&&n!=="NaN"&&n[0]!=="-"&&""+parseInt(n,10)===n,kr=Qa(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"),xo=n=>{const e=Object.create(null);return t=>e[t]||(e[t]=n(t))},jh=/-\w/g,xn=xo(n=>n.replace(jh,e=>e.slice(1).toUpperCase())),$h=/\B([A-Z])/g,$i=xo(n=>n.replace($h,"-$1").toLowerCase()),Zu=xo(n=>n.charAt(0).toUpperCase()+n.slice(1)),Fo=xo(n=>n?`on${Zu(n)}`:""),Pn=(n,e)=>!Object.is(n,e),Ks=(n,...e)=>{for(let t=0;t<n.length;t++)n[t](...e)},Ju=(n,e,t,i=!1)=>{Object.defineProperty(n,e,{configurable:!0,enumerable:!1,writable:i,value:t})},us=n=>{const e=parseFloat(n);return isNaN(e)?n:e};let Nl;const Mo=()=>Nl||(Nl=typeof globalThis<"u"?globalThis:typeof self<"u"?self:typeof window<"u"?window:typeof global<"u"?global:{});function So(n){if(Ie(n)){const e={};for(let t=0;t<n.length;t++){const i=n[t],r=gt(i)?Qh(i):So(i);if(r)for(const s in r)e[s]=r[s]}return e}else if(gt(n)||at(n))return n}const Kh=/;(?![^(]*\))/g,Zh=/:([^]+)/,Jh=/"(?:[^"\\]|\\[^])*"|'(?:[^'\\]|\\[^])*'|\\[^]|\/\*[^]*?\*\//g;function Qh(n){const e={};return n.replace(Jh,t=>t.startsWith("/*")?"":t).split(Kh).forEach(t=>{if(t){const i=t.split(Zh);i.length>1&&(e[i[0].trim()]=i[1].trim())}}),e}function rn(n){let e="";if(gt(n))e=n;else if(Ie(n))for(let t=0;t<n.length;t++){const i=rn(n[t]);i&&(e+=i+" ")}else if(at(n))for(const t in n)n[t]&&(e+=t+" ");return e.trim()}const ed="itemscope,allowfullscreen,disablepictureinpicture,disableremoteplayback,formnovalidate,ismap,nomodule,novalidate,playsinline,readonly",td=Qa(ed);function Qu(n){return!!n||n===""}function nd(n,e,t){if(n.length!==e.length)return!1;let i=!0;for(let r=0;i&&r<n.length;r++)i=ii(n[r],e[r],t);return i}function Ol(n,e,t){if(n.size!==e.size)return!1;const i=Array.from(e),r=new Uint8Array(i.length);for(const s of n){let a=-1;for(let o=0;o<i.length;o++)if(!r[o]&&ii(s,i[o],t)){a=o;break}if(a<0)return!1;r[a]=1}return!0}function id(n,e,t){let i=gi(n),r=gi(e);if(i||r||(i=ni(n),r=ni(e),i||r))return i&&r?Ol(n,e,t):!1;const s=Object.keys(n).length,a=Object.keys(e).length;if(s!==a)return!1;for(const o in n){const l=n.hasOwnProperty(o),c=e.hasOwnProperty(o);if(l&&!c||!l&&c||!ii(n[o],e[o],t))return!1}return String(n)===String(e)}function Fl(n,e,t,i){t||(t=[new Map,new Map]);const[r,s]=t;if(r.has(n)||s.has(e))return r.get(n)===e&&s.get(e)===n;r.set(n,e),s.set(e,n);const a=i(n,e,t);return r.delete(n),s.delete(e),a}function ii(n,e,t){if(n===e)return!0;let i=Il(n),r=Il(e);return i||r?i&&r?n.getTime()===e.getTime():!1:(i=Bn(n),r=Bn(e),i||r?n===e:(i=Ie(n),r=Ie(e),i||r?i&&r?Fl(n,e,t,nd):!1:(i=at(n),r=at(e),i||r?!i||!r?!1:Fl(n,e,t,id):String(n)===String(e))))}function nl(n,e){return n.findIndex(t=>ii(t,e))}const ef=n=>!!(n&&n.__v_isRef===!0),_e=n=>gt(n)?n:n==null?"":Ie(n)||at(n)&&(n.toString===$u||!qe(n.toString))?ef(n)?_e(n.value):JSON.stringify(n,tf,2):String(n),tf=(n,e)=>ef(e)?tf(n,e.value):gi(e)?{[`Map(${e.size})`]:[...e.entries()].reduce((t,[i,r],s)=>(t[Bo(i,s)+" =>"]=r,t),{})}:ni(e)?{[`Set(${e.size})`]:[...e.values()].map(t=>Bo(t))}:Bn(e)?Bo(e):at(e)&&!Ie(e)&&!Ku(e)?String(e):e,Bo=(n,e="")=>{var t;return Bn(n)?`Symbol(${(t=n.description)!=null?t:e})`:n};/**
* @vue/reactivity v3.5.45
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/let Ct;class rd{constructor(e=!1){this.detached=e,this._active=!0,this._on=0,this.effects=[],this.cleanups=[],this._isPaused=!1,this._warnOnRun=!0,this.__v_skip=!0,!e&&Ct&&(Ct.active?(this.parent=Ct,this.index=(Ct.scopes||(Ct.scopes=[])).push(this)-1):(this._active=!1,this._warnOnRun=!1))}get active(){return this._active}pause(){if(this._active){this._isPaused=!0;let e,t;if(this.scopes){const i=this.scopes.slice();for(e=0,t=i.length;e<t;e++)i[e].pause()}for(e=0,t=this.effects.length;e<t;e++)this.effects[e].pause()}}resume(){if(this._active&&this._isPaused){this._isPaused=!1;let e,t;if(this.scopes){const r=this.scopes.slice();for(e=0,t=r.length;e<t;e++)r[e].resume()}const i=this.effects.slice();for(e=0,t=i.length;e<t;e++)i[e].resume()}}run(e){if(this._active){const t=Ct;try{return Ct=this,e()}finally{Ct=t}}}on(){++this._on===1&&(this.prevScope=Ct,Ct=this)}off(){if(this._on>0&&--this._on===0){if(Ct===this)Ct=this.prevScope;else{let e=Ct;for(;e;){if(e.prevScope===this){e.prevScope=this.prevScope;break}e=e.prevScope}}this.prevScope=void 0}}stop(e){if(this._active){this._active=!1;let t,i;for(t=0,i=this.effects.length;t<i;t++)this.effects[t].stop();for(this.effects.length=0,t=0,i=this.cleanups.length;t<i;t++)this.cleanups[t]();if(this.cleanups.length=0,this.scopes){const r=this.scopes.slice();for(t=0,i=r.length;t<i;t++)r[t].stop(!0);this.scopes.length=0}if(!this.detached&&this.parent&&!e){const r=this.parent.scopes.pop();r&&r!==this&&(this.parent.scopes[this.index]=r,r.index=this.index)}this.parent=void 0}}}function sd(){return Ct}let ct;const zo=new WeakSet;class nf{constructor(e){this.fn=e,this.deps=void 0,this.depsTail=void 0,this.flags=5,this.next=void 0,this.cleanup=void 0,this.scheduler=void 0,Ct&&(Ct.active?Ct.effects.push(this):this.flags&=-2)}pause(){this.flags|=64}resume(){this.flags&64&&(this.flags&=-65,zo.has(this)&&(zo.delete(this),this.trigger()))}notify(){this.flags&2&&!(this.flags&32)||this.flags&8||sf(this)}run(){if(!(this.flags&1))return this.fn();this.flags|=2,Bl(this),of(this);const e=ct,t=Mn;ct=this,Mn=!0;try{return this.fn()}finally{af(this),ct=e,Mn=t,this.flags&=-3}}stop(){if(this.flags&1){for(let e=this.deps;e;e=e.nextDep)sl(e);this.deps=this.depsTail=void 0,Bl(this),this.onStop&&this.onStop(),this.flags&=-2}}trigger(){this.flags&64?zo.add(this):this.scheduler?this.scheduler():this.runIfDirty()}runIfDirty(){Ca(this)&&this.run()}get dirty(){return Ca(this)}}let rf=0,Wr,Xr;function sf(n,e=!1){if(n.flags|=8,e){n.next=Xr,Xr=n;return}n.next=Wr,Wr=n}function il(){rf++}function rl(){if(--rf>0)return;if(Xr){let e=Xr;for(Xr=void 0;e;){const t=e.next;e.next=void 0,e.flags&=-9,e=t}}let n;for(;Wr;){let e=Wr;for(Wr=void 0;e;){const t=e.next;if(e.next=void 0,e.flags&=-9,e.flags&1)try{e.trigger()}catch(i){n||(n=i)}e=t}}if(n)throw n}function of(n){for(let e=n.deps;e;e=e.nextDep)e.version=-1,e.prevActiveLink=e.dep.activeLink,e.dep.activeLink=e}function af(n){let e,t=n.depsTail,i=t;for(;i;){const r=i.prevDep;i.version===-1?(i===t&&(t=r),sl(i),od(i)):e=i,i.dep.activeLink=i.prevActiveLink,i.prevActiveLink=void 0,i=r}n.deps=e,n.depsTail=t}function Ca(n){for(let e=n.deps;e;e=e.nextDep)if(e.dep.version!==e.version||e.dep.computed&&(lf(e.dep.computed)||e.dep.version!==e.version))return!0;return!!n._dirty}function lf(n){if(n.flags&4&&!(n.flags&16)||(n.flags&=-17,n.globalVersion===Jr)||(n.globalVersion=Jr,!n.isSSR&&n.flags&128&&(!n.deps&&!n._dirty||!Ca(n))))return;n.flags|=2;const e=n.dep,t=ct,i=Mn;ct=n,Mn=!0;try{of(n);const r=n.fn(n._value);(e.version===0||Pn(r,n._value))&&(n.flags|=128,n._value=r,e.version++)}catch(r){throw e.version++,r}finally{ct=t,Mn=i,af(n),n.flags&=-3}}function sl(n,e=!1){const{dep:t,prevSub:i,nextSub:r}=n;if(i&&(i.nextSub=r,n.prevSub=void 0),r&&(r.prevSub=i,n.nextSub=void 0),t.subs===n&&(t.subs=i,!i&&t.computed)){t.computed.flags&=-5;for(let s=t.computed.deps;s;s=s.nextDep)sl(s,!0)}!e&&!--t.sc&&t.map&&t.map.delete(t.key)}function od(n){const{prevDep:e,nextDep:t}=n;e&&(e.nextDep=t,n.prevDep=void 0),t&&(t.prevDep=e,n.nextDep=void 0)}let Mn=!0;const cf=[];function zn(){cf.push(Mn),Mn=!1}function Hn(){const n=cf.pop();Mn=n===void 0?!0:n}function Bl(n){const{cleanup:e}=n;if(n.cleanup=void 0,e){const t=ct;ct=void 0;try{e()}finally{ct=t}}}let Jr=0;class ad{constructor(e,t){this.sub=e,this.dep=t,this.version=t.version,this.nextDep=this.prevDep=this.nextSub=this.prevSub=this.prevActiveLink=void 0}}class ol{constructor(e){this.computed=e,this.version=0,this.activeLink=void 0,this.subs=void 0,this.map=void 0,this.key=void 0,this.sc=0,this.__v_skip=!0}track(e){if(!ct||!Mn||ct===this.computed)return;let t=this.activeLink;if(t===void 0||t.sub!==ct)t=this.activeLink=new ad(ct,this),ct.deps?(t.prevDep=ct.depsTail,ct.depsTail.nextDep=t,ct.depsTail=t):ct.deps=ct.depsTail=t,uf(t);else if(t.version===-1&&(t.version=this.version,t.nextDep)){const i=t.nextDep;i.prevDep=t.prevDep,t.prevDep&&(t.prevDep.nextDep=i),t.prevDep=ct.depsTail,t.nextDep=void 0,ct.depsTail.nextDep=t,ct.depsTail=t,ct.deps===t&&(ct.deps=i)}return t}trigger(e){this.version++,Jr++,this.notify(e)}notify(e){il();try{for(let t=this.subs;t;t=t.prevSub)t.sub.notify()&&t.sub.dep.notify()}finally{rl()}}}function uf(n){if(n.dep.sc++,n.sub.flags&4){const e=n.dep.computed;if(e&&!n.dep.subs){e.flags|=20;for(let i=e.deps;i;i=i.nextDep)uf(i)}const t=n.dep.subs;t!==n&&(n.prevSub=t,t&&(t.nextSub=n)),n.dep.subs=n}}const La=new WeakMap,Hi=Symbol(""),Pa=Symbol(""),Qr=Symbol("");function Ot(n,e,t){if(Mn&&ct){let i=La.get(n);i||La.set(n,i=new Map);let r=i.get(t);r||(i.set(t,r=new ol),r.map=i,r.key=t),r.track()}}function Qn(n,e,t,i,r,s){const a=La.get(n);if(!a){Jr++;return}const o=l=>{l&&l.trigger()};if(il(),e==="clear")a.forEach(o);else{const l=Ie(n),c=l&&tl(t);if(l&&t==="length"){const u=Number(i);a.forEach((f,d)=>{(d==="length"||d===Qr||!Bn(d)&&d>=u)&&o(f)})}else switch((t!==void 0||a.has(void 0))&&o(a.get(t)),c&&o(a.get(Qr)),e){case"add":l?c&&o(a.get("length")):(o(a.get(Hi)),gi(n)&&o(a.get(Pa)));break;case"delete":l||(o(a.get(Hi)),gi(n)&&o(a.get(Pa)));break;case"set":gi(n)&&o(a.get(Hi));break}}rl()}function Zi(n){const e=st(n);return e===n||(Ot(e,"iterate",Qr),cn(n))?e:Vn(n)?_i(n)?e.map(t=>yi(un(t))):e.map(yi):e.map(un)}function yo(n){return Ot(n=st(n),"iterate",Qr),n}function An(n,e){return Vn(n)?yi(_i(n)?un(e):e):un(e)}const ld={__proto__:null,[Symbol.iterator](){return Ho(this,Symbol.iterator,n=>An(this,n))},concat(...n){return Zi(this).concat(...n.map(e=>Ie(e)?Zi(e):e))},entries(){return Ho(this,"entries",n=>(n[1]=An(this,n[1]),n))},every(n,e){return Wn(this,"every",n,e,void 0,arguments)},filter(n,e){return Wn(this,"filter",n,e,t=>t.map(i=>An(this,i)),arguments)},find(n,e){return Wn(this,"find",n,e,t=>An(this,t),arguments)},findIndex(n,e){return Wn(this,"findIndex",n,e,void 0,arguments)},findLast(n,e){return Wn(this,"findLast",n,e,t=>An(this,t),arguments)},findLastIndex(n,e){return Wn(this,"findLastIndex",n,e,void 0,arguments)},forEach(n,e){return Wn(this,"forEach",n,e,void 0,arguments)},includes(...n){return Vo(this,"includes",n)},indexOf(...n){return Vo(this,"indexOf",n)},join(n){return Zi(this).join(n)},lastIndexOf(...n){return Vo(this,"lastIndexOf",n)},map(n,e){return Wn(this,"map",n,e,void 0,arguments)},pop(){return Ur(this,"pop")},push(...n){return Ur(this,"push",n)},reduce(n,...e){return Hl(this,"reduce",n,e)},reduceRight(n,...e){return Hl(this,"reduceRight",n,e)},shift(){return Ur(this,"shift")},some(n,e){return Wn(this,"some",n,e,void 0,arguments)},splice(...n){return Ur(this,"splice",n)},toReversed(){return Zi(this).toReversed()},toSorted(n){return Zi(this).toSorted(n)},toSpliced(...n){return Zi(this).toSpliced(...n)},unshift(...n){return Ur(this,"unshift",n)},values(){return Ho(this,"values",n=>An(this,n))}};function Ho(n,e,t){const i=yo(n),r=i[e],s=r.call(i);if(i!==n&&!cn(n)){if(s[Symbol.toStringTag]==="Array Iterator"){const a=Object.create(Object.getPrototypeOf(s));return a.next=()=>zl(s.next(),t),r!==ff[e]&&Object.defineProperties(a,{return:{get(){const o=s.return;return typeof o=="function"?o.bind(s):o}},throw:{get(){const o=s.throw;return typeof o=="function"?o.bind(s):o}}}),a}s._next=s.next,s.next=()=>zl(s._next(),t)}return s}function zl(n,e){return n.done||(n.value=e(n.value)),n}const ff=Array.prototype;function Wn(n,e,t,i,r,s){const a=yo(n),o=a!==n&&!cn(n),l=a[e];if(l!==ff[e]){const f=l.apply(n,s);return o?un(f):f}let c=t;a!==n&&(o?c=function(f,d){return t.call(this,An(n,f),d,n)}:t.length>2&&(c=function(f,d){return t.call(this,f,d,n)}));const u=l.call(a,c,i);return o&&r?r(u):u}function Hl(n,e,t,i){const r=yo(n),s=r!==n&&!cn(n);let a=t,o=!1;r!==n&&(s?(o=i.length===0,a=function(c,u,f){return o&&(o=!1,c=An(n,c)),t.call(this,c,An(n,u),f,n)}):t.length>3&&(a=function(c,u,f){return t.call(this,c,u,f,n)}));const l=r[e](a,...i);return o?An(n,l):l}function Vo(n,e,t){const i=st(n);Ot(i,"iterate",Qr);const r=i[e](...t);return(r===-1||r===!1)&&cl(t[0])?(t[0]=st(t[0]),i[e](...t)):r}function Ur(n,e,t=[]){zn(),il();const i=st(n)[e].apply(n,t);return rl(),Hn(),i}const cd=Qa("__proto__,__v_isRef,__isVue"),hf=new Set(Object.getOwnPropertyNames(Symbol).filter(n=>n!=="arguments"&&n!=="caller").map(n=>Symbol[n]).filter(Bn));function ud(n){Bn(n)||(n=String(n));const e=st(this);return Ot(e,"has",n),e.hasOwnProperty(n)}class df{constructor(e=!1,t=!1){this._isReadonly=e,this._isShallow=t}get(e,t,i){if(t==="__v_skip")return e.__v_skip;const r=this._isReadonly,s=this._isShallow;if(t==="__v_isReactive")return!r;if(t==="__v_isReadonly")return r;if(t==="__v_isShallow")return s;if(t==="__v_raw")return i===(r?s?Md:_f:s?gf:mf).get(e)||Object.getPrototypeOf(e)===Object.getPrototypeOf(i)?e:void 0;const a=Ie(e);if(!r){let l;if(a&&(l=ld[t]))return l;if(t==="hasOwnProperty")return ud}const o=Reflect.get(e,t,Ft(e)?e:i);if((Bn(t)?hf.has(t):cd(t))||(r||Ot(e,"get",t),s))return o;if(Ft(o)){const l=a&&tl(t)?o:o.value;return r&&at(l)?Ua(l):l}return at(o)?r?Ua(o):yr(o):o}}class pf extends df{constructor(e=!1){super(!1,e)}set(e,t,i,r){let s=e[t];const a=Ie(e)&&tl(t);if(!this._isShallow){const c=Vn(s);if(!cn(i)&&!Vn(i)&&(s=st(s),i=st(i)),!a&&Ft(s)&&!Ft(i))return c||(s.value=i),!0}const o=a?Number(t)<e.length:rt(e,t),l=Reflect.set(e,t,i,Ft(e)?e:r);return e===st(r)&&l&&(o?Pn(i,s)&&Qn(e,"set",t,i):Qn(e,"add",t,i)),l}deleteProperty(e,t){const i=rt(e,t);e[t];const r=Reflect.deleteProperty(e,t);return r&&i&&Qn(e,"delete",t,void 0),r}has(e,t){const i=Reflect.has(e,t);return(!Bn(t)||!hf.has(t))&&Ot(e,"has",t),i}ownKeys(e){return Ot(e,"iterate",Ie(e)?"length":Hi),Reflect.ownKeys(e)}}class fd extends df{constructor(e=!1){super(!0,e)}set(e,t){return!0}deleteProperty(e,t){return!0}}const hd=new pf,dd=new fd,pd=new pf(!0);const Da=n=>n,vs=n=>Reflect.getPrototypeOf(n);function md(n,e,t){return function(...i){const r=this.__v_raw,s=st(r),a=gi(s),o=n==="entries"||n===Symbol.iterator&&a,l=n==="keys"&&a,c=r[n](...i),u=t?Da:e?yi:un;return!e&&Ot(s,"iterate",l?Pa:Hi),Rt(Object.create(c),{next(){const{value:f,done:d}=c.next();return d?{value:f,done:d}:{value:o?[u(f[0]),u(f[1])]:u(f),done:d}}})}}function xs(n){return function(...e){return n==="delete"?!1:n==="clear"?void 0:this}}function gd(n,e){const t={get(r){const s=this.__v_raw,a=st(s),o=st(r);n||(Pn(r,o)&&Ot(a,"get",r),Ot(a,"get",o));const{has:l}=vs(a),c=e?Da:n?yi:un;if(l.call(a,r))return c(s.get(r));if(l.call(a,o))return c(s.get(o));s!==a&&s.get(r)},get size(){const r=this.__v_raw;return!n&&Ot(st(r),"iterate",Hi),r.size},has(r){const s=this.__v_raw,a=st(s),o=st(r);return n||(Pn(r,o)&&Ot(a,"has",r),Ot(a,"has",o)),r===o?s.has(r):s.has(r)||s.has(o)},forEach(r,s){const a=this,o=a.__v_raw,l=st(o),c=e?Da:n?yi:un;return!n&&Ot(l,"iterate",Hi),o.forEach((u,f)=>r.call(s,c(u),c(f),a))}};return Rt(t,n?{add:xs("add"),set:xs("set"),delete:xs("delete"),clear:xs("clear")}:{add(r){const s=st(this),a=vs(s),o=st(r),l=!e&&!cn(r)&&!Vn(r)?o:r;return a.has.call(s,l)||Pn(r,l)&&a.has.call(s,r)||Pn(o,l)&&a.has.call(s,o)||(s.add(l),Qn(s,"add",l,l)),this},set(r,s){!e&&!cn(s)&&!Vn(s)&&(s=st(s));const a=st(this),{has:o,get:l}=vs(a);let c=o.call(a,r);c||(r=st(r),c=o.call(a,r));const u=l.call(a,r);return a.set(r,s),c?Pn(s,u)&&Qn(a,"set",r,s):Qn(a,"add",r,s),this},delete(r){const s=st(this),{has:a,get:o}=vs(s);let l=a.call(s,r);l||(r=st(r),l=a.call(s,r)),o&&o.call(s,r);const c=s.delete(r);return l&&Qn(s,"delete",r,void 0),c},clear(){const r=st(this),s=r.size!==0,a=r.clear();return s&&Qn(r,"clear",void 0,void 0),a}}),["keys","values","entries",Symbol.iterator].forEach(r=>{t[r]=md(r,n,e)}),t}function al(n,e){const t=gd(n,e);return(i,r,s)=>r==="__v_isReactive"?!n:r==="__v_isReadonly"?n:r==="__v_isShallow"?e:r==="__v_raw"?i:Reflect.get(rt(t,r)&&r in i?t:i,r,s)}const _d={get:al(!1,!1)},vd={get:al(!1,!0)},xd={get:al(!0,!1)};const mf=new WeakMap,gf=new WeakMap,_f=new WeakMap,Md=new WeakMap;function Sd(n){switch(n){case"Object":case"Array":return 1;case"Map":case"Set":case"WeakMap":case"WeakSet":return 2;default:return 0}}function yr(n){return Vn(n)?n:ll(n,!1,hd,_d,mf)}function yd(n){return ll(n,!1,pd,vd,gf)}function Ua(n){return ll(n,!0,dd,xd,_f)}function ll(n,e,t,i,r){if(!at(n)||n.__v_raw&&!(e&&n.__v_isReactive)||n.__v_skip||!Object.isExtensible(n))return n;const s=r.get(n);if(s)return s;const a=Sd(Yh(n));if(a===0)return n;const o=new Proxy(n,a===2?i:t);return r.set(n,o),o}function _i(n){return Vn(n)?_i(n.__v_raw):!!(n&&n.__v_isReactive)}function Vn(n){return!!(n&&n.__v_isReadonly)}function cn(n){return!!(n&&n.__v_isShallow)}function cl(n){return n?!!n.__v_raw:!1}function st(n){const e=n&&n.__v_raw;return e?st(e):n}function ul(n){return!rt(n,"__v_skip")&&Object.isExtensible(n)&&Ju(n,"__v_skip",!0),n}const un=n=>at(n)?yr(n):n,yi=n=>at(n)?Ua(n):n;function Ft(n){return n?n.__v_isRef===!0:!1}function Dn(n){return Ed(n,!1)}function Ed(n,e){return Ft(n)?n:new bd(n,e)}class bd{constructor(e,t){this.dep=new ol,this.__v_isRef=!0,this.__v_isShallow=!1,this._rawValue=t?e:st(e),this._value=t?e:un(e),this.__v_isShallow=t}get value(){return this.dep.track(),this._value}set value(e){const t=this._rawValue,i=this.__v_isShallow||cn(e)||Vn(e);e=i?e:st(e),Pn(e,t)&&(this._rawValue=e,this._value=i?e:un(e),this.dep.trigger())}}function Se(n){return Ft(n)?n.value:n}const Td={get:(n,e,t)=>e==="__v_raw"?n:Se(Reflect.get(n,e,t)),set:(n,e,t,i)=>{const r=n[e];return Ft(r)&&!Ft(t)?(r.value=t,!0):Reflect.set(n,e,t,i)}};function vf(n){return _i(n)?n:new Proxy(n,Td)}class Ad{constructor(e,t,i){this.fn=e,this.setter=t,this._value=void 0,this.dep=new ol(this),this.__v_isRef=!0,this.deps=void 0,this.depsTail=void 0,this.flags=16,this.globalVersion=Jr-1,this.next=void 0,this.effect=this,this.__v_isReadonly=!t,this.isSSR=i}notify(){if(this.flags|=16,!(this.flags&8)&&ct!==this)return sf(this,!0),!0}get value(){const e=this.dep.track();return lf(this),e&&(e.version=this.dep.version),this._value}set value(e){this.setter&&this.setter(e)}}function wd(n,e,t=!1){let i,r;return qe(n)?i=n:(i=n.get,r=n.set),new Ad(i,r,t)}const Ms={},to=new WeakMap;let Ni;function Rd(n,e=!1,t=Ni){if(t){let i=to.get(t);i||to.set(t,i=[]),i.push(n)}}function Cd(n,e,t=lt){const{immediate:i,deep:r,once:s,scheduler:a,augmentJob:o,call:l}=t,c=E=>r?E:cn(E)||r===!1||r===0?ei(E,1):ei(E);let u,f,d,m,g=!1,_=!1;if(Ft(n)?(f=()=>n.value,g=cn(n)):_i(n)?(f=()=>c(n),g=!0):Ie(n)?(_=!0,g=n.some(E=>_i(E)||cn(E)),f=()=>n.map(E=>{if(Ft(E))return E.value;if(_i(E))return c(E);if(qe(E))return l?l(E,2):E()})):qe(n)?e?f=l?()=>l(n,2):n:f=()=>{if(d){zn();try{d()}finally{Hn()}}const E=Ni;Ni=u;try{return l?l(n,3,[m]):n(m)}finally{Ni=E}}:f=Fn,e&&r){const E=f,D=r===!0?1/0:r;f=()=>ei(E(),D)}const p=sd(),h=()=>{u.stop(),p&&p.active&&el(p.effects,u)};if(s&&e){const E=e;e=(...D)=>{try{return E(...D)}finally{h()}}}let S=_?new Array(n.length).fill(Ms):Ms;const M=E=>{if(!(!(u.flags&1)||!u.dirty&&!E))if(e){const D=u.run();if(E||r||g||(_?D.some((L,T)=>Pn(L,S[T])):Pn(D,S))){const L=Ni;zn();try{d&&d(),Ni=u;const T=[D,S===Ms?void 0:_&&S[0]===Ms?[]:S,m];S=D,l?l(e,3,T):e(...T)}finally{Ni=L,Hn()}}}else u.run()};return o&&o(M),u=new nf(f),u.scheduler=a?()=>a(M,!1):M,m=E=>Rd(E,!1,u),d=u.onStop=()=>{const E=to.get(u);if(E){if(l)l(E,4);else for(const D of E)D();to.delete(u)}},e?i?M(!0):S=u.run():a?a(M.bind(null,!0),!0):u.run(),h.pause=u.pause.bind(u),h.resume=u.resume.bind(u),h.stop=h,h}function ei(n,e=1/0,t){if(e<=0||!at(n)||n.__v_skip||(t=t||new Map,(t.get(n)||0)>=e))return n;if(t.set(n,e),e--,Ft(n))ei(n.value,e,t);else if(Ie(n))for(let i=0;i<n.length;i++)ei(n[i],e,t);else if(ni(n)||gi(n))n.forEach(i=>{ei(i,e,t)});else if(Ku(n)){for(const i in n)ei(n[i],e,t);for(const i of Object.getOwnPropertySymbols(n))Object.prototype.propertyIsEnumerable.call(n,i)&&ei(n[i],e,t)}return n}/**
* @vue/runtime-core v3.5.45
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/function fs(n,e,t,i){try{return i?n(...i):n()}catch(r){Eo(r,e,t)}}function yn(n,e,t,i){if(qe(n)){const r=fs(n,e,t,i);return r&&ju(r)&&r.catch(s=>{Eo(s,e,t,void 0,!0)}),r}if(Ie(n)){const r=[];for(let s=0;s<n.length;s++)r.push(yn(n[s],e,t,i));return r}}function Eo(n,e,t,i=!0,r=!1){const s=e?e.vnode:null,{errorHandler:a,throwUnhandledErrorInProduction:o}=e&&e.appContext.config||lt;if(e){let l=e.parent;const c=e.proxy,u=`https://vuejs.org/error-reference/#runtime-${t}`;for(;l;){const f=l.ec;if(f&&!l.isUnmounted&&(!r||l.scope.active)){for(let d=0;d<f.length;d++)if(f[d](n,c,u)===!1)return}l=l.parent}if(a){zn(),fs(a,null,10,[n,c,u]),Hn();return}}Ld(n,t,s,i,o)}function Ld(n,e,t,i=!0,r=!1){if(r)throw n;console.error(n)}const kt=[];let mn=-1;const wn=[];let fi=null,gr=0;const xf=Promise.resolve();let no=null;function Mf(n){const e=no||xf;return n?e.then(this?n.bind(this):n):e}function Pd(n){let e=mn+1,t=kt.length;for(;e<t;){const i=e+t>>>1,r=kt[i],s=es(r);s<n||s===n&&r.flags&2?e=i+1:t=i}return e}function fl(n){if(!(n.flags&1)){const e=es(n),t=kt[kt.length-1];!t||!(n.flags&2)&&e>=es(t)?kt.push(n):kt.splice(Pd(e),0,n),n.flags|=1,Sf()}}function Sf(){no||(no=xf.then(bf))}function Dd(n){if(!Ie(n))fi&&n.id===-1?fi.splice(gr+1,0,n):n.flags&1||(wn.push(n),n.flags|=1);else for(let e=0;e<n.length;e++)wn.push(n[e]);Sf()}function yf(n,e,t,i=mn+1){for(;i<kt.length;i++){const r=kt[i];if(r&&r.flags&2){if(n&&r.id!==n.uid||e!==void 0&&!(r.id>=e))continue;kt.splice(i,1),i=n?i-1:mn,r.flags&4&&(r.flags&=-2),r(),r.flags&4||(r.flags&=-2)}}}function Ef(n,e,t=0){if(wn.length){let i=wn,r=0;if(e){i=[];for(let a=0;a<wn.length;a++){const o=wn[a];(o.i!==void 0?!o.i||o.i.uid<t:e.has(o))?wn[r++]=o:i.push(o)}}const s=[...new Set(i)].sort((a,o)=>es(a)-es(o));if(wn.length=r,fi){for(let a=0;a<s.length;a++)fi.push(s[a]);return}for(fi=s,gr=0;gr<fi.length;gr++){const a=fi[gr];a.flags&4&&(a.flags&=-2),a.flags&8||a(),a.flags&=-2}fi=null,gr=0}}let Go=!1;function Ud(n,e){if(Go){n();return}const t=e===void 0?void 0:new Set(wn);n(),Go=!0;try{yf(void 0,e),Ef(void 0,t,e)}finally{Go=!1}}const es=n=>n.id==null?n.flags&2?-1:1/0:n.id;function bf(n){try{for(mn=0;mn<kt.length;mn++){const e=kt[mn];e&&!(e.flags&8)&&(e.flags&4&&(e.flags&=-2),fs(e,e.i,e.i?15:14),e.flags&4||(e.flags&=-2))}}finally{for(;mn<kt.length;mn++){const e=kt[mn];e&&(e.flags&=-2)}mn=-1,kt.length=0,Ef(),no=null,(kt.length||wn.length)&&bf()}}let ln=null,Tf=null;function io(n){const e=ln;return ln=n,Tf=n&&n.type.__scopeId||null,e}function Id(n,e=ln,t){if(!e||n._n)return n;const i=(...r)=>{i._d&&Zl(-1);const s=io(e),a=Vi.length;let o;try{o=n(...r)}finally{for(let l=Vi.length;l>a;l--)jf();io(s),i._d&&Zl(1)}return o};return i._n=!0,i._c=!0,i._d=!0,i}function ut(n,e){if(ln===null)return n;const t=wo(ln),i=n.dirs||(n.dirs=[]);for(let r=0;r<e.length;r++){let[s,a,o,l=lt]=e[r];s&&(qe(s)&&(s={mounted:s,updated:s}),s.deep&&ei(a),i.push({dir:s,instance:t,value:a,oldValue:void 0,arg:o,modifiers:l}))}return n}function Ci(n,e,t,i){let r=n;if(i==="beforeMount")n._mount=n;else if(i==="beforeUpdate"){const o=e&&e._mount;o&&(o._latest=n,n._mount=o)}else if(i==="mounted"){const o=n._latest;n._mount=n._latest=void 0,o&&(r=o,o._mount=void 0)}const s=r.dirs,a=e&&e.dirs;for(let o=0;o<s.length;o++){let l=s[o];a?l.oldValue=a[o].value:i==="mounted"&&l.oldValue!==void 0&&(l=Rt({},l,{oldValue:void 0}));let c=l.dir[i];c&&(zn(),yn(c,t,8,[n.el,l,r,e]),Hn())}}function Nd(n,e){if(Xt){let t=Xt.provides;const i=Xt.parent&&Xt.parent.provides;i===t&&(t=Xt.provides=Object.create(i)),t[n]=e}}function Zs(n,e,t=!1){const i=Up();if(i||xr){let r=xr?xr._context.provides:i?i.parent==null||i.ce?i.vnode.appContext&&i.vnode.appContext.provides:i.parent.provides:void 0;if(r&&n in r)return r[n];if(arguments.length>1)return t&&qe(e)?e.call(i&&i.proxy):e}}const Od=Symbol.for("v-scx"),Fd=()=>Zs(Od);function vi(n,e,t){return Af(n,e,t)}function Af(n,e,t=lt){const{immediate:i,deep:r,flush:s,once:a}=t,o=Rt({},t),l=e&&i||!e&&s!=="post";let c;if(rs){if(s==="sync"){const m=Fd();c=m.__watcherHandles||(m.__watcherHandles=[])}else if(!l){const m=()=>{};return m.stop=Fn,m.resume=Fn,m.pause=Fn,m}}const u=Xt;o.call=(m,g,_)=>yn(m,u,g,_);let f=!1;s==="post"?o.scheduler=m=>{m.i=u,zt(m,u&&u.suspense)}:s!=="sync"&&(f=!0,o.scheduler=(m,g)=>{g?m():fl(m)}),o.augmentJob=m=>{e&&(m.flags|=4),f&&(m.flags|=2,u&&(m.id=u.uid,m.i=u))};const d=Cd(n,e,o);return rs&&(c?c.push(d):l&&d()),d}function Bd(n,e,t){const i=this.proxy,r=gt(n)?n.includes(".")?wf(i,n):()=>i[n]:n.bind(i,i);let s;qe(e)?s=e:(s=e.handler,t=e);const a=hs(this),o=Af(r,s.bind(i),t);return a(),o}function wf(n,e){const t=e.split(".");return()=>{let i=n;for(let r=0;r<t.length&&i;r++)i=i[t[r]];return i}}const zd=Symbol("_vte"),bo=n=>n.__isTeleport,ko=Symbol("_leaveCb");function Hd(n){let e=n[0];if(n.length>1){for(const t of n)if(t.type!==En){e=t;break}}return e}function Rf(n){if(!hl(n))return bo(n.type)&&n.children?Hd(n.children):n;if(n.component)return n.component.subTree;const{shapeFlag:e,children:t}=n;if(t){if(e&16)return t[0];if(e&32&&qe(t.default))return t.default()}}function qr(n,e){if(n.shapeFlag&6&&n.component){n.transition=e;const t=n.component.subTree;qr(bo(t.type)&&Rf(t)||t,e)}else if(n.shapeFlag&128){const t=n.suspense;if(t){const i=t.isHydrating?t.pendingBranch:t.activeBranch;i&&qr(i,e.clone(i))}else n.ssContent.transition=e.clone(n.ssContent),n.ssFallback.transition=e.clone(n.ssFallback)}else if(n.transition=e,n.type===ht&&Ie(n.children)){const t=Nf(n.children,!1);t&&qr(t,e)}}function Ia(n){if(n.component)return Ia(n.component.subTree);if(n.type===ht){const e=Ie(n.children)&&Nf(n.children,!1);return e?Ia(e):void 0}if(n.type!==En)return n}function Cf(n){n.ids=[n.ids[0]+n.ids[2]+++"-",0,0]}function Vl(n,e){let t;return!!((t=Object.getOwnPropertyDescriptor(n,e))&&!t.configurable)}const ro=new WeakMap;function Yr(n,e,t,i,r=!1){if(Ie(n)){n.forEach((_,p)=>Yr(_,e&&(Ie(e)?e[p]:e),t,i,r));return}if(jr(i)&&!r){i.shapeFlag&512&&i.type.__asyncResolved&&i.component.subTree.component&&Yr(n,e,t,i.component.subTree);return}const s=i.shapeFlag&4?wo(i.component):i.el,a=r?null:s,{i:o,r:l}=n,c=e&&e.r,u=o.refs===lt?o.refs={}:o.refs,f=o.setupState,d=st(f),m=f===lt?Yu:_=>Vl(u,_)?!1:rt(d,_),g=(_,p)=>!(p&&Vl(u,p));if(c!=null&&c!==l){if(Gl(e),gt(c))u[c]=null,m(c)&&(f[c]=null);else if(Ft(c)){const _=e;g(c,_.k)&&(c.value=null),_.k&&(u[_.k]=null)}}if(qe(l))fs(l,o,12,[a,u]);else{const _=gt(l),p=Ft(l);if(_||p){const h=()=>{if(n.f){const S=_?m(l)?f[l]:u[l]:g()||!n.k?l.value:u[n.k];if(r)Ie(S)&&el(S,s);else if(Ie(S))S.includes(s)||S.push(s);else if(_)u[l]=[s],m(l)&&(f[l]=u[l]);else{const M=[s];g(l,n.k)&&(l.value=M),n.k&&(u[n.k]=M)}}else _?(u[l]=a,m(l)&&(f[l]=a)):p&&(g(l,n.k)&&(l.value=a),n.k&&(u[n.k]=a))};if(a){const S=()=>{h(),ro.delete(n)};S.id=-1,ro.set(n,S),zt(S,t)}else Gl(n),h()}}}function Gl(n){const e=ro.get(n);e&&(e.flags|=8,ro.delete(n))}Mo().requestIdleCallback;Mo().cancelIdleCallback;const jr=n=>!!n.type.__asyncLoader,hl=n=>n.type.__isKeepAlive;function Vd(n,e){Lf(n,"a",e)}function Gd(n,e){Lf(n,"da",e)}function Lf(n,e,t=Xt){const i=n.__wdc||(n.__wdc=()=>{let r=t;for(;r;){if(r.isDeactivated)return;r=r.parent}return n()});if(ts(e,i,t),t){let r=t.parent;for(;r&&r.parent;)hl(r.parent.vnode)&&kd(i,e,t,r),r=r.parent}}function kd(n,e,t,i){const r=ts(e,n,i,!0),s=ts("um",()=>el(i[e],r),t);s.flags=16}function ts(n,e,t=Xt,i=!1){if(t){const r=t[n]||(t[n]=[]),s=e.__weh||(e.__weh=(...a)=>{zn();const o=hs(t),l=yn(e,t,n,a);return o(),Hn(),l});return i?r.unshift(s):r.push(s),s}}const si=n=>(e,t=Xt)=>{(!rs||n==="sp")&&ts(n,(...i)=>e(...i),t)},Wd=si("bm"),dl=si("m"),Xd=si("bu"),qd=si("u"),pl=si("bum"),Yd=si("um"),jd=si("sp"),$d=si("rtg"),Kd=si("rtc");function Zd(n,e=Xt){ts("ec",n,e)}const Jd=Symbol.for("v-ndc");function pn(n,e,t,i){let r;const s=t,a=Ie(n);if(a||gt(n)){const o=a&&_i(n);let l=!1,c=!1;o&&(l=!cn(n),c=Vn(n),n=yo(n)),r=new Array(n.length);for(let u=0,f=n.length;u<f;u++)r[u]=e(l?c?yi(un(n[u])):un(n[u]):n[u],u,void 0,s)}else if(typeof n=="number")if(!Number.isInteger(n)||n<0)r=[];else{r=new Array(n);for(let o=0;o<n;o++)r[o]=e(o+1,o,void 0,s)}else if(at(n))if(n[Symbol.iterator])r=Array.from(n,(o,l)=>e(o,l,void 0,s));else{const o=Object.keys(n);r=new Array(o.length);for(let l=0,c=o.length;l<c;l++){const u=o[l];r[l]=e(n[u],u,l,s)}}else r=[];return r}const Na=n=>n?Jf(n)?wo(n):Na(n.parent):null,$r=Rt(Object.create(null),{$:n=>n,$el:n=>n.vnode.el,$data:n=>n.data,$props:n=>n.props,$attrs:n=>n.attrs,$slots:n=>n.slots,$refs:n=>n.refs,$parent:n=>Na(n.parent),$root:n=>Na(n.root),$host:n=>n.ce,$emit:n=>n.emit,$options:n=>Df(n),$forceUpdate:n=>n.f||(n.f=()=>{fl(n.update)}),$nextTick:n=>n.n||(n.n=Mf.bind(n.proxy)),$watch:n=>Bd.bind(n)}),Wo=(n,e)=>n!==lt&&!n.__isScriptSetup&&rt(n,e),Qd={get({_:n},e){if(e==="__v_skip")return!0;const{ctx:t,setupState:i,data:r,props:s,accessCache:a,type:o,appContext:l}=n;if(e[0]!=="$"){const d=a[e];if(d!==void 0)switch(d){case 1:return i[e];case 2:return r[e];case 4:return t[e];case 3:return s[e]}else{if(Wo(i,e))return a[e]=1,i[e];if(r!==lt&&rt(r,e))return a[e]=2,r[e];if(rt(s,e))return a[e]=3,s[e];if(t!==lt&&rt(t,e))return a[e]=4,t[e];Oa&&(a[e]=0)}}const c=$r[e];let u,f;if(c)return e==="$attrs"&&Ot(n.attrs,"get",""),c(n);if((u=o.__cssModules)&&(u=u[e]))return u;if(t!==lt&&rt(t,e))return a[e]=4,t[e];if(f=l.config.globalProperties,rt(f,e))return f[e]},set({_:n},e,t){const{data:i,setupState:r,ctx:s}=n;return Wo(r,e)?(r[e]=t,!0):i!==lt&&rt(i,e)?(i[e]=t,!0):rt(n.props,e)||e[0]==="$"&&e.slice(1)in n?!1:(s[e]=t,!0)},has({_:{data:n,setupState:e,accessCache:t,ctx:i,appContext:r,props:s,type:a}},o){let l;return!!(t[o]||n!==lt&&o[0]!=="$"&&rt(n,o)||Wo(e,o)||rt(s,o)||rt(i,o)||rt($r,o)||rt(r.config.globalProperties,o)||(l=a.__cssModules)&&l[o])},defineProperty(n,e,t){return t.get!=null?n._.accessCache[e]=0:rt(t,"value")&&this.set(n,e,t.value,null),Reflect.defineProperty(n,e,t)}};function kl(n){return Ie(n)?n.reduce((e,t)=>(e[t]=null,e),{}):n}let Oa=!0;function ep(n){const e=Df(n),t=n.proxy,i=n.ctx;Oa=!1,e.beforeCreate&&Wl(e.beforeCreate,n,"bc");const{data:r,computed:s,methods:a,watch:o,provide:l,inject:c,created:u,beforeMount:f,mounted:d,beforeUpdate:m,updated:g,activated:_,deactivated:p,beforeDestroy:h,beforeUnmount:S,destroyed:M,unmounted:E,render:D,renderTracked:L,renderTriggered:T,errorCaptured:C,serverPrefetch:x,expose:A,inheritAttrs:k,components:te,directives:se,filters:N}=e;if(c&&tp(c,i,null),a)for(const Q in a){const $=a[Q];qe($)&&(i[Q]=$.bind(t))}if(r){const Q=r.call(t,t);at(Q)&&(n.data=yr(Q))}if(Oa=!0,s)for(const Q in s){const $=s[Q],re=qe($)?$.bind(t,t):qe($.get)?$.get.bind(t,t):Fn,ae=!qe($)&&qe($.set)?$.set.bind(t):Fn,pe=Gi({get:re,set:ae});Object.defineProperty(i,Q,{enumerable:!0,configurable:!0,get:()=>pe.value,set:he=>pe.value=he})}if(o)for(const Q in o)Pf(o[Q],i,t,Q);if(l){const Q=qe(l)?l.call(t):l;Reflect.ownKeys(Q).forEach($=>{Nd($,Q[$])})}u&&Wl(u,n,"c");function G(Q,$){Ie($)?$.forEach(re=>Q(re.bind(t))):$&&Q($.bind(t))}if(G(Wd,f),G(dl,d),G(Xd,m),G(qd,g),G(Vd,_),G(Gd,p),G(Zd,C),G(Kd,L),G($d,T),G(pl,S),G(Yd,E),G(jd,x),Ie(A))if(A.length){const Q=n.exposed||(n.exposed={});A.forEach($=>{Object.defineProperty(Q,$,{get:()=>t[$],set:re=>t[$]=re,enumerable:!0})})}else n.exposed||(n.exposed={});D&&n.render===Fn&&(n.render=D),k!=null&&(n.inheritAttrs=k),te&&(n.components=te),se&&(n.directives=se),x&&Cf(n)}function tp(n,e,t=Fn){Ie(n)&&(n=Fa(n));for(const i in n){const r=n[i];let s;at(r)?"default"in r?s=Zs(r.from||i,r.default,!0):s=Zs(r.from||i):s=Zs(r),Ft(s)?Object.defineProperty(e,i,{enumerable:!0,configurable:!0,get:()=>s.value,set:a=>s.value=a}):e[i]=s}}function Wl(n,e,t){yn(Ie(n)?n.map(i=>i.bind(e.proxy)):n.bind(e.proxy),e,t)}function Pf(n,e,t,i){let r=i.includes(".")?wf(t,i):()=>t[i];if(gt(n)){const s=e[n];qe(s)&&vi(r,s)}else if(qe(n))vi(r,n.bind(t));else if(at(n))if(Ie(n))n.forEach(s=>Pf(s,e,t,i));else{const s=qe(n.handler)?n.handler.bind(t):e[n.handler];qe(s)&&vi(r,s,n)}}function Df(n){const e=n.type,{mixins:t,extends:i}=e,{mixins:r,optionsCache:s,config:{optionMergeStrategies:a}}=n.appContext,o=s.get(e);let l;return o?l=o:!r.length&&!t&&!i?l=e:(l={},r.length&&r.forEach(c=>so(l,c,a,!0)),so(l,e,a)),at(e)&&s.set(e,l),l}function so(n,e,t,i=!1){const{mixins:r,extends:s}=e;s&&so(n,s,t,!0),r&&r.forEach(a=>so(n,a,t,!0));for(const a in e)if(!(i&&a==="expose")){const o=np[a]||t&&t[a];n[a]=o?o(n[a],e[a]):e[a]}return n}const np={data:Xl,props:ql,emits:ql,methods:Vr,computed:Vr,beforeCreate:Bt,created:Bt,beforeMount:Bt,mounted:Bt,beforeUpdate:Bt,updated:Bt,beforeDestroy:Bt,beforeUnmount:Bt,destroyed:Bt,unmounted:Bt,activated:Bt,deactivated:Bt,errorCaptured:Bt,serverPrefetch:Bt,components:Vr,directives:Vr,watch:rp,provide:Xl,inject:ip};function Xl(n,e){return e?n?function(){return Rt(qe(n)?n.call(this,this):n,qe(e)?e.call(this,this):e)}:e:n}function ip(n,e){return Vr(Fa(n),Fa(e))}function Fa(n){if(Ie(n)){const e={};for(let t=0;t<n.length;t++)e[n[t]]=n[t];return e}return n}function Bt(n,e){return n?[...new Set([].concat(n,e))]:e}function Vr(n,e){return n?Rt(Object.create(null),n,e):e}function ql(n,e){return n?Ie(n)&&Ie(e)?[...new Set([...n,...e])]:Rt(Object.create(null),kl(n),kl(e??{})):e}function rp(n,e){if(!n)return e;if(!e)return n;const t=Rt(Object.create(null),n);for(const i in e)t[i]=Bt(n[i],e[i]);return t}function Uf(){return{app:null,config:{isNativeTag:Yu,performance:!1,globalProperties:{},optionMergeStrategies:{},errorHandler:void 0,warnHandler:void 0,compilerOptions:{}},mixins:[],components:{},directives:{},provides:Object.create(null),optionsCache:new WeakMap,propsCache:new WeakMap,emitsCache:new WeakMap}}let sp=0;function op(n,e){return function(i,r=null){qe(i)||(i=Rt({},i)),r!=null&&!at(r)&&(r=null);const s=Uf(),a=new WeakSet,o=[];let l=!1;const c=s.app={_uid:sp++,_component:i,_props:r,_container:null,_context:s,_instance:null,version:zp,get config(){return s.config},set config(u){},use(u,...f){return a.has(u)||(u&&qe(u.install)?(a.add(u),u.install(c,...f)):qe(u)&&(a.add(u),u(c,...f))),c},mixin(u){return s.mixins.includes(u)||s.mixins.push(u),c},component(u,f){return f?(s.components[u]=f,c):s.components[u]},directive(u,f){return f?(s.directives[u]=f,c):s.directives[u]},mount(u,f,d){if(!l){const m=c._ceVNode||Yt(i,r);return m.appContext=s,d===!0?d="svg":d===!1&&(d=void 0),n(m,u,d),l=!0,c._container=u,u.__vue_app__=c,wo(m.component)}},onUnmount(u){o.push(u)},unmount(){l&&(yn(o,c._instance,16),n(null,c._container),delete c._container.__vue_app__)},provide(u,f){return s.provides[u]=f,c},runWithContext(u){const f=xr;xr=c;try{return u()}finally{xr=f}}};return c}}let xr=null;const ap=(n,e)=>e==="modelValue"||e==="model-value"?n.modelModifiers:n[`${e}Modifiers`]||n[`${xn(e)}Modifiers`]||n[`${$i(e)}Modifiers`];function lp(n,e,...t){if(n.isUnmounted)return;const i=n.vnode.props||lt;let r=t;const s=e.startsWith("update:"),a=s&&ap(i,e.slice(7));a&&(a.trim&&(r=t.map(u=>gt(u)?u.trim():u)),a.number&&(r=r.map(us)));let o,l=i[o=Fo(e)]||i[o=Fo(xn(e))];!l&&s&&(l=i[o=Fo($i(e))]),l&&yn(l,n,6,r);const c=i[o+"Once"];if(c){if(!n.emitted)n.emitted={};else if(n.emitted[o])return;n.emitted[o]=!0,yn(c,n,6,r)}}const cp=new WeakMap;function If(n,e,t=!1){const i=t?cp:e.emitsCache,r=i.get(n);if(r!==void 0)return r;const s=n.emits;let a={},o=!1;if(!qe(n)){const l=c=>{const u=If(c,e,!0);u&&(o=!0,Rt(a,u))};!t&&e.mixins.length&&e.mixins.forEach(l),n.extends&&l(n.extends),n.mixins&&n.mixins.forEach(l)}return!s&&!o?(at(n)&&i.set(n,null),null):(Ie(s)?s.forEach(l=>a[l]=null):Rt(a,s),at(n)&&i.set(n,a),a)}function To(n,e){return!n||!_o(e)?!1:(e=e.slice(2),e=e==="Once"?e:e.replace(/Once$/,""),rt(n,e[0].toLowerCase()+e.slice(1))||rt(n,$i(e))||rt(n,e))}function Yl(n){const{type:e,vnode:t,proxy:i,withProxy:r,propsOptions:[s],slots:a,attrs:o,emit:l,render:c,renderCache:u,props:f,data:d,setupState:m,ctx:g,inheritAttrs:_}=n,p=io(n);let h,S;try{if(t.shapeFlag&4){const E=r||i,D=E;h=Rn(c.call(D,E,u,f,m,d,g)),S=o}else{const E=e;h=Rn(E.length>1?E(f,{attrs:o,slots:a,emit:l}):E(f,null)),S=e.props?o:up(o)}}catch(E){Vi.length=0,Eo(E,n,1),h=Yt(En)}let M=h;if(S&&_!==!1){const E=Object.keys(S),{shapeFlag:D}=M;E.length&&D&7&&(s&&E.some(vo)&&(S=fp(S,s)),M=Er(M,S,!1,!0))}if(t.dirs&&(M=Er(M,null,!1,!0),M.dirs=M.dirs?M.dirs.concat(t.dirs):t.dirs),t.transition){const E=bo(M.type)&&Rf(M)||M;qr(E,t.transition)}return h=M,io(p),h}function Nf(n,e=!0){let t;for(let i=0;i<n.length;i++){const r=n[i];if(_l(r)){if(r.type!==En||r.children==="v-if"){if(t)return;t=r}}else return}return t}const up=n=>{let e;for(const t in n)(t==="class"||t==="style"||_o(t))&&((e||(e={}))[t]=n[t]);return e},fp=(n,e)=>{const t={};for(const i in n)(!vo(i)||!(i.slice(9)in e))&&(t[i]=n[i]);return t};function hp(n,e,t){const{props:i,children:r,component:s}=n,{props:a,children:o,patchFlag:l}=e,c=s.emitsOptions;if(e.dirs||e.transition)return!0;if(t&&l>=0){if(l&1024)return!0;if(l&16)return i?jl(i,a,c):!!a;if(l&8){const u=e.dynamicProps;for(let f=0;f<u.length;f++){const d=u[f];if(Of(a,i,d)&&!To(c,d))return!0}}}else return(r||o)&&(!o||!o.$stable)?!0:i===a?!1:i?a?jl(i,a,c):!0:!!a;return!1}function jl(n,e,t){const i=Object.keys(e);if(i.length!==Object.keys(n).length)return!0;for(let r=0;r<i.length;r++){const s=i[r];if(!rt(n,s)||Of(e,n,s)&&!To(t,s))return!0}return!1}function Of(n,e,t){const i=n[t],r=e[t];return t==="style"&&at(i)&&at(r)?!ii(i,r):i!==r}function dp({vnode:n,parent:e,suspense:t},i){for(;e;){const r=e.subTree;if(r.suspense&&r.suspense.activeBranch===n&&(r.suspense.vnode.el=r.el=i,n=r),r===n)(n=e.vnode).el=i,e=e.parent;else break}t&&t.activeBranch===n&&(t.vnode.el=i)}const Ff={},Bf=()=>Object.create(Ff),zf=n=>Object.getPrototypeOf(n)===Ff;function pp(n,e,t,i=!1){const r={},s=Bf();n.propsDefaults=Object.create(null),Hf(n,e,r,s);for(const a in n.propsOptions[0])a in r||(r[a]=void 0);t?n.props=i?r:yd(r):n.type.props?n.props=r:n.props=s,n.attrs=s}function mp(n,e,t,i){const{props:r,attrs:s,vnode:{patchFlag:a}}=n,o=st(r),[l]=n.propsOptions;let c=!1;if((i||a>0)&&!(a&16)){if(a&8){const u=n.vnode.dynamicProps;for(let f=0;f<u.length;f++){let d=u[f];if(To(n.emitsOptions,d))continue;const m=e[d];if(l)if(rt(s,d))m!==s[d]&&(s[d]=m,c=!0);else{const g=xn(d);r[g]=Ba(l,o,g,m,n,!1)}else m!==s[d]&&(s[d]=m,c=!0)}}}else{Hf(n,e,r,s)&&(c=!0);let u;for(const f in o)(!e||!rt(e,f)&&((u=$i(f))===f||!rt(e,u)))&&(l?t&&(t[f]!==void 0||t[u]!==void 0)&&(r[f]=Ba(l,o,f,void 0,n,!0)):delete r[f]);if(s!==o)for(const f in s)(!e||!rt(e,f))&&(delete s[f],c=!0)}c&&Qn(n.attrs,"set","")}function Hf(n,e,t,i){const[r,s]=n.propsOptions;let a=!1,o;if(e)for(let l in e){if(kr(l))continue;const c=e[l];let u;r&&rt(r,u=xn(l))?!s||!s.includes(u)?t[u]=c:(o||(o={}))[u]=c:To(n.emitsOptions,l)||(!(l in i)||c!==i[l])&&(i[l]=c,a=!0)}if(s){const l=st(t),c=o||lt;for(let u=0;u<s.length;u++){const f=s[u];t[f]=Ba(r,l,f,c[f],n,!rt(c,f))}}return a}function Ba(n,e,t,i,r,s){const a=n[t];if(a!=null){const o=rt(a,"default");if(o&&i===void 0){const l=a.default;if(a.type!==Function&&!a.skipFactory&&qe(l)){const{propsDefaults:c}=r;if(t in c)i=c[t];else{const u=hs(r);i=c[t]=l.call(null,e),u()}}else i=l;r.ce&&r.ce._setProp(t,i)}a[0]&&(s&&!o?i=!1:a[1]&&(i===""||i===$i(t))&&(i=!0))}return i}const gp=new WeakMap;function Vf(n,e,t=!1){const i=t?gp:e.propsCache,r=i.get(n);if(r)return r;const s=n.props,a={},o=[];let l=!1;if(!qe(n)){const u=f=>{l=!0;const[d,m]=Vf(f,e,!0);Rt(a,d),m&&o.push(...m)};!t&&e.mixins.length&&e.mixins.forEach(u),n.extends&&u(n.extends),n.mixins&&n.mixins.forEach(u)}if(!s&&!l)return at(n)&&i.set(n,zi),zi;if(Ie(s))for(let u=0;u<s.length;u++){const f=xn(s[u]);$l(f)&&(a[f]=lt)}else if(s)for(const u in s){const f=xn(u);if($l(f)){const d=s[u],m=a[f]=Ie(d)||qe(d)?{type:d}:Rt({},d),g=m.type;let _=!1,p=!0;if(Ie(g))for(let h=0;h<g.length;++h){const S=g[h],M=qe(S)&&S.name;if(M==="Boolean"){_=!0;break}else M==="String"&&(p=!1)}else _=qe(g)&&g.name==="Boolean";m[0]=_,m[1]=p,(_||rt(m,"default"))&&o.push(f)}}const c=[a,o];return at(n)&&i.set(n,c),c}function $l(n){return n[0]!=="$"&&!kr(n)}const ml=n=>n==="_"||n==="_ctx"||n==="$stable",gl=n=>Ie(n)?n.map(Rn):[Rn(n)],_p=(n,e,t)=>{if(e._n)return e;const i=Id((...r)=>gl(e(...r)),t);return i._c=!1,i},Gf=(n,e,t)=>{const i=n._ctx;for(const r in n){if(ml(r))continue;const s=n[r];if(qe(s))e[r]=_p(r,s,i);else if(s!=null){const a=gl(s);e[r]=()=>a}}},kf=(n,e)=>{const t=gl(e);n.slots.default=()=>t},Wf=(n,e,t)=>{for(const i in e)(t||!ml(i))&&(n[i]=e[i])},vp=(n,e,t)=>{const i=n.slots=Bf();if(n.vnode.shapeFlag&32){const r=e._;r?(Wf(i,e,t),t&&Ju(i,"_",r,!0)):Gf(e,i)}else e&&kf(n,e)},xp=(n,e,t)=>{const{vnode:i,slots:r}=n;let s=!0,a=lt;if(i.shapeFlag&32){const o=e._;o?t&&o===1?s=!1:Wf(r,e,t):(s=!e.$stable,Gf(e,r)),a=e}else e&&(kf(n,e),a={default:1});if(s)for(const o in r)!ml(o)&&a[o]==null&&delete r[o]},zt=Tp;function Mp(n){return Sp(n)}function Sp(n,e){const t=Mo();t.__VUE__=!0;const{insert:i,remove:r,patchProp:s,createElement:a,createText:o,createComment:l,setText:c,setElementText:u,parentNode:f,nextSibling:d,setScopeId:m=Fn,insertStaticContent:g}=n,_=(R,b,j,Y=null,X=null,z=null,le=void 0,ie=null,y=!!b.dynamicChildren)=>{if(R===b)return;R&&!Ir(R,b)&&(Y=Ce(R),he(R,X,z,!0),R=null),b.patchFlag===-2&&(y=!1,b.dynamicChildren=null),b.dynamicChildren&&R&&R.dynamicChildren&&R.dynamicChildren.hasOnce&&(b.dynamicChildren===zi&&(b.dynamicChildren=[]),b.dynamicChildren.hasOnce=!0);const{type:v,ref:O,shapeFlag:B}=b;switch(v){case Ao:p(R,b,j,Y);break;case En:h(R,b,j,Y);break;case qo:R==null&&S(b,j,Y,le);break;case ht:te(R,b,j,Y,X,z,le,ie,y);break;default:B&1?D(R,b,j,Y,X,z,le,ie,y):B&6?se(R,b,j,Y,X,z,le,ie,y):(B&64||B&128)&&v.process(R,b,j,Y,X,z,le,ie,y,Oe)}O!=null&&X?Yr(O,R&&R.ref,z,b||R,!b):O==null&&R&&R.ref!=null&&Yr(R.ref,null,z,R,!0)},p=(R,b,j,Y)=>{if(R==null)i(b.el=o(b.children),j,Y);else{const X=b.el=R.el;b.children!==R.children&&c(X,b.children)}},h=(R,b,j,Y)=>{R==null?i(b.el=l(b.children||""),j,Y):b.el=R.el},S=(R,b,j,Y)=>{[R.el,R.anchor]=g(R.children,b,j,Y,R.el,R.anchor)},M=({el:R,anchor:b},j,Y)=>{let X;for(;R&&R!==b;)X=d(R),i(R,j,Y),R=X;i(b,j,Y)},E=({el:R,anchor:b})=>{let j;for(;R&&R!==b;)j=d(R),r(R),R=j;r(b)},D=(R,b,j,Y,X,z,le,ie,y)=>{if(b.type==="svg"?le="svg":b.type==="math"&&(le="mathml"),R==null)L(b,j,Y,X,z,le,ie,y);else{const v=R.el&&R.el._isVueCE?R.el:null;try{v&&v._beginPatch(),x(R,b,X,z,le,ie,y)}finally{v&&v._endPatch()}}},L=(R,b,j,Y,X,z,le,ie)=>{let y,v;const{props:O,shapeFlag:B,transition:q,dirs:Z}=R;if(y=R.el=a(R.type,z,O&&O.is,O),B&8?u(y,R.children):B&16&&C(R.children,y,null,Y,X,Xo(R,z),le,ie),Z&&Ci(R,null,Y,"created"),T(y,R,R.scopeId,le,Y),O){for(const ce in O)ce!=="value"&&!kr(ce)&&s(y,ce,null,O[ce],z,Y);"value"in O&&s(y,"value",null,O.value,z),(v=O.onVnodeBeforeMount)&&Tn(v,Y,R)}Z&&Ci(R,null,Y,"beforeMount");const me=yp(X,q);me?q.beforeEnter(y):q&&!q.persisted&&(y[bp]=!0),i(y,b,j),((v=O&&O.onVnodeMounted)||me||Z)&&zt(()=>{try{v&&Tn(v,Y,R),me&&q.enter(y),Z&&Ci(R,null,Y,"mounted")}finally{}},X)},T=(R,b,j,Y,X)=>{if(j&&m(R,j),Y)for(let z=0;z<Y.length;z++)m(R,Y[z]);if(X){let z=X.subTree;if(b===z||Yf(z.type)&&(z.ssContent===b||z.ssFallback===b)){const le=X.vnode;T(R,le,le.scopeId,le.slotScopeIds,X.parent)}}},C=(R,b,j,Y,X,z,le,ie,y=0)=>{for(let v=y;v<R.length;v++){const O=R[v]=ie?Jn(R[v]):Rn(R[v]);_(null,O,b,j,Y,X,z,le,ie)}},x=(R,b,j,Y,X,z,le)=>{const ie=b.el=R.el;let{patchFlag:y,dynamicChildren:v,dirs:O}=b;y|=R.patchFlag&16;const B=R.props||lt,q=b.props||lt;let Z;if(j&&Li(j,!1),(Z=q.onVnodeBeforeUpdate)&&Tn(Z,j,b,R),O&&Ci(b,R,j,"beforeUpdate"),j&&Li(j,!0),v&&(!R.dynamicChildren||R.dynamicChildren.length!==v.length)&&(y=0,le=!1,v=null),(B.innerHTML&&q.innerHTML==null||B.textContent&&q.textContent==null)&&u(ie,""),v?A(R.dynamicChildren,v,ie,j,Y,Xo(b,X),z):le||$(R,b,ie,null,j,Y,Xo(b,X),z,!1),y>0){if(y&16)k(ie,B,q,j,X);else if(y&2&&B.class!==q.class&&s(ie,"class",null,q.class,X),y&4&&s(ie,"style",B.style,q.style,X),y&8){const me=b.dynamicProps;for(let ce=0;ce<me.length;ce++){const de=me[ce],be=B[de],Le=q[de];(Le!==be||de==="value")&&s(ie,de,be,Le,X,j)}}y&1&&R.children!==b.children&&u(ie,b.children)}else!le&&v==null&&k(ie,B,q,j,X);((Z=q.onVnodeUpdated)||O)&&zt(()=>{Z&&Tn(Z,j,b,R),O&&Ci(b,R,j,"updated")},Y)},A=(R,b,j,Y,X,z,le)=>{for(let ie=0;ie<b.length;ie++){const y=R[ie],v=b[ie],O=y.el||Kr(y),B=O&&(y.type===ht||!Ir(y,v)||y.shapeFlag&198)?f(O):j;_(y,v,B,null,Y,X,z,le,!0)}},k=(R,b,j,Y,X)=>{if(b!==j){if(b!==lt)for(const z in b)!kr(z)&&!(z in j)&&s(R,z,b[z],null,X,Y);for(const z in j){if(kr(z))continue;const le=j[z],ie=b[z];le!==ie&&z!=="value"&&s(R,z,ie,le,X,Y)}"value"in j&&s(R,"value",b.value,j.value,X)}},te=(R,b,j,Y,X,z,le,ie,y)=>{const v=b.el=R?R.el:o(""),O=b.anchor=R?R.anchor:o("");let{patchFlag:B,dynamicChildren:q,slotScopeIds:Z}=b;Z&&(ie=ie?ie.concat(Z):Z),R==null?(i(v,j,Y),i(O,j,Y),C(b.children||[],j,O,X,z,le,ie,y)):B>0&&B&64&&q&&R.dynamicChildren&&R.dynamicChildren.length===q.length?(A(R.dynamicChildren,q,j,X,z,le,ie),(b.key!=null||X&&b===X.subTree)&&Xf(R,b,!0)):$(R,b,j,O,X,z,le,ie,y)},se=(R,b,j,Y,X,z,le,ie,y)=>{b.slotScopeIds=ie,R==null?b.shapeFlag&512?X.ctx.activate(b,j,Y,le,y):N(b,j,Y,X,z,le,y):W(R,b,y)},N=(R,b,j,Y,X,z,le)=>{const ie=R.component=Dp(R,Y,X);if(hl(R)&&(ie.ctx.renderer=Oe),Ip(ie,!1,le),ie.asyncDep){if(X&&X.registerDep(ie,G,le,z),!R.el){const y=ie.subTree=Yt(En);h(null,y,b,j),R.placeholder=y.el}}else G(ie,R,b,j,X,z,le)},W=(R,b,j)=>{const Y=b.component=R.component;if(hp(R,b,j))if(Y.asyncDep&&!Y.asyncResolved){b.el=R.el,b.placeholder=R.placeholder,Q(Y,b,j);return}else Y.next=b,Y.update();else b.el=R.el,b.placeholder=R.placeholder,Y.vnode=b},G=(R,b,j,Y,X,z,le)=>{const ie=()=>{if(R.isMounted){let{next:B,bu:q,u:Z,parent:me,vnode:ce}=R;{const ke=qf(R);if(ke){B&&(B.el=ce.el,Q(R,B,le)),ke.asyncDep.then(()=>{const Fe=()=>{R.job.flags&8||(X&&X.pendingBranch?zt(Fe,X):v())};Fe.flags=48,zt(Fe,X)});return}}let de=B,be;Li(R,!1),B?(B.el=ce.el,Q(R,B,le)):B=ce,q&&Ks(q),(be=B.props&&B.props.onVnodeBeforeUpdate)&&Tn(be,me,B,ce),Li(R,!0);const Le=Yl(R),oe=R.subTree;R.subTree=Le,_(oe,Le,f(oe.el||Kr(oe)),Ce(oe),R,X,z),B.el=Le.el,de===null&&dp(R,Le.el),Z&&zt(Z,X),(be=B.props&&B.props.onVnodeUpdated)&&zt(()=>Tn(be,me,B,ce),X)}else{let B;const{el:q,props:Z}=b,{bm:me,m:ce,parent:de,root:be,type:Le}=R,oe=jr(b);Li(R,!1),me&&Ks(me),!oe&&(B=Z&&Z.onVnodeBeforeMount)&&Tn(B,de,b),Li(R,!0);{be.ce&&be.ce._hasShadowRoot()&&be.ce._injectChildStyle(Le,R.parent?R.parent.type:void 0);const ke=R.subTree=Yl(R);_(null,ke,j,Y,R,X,z),b.el=ke.el}if(ce&&zt(ce,X),!oe&&(B=Z&&Z.onVnodeMounted)){const ke=b;zt(()=>Tn(B,de,ke),X)}(b.shapeFlag&256||de&&jr(de.vnode)&&de.vnode.shapeFlag&256)&&R.a&&zt(R.a,X),R.isMounted=!0,b=j=Y=null}};R.scope.on();const y=R.effect=new nf(ie);R.scope.off();const v=R.update=y.run.bind(y),O=R.job=y.runIfDirty.bind(y);O.i=R,O.id=R.uid,y.scheduler=()=>fl(O),Li(R,!0),v()},Q=(R,b,j)=>{b.component=R;const Y=R.vnode.props;R.vnode=b,R.next=null,mp(R,b.props,Y,j),xp(R,b.children,j),zn(),yf(R),Hn()},$=(R,b,j,Y,X,z,le,ie,y=!1)=>{const v=R&&R.children,O=R?R.shapeFlag:0,B=b.children,{patchFlag:q,shapeFlag:Z}=b;if(q>0){if(q&128){ae(v,B,j,Y,X,z,le,ie,y);return}else if(q&256){re(v,B,j,Y,X,z,le,ie,y);return}}Z&8?(O&16&&Re(v,X,z),B!==v&&u(j,B)):O&16?Z&16?ae(v,B,j,Y,X,z,le,ie,y):Re(v,X,z,!0):(O&8&&u(j,""),Z&16&&C(B,j,Y,X,z,le,ie,y))},re=(R,b,j,Y,X,z,le,ie,y)=>{R=R||zi,b=b||zi;const v=R.length,O=b.length,B=Math.min(v,O);let q;for(q=0;q<B;q++){const Z=b[q]=y?Jn(b[q]):Rn(b[q]);_(R[q],Z,j,null,X,z,le,ie,y)}v>O?Re(R,X,z,!0,!1,B):C(b,j,Y,X,z,le,ie,y,B)},ae=(R,b,j,Y,X,z,le,ie,y)=>{let v=0;const O=b.length;let B=R.length-1,q=O-1;for(;v<=B&&v<=q;){const Z=R[v],me=b[v]=y?Jn(b[v]):Rn(b[v]);if(Ir(Z,me))_(Z,me,j,null,X,z,le,ie,y);else break;v++}for(;v<=B&&v<=q;){const Z=R[B],me=b[q]=y?Jn(b[q]):Rn(b[q]);if(Ir(Z,me))_(Z,me,j,null,X,z,le,ie,y);else break;B--,q--}if(v>B){if(v<=q){const Z=q+1,me=Z<O?b[Z].el:Y;for(;v<=q;)_(null,b[v]=y?Jn(b[v]):Rn(b[v]),j,me,X,z,le,ie,y),v++}}else if(v>q)for(;v<=B;)he(R[v],X,z,!0),v++;else{const Z=v,me=v,ce=new Map;for(v=me;v<=q;v++){const Te=b[v]=y?Jn(b[v]):Rn(b[v]);Te.key!=null&&ce.set(Te.key,v)}let de,be=0;const Le=q-me+1;let oe=!1,ke=0;const Fe=new Array(Le);for(v=0;v<Le;v++)Fe[v]=0;for(v=Z;v<=B;v++){const Te=R[v];if(be>=Le){he(Te,X,z,!0);continue}let xe;if(Te.key!=null)xe=ce.get(Te.key);else for(de=me;de<=q;de++)if(Fe[de-me]===0&&Ir(Te,b[de])){xe=de;break}xe===void 0?he(Te,X,z,!0):(Fe[xe-me]=v+1,xe>=ke?ke=xe:oe=!0,_(Te,b[xe],j,null,X,z,le,ie,y),be++)}const Be=oe?Ep(Fe):zi;for(de=Be.length-1,v=Le-1;v>=0;v--){const Te=me+v,xe=b[Te],P=b[Te+1],ge=Te+1<O?P.el||Kr(P):Y;Fe[v]===0?_(null,xe,j,ge,X,z,le,ie,y):oe&&(de<0||v!==Be[de]?pe(xe,j,ge,2):de--)}}},pe=(R,b,j,Y,X=null)=>{const{el:z,type:le,transition:ie,children:y,shapeFlag:v}=R;if(v&6){pe(R.component.subTree,b,j,Y);return}if(v&128){R.suspense.move(b,j,Y);return}if(v&64){le.move(R,b,j,Oe);return}if(le===ht){i(z,b,j);for(let B=0;B<y.length;B++)pe(y[B],b,j,Y);i(R.anchor,b,j);return}if(le===qo){M(R,b,j);return}if(Y!==2&&v&1&&ie)if(Y===0)ie.persisted&&!z[ko]?i(z,b,j):(ie.beforeEnter(z),i(z,b,j),zt(()=>ie.enter(z),X));else{const{leave:B,delayLeave:q,afterLeave:Z}=ie,me=()=>{R.ctx.isUnmounted?r(z):i(z,b,j)},ce=()=>{const de=z._isLeaving||!!z[ko];z._isLeaving&&z[ko](!0),ie.persisted&&!de?me():B(z,()=>{me(),Z&&Z()})};q?q(z,me,ce):ce()}else i(z,b,j)},he=(R,b,j,Y=!1,X=!1)=>{const{type:z,props:le,ref:ie,children:y,dynamicChildren:v,shapeFlag:O,patchFlag:B,dirs:q,cacheIndex:Z,memo:me}=R;if((B===-2||v&&v.hasOnce)&&(X=!1),ie!=null&&(zn(),Yr(ie,null,j,R,!0),Hn()),Z!=null&&(!R.ctx||R.ctx===b)&&(b.renderCache[Z]=void 0),O&256&&b.ctx.deactivate(R))return;const ce=O&1&&q,de=!jr(R);let be;if(de&&(be=le&&le.onVnodeBeforeUnmount)&&Tn(be,b,R),O&6)Ee(R.component,j,Y);else{if(O&128){R.suspense.unmount(j,Y);return}ce&&Ci(R,null,b,"beforeUnmount"),O&64?R.type.remove(R,b,j,Oe,Y):v&&!v.hasOnce&&(z!==ht||B>0&&B&64)?Re(v,b,j,!1,!0):(z===ht&&B&384||!X&&O&16)&&Re(y,b,j),Y&&ne(R)}const Le=me!=null&&Z==null;(de&&(be=le&&le.onVnodeUnmounted)||ce||Le)&&zt(()=>{be&&Tn(be,b,R),ce&&Ci(R,null,b,"unmounted"),Le&&(R.el=null)},j)},ne=R=>{const{type:b,el:j,anchor:Y,transition:X}=R,z=b===ht;if(z&&!X){ue(j,Y);return}if(b===qo){E(R),X&&!X.persisted&&X.afterLeave&&X.afterLeave();return}const le=z?Ia(R):R,ie=()=>{z?f(j)&&ue(j,Y):r(j),X&&!X.persisted&&X.afterLeave&&X.afterLeave()};if(le&&le.shapeFlag&1&&X&&!X.persisted){const{leave:y,delayLeave:v}=X,O=le.el,B=()=>y(O,ie);v?v(O,ie,B):B()}else ie()},ue=(R,b)=>{let j;for(;R!==b;)j=d(R),r(R),R=j;r(b)},Ee=(R,b,j)=>{const{bum:Y,scope:X,job:z,subTree:le,um:ie,m:y,a:v}=R;Kl(y),Kl(v),Y&&Ks(Y),X.stop(),z?(z.flags|=8,he(le,R,b,j)):le&&(le.transition=R.vnode.transition,he(le,R,b,j)),ie&&zt(ie,b);const O=()=>{R.isUnmounted=!0};O.flags=16,zt(O,b)},Re=(R,b,j,Y=!1,X=!1,z=0)=>{for(let le=z;le<R.length;le++)he(R[le],b,j,Y,X)},Ce=R=>{if(R.shapeFlag&6)return Ce(R.component.subTree);if(R.shapeFlag&128)return R.suspense.next();const b=d(R.anchor||R.el),j=b&&b[zd];return j?d(j):b},Ve=(R,b,j)=>{const Y=R&&b._vnode?void 0:R&&R.component?R.component.uid:Pp();Ud(()=>{R==null?b._vnode&&he(b._vnode,null,null,!0):_(b._vnode||null,R,b,null,null,null,j),b._vnode=R},Y)},Oe={p:_,um:he,m:pe,r:ne,mt:N,mc:C,pc:$,pbc:A,n:Ce,o:n};return{render:Ve,hydrate:void 0,createApp:op(Ve)}}function Xo({type:n,props:e},t){return t==="svg"&&n==="foreignObject"||t==="mathml"&&n==="annotation-xml"&&e&&e.encoding&&e.encoding.includes("html")?void 0:t}function Li({effect:n,job:e},t){t?(n.flags|=32,e.flags|=4):(n.flags&=-33,e.flags&=-5)}function yp(n,e){return(!n||n&&!n.pendingBranch)&&e&&!e.persisted}function Xf(n,e,t=!1){const i=n.children,r=e.children;if(Ie(i)&&Ie(r))for(let s=0;s<i.length;s++){const a=i[s];let o=r[s];o.shapeFlag&1&&!o.dynamicChildren&&((o.patchFlag<=0||o.patchFlag===32)&&(o=r[s]=Jn(r[s]),o.el=a.el),!t&&o.patchFlag!==-2&&Xf(a,o)),o.type===Ao&&(o.patchFlag===-1&&(o=r[s]=Jn(o)),o.el=a.el),o.type===En&&!o.el&&(o.el=a.el)}}function Ep(n){const e=n.slice(),t=[0];let i,r,s,a,o;const l=n.length;for(i=0;i<l;i++){const c=n[i];if(c!==0){if(r=t[t.length-1],n[r]<c){e[i]=r,t.push(i);continue}for(s=0,a=t.length-1;s<a;)o=s+a>>1,n[t[o]]<c?s=o+1:a=o;c<n[t[s]]&&(s>0&&(e[i]=t[s-1]),t[s]=i)}}for(s=t.length,a=t[s-1];s-- >0;)t[s]=a,a=e[a];return t}function qf(n){const e=n.subTree.component;if(e)return e.asyncDep&&!e.asyncResolved?e:qf(e)}function Kl(n){if(n)for(let e=0;e<n.length;e++)n[e].flags|=8}function Kr(n){if(n.placeholder)return n.placeholder;const e=n.component;if(e)return Kr(e.subTree);const t=n.suspense;return t&&t.activeBranch?Kr(t.activeBranch):null}const Yf=n=>n.__isSuspense,bp=Symbol("_deferredEnter");function Tp(n,e){e&&e.pendingBranch?Ie(n)?e.effects.push(...n):e.effects.push(n):Dd(n)}const ht=Symbol.for("v-fgt"),Ao=Symbol.for("v-txt"),En=Symbol.for("v-cmt"),qo=Symbol.for("v-stc"),Vi=[];let Qt=null;function $e(n=!1){Vi.push(Qt=n?null:[])}function jf(){Vi.pop(),Qt=Vi[Vi.length-1]||null}let ns=1;function Zl(n,e=!1){ns+=n,n<0&&Qt&&e&&(Qt.hasOnce=!0)}function $f(n){return n.dynamicChildren=ns>0?Qt||zi:null,jf(),ns>0&&Qt&&Qt.push(n),n}function Ze(n,e,t,i,r,s){return $f(U(n,e,t,i,r,s,!0))}function Ap(n,e,t,i,r){return $f(Yt(n,e,t,i,r,!0))}function _l(n){return n?n.__v_isVNode===!0:!1}function Ir(n,e){return n.type===e.type&&n.key===e.key}const Kf=({key:n})=>n??null,Js=({ref:n,ref_key:e,ref_for:t})=>(typeof n=="number"&&(n=""+n),n!=null?gt(n)||Ft(n)||qe(n)?{i:ln,r:n,k:e,f:!!t}:n:null);function U(n,e=null,t=null,i=0,r=null,s=n===ht?0:1,a=!1,o=!1){const l={__v_isVNode:!0,__v_skip:!0,type:n,props:e,key:e&&Kf(e),ref:e&&Js(e),scopeId:Tf,slotScopeIds:null,children:t,component:null,suspense:null,ssContent:null,ssFallback:null,dirs:null,transition:null,el:null,anchor:null,target:null,targetStart:null,targetAnchor:null,staticCount:0,shapeFlag:s,patchFlag:i,dynamicProps:r,dynamicChildren:null,appContext:null,ctx:ln};return o?(oo(l,t),s&128&&n.normalize(l)):t&&(l.shapeFlag|=gt(t)?8:16),ns>0&&!a&&Qt&&(l.patchFlag>0||s&6)&&l.patchFlag!==32&&Qt.push(l),l}const Yt=wp;function wp(n,e=null,t=null,i=0,r=null,s=!1){if((!n||n===Jd)&&(n=En),_l(n)){const o=Er(n,e,!0);return t&&oo(o,t),ns>0&&!s&&Qt&&(o.shapeFlag&6?Qt[Qt.indexOf(n)]=o:Qt.push(o)),o.patchFlag=-2,o}if(Bp(n)&&(n=n.__vccOpts),e){e=Rp(e);let{class:o,style:l}=e;o&&!gt(o)&&(e.class=rn(o)),at(l)&&(cl(l)&&!Ie(l)&&(l=Rt({},l)),e.style=So(l))}const a=gt(n)?1:Yf(n)?128:bo(n)?64:at(n)?4:qe(n)?2:0;return U(n,e,t,i,r,a,s,!0)}function Rp(n){return n?cl(n)?Rt({},n):zf(n)?Rt({},n[eh]||n):n:null}function Er(n,e,t=!1,i=!1){const{props:r,ref:s,patchFlag:a,children:o,transition:l}=n,c=e?Cp(r||{},e):r,u={__v_isVNode:!0,__v_skip:!0,type:n.type,props:c,key:c&&Kf(c),ref:e&&e.ref?t&&s?Ie(s)?s.concat(Js(e)):[s,Js(e)]:Js(e):s,scopeId:n.scopeId,slotScopeIds:n.slotScopeIds,children:o,target:n.target,targetStart:n.targetStart,targetAnchor:n.targetAnchor,staticCount:n.staticCount,shapeFlag:n.shapeFlag,patchFlag:e&&n.type!==ht?a===-1?16:a|16:a,dynamicProps:n.dynamicProps,dynamicChildren:n.dynamicChildren,appContext:n.appContext,dirs:n.dirs,transition:l,component:n.component,suspense:n.suspense,ssContent:n.ssContent&&Er(n.ssContent),ssFallback:n.ssFallback&&Er(n.ssFallback),placeholder:n.placeholder,el:n.el,anchor:n.anchor,ctx:n.ctx,ce:n.ce,cacheIndex:n.cacheIndex};return l&&i&&qr(u,l.clone(u)),u}function xt(n=" ",e=0){return Yt(Ao,null,n,e)}function Un(n="",e=!1){return e?($e(),Ap(En,null,n)):Yt(En,null,n)}function Rn(n){return n==null||typeof n=="boolean"?Yt(En):Ie(n)?Yt(ht,null,n.slice()):_l(n)?Jn(n):Yt(Ao,null,String(n))}function Jn(n){return n.el===null&&n.patchFlag!==-1||n.memo?n:Er(n)}function oo(n,e){let t=0;const{shapeFlag:i}=n;if(e==null)e=null;else if(Ie(e))t=16;else if(typeof e=="object")if(i&65){const r=e.default;r&&(r._c&&(r._d=!1),oo(n,r()),r._c&&(r._d=!0));return}else{t=32;const r=e._;!r&&!zf(e)?e._ctx=ln:r===3&&ln&&(ln.slots._===1?e._=1:(e._=2,n.patchFlag|=1024))}else if(qe(e)){if(i&65){oo(n,{default:e});return}e={default:e,_ctx:ln},t=32}else e=String(e),i&64?(t=16,e=[xt(e)]):t=8;n.children=e,n.shapeFlag|=t}function Cp(...n){const e={};for(let t=0;t<n.length;t++){const i=n[t];for(const r in i)if(r==="class")e.class!==i.class&&(e.class=rn([e.class,i.class]));else if(r==="style")e.style=So([e.style,i.style]);else if(_o(r)){const s=e[r],a=i[r];a&&s!==a&&!(Ie(s)&&s.includes(a))?e[r]=s?[].concat(s,a):a:a==null&&s==null&&!vo(r)&&(e[r]=a)}else r!==""&&(e[r]=i[r])}return e}function Tn(n,e,t,i=null){yn(n,e,7,[t,i])}const Lp=Uf();let Zf=0;function Pp(){return Zf}function Dp(n,e,t){const i=n.type,r=(e?e.appContext:n.appContext)||Lp,s={uid:Zf++,vnode:n,type:i,parent:e,appContext:r,root:null,next:null,subTree:null,effect:null,update:null,job:null,scope:new rd(!0),render:null,proxy:null,exposed:null,exposeProxy:null,withProxy:null,provides:e?e.provides:Object.create(r.provides),ids:e?e.ids:["",0,0],accessCache:null,renderCache:[],components:null,directives:null,propsOptions:Vf(i,r),emitsOptions:If(i,r),emit:null,emitted:null,propsDefaults:lt,inheritAttrs:i.inheritAttrs,ctx:lt,data:lt,props:lt,attrs:lt,slots:lt,refs:lt,setupState:lt,setupContext:null,suspense:t,suspenseId:t?t.pendingId:0,asyncDep:null,asyncResolved:!1,isMounted:!1,isUnmounted:!1,isDeactivated:!1,bc:null,c:null,bm:null,m:null,bu:null,u:null,um:null,bum:null,da:null,a:null,rtg:null,rtc:null,ec:null,sp:null};return s.ctx={_:s},s.root=e?e.root:s,s.emit=lp.bind(null,s),n.ce&&n.ce(s),s}let Xt=null;const Up=()=>Xt||ln;let ao,is;{const n=Mo(),e=(t,i)=>{let r;return(r=n[t])||(r=n[t]=[]),r.push(i),s=>{r.length>1?r.forEach(a=>a(s)):r[0](s)}};ao=e("__VUE_INSTANCE_SETTERS__",t=>Xt=t),is=e("__VUE_SSR_SETTERS__",t=>rs=t)}const hs=n=>{const e=Xt;return ao(n),n.scope.on(),()=>{n.scope.off(),ao(e)}},Jl=()=>{Xt&&Xt.scope.off(),ao(null)};function Jf(n){return n.vnode.shapeFlag&4}let rs=!1;function Ip(n,e=!1,t=!1){e&&is(e);const{props:i,children:r}=n.vnode,s=Jf(n);pp(n,i,s,e),vp(n,r,t||e);const a=s?Np(n,e):void 0;return e&&is(!1),a}function Np(n,e){const t=n.type;n.accessCache=Object.create(null),n.proxy=new Proxy(n.ctx,Qd);const{setup:i}=t;if(i){zn();const r=n.setupContext=i.length>1?Fp(n):null,s=hs(n),a=fs(i,n,0,[n.props,r]),o=ju(a);if(Hn(),s(),(o||n.sp)&&!jr(n)&&Cf(n),o){if(a.then(Jl,Jl),e)return a.then(l=>{is(!0);try{Ql(n,l,e)}finally{is(!1)}}).catch(l=>{Eo(l,n,0,void 0,!0),n.ssrRender=(c,u)=>u("<!---->")});n.asyncDep=a}else Ql(n,a)}else Qf(n)}function Ql(n,e,t){qe(e)?n.type.__ssrInlineRender?n.ssrRender=e:n.render=e:at(e)&&(n.setupState=vf(e)),Qf(n)}function Qf(n,e,t){const i=n.type;n.render||(n.render=i.render||Fn);{const r=hs(n);zn();try{ep(n)}finally{Hn(),r()}}}const eh=Symbol(),Op={get(n,e){return Ot(n,"get",""),e===eh?n:n[e]}};function Fp(n){const e=t=>{n.exposed=t||{}};return{attrs:new Proxy(n.attrs,Op),slots:n.slots,emit:n.emit,expose:e}}function wo(n){return n.exposed?n.exposeProxy||(n.exposeProxy=new Proxy(vf(ul(n.exposed)),{get(e,t){if(t in e)return e[t];if(t in $r)return $r[t](n)},has(e,t){return t in e||t in $r}})):n.proxy}function Bp(n){return qe(n)&&"__vccOpts"in n}const Gi=(n,e)=>wd(n,e,rs),zp="3.5.45";/**
* @vue/runtime-dom v3.5.45
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/let za;const ec=typeof window<"u"&&window.trustedTypes;if(ec)try{za=ec.createPolicy("vue",{createHTML:n=>n})}catch{}const th=za?n=>za.createHTML(n):n=>n,Hp="http://www.w3.org/2000/svg",Vp="http://www.w3.org/1998/Math/MathML",Zn=typeof document<"u"?document:null,tc=Zn&&Zn.createElement("template"),Gp={insert:(n,e,t)=>{e.insertBefore(n,t||null)},remove:n=>{const e=n.parentNode;e&&e.removeChild(n)},createElement:(n,e,t,i)=>{const r=e==="svg"?Zn.createElementNS(Hp,n):e==="mathml"?Zn.createElementNS(Vp,n):t?Zn.createElement(n,{is:t}):Zn.createElement(n);return n==="select"&&i&&i.multiple!=null&&r.setAttribute("multiple",i.multiple),r},createText:n=>Zn.createTextNode(n),createComment:n=>Zn.createComment(n),setText:(n,e)=>{n.nodeValue=e},setElementText:(n,e)=>{n.textContent=e},parentNode:n=>n.parentNode,nextSibling:n=>n.nextSibling,querySelector:n=>Zn.querySelector(n),setScopeId(n,e){n.setAttribute(e,"")},insertStaticContent(n,e,t,i,r,s){const a=t?t.previousSibling:e.lastChild;if(r&&(r===s||r.nextSibling))for(;e.insertBefore(r.cloneNode(!0),t),!(r===s||!(r=r.nextSibling)););else{tc.innerHTML=th(i==="svg"?`<svg>${n}</svg>`:i==="mathml"?`<math>${n}</math>`:n);const o=tc.content;if(i==="svg"||i==="mathml"){const l=o.firstChild;for(;l.firstChild;)o.appendChild(l.firstChild);o.removeChild(l)}e.insertBefore(o,t)}return[a?a.nextSibling:e.firstChild,t?t.previousSibling:e.lastChild]}},kp=Symbol("_vtc");function Wp(n,e,t){const i=n[kp];i&&(e=(e?[e,...i]:[...i]).join(" ")),e==null?n.removeAttribute("class"):t?n.setAttribute("class",e):n.className=e}const lo=Symbol("_vod"),nh=Symbol("_vsh"),Ss={name:"show",beforeMount(n,{value:e},{transition:t}){n[lo]=n.style.display==="none"?"":n.style.display,t&&e?t.beforeEnter(n):Nr(n,e)},mounted(n,{value:e},{transition:t}){t&&e&&t.enter(n)},updated(n,{value:e,oldValue:t},{transition:i}){!e!=!t&&(i?e?(i.beforeEnter(n),Nr(n,!0),i.enter(n)):i.leave(n,()=>{Nr(n,!1)}):Nr(n,e))},beforeUnmount(n,{value:e}){Nr(n,e)}};function Nr(n,e){n.style.display=e?n[lo]:"none",n[nh]=!e}const Xp=Symbol(""),qp=/(?:^|;)\s*display\s*:/;function Yp(n,e,t){const i=n.style,r=gt(t);let s=!1;if(t&&!r){if(e)if(gt(e))for(const a of e.split(";")){const o=a.slice(0,a.indexOf(":")).trim();t[o]==null&&Gr(i,o,"")}else for(const a in e)t[a]==null&&Gr(i,a,"");for(const a in t){a==="display"&&(s=!0);const o=t[a];o!=null?$p(n,a,!gt(e)&&e?e[a]:void 0,o)||Gr(i,a,o):Gr(i,a,"")}}else if(r){if(e!==t){const a=i[Xp];a&&(t+=";"+a),i.cssText=t,s=qp.test(t)}}else e&&n.removeAttribute("style");lo in n&&((!r||e!==t)&&(n[lo]=s?i.display:""),n[nh]&&(i.display="none"))}const ys=/\s*!important$/;function Gr(n,e,t){if(Ie(t))t.forEach(i=>Gr(n,e,i));else if(t==null&&(t=""),e.startsWith("--"))ys.test(t)?n.setProperty(e,t.replace(ys,""),"important"):n.setProperty(e,t);else{const i=jp(n,e);ys.test(t)?n.setProperty($i(i),t.replace(ys,""),"important"):n[i]=t}}const nc=["Webkit","Moz","ms"],Yo={};function jp(n,e){const t=Yo[e];if(t)return t;let i=xn(e);if(i!=="filter"&&i in n)return Yo[e]=i;i=Zu(i);for(let r=0;r<nc.length;r++){const s=nc[r]+i;if(s in n)return Yo[e]=s}return e}function $p(n,e,t,i){return n.tagName==="TEXTAREA"&&(e==="width"||e==="height")&&gt(i)&&t===i}const ic="http://www.w3.org/1999/xlink";function rc(n,e,t,i,r,s=td(e)){i&&e.startsWith("xlink:")?t==null?n.removeAttributeNS(ic,e.slice(6,e.length)):n.setAttributeNS(ic,e,t):t==null||s&&!Qu(t)?n.removeAttribute(e):n.setAttribute(e,s?"":Bn(t)?String(t):t)}function sc(n,e,t,i,r){if(e==="innerHTML"||e==="textContent"){t!=null&&(n[e]=e==="innerHTML"?th(t):t);return}const s=n.tagName;if(e==="value"&&s!=="PROGRESS"&&!s.includes("-")){const o=s==="OPTION"?n.getAttribute("value")||"":n.value,l=t==null?n.type==="checkbox"?"on":"":String(t);(o!==l||!("_value"in n))&&(n.value=l),t==null&&n.removeAttribute(e),n._value=t;return}let a=!1;if(t===""||t==null){const o=typeof n[e];o==="boolean"?t=Qu(t):t==null&&o==="string"?(t="",a=!0):o==="number"&&(t=0,a=!0)}try{n[e]=t}catch{}a&&n.removeAttribute(r||e)}function di(n,e,t,i){n.addEventListener(e,t,i)}function Kp(n,e,t,i){n.removeEventListener(e,t,i)}const oc=Symbol("_vei");function Zp(n,e,t,i,r=null){const s=n[oc]||(n[oc]={}),a=s[e];if(i&&a)a.value=i;else{const[o,l]=em(e);if(i){const c=s[e]=im(i,r);di(n,o,c,l)}else a&&(Kp(n,o,a,l),s[e]=void 0)}}const Jp=/(Once|Passive|Capture)$/,Qp=/^on:?(?:Once|Passive|Capture)$/;function em(n){let e,t;for(;(t=n.match(Jp))&&!Qp.test(n);)e||(e={}),n=n.slice(0,n.length-t[1].length),e[t[1].toLowerCase()]=!0;return[n[2]===":"?n.slice(3):$i(n.slice(2)),e]}let jo=0;const tm=Promise.resolve(),nm=()=>jo||(tm.then(()=>jo=0),jo=Date.now());function im(n,e){const t=i=>{if(!i._vts)i._vts=Date.now();else if(i._vts<=t.attached)return;const r=t.value;if(Ie(r)){const s=i.stopImmediatePropagation;i.stopImmediatePropagation=()=>{s.call(i),i._stopped=!0};const a=r.slice(),o=[i];for(let l=0;l<a.length&&!i._stopped;l++){const c=a[l];c&&yn(c,e,5,o)}}else yn(r,e,5,[i])};return t.value=n,t.attached=nm(),t}const ac=n=>n.charCodeAt(0)===111&&n.charCodeAt(1)===110&&n.charCodeAt(2)>96&&n.charCodeAt(2)<123,rm=(n,e,t,i,r,s)=>{const a=r==="svg";e==="class"?Wp(n,i,a):e==="style"?Yp(n,t,i):_o(e)?vo(e)||Zp(n,e,t,i,s):(e[0]==="."?(e=e.slice(1),!0):e[0]==="^"?(e=e.slice(1),!1):sm(n,e,i,a))?(sc(n,e,i),!n.tagName.includes("-")&&(e==="value"||e==="checked"||e==="selected")&&rc(n,e,i,a,s,e!=="value")):n._isVueCE&&(om(n,e)||n._def.__asyncLoader&&(/[A-Z]/.test(e)||!gt(i)))?sc(n,xn(e),i,s,e):(e==="true-value"?n._trueValue=i:e==="false-value"&&(n._falseValue=i),rc(n,e,i,a))};function sm(n,e,t,i){if(i)return!!(e==="innerHTML"||e==="textContent"||e in n&&ac(e)&&qe(t));if(e==="spellcheck"||e==="draggable"||e==="translate"||e==="autocorrect"||e==="sandbox"&&n.tagName==="IFRAME"||e==="form"||e==="list"&&n.tagName==="INPUT"||e==="type"&&n.tagName==="TEXTAREA")return!1;if(e==="width"||e==="height"){const r=n.tagName;if(r==="IMG"||r==="VIDEO"||r==="CANVAS"||r==="SOURCE")return!1}return ac(e)&&gt(t)?!1:e in n}function om(n,e){const t=n._def.props;if(!t)return!1;const i=xn(e);return Array.isArray(t)?t.some(r=>xn(r)===i):Object.keys(t).some(r=>xn(r)===i)}const br=n=>{const e=n.props["onUpdate:modelValue"]||!1;return Ie(e)?t=>Ks(e,t):e};function am(n){n.target.composing=!0}function lc(n){const e=n.target;e.composing&&(e.composing=!1,e.dispatchEvent(new Event("input")))}const Nn=Symbol("_assign"),Es=Symbol("_initialValue");function $o(n,e,t){return e&&(n=n.trim()),t&&(n=us(n)),n}const Nt={created(n,{modifiers:{lazy:e,trim:t,number:i}},r){n.parentNode&&(n.type==="text"?n[Es]=n.defaultValue.replace(/[\r\n]/g,""):n.type==="textarea"&&(n[Es]=n.defaultValue.replace(/\r\n?/g,`
`))),n[Nn]=br(r);const s=i||r.props&&r.props.type==="number";di(n,e?"change":"input",a=>{a.target.composing||n[Nn]($o(n.value,t,s))}),(t||s)&&di(n,"change",()=>{n.value=$o(n.value,t,s)}),e||(di(n,"compositionstart",am),di(n,"compositionend",lc),di(n,"change",lc))},mounted(n,{value:e,modifiers:{trim:t,number:i}}){const r=e??"",s=n[Es];delete n[Es],s!==void 0&&(n.type==="text"||n.type==="textarea")&&n.value!==s?n[Nn]($o(n.value,t,i)):n.value=r},beforeUpdate(n,{value:e,oldValue:t,modifiers:{lazy:i,trim:r,number:s}},a){if(n[Nn]=br(a),n.composing)return;const o=(s||n.type==="number")&&!/^0\d/.test(n.value)?us(n.value):n.value,l=e??"";if(o===l)return;const c=n.getRootNode();(c instanceof Document||c instanceof ShadowRoot)&&c.activeElement===n&&n.type!=="range"&&(i&&e===t||r&&n.value.trim()===l)||(n.value=l)}},Ha={deep:!0,created(n,e,t){n[Nn]=br(t),di(n,"change",()=>{const i=n._modelValue,r=ss(n),s=n.checked,a=n[Nn];if(Ie(i)){const o=nl(i,r),l=o!==-1;if(s&&!l)a(i.concat(r));else if(!s&&l){const c=[...i];c.splice(o,1),a(c)}}else if(ni(i)){const o=new Set(i);s?o.add(r):o.delete(r),a(o)}else a(ih(n,s))})},mounted:cc,beforeUpdate(n,e,t){n[Nn]=br(t),cc(n,e,t)}};function cc(n,{value:e,oldValue:t},i){n._modelValue=e;let r;if(Ie(e))r=nl(e,i.props.value)>-1;else if(ni(e))r=e.has(i.props.value);else{if(e===t)return;r=ii(e,ih(n,!0))}n.checked!==r&&(n.checked=r)}const uc={deep:!0,created(n,{value:e,modifiers:{number:t}},i){n._modelValue=e,di(n,"change",()=>{const r=Array.prototype.filter.call(n.options,l=>l.selected).map(l=>t?us(ss(l)):ss(l)),s=n.multiple,a=s?ni(n._modelValue)?new Set(r):r:r[0],o=n._pendingValue=[s,s?Ie(a)?r.slice():r:a];try{n[Nn](a)}finally{Mf(()=>{n._pendingValue===o&&(n._pendingValue=void 0)})}}),n[Nn]=br(i)},mounted(n,{value:e,modifiers:{number:t}}){fc(n,e,t)},beforeUpdate(n,{value:e},t){n._modelValue=e,n[Nn]=br(t)},updated(n,{value:e,modifiers:{number:t}}){const i=n._pendingValue;n._pendingValue=void 0,(!i||i[0]!==n.multiple||!lm(e,i[1],i[0]))&&fc(n,e,t)}};function lm(n,e,t){if(!t||Ie(n))return ii(n,e);if(ni(n)){if(n.size!==e.length)return!1;for(const i of e)if(!n.has(i))return!1;return!0}return!1}function fc(n,e,t=!1){const i=n.multiple,r=Ie(e);if(!(i&&!r&&!ni(e))){for(let s=0,a=n.options.length;s<a;s++){const o=n.options[s],l=ss(o);if(i)if(r){const c=typeof l;c==="string"||c==="number"?o.selected=e.some(u=>String(u)===String(l)):o.selected=nl(e,l)>-1}else o.selected=e.has(l)||t&&typeof l=="string"&&e.has(us(l));else if(ii(ss(o),e)){n.selectedIndex!==s&&(n.selectedIndex=s);return}}!i&&n.selectedIndex!==-1&&(n.selectedIndex=-1)}}function ss(n){return"_value"in n?n._value:n.value}function ih(n,e){const t=e?"_trueValue":"_falseValue";return t in n?n[t]:e}const cm=["ctrl","shift","alt","meta"],um={stop:n=>n.stopPropagation(),prevent:n=>n.preventDefault(),self:n=>n.target!==n.currentTarget,ctrl:n=>!n.ctrlKey,shift:n=>!n.shiftKey,alt:n=>!n.altKey,meta:n=>!n.metaKey,left:n=>"button"in n&&n.button!==0,middle:n=>"button"in n&&n.button!==1,right:n=>"button"in n&&n.button!==2,exact:(n,e)=>cm.some(t=>n[`${t}Key`]&&!e.includes(t))},Va=(n,e)=>{if(!n)return n;const t=n._withMods||(n._withMods={}),i=e.join(".");return t[i]||(t[i]=(r,...s)=>{for(let a=0;a<e.length;a++){const o=um[e[a]];if(o&&o(r,e))return}return n(r,...s)})},fm=Rt({patchProp:rm},Gp);let hc;function hm(){return hc||(hc=Mp(fm))}const dm=(...n)=>{const e=hm().createApp(...n),{mount:t}=e;return e.mount=i=>{const r=mm(i);if(!r)return;const s=e._component;!qe(s)&&!s.render&&!s.template&&(s.template=r.innerHTML),r.nodeType===1&&(r.textContent="");const a=t(r,!1,pm(r));return r instanceof Element&&(r.removeAttribute("v-cloak"),r.setAttribute("data-v-app","")),a},e};function pm(n){if(n instanceof SVGElement)return"svg";if(typeof MathMLElement=="function"&&n instanceof MathMLElement)return"mathml"}function mm(n){return gt(n)?document.querySelector(n):n}const gm=8e6;class Ei{constructor(e=64,t=40,i=64,r=.1){this.nx=e,this.ny=t,this.nz=i,this.cell=r,this.data=new Uint8Array(e*t*i)}index(e,t,i){return(t*this.nz+i)*this.nx+e}inBounds(e,t,i){return e>=0&&e<this.nx&&t>=0&&t<this.ny&&i>=0&&i<this.nz}get(e,t,i){return this.inBounds(e,t,i)?this.data[this.index(e,t,i)]:0}set(e,t,i,r){this.inBounds(e,t,i)&&(this.data[this.index(e,t,i)]=r)}setMirrored(e,t,i,r,s,a){const o=s?[e,this.nx-1-e]:[e],l=a?[i,this.nz-1-i]:[i];for(const c of o)for(const u of l)this.set(c,t,u,r)}count(){let e=0;const t=this.data;for(let i=0;i<t.length;i++)t[i]&&e++;return e}volume(){const e=this.cell;return this.count()*e*e*e}clear(){this.data.fill(0)}layerClear(e){e<0||e>=this.ny||this.data.fill(0,e*this.nz*this.nx,(e+1)*this.nz*this.nx)}layerTranslate(e,t,i){if(e<0||e>=this.ny||!t&&!i)return;const{nx:r,nz:s}=this,a=this.data.slice(e*s*r,(e+1)*s*r),o=new Uint8Array(r*s);for(let l=0;l<s;l++){const c=l+i;if(!(c<0||c>=s))for(let u=0;u<r;u++){const f=u+t;f<0||f>=r||(o[c*r+f]=a[l*r+u])}}this.data.set(o,e*s*r)}layerRotate(e,t){if(e<0||e>=this.ny)return;const{nx:i,nz:r}=this,s=this.data.slice(e*r*i,(e+1)*r*i),a=new Uint8Array(i*r),o=(i-1)/2,l=(r-1)/2;for(let c=0;c<r;c++)for(let u=0;u<i;u++){const f=s[c*i+u];if(!f)continue;const d=u-o,m=c-l,g=Math.round(o+(t>0?-m:m)),_=Math.round(l+(t>0?d:-d));g>=0&&g<i&&_>=0&&_<r&&(a[_*i+g]=f)}this.data.set(a,e*r*i)}copyRegion(e,t,i,r,s){const a=r-t+1,o=s-i+1,l=new Uint8Array(a*o);for(let c=0;c<o;c++)for(let u=0;u<a;u++)l[c*a+u]=this.get(t+u,e,i+c);return{w:a,h:o,cells:l}}pasteRegion(e,t,i,r,s,a){const{w:o,h:l,cells:c}=t;for(let u=0;u<l;u++)for(let f=0;f<o;f++){const d=c[u*o+f];if(!d)continue;const m=[i+f],g=[r+u];s&&m.push(this.nx-1-(i+f)),a&&g.push(this.nz-1-(r+u));for(const _ of m)for(const p of g)this.set(_,e,p,d)}}resample(e){if(e===this.cell)return;const t=this.nx*this.cell,i=this.ny*this.cell,r=this.nz*this.cell;let s=Math.max(1,Math.round(t/e)),a=Math.max(1,Math.round(i/e)),o=Math.max(1,Math.round(r/e));for(;s*a*o>gm;)s=Math.max(1,Math.floor(s*.9)),a=Math.max(1,Math.floor(a*.9)),o=Math.max(1,Math.floor(o*.9));const l=new Uint8Array(s*a*o),c=e/this.cell;if(c>1)for(let u=0;u<a;u++){const f=Math.floor(u*c),d=Math.min(this.ny,Math.ceil((u+1)*c));for(let m=0;m<o;m++){const g=Math.floor(m*c),_=Math.min(this.nz,Math.ceil((m+1)*c));for(let p=0;p<s;p++){const h=Math.floor(p*c),S=Math.min(this.nx,Math.ceil((p+1)*c));let M=0;e:for(let E=f;E<d;E++)for(let D=g;D<_;D++)for(let L=h;L<S;L++){const T=this.data[this.index(L,E,D)];if(T){M=T;break e}}M&&(l[(u*o+m)*s+p]=M)}}}else for(let u=0;u<a;u++){const f=Math.min(this.ny-1,Math.floor((u+.5)*e/this.cell));for(let d=0;d<o;d++){const m=Math.min(this.nz-1,Math.floor((d+.5)*e/this.cell));for(let g=0;g<s;g++){const _=Math.min(this.nx-1,Math.floor((g+.5)*e/this.cell)),p=this.data[this.index(_,f,m)];p&&(l[(u*o+d)*s+g]=p)}}}this.nx=s,this.ny=a,this.nz=o,this.cell=e,this.data=l}serialize(){return{nx:this.nx,ny:this.ny,nz:this.nz,cell:this.cell,data:this.data.slice().buffer}}static deserialize(e){const t=new Ei(e.nx,e.ny,e.nz,e.cell);return t.data=new Uint8Array(e.data),t}static fromPoints(e,t,i,r=200){let s=1/0,a=1/0,o=1/0,l=-1/0,c=-1/0,u=-1/0;for(let h=0;h<e.length;h+=3){const S=e[h],M=e[h+1],E=e[h+2];S<s&&(s=S),M<a&&(a=M),E<o&&(o=E),S>l&&(l=S),M>c&&(c=M),E>u&&(u=E)}if(!isFinite(s))throw new Error("点云为空");const f=t;s-=f,a-=f,o-=f,l+=f,c+=f,u+=f;const d=h=>Math.max(1,Math.min(r,Math.ceil(h))),m=d((l-s)/t),g=d((c-a)/t),_=d((u-o)/t),p=new Ei(m,g,_,t);for(let h=0;h<e.length;h+=3){const S=Math.floor((e[h]-s)/t),M=Math.floor((e[h+1]-a)/t),E=Math.floor((e[h+2]-o)/t);p.set(Math.min(m-1,Math.max(0,S)),Math.min(g-1,Math.max(0,M)),Math.min(_-1,Math.max(0,E)),i)}return p}}const rh=[{id:1,name:"太湖石",color:"#8f9a90"},{id:2,name:"黄石",color:"#b98a4a"},{id:3,name:"英石",color:"#6e6f75"},{id:4,name:"灵璧石",color:"#3f4148"},{id:5,name:"千层石",color:"#a8856a"},{id:6,name:"斧劈石",color:"#7d7468"},{id:7,name:"笋石",color:"#9aa37a"},{id:8,name:"钟乳石",color:"#c8bfae"}],dc=["草稿","加工中","已审定","已归档"];function sh(n){const e=rh.find(t=>t.id===n);return e?e.color:"#999999"}function vl(n){const e=sh(n);return[parseInt(e.slice(1,3),16)/255,parseInt(e.slice(3,5),16)/255,parseInt(e.slice(5,7),16)/255]}const F=yr({model:ul(new Ei(64,40,64,.1)),rev:0,currentLayer:0,material:1,tool:"paint",mirrorX:!0,mirrorZ:!1,decimation:.3,mesh:{facesRaw:0,faces:0,voxels:0,volume:0},selection:null,clipboard:null,stones:[],versions:[],currentStoneId:null,archiveTab:"stones",compareA:null,compareB:null,recordVersion:null,notice:""});function Cn(){F.rev++}function co(n){F.model=ul(n),F.currentLayer=Math.min(F.currentLayer,n.ny-1),F.selection=null,Cn()}function Vt(n){F.notice=n,setTimeout(()=>{F.notice===n&&(F.notice="")},3e3)}/**
 * @license
 * Copyright 2010-2023 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const xl="160",Ji={ROTATE:0,DOLLY:1,PAN:2},Qi={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},_m=0,pc=1,vm=2,oh=1,xm=2,Kn=3,bi=0,$t=1,In=2,xi=0,Mr=1,mc=2,gc=3,_c=4,Mm=5,Fi=100,Sm=101,ym=102,vc=103,xc=104,Em=200,bm=201,Tm=202,Am=203,Ga=204,ka=205,wm=206,Rm=207,Cm=208,Lm=209,Pm=210,Dm=211,Um=212,Im=213,Nm=214,Om=0,Fm=1,Bm=2,uo=3,zm=4,Hm=5,Vm=6,Gm=7,ah=0,km=1,Wm=2,Mi=0,Xm=1,qm=2,Ym=3,jm=4,$m=5,Km=6,lh=300,Tr=301,Ar=302,Wa=303,Xa=304,Ro=306,qa=1e3,_n=1001,Ya=1002,Gt=1003,Mc=1004,Ko=1005,sn=1006,Zm=1007,os=1008,Si=1009,Jm=1010,Qm=1011,Ml=1012,ch=1013,pi=1014,mi=1015,as=1016,uh=1017,fh=1018,ki=1020,eg=1021,vn=1023,tg=1024,ng=1025,Wi=1026,wr=1027,ig=1028,hh=1029,rg=1030,dh=1031,ph=1033,Zo=33776,Jo=33777,Qo=33778,ea=33779,Sc=35840,yc=35841,Ec=35842,bc=35843,mh=36196,Tc=37492,Ac=37496,wc=37808,Rc=37809,Cc=37810,Lc=37811,Pc=37812,Dc=37813,Uc=37814,Ic=37815,Nc=37816,Oc=37817,Fc=37818,Bc=37819,zc=37820,Hc=37821,ta=36492,Vc=36494,Gc=36495,sg=36283,kc=36284,Wc=36285,Xc=36286,gh=3e3,Xi=3001,og=3200,ag=3201,_h=0,lg=1,an="",Lt="srgb",ri="srgb-linear",Sl="display-p3",Co="display-p3-linear",fo="linear",ft="srgb",ho="rec709",po="p3",er=7680,qc=519,cg=512,ug=513,fg=514,vh=515,hg=516,dg=517,pg=518,mg=519,Yc=35044,jc="300 es",ja=1035,ti=2e3,mo=2001;class Ki{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(t)===-1&&i[e].push(t)}hasEventListener(e,t){if(this._listeners===void 0)return!1;const i=this._listeners;return i[e]!==void 0&&i[e].indexOf(t)!==-1}removeEventListener(e,t){if(this._listeners===void 0)return;const r=this._listeners[e];if(r!==void 0){const s=r.indexOf(t);s!==-1&&r.splice(s,1)}}dispatchEvent(e){if(this._listeners===void 0)return;const i=this._listeners[e.type];if(i!==void 0){e.target=this;const r=i.slice(0);for(let s=0,a=r.length;s<a;s++)r[s].call(this,e);e.target=null}}}const Ut=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Qs=Math.PI/180,$a=180/Math.PI;function ds(){const n=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Ut[n&255]+Ut[n>>8&255]+Ut[n>>16&255]+Ut[n>>24&255]+"-"+Ut[e&255]+Ut[e>>8&255]+"-"+Ut[e>>16&15|64]+Ut[e>>24&255]+"-"+Ut[t&63|128]+Ut[t>>8&255]+"-"+Ut[t>>16&255]+Ut[t>>24&255]+Ut[i&255]+Ut[i>>8&255]+Ut[i>>16&255]+Ut[i>>24&255]).toLowerCase()}function Wt(n,e,t){return Math.max(e,Math.min(t,n))}function gg(n,e){return(n%e+e)%e}function na(n,e,t){return(1-t)*n+t*e}function $c(n){return(n&n-1)===0&&n!==0}function Ka(n){return Math.pow(2,Math.floor(Math.log(n)/Math.LN2))}function Or(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("Invalid component type.")}}function qt(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("Invalid component type.")}}const _g={DEG2RAD:Qs};class Xe{constructor(e=0,t=0){Xe.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,i=this.y,r=e.elements;return this.x=r[0]*t+r[3]*i+r[6],this.y=r[1]*t+r[4]*i+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Wt(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y;return t*t+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const i=Math.cos(t),r=Math.sin(t),s=this.x-e.x,a=this.y-e.y;return this.x=s*i-a*r+e.x,this.y=s*r+a*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Qe{constructor(e,t,i,r,s,a,o,l,c){Qe.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,i,r,s,a,o,l,c)}set(e,t,i,r,s,a,o,l,c){const u=this.elements;return u[0]=e,u[1]=r,u[2]=o,u[3]=t,u[4]=s,u[5]=l,u[6]=i,u[7]=a,u[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],this}extractBasis(e,t,i){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,r=t.elements,s=this.elements,a=i[0],o=i[3],l=i[6],c=i[1],u=i[4],f=i[7],d=i[2],m=i[5],g=i[8],_=r[0],p=r[3],h=r[6],S=r[1],M=r[4],E=r[7],D=r[2],L=r[5],T=r[8];return s[0]=a*_+o*S+l*D,s[3]=a*p+o*M+l*L,s[6]=a*h+o*E+l*T,s[1]=c*_+u*S+f*D,s[4]=c*p+u*M+f*L,s[7]=c*h+u*E+f*T,s[2]=d*_+m*S+g*D,s[5]=d*p+m*M+g*L,s[8]=d*h+m*E+g*T,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],a=e[4],o=e[5],l=e[6],c=e[7],u=e[8];return t*a*u-t*o*c-i*s*u+i*o*l+r*s*c-r*a*l}invert(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],a=e[4],o=e[5],l=e[6],c=e[7],u=e[8],f=u*a-o*c,d=o*l-u*s,m=c*s-a*l,g=t*f+i*d+r*m;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const _=1/g;return e[0]=f*_,e[1]=(r*c-u*i)*_,e[2]=(o*i-r*a)*_,e[3]=d*_,e[4]=(u*t-r*l)*_,e[5]=(r*s-o*t)*_,e[6]=m*_,e[7]=(i*l-c*t)*_,e[8]=(a*t-i*s)*_,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,i,r,s,a,o){const l=Math.cos(s),c=Math.sin(s);return this.set(i*l,i*c,-i*(l*a+c*o)+a+e,-r*c,r*l,-r*(-c*a+l*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(ia.makeScale(e,t)),this}rotate(e){return this.premultiply(ia.makeRotation(-e)),this}translate(e,t){return this.premultiply(ia.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,i,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,i=e.elements;for(let r=0;r<9;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<9;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const ia=new Qe;function xh(n){for(let e=n.length-1;e>=0;--e)if(n[e]>=65535)return!0;return!1}function go(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function vg(){const n=go("canvas");return n.style.display="block",n}const Kc={};function Zr(n){n in Kc||(Kc[n]=!0,console.warn(n))}const Zc=new Qe().set(.8224621,.177538,0,.0331941,.9668058,0,.0170827,.0723974,.9105199),Jc=new Qe().set(1.2249401,-.2249404,0,-.0420569,1.0420571,0,-.0196376,-.0786361,1.0982735),bs={[ri]:{transfer:fo,primaries:ho,toReference:n=>n,fromReference:n=>n},[Lt]:{transfer:ft,primaries:ho,toReference:n=>n.convertSRGBToLinear(),fromReference:n=>n.convertLinearToSRGB()},[Co]:{transfer:fo,primaries:po,toReference:n=>n.applyMatrix3(Jc),fromReference:n=>n.applyMatrix3(Zc)},[Sl]:{transfer:ft,primaries:po,toReference:n=>n.convertSRGBToLinear().applyMatrix3(Jc),fromReference:n=>n.applyMatrix3(Zc).convertLinearToSRGB()}},xg=new Set([ri,Co]),ot={enabled:!0,_workingColorSpace:ri,get workingColorSpace(){return this._workingColorSpace},set workingColorSpace(n){if(!xg.has(n))throw new Error(`Unsupported working color space, "${n}".`);this._workingColorSpace=n},convert:function(n,e,t){if(this.enabled===!1||e===t||!e||!t)return n;const i=bs[e].toReference,r=bs[t].fromReference;return r(i(n))},fromWorkingColorSpace:function(n,e){return this.convert(n,this._workingColorSpace,e)},toWorkingColorSpace:function(n,e){return this.convert(n,e,this._workingColorSpace)},getPrimaries:function(n){return bs[n].primaries},getTransfer:function(n){return n===an?fo:bs[n].transfer}};function Sr(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function ra(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}let tr;class Mh{static getDataURL(e){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let t;if(e instanceof HTMLCanvasElement)t=e;else{tr===void 0&&(tr=go("canvas")),tr.width=e.width,tr.height=e.height;const i=tr.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),t=tr}return t.width>2048||t.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",e),t.toDataURL("image/jpeg",.6)):t.toDataURL("image/png")}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=go("canvas");t.width=e.width,t.height=e.height;const i=t.getContext("2d");i.drawImage(e,0,0,e.width,e.height);const r=i.getImageData(0,0,e.width,e.height),s=r.data;for(let a=0;a<s.length;a++)s[a]=Sr(s[a]/255)*255;return i.putImageData(r,0,0),t}else if(e.data){const t=e.data.slice(0);for(let i=0;i<t.length;i++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[i]=Math.floor(Sr(t[i]/255)*255):t[i]=Sr(t[i]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let Mg=0;class Sh{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Mg++}),this.uuid=ds(),this.data=e,this.version=0}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const i={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let a=0,o=r.length;a<o;a++)r[a].isDataTexture?s.push(sa(r[a].image)):s.push(sa(r[a]))}else s=sa(r);i.url=s}return t||(e.images[this.uuid]=i),i}}function sa(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?Mh.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let Sg=0;class en extends Ki{constructor(e=en.DEFAULT_IMAGE,t=en.DEFAULT_MAPPING,i=_n,r=_n,s=sn,a=os,o=vn,l=Si,c=en.DEFAULT_ANISOTROPY,u=an){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Sg++}),this.uuid=ds(),this.name="",this.source=new Sh(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=i,this.wrapT=r,this.magFilter=s,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new Xe(0,0),this.repeat=new Xe(1,1),this.center=new Xe(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Qe,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,typeof u=="string"?this.colorSpace=u:(Zr("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace=u===Xi?Lt:an),this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.needsPMREMUpdate=!1}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const i={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),t||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==lh)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case qa:e.x=e.x-Math.floor(e.x);break;case _n:e.x=e.x<0?0:1;break;case Ya:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case qa:e.y=e.y-Math.floor(e.y);break;case _n:e.y=e.y<0?0:1;break;case Ya:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}get encoding(){return Zr("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace===Lt?Xi:gh}set encoding(e){Zr("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace=e===Xi?Lt:an}}en.DEFAULT_IMAGE=null;en.DEFAULT_MAPPING=lh;en.DEFAULT_ANISOTROPY=1;class wt{constructor(e=0,t=0,i=0,r=1){wt.prototype.isVector4=!0,this.x=e,this.y=t,this.z=i,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,i,r){return this.x=e,this.y=t,this.z=i,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,i=this.y,r=this.z,s=this.w,a=e.elements;return this.x=a[0]*t+a[4]*i+a[8]*r+a[12]*s,this.y=a[1]*t+a[5]*i+a[9]*r+a[13]*s,this.z=a[2]*t+a[6]*i+a[10]*r+a[14]*s,this.w=a[3]*t+a[7]*i+a[11]*r+a[15]*s,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,i,r,s;const l=e.elements,c=l[0],u=l[4],f=l[8],d=l[1],m=l[5],g=l[9],_=l[2],p=l[6],h=l[10];if(Math.abs(u-d)<.01&&Math.abs(f-_)<.01&&Math.abs(g-p)<.01){if(Math.abs(u+d)<.1&&Math.abs(f+_)<.1&&Math.abs(g+p)<.1&&Math.abs(c+m+h-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const M=(c+1)/2,E=(m+1)/2,D=(h+1)/2,L=(u+d)/4,T=(f+_)/4,C=(g+p)/4;return M>E&&M>D?M<.01?(i=0,r=.707106781,s=.707106781):(i=Math.sqrt(M),r=L/i,s=T/i):E>D?E<.01?(i=.707106781,r=0,s=.707106781):(r=Math.sqrt(E),i=L/r,s=C/r):D<.01?(i=.707106781,r=.707106781,s=0):(s=Math.sqrt(D),i=T/s,r=C/s),this.set(i,r,s,t),this}let S=Math.sqrt((p-g)*(p-g)+(f-_)*(f-_)+(d-u)*(d-u));return Math.abs(S)<.001&&(S=1),this.x=(p-g)/S,this.y=(f-_)/S,this.z=(d-u)/S,this.w=Math.acos((c+m+h-1)/2),this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this.w=Math.max(e.w,Math.min(t.w,this.w)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this.w=Math.max(e,Math.min(t,this.w)),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this.w=e.w+(t.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class yg extends Ki{constructor(e=1,t=1,i={}){super(),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=1,this.scissor=new wt(0,0,e,t),this.scissorTest=!1,this.viewport=new wt(0,0,e,t);const r={width:e,height:t,depth:1};i.encoding!==void 0&&(Zr("THREE.WebGLRenderTarget: option.encoding has been replaced by option.colorSpace."),i.colorSpace=i.encoding===Xi?Lt:an),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:sn,depthBuffer:!0,stencilBuffer:!1,depthTexture:null,samples:0},i),this.texture=new en(r,i.mapping,i.wrapS,i.wrapT,i.magFilter,i.minFilter,i.format,i.type,i.anisotropy,i.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.flipY=!1,this.texture.generateMipmaps=i.generateMipmaps,this.texture.internalFormat=i.internalFormat,this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.depthTexture=i.depthTexture,this.samples=i.samples}setSize(e,t,i=1){(this.width!==e||this.height!==t||this.depth!==i)&&(this.width=e,this.height=t,this.depth=i,this.texture.image.width=e,this.texture.image.height=t,this.texture.image.depth=i,this.dispose()),this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.texture=e.texture.clone(),this.texture.isRenderTargetTexture=!0;const t=Object.assign({},e.texture.image);return this.texture.source=new Sh(t),this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class qi extends yg{constructor(e=1,t=1,i={}){super(e,t,i),this.isWebGLRenderTarget=!0}}class yh extends en{constructor(e=null,t=1,i=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=Gt,this.minFilter=Gt,this.wrapR=_n,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Eg extends en{constructor(e=null,t=1,i=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=Gt,this.minFilter=Gt,this.wrapR=_n,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Yi{constructor(e=0,t=0,i=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=i,this._w=r}static slerpFlat(e,t,i,r,s,a,o){let l=i[r+0],c=i[r+1],u=i[r+2],f=i[r+3];const d=s[a+0],m=s[a+1],g=s[a+2],_=s[a+3];if(o===0){e[t+0]=l,e[t+1]=c,e[t+2]=u,e[t+3]=f;return}if(o===1){e[t+0]=d,e[t+1]=m,e[t+2]=g,e[t+3]=_;return}if(f!==_||l!==d||c!==m||u!==g){let p=1-o;const h=l*d+c*m+u*g+f*_,S=h>=0?1:-1,M=1-h*h;if(M>Number.EPSILON){const D=Math.sqrt(M),L=Math.atan2(D,h*S);p=Math.sin(p*L)/D,o=Math.sin(o*L)/D}const E=o*S;if(l=l*p+d*E,c=c*p+m*E,u=u*p+g*E,f=f*p+_*E,p===1-o){const D=1/Math.sqrt(l*l+c*c+u*u+f*f);l*=D,c*=D,u*=D,f*=D}}e[t]=l,e[t+1]=c,e[t+2]=u,e[t+3]=f}static multiplyQuaternionsFlat(e,t,i,r,s,a){const o=i[r],l=i[r+1],c=i[r+2],u=i[r+3],f=s[a],d=s[a+1],m=s[a+2],g=s[a+3];return e[t]=o*g+u*f+l*m-c*d,e[t+1]=l*g+u*d+c*f-o*m,e[t+2]=c*g+u*m+o*d-l*f,e[t+3]=u*g-o*f-l*d-c*m,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,i,r){return this._x=e,this._y=t,this._z=i,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const i=e._x,r=e._y,s=e._z,a=e._order,o=Math.cos,l=Math.sin,c=o(i/2),u=o(r/2),f=o(s/2),d=l(i/2),m=l(r/2),g=l(s/2);switch(a){case"XYZ":this._x=d*u*f+c*m*g,this._y=c*m*f-d*u*g,this._z=c*u*g+d*m*f,this._w=c*u*f-d*m*g;break;case"YXZ":this._x=d*u*f+c*m*g,this._y=c*m*f-d*u*g,this._z=c*u*g-d*m*f,this._w=c*u*f+d*m*g;break;case"ZXY":this._x=d*u*f-c*m*g,this._y=c*m*f+d*u*g,this._z=c*u*g+d*m*f,this._w=c*u*f-d*m*g;break;case"ZYX":this._x=d*u*f-c*m*g,this._y=c*m*f+d*u*g,this._z=c*u*g-d*m*f,this._w=c*u*f+d*m*g;break;case"YZX":this._x=d*u*f+c*m*g,this._y=c*m*f+d*u*g,this._z=c*u*g-d*m*f,this._w=c*u*f-d*m*g;break;case"XZY":this._x=d*u*f-c*m*g,this._y=c*m*f-d*u*g,this._z=c*u*g+d*m*f,this._w=c*u*f+d*m*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const i=t/2,r=Math.sin(i);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,i=t[0],r=t[4],s=t[8],a=t[1],o=t[5],l=t[9],c=t[2],u=t[6],f=t[10],d=i+o+f;if(d>0){const m=.5/Math.sqrt(d+1);this._w=.25/m,this._x=(u-l)*m,this._y=(s-c)*m,this._z=(a-r)*m}else if(i>o&&i>f){const m=2*Math.sqrt(1+i-o-f);this._w=(u-l)/m,this._x=.25*m,this._y=(r+a)/m,this._z=(s+c)/m}else if(o>f){const m=2*Math.sqrt(1+o-i-f);this._w=(s-c)/m,this._x=(r+a)/m,this._y=.25*m,this._z=(l+u)/m}else{const m=2*Math.sqrt(1+f-i-o);this._w=(a-r)/m,this._x=(s+c)/m,this._y=(l+u)/m,this._z=.25*m}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let i=e.dot(t)+1;return i<Number.EPSILON?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Wt(this.dot(e),-1,1)))}rotateTowards(e,t){const i=this.angleTo(e);if(i===0)return this;const r=Math.min(1,t/i);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const i=e._x,r=e._y,s=e._z,a=e._w,o=t._x,l=t._y,c=t._z,u=t._w;return this._x=i*u+a*o+r*c-s*l,this._y=r*u+a*l+s*o-i*c,this._z=s*u+a*c+i*l-r*o,this._w=a*u-i*o-r*l-s*c,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const i=this._x,r=this._y,s=this._z,a=this._w;let o=a*e._w+i*e._x+r*e._y+s*e._z;if(o<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,o=-o):this.copy(e),o>=1)return this._w=a,this._x=i,this._y=r,this._z=s,this;const l=1-o*o;if(l<=Number.EPSILON){const m=1-t;return this._w=m*a+t*this._w,this._x=m*i+t*this._x,this._y=m*r+t*this._y,this._z=m*s+t*this._z,this.normalize(),this}const c=Math.sqrt(l),u=Math.atan2(c,o),f=Math.sin((1-t)*u)/c,d=Math.sin(t*u)/c;return this._w=a*f+this._w*d,this._x=i*f+this._x*d,this._y=r*f+this._y*d,this._z=s*f+this._z*d,this._onChangeCallback(),this}slerpQuaternions(e,t,i){return this.copy(e).slerp(t,i)}random(){const e=Math.random(),t=Math.sqrt(1-e),i=Math.sqrt(e),r=2*Math.PI*Math.random(),s=2*Math.PI*Math.random();return this.set(t*Math.cos(r),i*Math.sin(s),i*Math.cos(s),t*Math.sin(r))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class V{constructor(e=0,t=0,i=0){V.prototype.isVector3=!0,this.x=e,this.y=t,this.z=i}set(e,t,i){return i===void 0&&(i=this.z),this.x=e,this.y=t,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Qc.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Qc.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[3]*i+s[6]*r,this.y=s[1]*t+s[4]*i+s[7]*r,this.z=s[2]*t+s[5]*i+s[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,i=this.y,r=this.z,s=e.elements,a=1/(s[3]*t+s[7]*i+s[11]*r+s[15]);return this.x=(s[0]*t+s[4]*i+s[8]*r+s[12])*a,this.y=(s[1]*t+s[5]*i+s[9]*r+s[13])*a,this.z=(s[2]*t+s[6]*i+s[10]*r+s[14])*a,this}applyQuaternion(e){const t=this.x,i=this.y,r=this.z,s=e.x,a=e.y,o=e.z,l=e.w,c=2*(a*r-o*i),u=2*(o*t-s*r),f=2*(s*i-a*t);return this.x=t+l*c+a*f-o*u,this.y=i+l*u+o*c-s*f,this.z=r+l*f+s*u-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[4]*i+s[8]*r,this.y=s[1]*t+s[5]*i+s[9]*r,this.z=s[2]*t+s[6]*i+s[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const i=e.x,r=e.y,s=e.z,a=t.x,o=t.y,l=t.z;return this.x=r*l-s*o,this.y=s*a-i*l,this.z=i*o-r*a,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const i=e.dot(this)/t;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return oa.copy(this).projectOnVector(e),this.sub(oa)}reflect(e){return this.sub(oa.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Wt(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y,r=this.z-e.z;return t*t+i*i+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,i){const r=Math.sin(t)*e;return this.x=r*Math.sin(i),this.y=Math.cos(t)*e,this.z=r*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,i){return this.x=e*Math.sin(t),this.y=i,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=i,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=(Math.random()-.5)*2,t=Math.random()*Math.PI*2,i=Math.sqrt(1-e**2);return this.x=i*Math.cos(t),this.y=i*Math.sin(t),this.z=e,this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const oa=new V,Qc=new Yi;class ps{constructor(e=new V(1/0,1/0,1/0),t=new V(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t+=3)this.expandByPoint(fn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,i=e.count;t<i;t++)this.expandByPoint(fn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const i=fn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const i=e.geometry;if(i!==void 0){const s=i.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=s.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,fn):fn.fromBufferAttribute(s,a),fn.applyMatrix4(e.matrixWorld),this.expandByPoint(fn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Ts.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),Ts.copy(i.boundingBox)),Ts.applyMatrix4(e.matrixWorld),this.union(Ts)}const r=e.children;for(let s=0,a=r.length;s<a;s++)this.expandByObject(r[s],t);return this}containsPoint(e){return!(e.x<this.min.x||e.x>this.max.x||e.y<this.min.y||e.y>this.max.y||e.z<this.min.z||e.z>this.max.z)}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return!(e.max.x<this.min.x||e.min.x>this.max.x||e.max.y<this.min.y||e.min.y>this.max.y||e.max.z<this.min.z||e.min.z>this.max.z)}intersectsSphere(e){return this.clampPoint(e.center,fn),fn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,i;return e.normal.x>0?(t=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),t<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Fr),As.subVectors(this.max,Fr),nr.subVectors(e.a,Fr),ir.subVectors(e.b,Fr),rr.subVectors(e.c,Fr),oi.subVectors(ir,nr),ai.subVectors(rr,ir),Pi.subVectors(nr,rr);let t=[0,-oi.z,oi.y,0,-ai.z,ai.y,0,-Pi.z,Pi.y,oi.z,0,-oi.x,ai.z,0,-ai.x,Pi.z,0,-Pi.x,-oi.y,oi.x,0,-ai.y,ai.x,0,-Pi.y,Pi.x,0];return!aa(t,nr,ir,rr,As)||(t=[1,0,0,0,1,0,0,0,1],!aa(t,nr,ir,rr,As))?!1:(ws.crossVectors(oi,ai),t=[ws.x,ws.y,ws.z],aa(t,nr,ir,rr,As))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,fn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(fn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Xn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Xn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Xn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Xn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Xn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Xn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Xn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Xn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Xn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}}const Xn=[new V,new V,new V,new V,new V,new V,new V,new V],fn=new V,Ts=new ps,nr=new V,ir=new V,rr=new V,oi=new V,ai=new V,Pi=new V,Fr=new V,As=new V,ws=new V,Di=new V;function aa(n,e,t,i,r){for(let s=0,a=n.length-3;s<=a;s+=3){Di.fromArray(n,s);const o=r.x*Math.abs(Di.x)+r.y*Math.abs(Di.y)+r.z*Math.abs(Di.z),l=e.dot(Di),c=t.dot(Di),u=i.dot(Di);if(Math.max(-Math.max(l,c,u),Math.min(l,c,u))>o)return!1}return!0}const bg=new ps,Br=new V,la=new V;class Lo{constructor(e=new V,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const i=this.center;t!==void 0?i.copy(t):bg.setFromPoints(e).getCenter(i);let r=0;for(let s=0,a=e.length;s<a;s++)r=Math.max(r,i.distanceToSquared(e[s]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const i=this.center.distanceToSquared(e);return t.copy(e),i>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Br.subVectors(e,this.center);const t=Br.lengthSq();if(t>this.radius*this.radius){const i=Math.sqrt(t),r=(i-this.radius)*.5;this.center.addScaledVector(Br,r/i),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(la.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Br.copy(e.center).add(la)),this.expandByPoint(Br.copy(e.center).sub(la))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}}const qn=new V,ca=new V,Rs=new V,li=new V,ua=new V,Cs=new V,fa=new V;class yl{constructor(e=new V,t=new V(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,qn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const i=t.dot(this.direction);return i<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=qn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(qn.copy(this.origin).addScaledVector(this.direction,t),qn.distanceToSquared(e))}distanceSqToSegment(e,t,i,r){ca.copy(e).add(t).multiplyScalar(.5),Rs.copy(t).sub(e).normalize(),li.copy(this.origin).sub(ca);const s=e.distanceTo(t)*.5,a=-this.direction.dot(Rs),o=li.dot(this.direction),l=-li.dot(Rs),c=li.lengthSq(),u=Math.abs(1-a*a);let f,d,m,g;if(u>0)if(f=a*l-o,d=a*o-l,g=s*u,f>=0)if(d>=-g)if(d<=g){const _=1/u;f*=_,d*=_,m=f*(f+a*d+2*o)+d*(a*f+d+2*l)+c}else d=s,f=Math.max(0,-(a*d+o)),m=-f*f+d*(d+2*l)+c;else d=-s,f=Math.max(0,-(a*d+o)),m=-f*f+d*(d+2*l)+c;else d<=-g?(f=Math.max(0,-(-a*s+o)),d=f>0?-s:Math.min(Math.max(-s,-l),s),m=-f*f+d*(d+2*l)+c):d<=g?(f=0,d=Math.min(Math.max(-s,-l),s),m=d*(d+2*l)+c):(f=Math.max(0,-(a*s+o)),d=f>0?s:Math.min(Math.max(-s,-l),s),m=-f*f+d*(d+2*l)+c);else d=a>0?-s:s,f=Math.max(0,-(a*d+o)),m=-f*f+d*(d+2*l)+c;return i&&i.copy(this.origin).addScaledVector(this.direction,f),r&&r.copy(ca).addScaledVector(Rs,d),m}intersectSphere(e,t){qn.subVectors(e.center,this.origin);const i=qn.dot(this.direction),r=qn.dot(qn)-i*i,s=e.radius*e.radius;if(r>s)return null;const a=Math.sqrt(s-r),o=i-a,l=i+a;return l<0?null:o<0?this.at(l,t):this.at(o,t)}intersectsSphere(e){return this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(e.normal)+e.constant)/t;return i>=0?i:null}intersectPlane(e,t){const i=this.distanceToPlane(e);return i===null?null:this.at(i,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let i,r,s,a,o,l;const c=1/this.direction.x,u=1/this.direction.y,f=1/this.direction.z,d=this.origin;return c>=0?(i=(e.min.x-d.x)*c,r=(e.max.x-d.x)*c):(i=(e.max.x-d.x)*c,r=(e.min.x-d.x)*c),u>=0?(s=(e.min.y-d.y)*u,a=(e.max.y-d.y)*u):(s=(e.max.y-d.y)*u,a=(e.min.y-d.y)*u),i>a||s>r||((s>i||isNaN(i))&&(i=s),(a<r||isNaN(r))&&(r=a),f>=0?(o=(e.min.z-d.z)*f,l=(e.max.z-d.z)*f):(o=(e.max.z-d.z)*f,l=(e.min.z-d.z)*f),i>l||o>r)||((o>i||i!==i)&&(i=o),(l<r||r!==r)&&(r=l),r<0)?null:this.at(i>=0?i:r,t)}intersectsBox(e){return this.intersectBox(e,qn)!==null}intersectTriangle(e,t,i,r,s){ua.subVectors(t,e),Cs.subVectors(i,e),fa.crossVectors(ua,Cs);let a=this.direction.dot(fa),o;if(a>0){if(r)return null;o=1}else if(a<0)o=-1,a=-a;else return null;li.subVectors(this.origin,e);const l=o*this.direction.dot(Cs.crossVectors(li,Cs));if(l<0)return null;const c=o*this.direction.dot(ua.cross(li));if(c<0||l+c>a)return null;const u=-o*li.dot(fa);return u<0?null:this.at(u/a,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class yt{constructor(e,t,i,r,s,a,o,l,c,u,f,d,m,g,_,p){yt.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,i,r,s,a,o,l,c,u,f,d,m,g,_,p)}set(e,t,i,r,s,a,o,l,c,u,f,d,m,g,_,p){const h=this.elements;return h[0]=e,h[4]=t,h[8]=i,h[12]=r,h[1]=s,h[5]=a,h[9]=o,h[13]=l,h[2]=c,h[6]=u,h[10]=f,h[14]=d,h[3]=m,h[7]=g,h[11]=_,h[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new yt().fromArray(this.elements)}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],t[9]=i[9],t[10]=i[10],t[11]=i[11],t[12]=i[12],t[13]=i[13],t[14]=i[14],t[15]=i[15],this}copyPosition(e){const t=this.elements,i=e.elements;return t[12]=i[12],t[13]=i[13],t[14]=i[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,i){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(e,t,i){return this.set(e.x,t.x,i.x,0,e.y,t.y,i.y,0,e.z,t.z,i.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,i=e.elements,r=1/sr.setFromMatrixColumn(e,0).length(),s=1/sr.setFromMatrixColumn(e,1).length(),a=1/sr.setFromMatrixColumn(e,2).length();return t[0]=i[0]*r,t[1]=i[1]*r,t[2]=i[2]*r,t[3]=0,t[4]=i[4]*s,t[5]=i[5]*s,t[6]=i[6]*s,t[7]=0,t[8]=i[8]*a,t[9]=i[9]*a,t[10]=i[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,i=e.x,r=e.y,s=e.z,a=Math.cos(i),o=Math.sin(i),l=Math.cos(r),c=Math.sin(r),u=Math.cos(s),f=Math.sin(s);if(e.order==="XYZ"){const d=a*u,m=a*f,g=o*u,_=o*f;t[0]=l*u,t[4]=-l*f,t[8]=c,t[1]=m+g*c,t[5]=d-_*c,t[9]=-o*l,t[2]=_-d*c,t[6]=g+m*c,t[10]=a*l}else if(e.order==="YXZ"){const d=l*u,m=l*f,g=c*u,_=c*f;t[0]=d+_*o,t[4]=g*o-m,t[8]=a*c,t[1]=a*f,t[5]=a*u,t[9]=-o,t[2]=m*o-g,t[6]=_+d*o,t[10]=a*l}else if(e.order==="ZXY"){const d=l*u,m=l*f,g=c*u,_=c*f;t[0]=d-_*o,t[4]=-a*f,t[8]=g+m*o,t[1]=m+g*o,t[5]=a*u,t[9]=_-d*o,t[2]=-a*c,t[6]=o,t[10]=a*l}else if(e.order==="ZYX"){const d=a*u,m=a*f,g=o*u,_=o*f;t[0]=l*u,t[4]=g*c-m,t[8]=d*c+_,t[1]=l*f,t[5]=_*c+d,t[9]=m*c-g,t[2]=-c,t[6]=o*l,t[10]=a*l}else if(e.order==="YZX"){const d=a*l,m=a*c,g=o*l,_=o*c;t[0]=l*u,t[4]=_-d*f,t[8]=g*f+m,t[1]=f,t[5]=a*u,t[9]=-o*u,t[2]=-c*u,t[6]=m*f+g,t[10]=d-_*f}else if(e.order==="XZY"){const d=a*l,m=a*c,g=o*l,_=o*c;t[0]=l*u,t[4]=-f,t[8]=c*u,t[1]=d*f+_,t[5]=a*u,t[9]=m*f-g,t[2]=g*f-m,t[6]=o*u,t[10]=_*f+d}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Tg,e,Ag)}lookAt(e,t,i){const r=this.elements;return Zt.subVectors(e,t),Zt.lengthSq()===0&&(Zt.z=1),Zt.normalize(),ci.crossVectors(i,Zt),ci.lengthSq()===0&&(Math.abs(i.z)===1?Zt.x+=1e-4:Zt.z+=1e-4,Zt.normalize(),ci.crossVectors(i,Zt)),ci.normalize(),Ls.crossVectors(Zt,ci),r[0]=ci.x,r[4]=Ls.x,r[8]=Zt.x,r[1]=ci.y,r[5]=Ls.y,r[9]=Zt.y,r[2]=ci.z,r[6]=Ls.z,r[10]=Zt.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,r=t.elements,s=this.elements,a=i[0],o=i[4],l=i[8],c=i[12],u=i[1],f=i[5],d=i[9],m=i[13],g=i[2],_=i[6],p=i[10],h=i[14],S=i[3],M=i[7],E=i[11],D=i[15],L=r[0],T=r[4],C=r[8],x=r[12],A=r[1],k=r[5],te=r[9],se=r[13],N=r[2],W=r[6],G=r[10],Q=r[14],$=r[3],re=r[7],ae=r[11],pe=r[15];return s[0]=a*L+o*A+l*N+c*$,s[4]=a*T+o*k+l*W+c*re,s[8]=a*C+o*te+l*G+c*ae,s[12]=a*x+o*se+l*Q+c*pe,s[1]=u*L+f*A+d*N+m*$,s[5]=u*T+f*k+d*W+m*re,s[9]=u*C+f*te+d*G+m*ae,s[13]=u*x+f*se+d*Q+m*pe,s[2]=g*L+_*A+p*N+h*$,s[6]=g*T+_*k+p*W+h*re,s[10]=g*C+_*te+p*G+h*ae,s[14]=g*x+_*se+p*Q+h*pe,s[3]=S*L+M*A+E*N+D*$,s[7]=S*T+M*k+E*W+D*re,s[11]=S*C+M*te+E*G+D*ae,s[15]=S*x+M*se+E*Q+D*pe,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[4],r=e[8],s=e[12],a=e[1],o=e[5],l=e[9],c=e[13],u=e[2],f=e[6],d=e[10],m=e[14],g=e[3],_=e[7],p=e[11],h=e[15];return g*(+s*l*f-r*c*f-s*o*d+i*c*d+r*o*m-i*l*m)+_*(+t*l*m-t*c*d+s*a*d-r*a*m+r*c*u-s*l*u)+p*(+t*c*f-t*o*m-s*a*f+i*a*m+s*o*u-i*c*u)+h*(-r*o*u-t*l*f+t*o*d+r*a*f-i*a*d+i*l*u)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,i){const r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=i),this}invert(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],a=e[4],o=e[5],l=e[6],c=e[7],u=e[8],f=e[9],d=e[10],m=e[11],g=e[12],_=e[13],p=e[14],h=e[15],S=f*p*c-_*d*c+_*l*m-o*p*m-f*l*h+o*d*h,M=g*d*c-u*p*c-g*l*m+a*p*m+u*l*h-a*d*h,E=u*_*c-g*f*c+g*o*m-a*_*m-u*o*h+a*f*h,D=g*f*l-u*_*l-g*o*d+a*_*d+u*o*p-a*f*p,L=t*S+i*M+r*E+s*D;if(L===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const T=1/L;return e[0]=S*T,e[1]=(_*d*s-f*p*s-_*r*m+i*p*m+f*r*h-i*d*h)*T,e[2]=(o*p*s-_*l*s+_*r*c-i*p*c-o*r*h+i*l*h)*T,e[3]=(f*l*s-o*d*s-f*r*c+i*d*c+o*r*m-i*l*m)*T,e[4]=M*T,e[5]=(u*p*s-g*d*s+g*r*m-t*p*m-u*r*h+t*d*h)*T,e[6]=(g*l*s-a*p*s-g*r*c+t*p*c+a*r*h-t*l*h)*T,e[7]=(a*d*s-u*l*s+u*r*c-t*d*c-a*r*m+t*l*m)*T,e[8]=E*T,e[9]=(g*f*s-u*_*s-g*i*m+t*_*m+u*i*h-t*f*h)*T,e[10]=(a*_*s-g*o*s+g*i*c-t*_*c-a*i*h+t*o*h)*T,e[11]=(u*o*s-a*f*s-u*i*c+t*f*c+a*i*m-t*o*m)*T,e[12]=D*T,e[13]=(u*_*r-g*f*r+g*i*d-t*_*d-u*i*p+t*f*p)*T,e[14]=(g*o*r-a*_*r-g*i*l+t*_*l+a*i*p-t*o*p)*T,e[15]=(a*f*r-u*o*r+u*i*l-t*f*l-a*i*d+t*o*d)*T,this}scale(e){const t=this.elements,i=e.x,r=e.y,s=e.z;return t[0]*=i,t[4]*=r,t[8]*=s,t[1]*=i,t[5]*=r,t[9]*=s,t[2]*=i,t[6]*=r,t[10]*=s,t[3]*=i,t[7]*=r,t[11]*=s,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,i,r))}makeTranslation(e,t,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,i,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,t,-i,0,0,i,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,0,i,0,0,1,0,0,-i,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,0,i,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const i=Math.cos(t),r=Math.sin(t),s=1-i,a=e.x,o=e.y,l=e.z,c=s*a,u=s*o;return this.set(c*a+i,c*o-r*l,c*l+r*o,0,c*o+r*l,u*o+i,u*l-r*a,0,c*l-r*o,u*l+r*a,s*l*l+i,0,0,0,0,1),this}makeScale(e,t,i){return this.set(e,0,0,0,0,t,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,t,i,r,s,a){return this.set(1,i,s,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,i){const r=this.elements,s=t._x,a=t._y,o=t._z,l=t._w,c=s+s,u=a+a,f=o+o,d=s*c,m=s*u,g=s*f,_=a*u,p=a*f,h=o*f,S=l*c,M=l*u,E=l*f,D=i.x,L=i.y,T=i.z;return r[0]=(1-(_+h))*D,r[1]=(m+E)*D,r[2]=(g-M)*D,r[3]=0,r[4]=(m-E)*L,r[5]=(1-(d+h))*L,r[6]=(p+S)*L,r[7]=0,r[8]=(g+M)*T,r[9]=(p-S)*T,r[10]=(1-(d+_))*T,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,i){const r=this.elements;let s=sr.set(r[0],r[1],r[2]).length();const a=sr.set(r[4],r[5],r[6]).length(),o=sr.set(r[8],r[9],r[10]).length();this.determinant()<0&&(s=-s),e.x=r[12],e.y=r[13],e.z=r[14],hn.copy(this);const c=1/s,u=1/a,f=1/o;return hn.elements[0]*=c,hn.elements[1]*=c,hn.elements[2]*=c,hn.elements[4]*=u,hn.elements[5]*=u,hn.elements[6]*=u,hn.elements[8]*=f,hn.elements[9]*=f,hn.elements[10]*=f,t.setFromRotationMatrix(hn),i.x=s,i.y=a,i.z=o,this}makePerspective(e,t,i,r,s,a,o=ti){const l=this.elements,c=2*s/(t-e),u=2*s/(i-r),f=(t+e)/(t-e),d=(i+r)/(i-r);let m,g;if(o===ti)m=-(a+s)/(a-s),g=-2*a*s/(a-s);else if(o===mo)m=-a/(a-s),g=-a*s/(a-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=c,l[4]=0,l[8]=f,l[12]=0,l[1]=0,l[5]=u,l[9]=d,l[13]=0,l[2]=0,l[6]=0,l[10]=m,l[14]=g,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,t,i,r,s,a,o=ti){const l=this.elements,c=1/(t-e),u=1/(i-r),f=1/(a-s),d=(t+e)*c,m=(i+r)*u;let g,_;if(o===ti)g=(a+s)*f,_=-2*f;else if(o===mo)g=s*f,_=-1*f;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=2*c,l[4]=0,l[8]=0,l[12]=-d,l[1]=0,l[5]=2*u,l[9]=0,l[13]=-m,l[2]=0,l[6]=0,l[10]=_,l[14]=-g,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){const t=this.elements,i=e.elements;for(let r=0;r<16;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<16;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e[t+9]=i[9],e[t+10]=i[10],e[t+11]=i[11],e[t+12]=i[12],e[t+13]=i[13],e[t+14]=i[14],e[t+15]=i[15],e}}const sr=new V,hn=new yt,Tg=new V(0,0,0),Ag=new V(1,1,1),ci=new V,Ls=new V,Zt=new V,eu=new yt,tu=new Yi;class Po{constructor(e=0,t=0,i=0,r=Po.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=i,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,i,r=this._order){return this._x=e,this._y=t,this._z=i,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,i=!0){const r=e.elements,s=r[0],a=r[4],o=r[8],l=r[1],c=r[5],u=r[9],f=r[2],d=r[6],m=r[10];switch(t){case"XYZ":this._y=Math.asin(Wt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-u,m),this._z=Math.atan2(-a,s)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Wt(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(o,m),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-f,s),this._z=0);break;case"ZXY":this._x=Math.asin(Wt(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-f,m),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-Wt(f,-1,1)),Math.abs(f)<.9999999?(this._x=Math.atan2(d,m),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(Wt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-u,c),this._y=Math.atan2(-f,s)):(this._x=0,this._y=Math.atan2(o,m));break;case"XZY":this._z=Math.asin(-Wt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(o,s)):(this._x=Math.atan2(-u,m),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,i){return eu.makeRotationFromQuaternion(e),this.setFromRotationMatrix(eu,t,i)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return tu.setFromEuler(this),this.setFromQuaternion(tu,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Po.DEFAULT_ORDER="XYZ";class Eh{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let wg=0;const nu=new V,or=new Yi,Yn=new yt,Ps=new V,zr=new V,Rg=new V,Cg=new Yi,iu=new V(1,0,0),ru=new V(0,1,0),su=new V(0,0,1),Lg={type:"added"},Pg={type:"removed"};class Pt extends Ki{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:wg++}),this.uuid=ds(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Pt.DEFAULT_UP.clone();const e=new V,t=new Po,i=new Yi,r=new V(1,1,1);function s(){i.setFromEuler(t,!1)}function a(){t.setFromQuaternion(i,void 0,!1)}t._onChange(s),i._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new yt},normalMatrix:{value:new Qe}}),this.matrix=new yt,this.matrixWorld=new yt,this.matrixAutoUpdate=Pt.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Pt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Eh,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return or.setFromAxisAngle(e,t),this.quaternion.multiply(or),this}rotateOnWorldAxis(e,t){return or.setFromAxisAngle(e,t),this.quaternion.premultiply(or),this}rotateX(e){return this.rotateOnAxis(iu,e)}rotateY(e){return this.rotateOnAxis(ru,e)}rotateZ(e){return this.rotateOnAxis(su,e)}translateOnAxis(e,t){return nu.copy(e).applyQuaternion(this.quaternion),this.position.add(nu.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(iu,e)}translateY(e){return this.translateOnAxis(ru,e)}translateZ(e){return this.translateOnAxis(su,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Yn.copy(this.matrixWorld).invert())}lookAt(e,t,i){e.isVector3?Ps.copy(e):Ps.set(e,t,i);const r=this.parent;this.updateWorldMatrix(!0,!1),zr.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Yn.lookAt(zr,Ps,this.up):Yn.lookAt(Ps,zr,this.up),this.quaternion.setFromRotationMatrix(Yn),r&&(Yn.extractRotation(r.matrixWorld),or.setFromRotationMatrix(Yn),this.quaternion.premultiply(or.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.parent!==null&&e.parent.remove(e),e.parent=this,this.children.push(e),e.dispatchEvent(Lg)):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Pg)),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Yn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Yn.multiply(e.parent.matrixWorld)),e.applyMatrix4(Yn),this.add(e),e.updateWorldMatrix(!1,!0),this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let i=0,r=this.children.length;i<r;i++){const a=this.children[i].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,i=[]){this[e]===t&&i.push(this);const r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].getObjectsByProperty(e,t,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(zr,e,Rg),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(zr,Cg,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let i=0,r=t.length;i<r;i++){const s=t[i];(s.matrixWorldAutoUpdate===!0||e===!0)&&s.updateMatrixWorld(e)}}updateWorldMatrix(e,t){const i=this.parent;if(e===!0&&i!==null&&i.matrixWorldAutoUpdate===!0&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),t===!0){const r=this.children;for(let s=0,a=r.length;s<a;s++){const o=r[s];o.matrixWorldAutoUpdate===!0&&o.updateWorldMatrix(!1,!0)}}}toJSON(e){const t=e===void 0||typeof e=="string",i={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.visibility=this._visibility,r.active=this._active,r.bounds=this._bounds.map(o=>({boxInitialized:o.boxInitialized,boxMin:o.box.min.toArray(),boxMax:o.box.max.toArray(),sphereInitialized:o.sphereInitialized,sphereRadius:o.sphere.radius,sphereCenter:o.sphere.center.toArray()})),r.maxGeometryCount=this._maxGeometryCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.geometryCount=this._geometryCount,r.matricesTexture=this._matricesTexture.toJSON(e),this.boundingSphere!==null&&(r.boundingSphere={center:r.boundingSphere.center.toArray(),radius:r.boundingSphere.radius}),this.boundingBox!==null&&(r.boundingBox={min:r.boundingBox.min.toArray(),max:r.boundingBox.max.toArray()}));function s(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(e.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const l=o.shapes;if(Array.isArray(l))for(let c=0,u=l.length;c<u;c++){const f=l[c];s(e.shapes,f)}else s(e.shapes,l)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(s(e.materials,this.material[l]));r.material=o}else r.material=s(e.materials,this.material);if(this.children.length>0){r.children=[];for(let o=0;o<this.children.length;o++)r.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let o=0;o<this.animations.length;o++){const l=this.animations[o];r.animations.push(s(e.animations,l))}}if(t){const o=a(e.geometries),l=a(e.materials),c=a(e.textures),u=a(e.images),f=a(e.shapes),d=a(e.skeletons),m=a(e.animations),g=a(e.nodes);o.length>0&&(i.geometries=o),l.length>0&&(i.materials=l),c.length>0&&(i.textures=c),u.length>0&&(i.images=u),f.length>0&&(i.shapes=f),d.length>0&&(i.skeletons=d),m.length>0&&(i.animations=m),g.length>0&&(i.nodes=g)}return i.object=r,i;function a(o){const l=[];for(const c in o){const u=o[c];delete u.metadata,l.push(u)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let i=0;i<e.children.length;i++){const r=e.children[i];this.add(r.clone())}return this}}Pt.DEFAULT_UP=new V(0,1,0);Pt.DEFAULT_MATRIX_AUTO_UPDATE=!0;Pt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const dn=new V,jn=new V,ha=new V,$n=new V,ar=new V,lr=new V,ou=new V,da=new V,pa=new V,ma=new V;let Ds=!1;class gn{constructor(e=new V,t=new V,i=new V){this.a=e,this.b=t,this.c=i}static getNormal(e,t,i,r){r.subVectors(i,t),dn.subVectors(e,t),r.cross(dn);const s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(e,t,i,r,s){dn.subVectors(r,t),jn.subVectors(i,t),ha.subVectors(e,t);const a=dn.dot(dn),o=dn.dot(jn),l=dn.dot(ha),c=jn.dot(jn),u=jn.dot(ha),f=a*c-o*o;if(f===0)return s.set(0,0,0),null;const d=1/f,m=(c*l-o*u)*d,g=(a*u-o*l)*d;return s.set(1-m-g,g,m)}static containsPoint(e,t,i,r){return this.getBarycoord(e,t,i,r,$n)===null?!1:$n.x>=0&&$n.y>=0&&$n.x+$n.y<=1}static getUV(e,t,i,r,s,a,o,l){return Ds===!1&&(console.warn("THREE.Triangle.getUV() has been renamed to THREE.Triangle.getInterpolation()."),Ds=!0),this.getInterpolation(e,t,i,r,s,a,o,l)}static getInterpolation(e,t,i,r,s,a,o,l){return this.getBarycoord(e,t,i,r,$n)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(s,$n.x),l.addScaledVector(a,$n.y),l.addScaledVector(o,$n.z),l)}static isFrontFacing(e,t,i,r){return dn.subVectors(i,t),jn.subVectors(e,t),dn.cross(jn).dot(r)<0}set(e,t,i){return this.a.copy(e),this.b.copy(t),this.c.copy(i),this}setFromPointsAndIndices(e,t,i,r){return this.a.copy(e[t]),this.b.copy(e[i]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,i,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return dn.subVectors(this.c,this.b),jn.subVectors(this.a,this.b),dn.cross(jn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return gn.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return gn.getBarycoord(e,this.a,this.b,this.c,t)}getUV(e,t,i,r,s){return Ds===!1&&(console.warn("THREE.Triangle.getUV() has been renamed to THREE.Triangle.getInterpolation()."),Ds=!0),gn.getInterpolation(e,this.a,this.b,this.c,t,i,r,s)}getInterpolation(e,t,i,r,s){return gn.getInterpolation(e,this.a,this.b,this.c,t,i,r,s)}containsPoint(e){return gn.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return gn.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const i=this.a,r=this.b,s=this.c;let a,o;ar.subVectors(r,i),lr.subVectors(s,i),da.subVectors(e,i);const l=ar.dot(da),c=lr.dot(da);if(l<=0&&c<=0)return t.copy(i);pa.subVectors(e,r);const u=ar.dot(pa),f=lr.dot(pa);if(u>=0&&f<=u)return t.copy(r);const d=l*f-u*c;if(d<=0&&l>=0&&u<=0)return a=l/(l-u),t.copy(i).addScaledVector(ar,a);ma.subVectors(e,s);const m=ar.dot(ma),g=lr.dot(ma);if(g>=0&&m<=g)return t.copy(s);const _=m*c-l*g;if(_<=0&&c>=0&&g<=0)return o=c/(c-g),t.copy(i).addScaledVector(lr,o);const p=u*g-m*f;if(p<=0&&f-u>=0&&m-g>=0)return ou.subVectors(s,r),o=(f-u)/(f-u+(m-g)),t.copy(r).addScaledVector(ou,o);const h=1/(p+_+d);return a=_*h,o=d*h,t.copy(i).addScaledVector(ar,a).addScaledVector(lr,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const bh={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},ui={h:0,s:0,l:0},Us={h:0,s:0,l:0};function ga(n,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?n+(e-n)*6*t:t<1/2?e:t<2/3?n+(e-n)*6*(2/3-t):n}class nt{constructor(e,t,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,i)}set(e,t,i){if(t===void 0&&i===void 0){const r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,t,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Lt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,ot.toWorkingColorSpace(this,t),this}setRGB(e,t,i,r=ot.workingColorSpace){return this.r=e,this.g=t,this.b=i,ot.toWorkingColorSpace(this,r),this}setHSL(e,t,i,r=ot.workingColorSpace){if(e=gg(e,1),t=Wt(t,0,1),i=Wt(i,0,1),t===0)this.r=this.g=this.b=i;else{const s=i<=.5?i*(1+t):i+t-i*t,a=2*i-s;this.r=ga(a,s,e+1/3),this.g=ga(a,s,e),this.b=ga(a,s,e-1/3)}return ot.toWorkingColorSpace(this,r),this}setStyle(e,t=Lt){function i(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let s;const a=r[1],o=r[2];switch(a){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){const s=r[1],a=s.length;if(a===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(s,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Lt){const i=bh[e.toLowerCase()];return i!==void 0?this.setHex(i,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Sr(e.r),this.g=Sr(e.g),this.b=Sr(e.b),this}copyLinearToSRGB(e){return this.r=ra(e.r),this.g=ra(e.g),this.b=ra(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Lt){return ot.fromWorkingColorSpace(It.copy(this),e),Math.round(Wt(It.r*255,0,255))*65536+Math.round(Wt(It.g*255,0,255))*256+Math.round(Wt(It.b*255,0,255))}getHexString(e=Lt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=ot.workingColorSpace){ot.fromWorkingColorSpace(It.copy(this),t);const i=It.r,r=It.g,s=It.b,a=Math.max(i,r,s),o=Math.min(i,r,s);let l,c;const u=(o+a)/2;if(o===a)l=0,c=0;else{const f=a-o;switch(c=u<=.5?f/(a+o):f/(2-a-o),a){case i:l=(r-s)/f+(r<s?6:0);break;case r:l=(s-i)/f+2;break;case s:l=(i-r)/f+4;break}l/=6}return e.h=l,e.s=c,e.l=u,e}getRGB(e,t=ot.workingColorSpace){return ot.fromWorkingColorSpace(It.copy(this),t),e.r=It.r,e.g=It.g,e.b=It.b,e}getStyle(e=Lt){ot.fromWorkingColorSpace(It.copy(this),e);const t=It.r,i=It.g,r=It.b;return e!==Lt?`color(${e} ${t.toFixed(3)} ${i.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(i*255)},${Math.round(r*255)})`}offsetHSL(e,t,i){return this.getHSL(ui),this.setHSL(ui.h+e,ui.s+t,ui.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,i){return this.r=e.r+(t.r-e.r)*i,this.g=e.g+(t.g-e.g)*i,this.b=e.b+(t.b-e.b)*i,this}lerpHSL(e,t){this.getHSL(ui),e.getHSL(Us);const i=na(ui.h,Us.h,t),r=na(ui.s,Us.s,t),s=na(ui.l,Us.l,t);return this.setHSL(i,r,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,i=this.g,r=this.b,s=e.elements;return this.r=s[0]*t+s[3]*i+s[6]*r,this.g=s[1]*t+s[4]*i+s[7]*r,this.b=s[2]*t+s[5]*i+s[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const It=new nt;nt.NAMES=bh;let Dg=0;class Cr extends Ki{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Dg++}),this.uuid=ds(),this.name="",this.type="Material",this.blending=Mr,this.side=bi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Ga,this.blendDst=ka,this.blendEquation=Fi,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new nt(0,0,0),this.blendAlpha=0,this.depthFunc=uo,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=qc,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=er,this.stencilZFail=er,this.stencilZPass=er,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBuild(){}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const i=e[t];if(i===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(i):r&&r.isVector3&&i&&i.isVector3?r.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const i={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==Mr&&(i.blending=this.blending),this.side!==bi&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==Ga&&(i.blendSrc=this.blendSrc),this.blendDst!==ka&&(i.blendDst=this.blendDst),this.blendEquation!==Fi&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==uo&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==qc&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==er&&(i.stencilFail=this.stencilFail),this.stencilZFail!==er&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==er&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function r(s){const a=[];for(const o in s){const l=s[o];delete l.metadata,a.push(l)}return a}if(t){const s=r(e.textures),a=r(e.images);s.length>0&&(i.textures=s),a.length>0&&(i.images=a)}return i}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let i=null;if(t!==null){const r=t.length;i=new Array(r);for(let s=0;s!==r;++s)i[s]=t[s].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class El extends Cr{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new nt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.combine=ah,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const St=new V,Is=new Xe;class jt{constructor(e,t,i=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=i,this.usage=Yc,this._updateRange={offset:0,count:-1},this.updateRanges=[],this.gpuType=mi,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}get updateRange(){return console.warn("THREE.BufferAttribute: updateRange() is deprecated and will be removed in r169. Use addUpdateRange() instead."),this._updateRange}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,i){e*=this.itemSize,i*=t.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[e+r]=t.array[i+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,i=this.count;t<i;t++)Is.fromBufferAttribute(this,t),Is.applyMatrix3(e),this.setXY(t,Is.x,Is.y);else if(this.itemSize===3)for(let t=0,i=this.count;t<i;t++)St.fromBufferAttribute(this,t),St.applyMatrix3(e),this.setXYZ(t,St.x,St.y,St.z);return this}applyMatrix4(e){for(let t=0,i=this.count;t<i;t++)St.fromBufferAttribute(this,t),St.applyMatrix4(e),this.setXYZ(t,St.x,St.y,St.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)St.fromBufferAttribute(this,t),St.applyNormalMatrix(e),this.setXYZ(t,St.x,St.y,St.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)St.fromBufferAttribute(this,t),St.transformDirection(e),this.setXYZ(t,St.x,St.y,St.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let i=this.array[e*this.itemSize+t];return this.normalized&&(i=Or(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=qt(i,this.array)),this.array[e*this.itemSize+t]=i,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Or(t,this.array)),t}setX(e,t){return this.normalized&&(t=qt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Or(t,this.array)),t}setY(e,t){return this.normalized&&(t=qt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Or(t,this.array)),t}setZ(e,t){return this.normalized&&(t=qt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Or(t,this.array)),t}setW(e,t){return this.normalized&&(t=qt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,i){return e*=this.itemSize,this.normalized&&(t=qt(t,this.array),i=qt(i,this.array)),this.array[e+0]=t,this.array[e+1]=i,this}setXYZ(e,t,i,r){return e*=this.itemSize,this.normalized&&(t=qt(t,this.array),i=qt(i,this.array),r=qt(r,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this}setXYZW(e,t,i,r,s){return e*=this.itemSize,this.normalized&&(t=qt(t,this.array),i=qt(i,this.array),r=qt(r,this.array),s=qt(s,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Yc&&(e.usage=this.usage),e}}class Th extends jt{constructor(e,t,i){super(new Uint16Array(e),t,i)}}class Ah extends jt{constructor(e,t,i){super(new Uint32Array(e),t,i)}}class Sn extends jt{constructor(e,t,i){super(new Float32Array(e),t,i)}}let Ug=0;const nn=new yt,_a=new Pt,cr=new V,Jt=new ps,Hr=new ps,At=new V;class Gn extends Ki{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Ug++}),this.uuid=ds(),this.name="",this.type="BufferGeometry",this.index=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(xh(e)?Ah:Th)(e,1):this.index=e,this}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,i=0){this.groups.push({start:e,count:t,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const s=new Qe().getNormalMatrix(e);i.applyNormalMatrix(s),i.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return nn.makeRotationFromQuaternion(e),this.applyMatrix4(nn),this}rotateX(e){return nn.makeRotationX(e),this.applyMatrix4(nn),this}rotateY(e){return nn.makeRotationY(e),this.applyMatrix4(nn),this}rotateZ(e){return nn.makeRotationZ(e),this.applyMatrix4(nn),this}translate(e,t,i){return nn.makeTranslation(e,t,i),this.applyMatrix4(nn),this}scale(e,t,i){return nn.makeScale(e,t,i),this.applyMatrix4(nn),this}lookAt(e){return _a.lookAt(e),_a.updateMatrix(),this.applyMatrix4(_a.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(cr).negate(),this.translate(cr.x,cr.y,cr.z),this}setFromPoints(e){const t=[];for(let i=0,r=e.length;i<r;i++){const s=e[i];t.push(s.x,s.y,s.z||0)}return this.setAttribute("position",new Sn(t,3)),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new ps);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingBox.set(new V(-1/0,-1/0,-1/0),new V(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let i=0,r=t.length;i<r;i++){const s=t[i];Jt.setFromBufferAttribute(s),this.morphTargetsRelative?(At.addVectors(this.boundingBox.min,Jt.min),this.boundingBox.expandByPoint(At),At.addVectors(this.boundingBox.max,Jt.max),this.boundingBox.expandByPoint(At)):(this.boundingBox.expandByPoint(Jt.min),this.boundingBox.expandByPoint(Jt.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Lo);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingSphere.set(new V,1/0);return}if(e){const i=this.boundingSphere.center;if(Jt.setFromBufferAttribute(e),t)for(let s=0,a=t.length;s<a;s++){const o=t[s];Hr.setFromBufferAttribute(o),this.morphTargetsRelative?(At.addVectors(Jt.min,Hr.min),Jt.expandByPoint(At),At.addVectors(Jt.max,Hr.max),Jt.expandByPoint(At)):(Jt.expandByPoint(Hr.min),Jt.expandByPoint(Hr.max))}Jt.getCenter(i);let r=0;for(let s=0,a=e.count;s<a;s++)At.fromBufferAttribute(e,s),r=Math.max(r,i.distanceToSquared(At));if(t)for(let s=0,a=t.length;s<a;s++){const o=t[s],l=this.morphTargetsRelative;for(let c=0,u=o.count;c<u;c++)At.fromBufferAttribute(o,c),l&&(cr.fromBufferAttribute(e,c),At.add(cr)),r=Math.max(r,i.distanceToSquared(At))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=e.array,r=t.position.array,s=t.normal.array,a=t.uv.array,o=r.length/3;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new jt(new Float32Array(4*o),4));const l=this.getAttribute("tangent").array,c=[],u=[];for(let A=0;A<o;A++)c[A]=new V,u[A]=new V;const f=new V,d=new V,m=new V,g=new Xe,_=new Xe,p=new Xe,h=new V,S=new V;function M(A,k,te){f.fromArray(r,A*3),d.fromArray(r,k*3),m.fromArray(r,te*3),g.fromArray(a,A*2),_.fromArray(a,k*2),p.fromArray(a,te*2),d.sub(f),m.sub(f),_.sub(g),p.sub(g);const se=1/(_.x*p.y-p.x*_.y);isFinite(se)&&(h.copy(d).multiplyScalar(p.y).addScaledVector(m,-_.y).multiplyScalar(se),S.copy(m).multiplyScalar(_.x).addScaledVector(d,-p.x).multiplyScalar(se),c[A].add(h),c[k].add(h),c[te].add(h),u[A].add(S),u[k].add(S),u[te].add(S))}let E=this.groups;E.length===0&&(E=[{start:0,count:i.length}]);for(let A=0,k=E.length;A<k;++A){const te=E[A],se=te.start,N=te.count;for(let W=se,G=se+N;W<G;W+=3)M(i[W+0],i[W+1],i[W+2])}const D=new V,L=new V,T=new V,C=new V;function x(A){T.fromArray(s,A*3),C.copy(T);const k=c[A];D.copy(k),D.sub(T.multiplyScalar(T.dot(k))).normalize(),L.crossVectors(C,k);const se=L.dot(u[A])<0?-1:1;l[A*4]=D.x,l[A*4+1]=D.y,l[A*4+2]=D.z,l[A*4+3]=se}for(let A=0,k=E.length;A<k;++A){const te=E[A],se=te.start,N=te.count;for(let W=se,G=se+N;W<G;W+=3)x(i[W+0]),x(i[W+1]),x(i[W+2])}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new jt(new Float32Array(t.count*3),3),this.setAttribute("normal",i);else for(let d=0,m=i.count;d<m;d++)i.setXYZ(d,0,0,0);const r=new V,s=new V,a=new V,o=new V,l=new V,c=new V,u=new V,f=new V;if(e)for(let d=0,m=e.count;d<m;d+=3){const g=e.getX(d+0),_=e.getX(d+1),p=e.getX(d+2);r.fromBufferAttribute(t,g),s.fromBufferAttribute(t,_),a.fromBufferAttribute(t,p),u.subVectors(a,s),f.subVectors(r,s),u.cross(f),o.fromBufferAttribute(i,g),l.fromBufferAttribute(i,_),c.fromBufferAttribute(i,p),o.add(u),l.add(u),c.add(u),i.setXYZ(g,o.x,o.y,o.z),i.setXYZ(_,l.x,l.y,l.z),i.setXYZ(p,c.x,c.y,c.z)}else for(let d=0,m=t.count;d<m;d+=3)r.fromBufferAttribute(t,d+0),s.fromBufferAttribute(t,d+1),a.fromBufferAttribute(t,d+2),u.subVectors(a,s),f.subVectors(r,s),u.cross(f),i.setXYZ(d+0,u.x,u.y,u.z),i.setXYZ(d+1,u.x,u.y,u.z),i.setXYZ(d+2,u.x,u.y,u.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,i=e.count;t<i;t++)At.fromBufferAttribute(e,t),At.normalize(),e.setXYZ(t,At.x,At.y,At.z)}toNonIndexed(){function e(o,l){const c=o.array,u=o.itemSize,f=o.normalized,d=new c.constructor(l.length*u);let m=0,g=0;for(let _=0,p=l.length;_<p;_++){o.isInterleavedBufferAttribute?m=l[_]*o.data.stride+o.offset:m=l[_]*u;for(let h=0;h<u;h++)d[g++]=c[m++]}return new jt(d,u,f)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Gn,i=this.index.array,r=this.attributes;for(const o in r){const l=r[o],c=e(l,i);t.setAttribute(o,c)}const s=this.morphAttributes;for(const o in s){const l=[],c=s[o];for(let u=0,f=c.length;u<f;u++){const d=c[u],m=e(d,i);l.push(m)}t.morphAttributes[o]=l}t.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let o=0,l=a.length;o<l;o++){const c=a[o];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const i=this.attributes;for(const l in i){const c=i[l];e.data.attributes[l]=c.toJSON(e.data)}const r={};let s=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],u=[];for(let f=0,d=c.length;f<d;f++){const m=c[f];u.push(m.toJSON(e.data))}u.length>0&&(r[l]=u,s=!0)}s&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));const o=this.boundingSphere;return o!==null&&(e.data.boundingSphere={center:o.center.toArray(),radius:o.radius}),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const i=e.index;i!==null&&this.setIndex(i.clone(t));const r=e.attributes;for(const c in r){const u=r[c];this.setAttribute(c,u.clone(t))}const s=e.morphAttributes;for(const c in s){const u=[],f=s[c];for(let d=0,m=f.length;d<m;d++)u.push(f[d].clone(t));this.morphAttributes[c]=u}this.morphTargetsRelative=e.morphTargetsRelative;const a=e.groups;for(let c=0,u=a.length;c<u;c++){const f=a[c];this.addGroup(f.start,f.count,f.materialIndex)}const o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const au=new yt,Ui=new yl,Ns=new Lo,lu=new V,ur=new V,fr=new V,hr=new V,va=new V,Os=new V,Fs=new Xe,Bs=new Xe,zs=new Xe,cu=new V,uu=new V,fu=new V,Hs=new V,Vs=new V;class On extends Pt{constructor(e=new Gn,t=new El){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const r=t[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){const o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}getVertexPosition(e,t){const i=this.geometry,r=i.attributes.position,s=i.morphAttributes.position,a=i.morphTargetsRelative;t.fromBufferAttribute(r,e);const o=this.morphTargetInfluences;if(s&&o){Os.set(0,0,0);for(let l=0,c=s.length;l<c;l++){const u=o[l],f=s[l];u!==0&&(va.fromBufferAttribute(f,e),a?Os.addScaledVector(va,u):Os.addScaledVector(va.sub(t),u))}t.add(Os)}return t}raycast(e,t){const i=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),Ns.copy(i.boundingSphere),Ns.applyMatrix4(s),Ui.copy(e.ray).recast(e.near),!(Ns.containsPoint(Ui.origin)===!1&&(Ui.intersectSphere(Ns,lu)===null||Ui.origin.distanceToSquared(lu)>(e.far-e.near)**2))&&(au.copy(s).invert(),Ui.copy(e.ray).applyMatrix4(au),!(i.boundingBox!==null&&Ui.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,t,Ui)))}_computeIntersections(e,t,i){let r;const s=this.geometry,a=this.material,o=s.index,l=s.attributes.position,c=s.attributes.uv,u=s.attributes.uv1,f=s.attributes.normal,d=s.groups,m=s.drawRange;if(o!==null)if(Array.isArray(a))for(let g=0,_=d.length;g<_;g++){const p=d[g],h=a[p.materialIndex],S=Math.max(p.start,m.start),M=Math.min(o.count,Math.min(p.start+p.count,m.start+m.count));for(let E=S,D=M;E<D;E+=3){const L=o.getX(E),T=o.getX(E+1),C=o.getX(E+2);r=Gs(this,h,e,i,c,u,f,L,T,C),r&&(r.faceIndex=Math.floor(E/3),r.face.materialIndex=p.materialIndex,t.push(r))}}else{const g=Math.max(0,m.start),_=Math.min(o.count,m.start+m.count);for(let p=g,h=_;p<h;p+=3){const S=o.getX(p),M=o.getX(p+1),E=o.getX(p+2);r=Gs(this,a,e,i,c,u,f,S,M,E),r&&(r.faceIndex=Math.floor(p/3),t.push(r))}}else if(l!==void 0)if(Array.isArray(a))for(let g=0,_=d.length;g<_;g++){const p=d[g],h=a[p.materialIndex],S=Math.max(p.start,m.start),M=Math.min(l.count,Math.min(p.start+p.count,m.start+m.count));for(let E=S,D=M;E<D;E+=3){const L=E,T=E+1,C=E+2;r=Gs(this,h,e,i,c,u,f,L,T,C),r&&(r.faceIndex=Math.floor(E/3),r.face.materialIndex=p.materialIndex,t.push(r))}}else{const g=Math.max(0,m.start),_=Math.min(l.count,m.start+m.count);for(let p=g,h=_;p<h;p+=3){const S=p,M=p+1,E=p+2;r=Gs(this,a,e,i,c,u,f,S,M,E),r&&(r.faceIndex=Math.floor(p/3),t.push(r))}}}}function Ig(n,e,t,i,r,s,a,o){let l;if(e.side===$t?l=i.intersectTriangle(a,s,r,!0,o):l=i.intersectTriangle(r,s,a,e.side===bi,o),l===null)return null;Vs.copy(o),Vs.applyMatrix4(n.matrixWorld);const c=t.ray.origin.distanceTo(Vs);return c<t.near||c>t.far?null:{distance:c,point:Vs.clone(),object:n}}function Gs(n,e,t,i,r,s,a,o,l,c){n.getVertexPosition(o,ur),n.getVertexPosition(l,fr),n.getVertexPosition(c,hr);const u=Ig(n,e,t,i,ur,fr,hr,Hs);if(u){r&&(Fs.fromBufferAttribute(r,o),Bs.fromBufferAttribute(r,l),zs.fromBufferAttribute(r,c),u.uv=gn.getInterpolation(Hs,ur,fr,hr,Fs,Bs,zs,new Xe)),s&&(Fs.fromBufferAttribute(s,o),Bs.fromBufferAttribute(s,l),zs.fromBufferAttribute(s,c),u.uv1=gn.getInterpolation(Hs,ur,fr,hr,Fs,Bs,zs,new Xe),u.uv2=u.uv1),a&&(cu.fromBufferAttribute(a,o),uu.fromBufferAttribute(a,l),fu.fromBufferAttribute(a,c),u.normal=gn.getInterpolation(Hs,ur,fr,hr,cu,uu,fu,new V),u.normal.dot(i.direction)>0&&u.normal.multiplyScalar(-1));const f={a:o,b:l,c,normal:new V,materialIndex:0};gn.getNormal(ur,fr,hr,f.normal),u.face=f}return u}class ms extends Gn{constructor(e=1,t=1,i=1,r=1,s=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:i,widthSegments:r,heightSegments:s,depthSegments:a};const o=this;r=Math.floor(r),s=Math.floor(s),a=Math.floor(a);const l=[],c=[],u=[],f=[];let d=0,m=0;g("z","y","x",-1,-1,i,t,e,a,s,0),g("z","y","x",1,-1,i,t,-e,a,s,1),g("x","z","y",1,1,e,i,t,r,a,2),g("x","z","y",1,-1,e,i,-t,r,a,3),g("x","y","z",1,-1,e,t,i,r,s,4),g("x","y","z",-1,-1,e,t,-i,r,s,5),this.setIndex(l),this.setAttribute("position",new Sn(c,3)),this.setAttribute("normal",new Sn(u,3)),this.setAttribute("uv",new Sn(f,2));function g(_,p,h,S,M,E,D,L,T,C,x){const A=E/T,k=D/C,te=E/2,se=D/2,N=L/2,W=T+1,G=C+1;let Q=0,$=0;const re=new V;for(let ae=0;ae<G;ae++){const pe=ae*k-se;for(let he=0;he<W;he++){const ne=he*A-te;re[_]=ne*S,re[p]=pe*M,re[h]=N,c.push(re.x,re.y,re.z),re[_]=0,re[p]=0,re[h]=L>0?1:-1,u.push(re.x,re.y,re.z),f.push(he/T),f.push(1-ae/C),Q+=1}}for(let ae=0;ae<C;ae++)for(let pe=0;pe<T;pe++){const he=d+pe+W*ae,ne=d+pe+W*(ae+1),ue=d+(pe+1)+W*(ae+1),Ee=d+(pe+1)+W*ae;l.push(he,ne,Ee),l.push(ne,ue,Ee),$+=6}o.addGroup(m,$,x),m+=$,d+=Q}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ms(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function Rr(n){const e={};for(const t in n){e[t]={};for(const i in n[t]){const r=n[t][i];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?r.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][i]=null):e[t][i]=r.clone():Array.isArray(r)?e[t][i]=r.slice():e[t][i]=r}}return e}function Ht(n){const e={};for(let t=0;t<n.length;t++){const i=Rr(n[t]);for(const r in i)e[r]=i[r]}return e}function Ng(n){const e=[];for(let t=0;t<n.length;t++)e.push(n[t].clone());return e}function wh(n){return n.getRenderTarget()===null?n.outputColorSpace:ot.workingColorSpace}const Og={clone:Rr,merge:Ht};var Fg=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Bg=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class ji extends Cr{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Fg,this.fragmentShader=Bg,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={derivatives:!1,fragDepth:!1,drawBuffers:!1,shaderTextureLOD:!1,clipCullDistance:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Rr(e.uniforms),this.uniformsGroups=Ng(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const r in this.uniforms){const a=this.uniforms[r].value;a&&a.isTexture?t.uniforms[r]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[r]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[r]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[r]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[r]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[r]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[r]={type:"m4",value:a.toArray()}:t.uniforms[r]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const i={};for(const r in this.extensions)this.extensions[r]===!0&&(i[r]=!0);return Object.keys(i).length>0&&(t.extensions=i),t}}class Rh extends Pt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new yt,this.projectionMatrix=new yt,this.projectionMatrixInverse=new yt,this.coordinateSystem=ti}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}class on extends Rh{constructor(e=50,t=1,i=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=$a*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Qs*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return $a*2*Math.atan(Math.tan(Qs*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}setViewOffset(e,t,i,r,s,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Qs*.5*this.fov)/this.zoom,i=2*t,r=this.aspect*i,s=-.5*r;const a=this.view;if(this.view!==null&&this.view.enabled){const l=a.fullWidth,c=a.fullHeight;s+=a.offsetX*r/l,t-=a.offsetY*i/c,r*=a.width/l,i*=a.height/c}const o=this.filmOffset;o!==0&&(s+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,t,t-i,e,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const dr=-90,pr=1;class zg extends Pt{constructor(e,t,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const r=new on(dr,pr,e,t);r.layers=this.layers,this.add(r);const s=new on(dr,pr,e,t);s.layers=this.layers,this.add(s);const a=new on(dr,pr,e,t);a.layers=this.layers,this.add(a);const o=new on(dr,pr,e,t);o.layers=this.layers,this.add(o);const l=new on(dr,pr,e,t);l.layers=this.layers,this.add(l);const c=new on(dr,pr,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[i,r,s,a,o,l]=t;for(const c of t)this.remove(c);if(e===ti)i.up.set(0,1,0),i.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===mo)i.up.set(0,-1,0),i.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[s,a,o,l,c,u]=this.children,f=e.getRenderTarget(),d=e.getActiveCubeFace(),m=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;const _=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,e.setRenderTarget(i,0,r),e.render(t,s),e.setRenderTarget(i,1,r),e.render(t,a),e.setRenderTarget(i,2,r),e.render(t,o),e.setRenderTarget(i,3,r),e.render(t,l),e.setRenderTarget(i,4,r),e.render(t,c),i.texture.generateMipmaps=_,e.setRenderTarget(i,5,r),e.render(t,u),e.setRenderTarget(f,d,m),e.xr.enabled=g,i.texture.needsPMREMUpdate=!0}}class Ch extends en{constructor(e,t,i,r,s,a,o,l,c,u){e=e!==void 0?e:[],t=t!==void 0?t:Tr,super(e,t,i,r,s,a,o,l,c,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class Hg extends qi{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const i={width:e,height:e,depth:1},r=[i,i,i,i,i,i];t.encoding!==void 0&&(Zr("THREE.WebGLCubeRenderTarget: option.encoding has been replaced by option.colorSpace."),t.colorSpace=t.encoding===Xi?Lt:an),this.texture=new Ch(r,t.mapping,t.wrapS,t.wrapT,t.magFilter,t.minFilter,t.format,t.type,t.anisotropy,t.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=t.generateMipmaps!==void 0?t.generateMipmaps:!1,this.texture.minFilter=t.minFilter!==void 0?t.minFilter:sn}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new ms(5,5,5),s=new ji({name:"CubemapFromEquirect",uniforms:Rr(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:$t,blending:xi});s.uniforms.tEquirect.value=t;const a=new On(r,s),o=t.minFilter;return t.minFilter===os&&(t.minFilter=sn),new zg(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t,i,r){const s=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,i,r);e.setRenderTarget(s)}}const xa=new V,Vg=new V,Gg=new Qe;class hi{constructor(e=new V(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,i,r){return this.normal.set(e,t,i),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,i){const r=xa.subVectors(i,t).cross(Vg.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const i=e.delta(xa),r=this.normal.dot(i);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const s=-(e.start.dot(this.normal)+this.constant)/r;return s<0||s>1?null:t.copy(e.start).addScaledVector(i,s)}intersectsLine(e){const t=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return t<0&&i>0||i<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const i=t||Gg.getNormalMatrix(e),r=this.coplanarPoint(xa).applyMatrix4(e),s=this.normal.applyMatrix3(i).normalize();return this.constant=-r.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Ii=new Lo,ks=new V;class bl{constructor(e=new hi,t=new hi,i=new hi,r=new hi,s=new hi,a=new hi){this.planes=[e,t,i,r,s,a]}set(e,t,i,r,s,a){const o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(i),o[3].copy(r),o[4].copy(s),o[5].copy(a),this}copy(e){const t=this.planes;for(let i=0;i<6;i++)t[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,t=ti){const i=this.planes,r=e.elements,s=r[0],a=r[1],o=r[2],l=r[3],c=r[4],u=r[5],f=r[6],d=r[7],m=r[8],g=r[9],_=r[10],p=r[11],h=r[12],S=r[13],M=r[14],E=r[15];if(i[0].setComponents(l-s,d-c,p-m,E-h).normalize(),i[1].setComponents(l+s,d+c,p+m,E+h).normalize(),i[2].setComponents(l+a,d+u,p+g,E+S).normalize(),i[3].setComponents(l-a,d-u,p-g,E-S).normalize(),i[4].setComponents(l-o,d-f,p-_,E-M).normalize(),t===ti)i[5].setComponents(l+o,d+f,p+_,E+M).normalize();else if(t===mo)i[5].setComponents(o,f,_,M).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Ii.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Ii.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Ii)}intersectsSprite(e){return Ii.center.set(0,0,0),Ii.radius=.7071067811865476,Ii.applyMatrix4(e.matrixWorld),this.intersectsSphere(Ii)}intersectsSphere(e){const t=this.planes,i=e.center,r=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(i)<r)return!1;return!0}intersectsBox(e){const t=this.planes;for(let i=0;i<6;i++){const r=t[i];if(ks.x=r.normal.x>0?e.max.x:e.min.x,ks.y=r.normal.y>0?e.max.y:e.min.y,ks.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(ks)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let i=0;i<6;i++)if(t[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function Lh(){let n=null,e=!1,t=null,i=null;function r(s,a){t(s,a),i=n.requestAnimationFrame(r)}return{start:function(){e!==!0&&t!==null&&(i=n.requestAnimationFrame(r),e=!0)},stop:function(){n.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){n=s}}}function kg(n,e){const t=e.isWebGL2,i=new WeakMap;function r(c,u){const f=c.array,d=c.usage,m=f.byteLength,g=n.createBuffer();n.bindBuffer(u,g),n.bufferData(u,f,d),c.onUploadCallback();let _;if(f instanceof Float32Array)_=n.FLOAT;else if(f instanceof Uint16Array)if(c.isFloat16BufferAttribute)if(t)_=n.HALF_FLOAT;else throw new Error("THREE.WebGLAttributes: Usage of Float16BufferAttribute requires WebGL2.");else _=n.UNSIGNED_SHORT;else if(f instanceof Int16Array)_=n.SHORT;else if(f instanceof Uint32Array)_=n.UNSIGNED_INT;else if(f instanceof Int32Array)_=n.INT;else if(f instanceof Int8Array)_=n.BYTE;else if(f instanceof Uint8Array)_=n.UNSIGNED_BYTE;else if(f instanceof Uint8ClampedArray)_=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+f);return{buffer:g,type:_,bytesPerElement:f.BYTES_PER_ELEMENT,version:c.version,size:m}}function s(c,u,f){const d=u.array,m=u._updateRange,g=u.updateRanges;if(n.bindBuffer(f,c),m.count===-1&&g.length===0&&n.bufferSubData(f,0,d),g.length!==0){for(let _=0,p=g.length;_<p;_++){const h=g[_];t?n.bufferSubData(f,h.start*d.BYTES_PER_ELEMENT,d,h.start,h.count):n.bufferSubData(f,h.start*d.BYTES_PER_ELEMENT,d.subarray(h.start,h.start+h.count))}u.clearUpdateRanges()}m.count!==-1&&(t?n.bufferSubData(f,m.offset*d.BYTES_PER_ELEMENT,d,m.offset,m.count):n.bufferSubData(f,m.offset*d.BYTES_PER_ELEMENT,d.subarray(m.offset,m.offset+m.count)),m.count=-1),u.onUploadCallback()}function a(c){return c.isInterleavedBufferAttribute&&(c=c.data),i.get(c)}function o(c){c.isInterleavedBufferAttribute&&(c=c.data);const u=i.get(c);u&&(n.deleteBuffer(u.buffer),i.delete(c))}function l(c,u){if(c.isGLBufferAttribute){const d=i.get(c);(!d||d.version<c.version)&&i.set(c,{buffer:c.buffer,type:c.type,bytesPerElement:c.elementSize,version:c.version});return}c.isInterleavedBufferAttribute&&(c=c.data);const f=i.get(c);if(f===void 0)i.set(c,r(c,u));else if(f.version<c.version){if(f.size!==c.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");s(f.buffer,c,u),f.version=c.version}}return{get:a,remove:o,update:l}}class ls extends Gn{constructor(e=1,t=1,i=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:i,heightSegments:r};const s=e/2,a=t/2,o=Math.floor(i),l=Math.floor(r),c=o+1,u=l+1,f=e/o,d=t/l,m=[],g=[],_=[],p=[];for(let h=0;h<u;h++){const S=h*d-a;for(let M=0;M<c;M++){const E=M*f-s;g.push(E,-S,0),_.push(0,0,1),p.push(M/o),p.push(1-h/l)}}for(let h=0;h<l;h++)for(let S=0;S<o;S++){const M=S+c*h,E=S+c*(h+1),D=S+1+c*(h+1),L=S+1+c*h;m.push(M,E,L),m.push(E,D,L)}this.setIndex(m),this.setAttribute("position",new Sn(g,3)),this.setAttribute("normal",new Sn(_,3)),this.setAttribute("uv",new Sn(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ls(e.width,e.height,e.widthSegments,e.heightSegments)}}var Wg=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Xg=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,qg=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Yg=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,jg=`#ifdef USE_ALPHATEST
	if ( diffuseColor.a < alphaTest ) discard;
#endif`,$g=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Kg=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Zg=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Jg=`#ifdef USE_BATCHING
	attribute float batchId;
	uniform highp sampler2D batchingTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Qg=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( batchId );
#endif`,e_=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,t_=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,n_=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,i_=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,r_=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,s_=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#pragma unroll_loop_start
	for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
		plane = clippingPlanes[ i ];
		if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
	}
	#pragma unroll_loop_end
	#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
		bool clipped = true;
		#pragma unroll_loop_start
		for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
		}
		#pragma unroll_loop_end
		if ( clipped ) discard;
	#endif
#endif`,o_=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,a_=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,l_=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,c_=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,u_=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,f_=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	varying vec3 vColor;
#endif`,h_=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif`,d_=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
float luminance( const in vec3 rgb ) {
	const vec3 weights = vec3( 0.2126729, 0.7151522, 0.0721750 );
	return dot( weights, rgb );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,p_=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,m_=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,g_=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,__=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,v_=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,x_=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,M_="gl_FragColor = linearToOutputTexel( gl_FragColor );",S_=`
const mat3 LINEAR_SRGB_TO_LINEAR_DISPLAY_P3 = mat3(
	vec3( 0.8224621, 0.177538, 0.0 ),
	vec3( 0.0331941, 0.9668058, 0.0 ),
	vec3( 0.0170827, 0.0723974, 0.9105199 )
);
const mat3 LINEAR_DISPLAY_P3_TO_LINEAR_SRGB = mat3(
	vec3( 1.2249401, - 0.2249404, 0.0 ),
	vec3( - 0.0420569, 1.0420571, 0.0 ),
	vec3( - 0.0196376, - 0.0786361, 1.0982735 )
);
vec4 LinearSRGBToLinearDisplayP3( in vec4 value ) {
	return vec4( value.rgb * LINEAR_SRGB_TO_LINEAR_DISPLAY_P3, value.a );
}
vec4 LinearDisplayP3ToLinearSRGB( in vec4 value ) {
	return vec4( value.rgb * LINEAR_DISPLAY_P3_TO_LINEAR_SRGB, value.a );
}
vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}
vec4 LinearToLinear( in vec4 value ) {
	return value;
}
vec4 LinearTosRGB( in vec4 value ) {
	return sRGBTransferOETF( value );
}`,y_=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,E_=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,b_=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,T_=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,A_=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,w_=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,R_=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,C_=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,L_=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,P_=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,D_=`#ifdef USE_LIGHTMAP
	vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
	vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
	reflectedLight.indirectDiffuse += lightMapIrradiance;
#endif`,U_=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,I_=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,N_=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,O_=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	#if defined ( LEGACY_LIGHTS )
		if ( cutoffDistance > 0.0 && decayExponent > 0.0 ) {
			return pow( saturate( - lightDistance / cutoffDistance + 1.0 ), decayExponent );
		}
		return 1.0;
	#else
		float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
		if ( cutoffDistance > 0.0 ) {
			distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
		}
		return distanceFalloff;
	#endif
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,F_=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,B_=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,z_=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,H_=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,V_=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,G_=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,k_=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,W_=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,X_=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,q_=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Y_=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	gl_FragDepthEXT = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,j_=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,$_=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		varying float vFragDepth;
		varying float vIsPerspective;
	#else
		uniform float logDepthBufFC;
	#endif
#endif`,K_=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		vFragDepth = 1.0 + gl_Position.w;
		vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
	#else
		if ( isPerspectiveMatrix( projectionMatrix ) ) {
			gl_Position.z = log2( max( EPSILON, gl_Position.w + 1.0 ) ) * logDepthBufFC - 1.0;
			gl_Position.z *= gl_Position.w;
		}
	#endif
#endif`,Z_=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
	
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,J_=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Q_=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,e0=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,t0=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,n0=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,i0=`#if defined( USE_MORPHCOLORS ) && defined( MORPHTARGETS_TEXTURE )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,r0=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		objectNormal += morphNormal0 * morphTargetInfluences[ 0 ];
		objectNormal += morphNormal1 * morphTargetInfluences[ 1 ];
		objectNormal += morphNormal2 * morphTargetInfluences[ 2 ];
		objectNormal += morphNormal3 * morphTargetInfluences[ 3 ];
	#endif
#endif`,s0=`#ifdef USE_MORPHTARGETS
	uniform float morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
		uniform sampler2DArray morphTargetsTexture;
		uniform ivec2 morphTargetsTextureSize;
		vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
			int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
			int y = texelIndex / morphTargetsTextureSize.x;
			int x = texelIndex - y * morphTargetsTextureSize.x;
			ivec3 morphUV = ivec3( x, y, morphTargetIndex );
			return texelFetch( morphTargetsTexture, morphUV, 0 );
		}
	#else
		#ifndef USE_MORPHNORMALS
			uniform float morphTargetInfluences[ 8 ];
		#else
			uniform float morphTargetInfluences[ 4 ];
		#endif
	#endif
#endif`,o0=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		transformed += morphTarget0 * morphTargetInfluences[ 0 ];
		transformed += morphTarget1 * morphTargetInfluences[ 1 ];
		transformed += morphTarget2 * morphTargetInfluences[ 2 ];
		transformed += morphTarget3 * morphTargetInfluences[ 3 ];
		#ifndef USE_MORPHNORMALS
			transformed += morphTarget4 * morphTargetInfluences[ 4 ];
			transformed += morphTarget5 * morphTargetInfluences[ 5 ];
			transformed += morphTarget6 * morphTargetInfluences[ 6 ];
			transformed += morphTarget7 * morphTargetInfluences[ 7 ];
		#endif
	#endif
#endif`,a0=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,l0=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,c0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,u0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,f0=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,h0=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,d0=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,p0=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,m0=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,g0=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,_0=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,v0=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;
const vec3 PackFactors = vec3( 256. * 256. * 256., 256. * 256., 256. );
const vec4 UnpackFactors = UnpackDownscale / vec4( PackFactors, 1. );
const float ShiftRight8 = 1. / 256.;
vec4 packDepthToRGBA( const in float v ) {
	vec4 r = vec4( fract( v * PackFactors ), v );
	r.yzw -= r.xyz * ShiftRight8;	return r * PackUpscale;
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors );
}
vec2 packDepthToRG( in highp float v ) {
	return packDepthToRGBA( v ).yx;
}
float unpackRGToDepth( const in highp vec2 v ) {
	return unpackRGBAToDepth( vec4( v.xy, 0.0, 0.0 ) );
}
vec4 pack2HalfToRGBA( vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,x0=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,M0=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,S0=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,y0=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,E0=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,b0=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,T0=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return shadow;
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
		vec3 lightToPosition = shadowCoord.xyz;
		float dp = ( length( lightToPosition ) - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );		dp += shadowBias;
		vec3 bd3D = normalize( lightToPosition );
		#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
			vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
			return (
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
			) * ( 1.0 / 9.0 );
		#else
			return texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
		#endif
	}
#endif`,A0=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,w0=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,R0=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,C0=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,L0=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,P0=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,D0=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,U0=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,I0=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,N0=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,O0=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 OptimizedCineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color *= toneMappingExposure;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	return color;
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,F0=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,B0=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
		vec3 refractedRayExit = position + transmissionRay;
		vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
		vec2 refractionCoords = ndcPos.xy / ndcPos.w;
		refractionCoords += 1.0;
		refractionCoords /= 2.0;
		vec4 transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
		vec3 transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,z0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,H0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,V0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,G0=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const k0=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,W0=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,X0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,q0=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Y0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,j0=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,$0=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,K0=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#endif
}`,Z0=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,J0=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,Q0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,ev=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,tv=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,nv=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,iv=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,rv=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,sv=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,ov=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,av=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,lv=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,cv=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,uv=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), opacity );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,fv=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,hv=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,dv=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,pv=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,mv=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,gv=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,_v=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,vv=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,xv=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Mv=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Sv=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
	vec2 scale;
	scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
	scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,yv=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,je={alphahash_fragment:Wg,alphahash_pars_fragment:Xg,alphamap_fragment:qg,alphamap_pars_fragment:Yg,alphatest_fragment:jg,alphatest_pars_fragment:$g,aomap_fragment:Kg,aomap_pars_fragment:Zg,batching_pars_vertex:Jg,batching_vertex:Qg,begin_vertex:e_,beginnormal_vertex:t_,bsdfs:n_,iridescence_fragment:i_,bumpmap_pars_fragment:r_,clipping_planes_fragment:s_,clipping_planes_pars_fragment:o_,clipping_planes_pars_vertex:a_,clipping_planes_vertex:l_,color_fragment:c_,color_pars_fragment:u_,color_pars_vertex:f_,color_vertex:h_,common:d_,cube_uv_reflection_fragment:p_,defaultnormal_vertex:m_,displacementmap_pars_vertex:g_,displacementmap_vertex:__,emissivemap_fragment:v_,emissivemap_pars_fragment:x_,colorspace_fragment:M_,colorspace_pars_fragment:S_,envmap_fragment:y_,envmap_common_pars_fragment:E_,envmap_pars_fragment:b_,envmap_pars_vertex:T_,envmap_physical_pars_fragment:F_,envmap_vertex:A_,fog_vertex:w_,fog_pars_vertex:R_,fog_fragment:C_,fog_pars_fragment:L_,gradientmap_pars_fragment:P_,lightmap_fragment:D_,lightmap_pars_fragment:U_,lights_lambert_fragment:I_,lights_lambert_pars_fragment:N_,lights_pars_begin:O_,lights_toon_fragment:B_,lights_toon_pars_fragment:z_,lights_phong_fragment:H_,lights_phong_pars_fragment:V_,lights_physical_fragment:G_,lights_physical_pars_fragment:k_,lights_fragment_begin:W_,lights_fragment_maps:X_,lights_fragment_end:q_,logdepthbuf_fragment:Y_,logdepthbuf_pars_fragment:j_,logdepthbuf_pars_vertex:$_,logdepthbuf_vertex:K_,map_fragment:Z_,map_pars_fragment:J_,map_particle_fragment:Q_,map_particle_pars_fragment:e0,metalnessmap_fragment:t0,metalnessmap_pars_fragment:n0,morphcolor_vertex:i0,morphnormal_vertex:r0,morphtarget_pars_vertex:s0,morphtarget_vertex:o0,normal_fragment_begin:a0,normal_fragment_maps:l0,normal_pars_fragment:c0,normal_pars_vertex:u0,normal_vertex:f0,normalmap_pars_fragment:h0,clearcoat_normal_fragment_begin:d0,clearcoat_normal_fragment_maps:p0,clearcoat_pars_fragment:m0,iridescence_pars_fragment:g0,opaque_fragment:_0,packing:v0,premultiplied_alpha_fragment:x0,project_vertex:M0,dithering_fragment:S0,dithering_pars_fragment:y0,roughnessmap_fragment:E0,roughnessmap_pars_fragment:b0,shadowmap_pars_fragment:T0,shadowmap_pars_vertex:A0,shadowmap_vertex:w0,shadowmask_pars_fragment:R0,skinbase_vertex:C0,skinning_pars_vertex:L0,skinning_vertex:P0,skinnormal_vertex:D0,specularmap_fragment:U0,specularmap_pars_fragment:I0,tonemapping_fragment:N0,tonemapping_pars_fragment:O0,transmission_fragment:F0,transmission_pars_fragment:B0,uv_pars_fragment:z0,uv_pars_vertex:H0,uv_vertex:V0,worldpos_vertex:G0,background_vert:k0,background_frag:W0,backgroundCube_vert:X0,backgroundCube_frag:q0,cube_vert:Y0,cube_frag:j0,depth_vert:$0,depth_frag:K0,distanceRGBA_vert:Z0,distanceRGBA_frag:J0,equirect_vert:Q0,equirect_frag:ev,linedashed_vert:tv,linedashed_frag:nv,meshbasic_vert:iv,meshbasic_frag:rv,meshlambert_vert:sv,meshlambert_frag:ov,meshmatcap_vert:av,meshmatcap_frag:lv,meshnormal_vert:cv,meshnormal_frag:uv,meshphong_vert:fv,meshphong_frag:hv,meshphysical_vert:dv,meshphysical_frag:pv,meshtoon_vert:mv,meshtoon_frag:gv,points_vert:_v,points_frag:vv,shadow_vert:xv,shadow_frag:Mv,sprite_vert:Sv,sprite_frag:yv},Me={common:{diffuse:{value:new nt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Qe},alphaMap:{value:null},alphaMapTransform:{value:new Qe},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Qe}},envmap:{envMap:{value:null},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Qe}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Qe}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Qe},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Qe},normalScale:{value:new Xe(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Qe},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Qe}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Qe}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Qe}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new nt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new nt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Qe},alphaTest:{value:0},uvTransform:{value:new Qe}},sprite:{diffuse:{value:new nt(16777215)},opacity:{value:1},center:{value:new Xe(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Qe},alphaMap:{value:null},alphaMapTransform:{value:new Qe},alphaTest:{value:0}}},Ln={basic:{uniforms:Ht([Me.common,Me.specularmap,Me.envmap,Me.aomap,Me.lightmap,Me.fog]),vertexShader:je.meshbasic_vert,fragmentShader:je.meshbasic_frag},lambert:{uniforms:Ht([Me.common,Me.specularmap,Me.envmap,Me.aomap,Me.lightmap,Me.emissivemap,Me.bumpmap,Me.normalmap,Me.displacementmap,Me.fog,Me.lights,{emissive:{value:new nt(0)}}]),vertexShader:je.meshlambert_vert,fragmentShader:je.meshlambert_frag},phong:{uniforms:Ht([Me.common,Me.specularmap,Me.envmap,Me.aomap,Me.lightmap,Me.emissivemap,Me.bumpmap,Me.normalmap,Me.displacementmap,Me.fog,Me.lights,{emissive:{value:new nt(0)},specular:{value:new nt(1118481)},shininess:{value:30}}]),vertexShader:je.meshphong_vert,fragmentShader:je.meshphong_frag},standard:{uniforms:Ht([Me.common,Me.envmap,Me.aomap,Me.lightmap,Me.emissivemap,Me.bumpmap,Me.normalmap,Me.displacementmap,Me.roughnessmap,Me.metalnessmap,Me.fog,Me.lights,{emissive:{value:new nt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:je.meshphysical_vert,fragmentShader:je.meshphysical_frag},toon:{uniforms:Ht([Me.common,Me.aomap,Me.lightmap,Me.emissivemap,Me.bumpmap,Me.normalmap,Me.displacementmap,Me.gradientmap,Me.fog,Me.lights,{emissive:{value:new nt(0)}}]),vertexShader:je.meshtoon_vert,fragmentShader:je.meshtoon_frag},matcap:{uniforms:Ht([Me.common,Me.bumpmap,Me.normalmap,Me.displacementmap,Me.fog,{matcap:{value:null}}]),vertexShader:je.meshmatcap_vert,fragmentShader:je.meshmatcap_frag},points:{uniforms:Ht([Me.points,Me.fog]),vertexShader:je.points_vert,fragmentShader:je.points_frag},dashed:{uniforms:Ht([Me.common,Me.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:je.linedashed_vert,fragmentShader:je.linedashed_frag},depth:{uniforms:Ht([Me.common,Me.displacementmap]),vertexShader:je.depth_vert,fragmentShader:je.depth_frag},normal:{uniforms:Ht([Me.common,Me.bumpmap,Me.normalmap,Me.displacementmap,{opacity:{value:1}}]),vertexShader:je.meshnormal_vert,fragmentShader:je.meshnormal_frag},sprite:{uniforms:Ht([Me.sprite,Me.fog]),vertexShader:je.sprite_vert,fragmentShader:je.sprite_frag},background:{uniforms:{uvTransform:{value:new Qe},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:je.background_vert,fragmentShader:je.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1}},vertexShader:je.backgroundCube_vert,fragmentShader:je.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:je.cube_vert,fragmentShader:je.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:je.equirect_vert,fragmentShader:je.equirect_frag},distanceRGBA:{uniforms:Ht([Me.common,Me.displacementmap,{referencePosition:{value:new V},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:je.distanceRGBA_vert,fragmentShader:je.distanceRGBA_frag},shadow:{uniforms:Ht([Me.lights,Me.fog,{color:{value:new nt(0)},opacity:{value:1}}]),vertexShader:je.shadow_vert,fragmentShader:je.shadow_frag}};Ln.physical={uniforms:Ht([Ln.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Qe},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Qe},clearcoatNormalScale:{value:new Xe(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Qe},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Qe},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Qe},sheen:{value:0},sheenColor:{value:new nt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Qe},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Qe},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Qe},transmissionSamplerSize:{value:new Xe},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Qe},attenuationDistance:{value:0},attenuationColor:{value:new nt(0)},specularColor:{value:new nt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Qe},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Qe},anisotropyVector:{value:new Xe},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Qe}}]),vertexShader:je.meshphysical_vert,fragmentShader:je.meshphysical_frag};const Ws={r:0,b:0,g:0};function Ev(n,e,t,i,r,s,a){const o=new nt(0);let l=s===!0?0:1,c,u,f=null,d=0,m=null;function g(p,h){let S=!1,M=h.isScene===!0?h.background:null;M&&M.isTexture&&(M=(h.backgroundBlurriness>0?t:e).get(M)),M===null?_(o,l):M&&M.isColor&&(_(M,1),S=!0);const E=n.xr.getEnvironmentBlendMode();E==="additive"?i.buffers.color.setClear(0,0,0,1,a):E==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,a),(n.autoClear||S)&&n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil),M&&(M.isCubeTexture||M.mapping===Ro)?(u===void 0&&(u=new On(new ms(1,1,1),new ji({name:"BackgroundCubeMaterial",uniforms:Rr(Ln.backgroundCube.uniforms),vertexShader:Ln.backgroundCube.vertexShader,fragmentShader:Ln.backgroundCube.fragmentShader,side:$t,depthTest:!1,depthWrite:!1,fog:!1})),u.geometry.deleteAttribute("normal"),u.geometry.deleteAttribute("uv"),u.onBeforeRender=function(D,L,T){this.matrixWorld.copyPosition(T.matrixWorld)},Object.defineProperty(u.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(u)),u.material.uniforms.envMap.value=M,u.material.uniforms.flipEnvMap.value=M.isCubeTexture&&M.isRenderTargetTexture===!1?-1:1,u.material.uniforms.backgroundBlurriness.value=h.backgroundBlurriness,u.material.uniforms.backgroundIntensity.value=h.backgroundIntensity,u.material.toneMapped=ot.getTransfer(M.colorSpace)!==ft,(f!==M||d!==M.version||m!==n.toneMapping)&&(u.material.needsUpdate=!0,f=M,d=M.version,m=n.toneMapping),u.layers.enableAll(),p.unshift(u,u.geometry,u.material,0,0,null)):M&&M.isTexture&&(c===void 0&&(c=new On(new ls(2,2),new ji({name:"BackgroundMaterial",uniforms:Rr(Ln.background.uniforms),vertexShader:Ln.background.vertexShader,fragmentShader:Ln.background.fragmentShader,side:bi,depthTest:!1,depthWrite:!1,fog:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=M,c.material.uniforms.backgroundIntensity.value=h.backgroundIntensity,c.material.toneMapped=ot.getTransfer(M.colorSpace)!==ft,M.matrixAutoUpdate===!0&&M.updateMatrix(),c.material.uniforms.uvTransform.value.copy(M.matrix),(f!==M||d!==M.version||m!==n.toneMapping)&&(c.material.needsUpdate=!0,f=M,d=M.version,m=n.toneMapping),c.layers.enableAll(),p.unshift(c,c.geometry,c.material,0,0,null))}function _(p,h){p.getRGB(Ws,wh(n)),i.buffers.color.setClear(Ws.r,Ws.g,Ws.b,h,a)}return{getClearColor:function(){return o},setClearColor:function(p,h=1){o.set(p),l=h,_(o,l)},getClearAlpha:function(){return l},setClearAlpha:function(p){l=p,_(o,l)},render:g}}function bv(n,e,t,i){const r=n.getParameter(n.MAX_VERTEX_ATTRIBS),s=i.isWebGL2?null:e.get("OES_vertex_array_object"),a=i.isWebGL2||s!==null,o={},l=p(null);let c=l,u=!1;function f(N,W,G,Q,$){let re=!1;if(a){const ae=_(Q,G,W);c!==ae&&(c=ae,m(c.object)),re=h(N,Q,G,$),re&&S(N,Q,G,$)}else{const ae=W.wireframe===!0;(c.geometry!==Q.id||c.program!==G.id||c.wireframe!==ae)&&(c.geometry=Q.id,c.program=G.id,c.wireframe=ae,re=!0)}$!==null&&t.update($,n.ELEMENT_ARRAY_BUFFER),(re||u)&&(u=!1,C(N,W,G,Q),$!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,t.get($).buffer))}function d(){return i.isWebGL2?n.createVertexArray():s.createVertexArrayOES()}function m(N){return i.isWebGL2?n.bindVertexArray(N):s.bindVertexArrayOES(N)}function g(N){return i.isWebGL2?n.deleteVertexArray(N):s.deleteVertexArrayOES(N)}function _(N,W,G){const Q=G.wireframe===!0;let $=o[N.id];$===void 0&&($={},o[N.id]=$);let re=$[W.id];re===void 0&&(re={},$[W.id]=re);let ae=re[Q];return ae===void 0&&(ae=p(d()),re[Q]=ae),ae}function p(N){const W=[],G=[],Q=[];for(let $=0;$<r;$++)W[$]=0,G[$]=0,Q[$]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:W,enabledAttributes:G,attributeDivisors:Q,object:N,attributes:{},index:null}}function h(N,W,G,Q){const $=c.attributes,re=W.attributes;let ae=0;const pe=G.getAttributes();for(const he in pe)if(pe[he].location>=0){const ue=$[he];let Ee=re[he];if(Ee===void 0&&(he==="instanceMatrix"&&N.instanceMatrix&&(Ee=N.instanceMatrix),he==="instanceColor"&&N.instanceColor&&(Ee=N.instanceColor)),ue===void 0||ue.attribute!==Ee||Ee&&ue.data!==Ee.data)return!0;ae++}return c.attributesNum!==ae||c.index!==Q}function S(N,W,G,Q){const $={},re=W.attributes;let ae=0;const pe=G.getAttributes();for(const he in pe)if(pe[he].location>=0){let ue=re[he];ue===void 0&&(he==="instanceMatrix"&&N.instanceMatrix&&(ue=N.instanceMatrix),he==="instanceColor"&&N.instanceColor&&(ue=N.instanceColor));const Ee={};Ee.attribute=ue,ue&&ue.data&&(Ee.data=ue.data),$[he]=Ee,ae++}c.attributes=$,c.attributesNum=ae,c.index=Q}function M(){const N=c.newAttributes;for(let W=0,G=N.length;W<G;W++)N[W]=0}function E(N){D(N,0)}function D(N,W){const G=c.newAttributes,Q=c.enabledAttributes,$=c.attributeDivisors;G[N]=1,Q[N]===0&&(n.enableVertexAttribArray(N),Q[N]=1),$[N]!==W&&((i.isWebGL2?n:e.get("ANGLE_instanced_arrays"))[i.isWebGL2?"vertexAttribDivisor":"vertexAttribDivisorANGLE"](N,W),$[N]=W)}function L(){const N=c.newAttributes,W=c.enabledAttributes;for(let G=0,Q=W.length;G<Q;G++)W[G]!==N[G]&&(n.disableVertexAttribArray(G),W[G]=0)}function T(N,W,G,Q,$,re,ae){ae===!0?n.vertexAttribIPointer(N,W,G,$,re):n.vertexAttribPointer(N,W,G,Q,$,re)}function C(N,W,G,Q){if(i.isWebGL2===!1&&(N.isInstancedMesh||Q.isInstancedBufferGeometry)&&e.get("ANGLE_instanced_arrays")===null)return;M();const $=Q.attributes,re=G.getAttributes(),ae=W.defaultAttributeValues;for(const pe in re){const he=re[pe];if(he.location>=0){let ne=$[pe];if(ne===void 0&&(pe==="instanceMatrix"&&N.instanceMatrix&&(ne=N.instanceMatrix),pe==="instanceColor"&&N.instanceColor&&(ne=N.instanceColor)),ne!==void 0){const ue=ne.normalized,Ee=ne.itemSize,Re=t.get(ne);if(Re===void 0)continue;const Ce=Re.buffer,Ve=Re.type,Oe=Re.bytesPerElement,Ne=i.isWebGL2===!0&&(Ve===n.INT||Ve===n.UNSIGNED_INT||ne.gpuType===ch);if(ne.isInterleavedBufferAttribute){const R=ne.data,b=R.stride,j=ne.offset;if(R.isInstancedInterleavedBuffer){for(let Y=0;Y<he.locationSize;Y++)D(he.location+Y,R.meshPerAttribute);N.isInstancedMesh!==!0&&Q._maxInstanceCount===void 0&&(Q._maxInstanceCount=R.meshPerAttribute*R.count)}else for(let Y=0;Y<he.locationSize;Y++)E(he.location+Y);n.bindBuffer(n.ARRAY_BUFFER,Ce);for(let Y=0;Y<he.locationSize;Y++)T(he.location+Y,Ee/he.locationSize,Ve,ue,b*Oe,(j+Ee/he.locationSize*Y)*Oe,Ne)}else{if(ne.isInstancedBufferAttribute){for(let R=0;R<he.locationSize;R++)D(he.location+R,ne.meshPerAttribute);N.isInstancedMesh!==!0&&Q._maxInstanceCount===void 0&&(Q._maxInstanceCount=ne.meshPerAttribute*ne.count)}else for(let R=0;R<he.locationSize;R++)E(he.location+R);n.bindBuffer(n.ARRAY_BUFFER,Ce);for(let R=0;R<he.locationSize;R++)T(he.location+R,Ee/he.locationSize,Ve,ue,Ee*Oe,Ee/he.locationSize*R*Oe,Ne)}}else if(ae!==void 0){const ue=ae[pe];if(ue!==void 0)switch(ue.length){case 2:n.vertexAttrib2fv(he.location,ue);break;case 3:n.vertexAttrib3fv(he.location,ue);break;case 4:n.vertexAttrib4fv(he.location,ue);break;default:n.vertexAttrib1fv(he.location,ue)}}}}L()}function x(){te();for(const N in o){const W=o[N];for(const G in W){const Q=W[G];for(const $ in Q)g(Q[$].object),delete Q[$];delete W[G]}delete o[N]}}function A(N){if(o[N.id]===void 0)return;const W=o[N.id];for(const G in W){const Q=W[G];for(const $ in Q)g(Q[$].object),delete Q[$];delete W[G]}delete o[N.id]}function k(N){for(const W in o){const G=o[W];if(G[N.id]===void 0)continue;const Q=G[N.id];for(const $ in Q)g(Q[$].object),delete Q[$];delete G[N.id]}}function te(){se(),u=!0,c!==l&&(c=l,m(c.object))}function se(){l.geometry=null,l.program=null,l.wireframe=!1}return{setup:f,reset:te,resetDefaultState:se,dispose:x,releaseStatesOfGeometry:A,releaseStatesOfProgram:k,initAttributes:M,enableAttribute:E,disableUnusedAttributes:L}}function Tv(n,e,t,i){const r=i.isWebGL2;let s;function a(u){s=u}function o(u,f){n.drawArrays(s,u,f),t.update(f,s,1)}function l(u,f,d){if(d===0)return;let m,g;if(r)m=n,g="drawArraysInstanced";else if(m=e.get("ANGLE_instanced_arrays"),g="drawArraysInstancedANGLE",m===null){console.error("THREE.WebGLBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}m[g](s,u,f,d),t.update(f,s,d)}function c(u,f,d){if(d===0)return;const m=e.get("WEBGL_multi_draw");if(m===null)for(let g=0;g<d;g++)this.render(u[g],f[g]);else{m.multiDrawArraysWEBGL(s,u,0,f,0,d);let g=0;for(let _=0;_<d;_++)g+=f[_];t.update(g,s,1)}}this.setMode=a,this.render=o,this.renderInstances=l,this.renderMultiDraw=c}function Av(n,e,t){let i;function r(){if(i!==void 0)return i;if(e.has("EXT_texture_filter_anisotropic")===!0){const T=e.get("EXT_texture_filter_anisotropic");i=n.getParameter(T.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function s(T){if(T==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";T="mediump"}return T==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}const a=typeof WebGL2RenderingContext<"u"&&n.constructor.name==="WebGL2RenderingContext";let o=t.precision!==void 0?t.precision:"highp";const l=s(o);l!==o&&(console.warn("THREE.WebGLRenderer:",o,"not supported, using",l,"instead."),o=l);const c=a||e.has("WEBGL_draw_buffers"),u=t.logarithmicDepthBuffer===!0,f=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),d=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),m=n.getParameter(n.MAX_TEXTURE_SIZE),g=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),_=n.getParameter(n.MAX_VERTEX_ATTRIBS),p=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),h=n.getParameter(n.MAX_VARYING_VECTORS),S=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),M=d>0,E=a||e.has("OES_texture_float"),D=M&&E,L=a?n.getParameter(n.MAX_SAMPLES):0;return{isWebGL2:a,drawBuffers:c,getMaxAnisotropy:r,getMaxPrecision:s,precision:o,logarithmicDepthBuffer:u,maxTextures:f,maxVertexTextures:d,maxTextureSize:m,maxCubemapSize:g,maxAttributes:_,maxVertexUniforms:p,maxVaryings:h,maxFragmentUniforms:S,vertexTextures:M,floatFragmentTextures:E,floatVertexTextures:D,maxSamples:L}}function wv(n){const e=this;let t=null,i=0,r=!1,s=!1;const a=new hi,o=new Qe,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(f,d){const m=f.length!==0||d||i!==0||r;return r=d,i=f.length,m},this.beginShadows=function(){s=!0,u(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(f,d){t=u(f,d,0)},this.setState=function(f,d,m){const g=f.clippingPlanes,_=f.clipIntersection,p=f.clipShadows,h=n.get(f);if(!r||g===null||g.length===0||s&&!p)s?u(null):c();else{const S=s?0:i,M=S*4;let E=h.clippingState||null;l.value=E,E=u(g,d,M,m);for(let D=0;D!==M;++D)E[D]=t[D];h.clippingState=E,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=S}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function u(f,d,m,g){const _=f!==null?f.length:0;let p=null;if(_!==0){if(p=l.value,g!==!0||p===null){const h=m+_*4,S=d.matrixWorldInverse;o.getNormalMatrix(S),(p===null||p.length<h)&&(p=new Float32Array(h));for(let M=0,E=m;M!==_;++M,E+=4)a.copy(f[M]).applyMatrix4(S,o),a.normal.toArray(p,E),p[E+3]=a.constant}l.value=p,l.needsUpdate=!0}return e.numPlanes=_,e.numIntersection=0,p}}function Rv(n){let e=new WeakMap;function t(a,o){return o===Wa?a.mapping=Tr:o===Xa&&(a.mapping=Ar),a}function i(a){if(a&&a.isTexture){const o=a.mapping;if(o===Wa||o===Xa)if(e.has(a)){const l=e.get(a).texture;return t(l,a.mapping)}else{const l=a.image;if(l&&l.height>0){const c=new Hg(l.height/2);return c.fromEquirectangularTexture(n,a),e.set(a,c),a.addEventListener("dispose",r),t(c.texture,a.mapping)}else return null}}return a}function r(a){const o=a.target;o.removeEventListener("dispose",r);const l=e.get(o);l!==void 0&&(e.delete(o),l.dispose())}function s(){e=new WeakMap}return{get:i,dispose:s}}class Ph extends Rh{constructor(e=-1,t=1,i=1,r=-1,s=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=i,this.bottom=r,this.near=s,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,i,r,s,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let s=i-e,a=i+e,o=r+t,l=r-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=c*this.view.offsetX,a=s+c*this.view.width,o-=u*this.view.offsetY,l=o-u*this.view.height}this.projectionMatrix.makeOrthographic(s,a,o,l,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}const _r=4,hu=[.125,.215,.35,.446,.526,.582],Bi=20,Ma=new Ph,du=new nt;let Sa=null,ya=0,Ea=0;const Oi=(1+Math.sqrt(5))/2,mr=1/Oi,pu=[new V(1,1,1),new V(-1,1,1),new V(1,1,-1),new V(-1,1,-1),new V(0,Oi,mr),new V(0,Oi,-mr),new V(mr,0,Oi),new V(-mr,0,Oi),new V(Oi,mr,0),new V(-Oi,mr,0)];class mu{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,i=.1,r=100){Sa=this._renderer.getRenderTarget(),ya=this._renderer.getActiveCubeFace(),Ea=this._renderer.getActiveMipmapLevel(),this._setSize(256);const s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(e,i,r,s),t>0&&this._blur(s,0,0,t),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=vu(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=_u(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(Sa,ya,Ea),e.scissorTest=!1,Xs(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Tr||e.mapping===Ar?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Sa=this._renderer.getRenderTarget(),ya=this._renderer.getActiveCubeFace(),Ea=this._renderer.getActiveMipmapLevel();const i=t||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:sn,minFilter:sn,generateMipmaps:!1,type:as,format:vn,colorSpace:ri,depthBuffer:!1},r=gu(e,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=gu(e,t,i);const{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Cv(s)),this._blurMaterial=Lv(s,e,t)}return r}_compileMaterial(e){const t=new On(this._lodPlanes[0],e);this._renderer.compile(t,Ma)}_sceneToCubeUV(e,t,i,r){const o=new on(90,1,t,i),l=[1,-1,1,1,1,1],c=[1,1,1,-1,-1,-1],u=this._renderer,f=u.autoClear,d=u.toneMapping;u.getClearColor(du),u.toneMapping=Mi,u.autoClear=!1;const m=new El({name:"PMREM.Background",side:$t,depthWrite:!1,depthTest:!1}),g=new On(new ms,m);let _=!1;const p=e.background;p?p.isColor&&(m.color.copy(p),e.background=null,_=!0):(m.color.copy(du),_=!0);for(let h=0;h<6;h++){const S=h%3;S===0?(o.up.set(0,l[h],0),o.lookAt(c[h],0,0)):S===1?(o.up.set(0,0,l[h]),o.lookAt(0,c[h],0)):(o.up.set(0,l[h],0),o.lookAt(0,0,c[h]));const M=this._cubeSize;Xs(r,S*M,h>2?M:0,M,M),u.setRenderTarget(r),_&&u.render(g,o),u.render(e,o)}g.geometry.dispose(),g.material.dispose(),u.toneMapping=d,u.autoClear=f,e.background=p}_textureToCubeUV(e,t){const i=this._renderer,r=e.mapping===Tr||e.mapping===Ar;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=vu()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=_u());const s=r?this._cubemapMaterial:this._equirectMaterial,a=new On(this._lodPlanes[0],s),o=s.uniforms;o.envMap.value=e;const l=this._cubeSize;Xs(t,0,0,3*l,2*l),i.setRenderTarget(t),i.render(a,Ma)}_applyPMREM(e){const t=this._renderer,i=t.autoClear;t.autoClear=!1;for(let r=1;r<this._lodPlanes.length;r++){const s=Math.sqrt(this._sigmas[r]*this._sigmas[r]-this._sigmas[r-1]*this._sigmas[r-1]),a=pu[(r-1)%pu.length];this._blur(e,r-1,r,s,a)}t.autoClear=i}_blur(e,t,i,r,s){const a=this._pingPongRenderTarget;this._halfBlur(e,a,t,i,r,"latitudinal",s),this._halfBlur(a,e,i,i,r,"longitudinal",s)}_halfBlur(e,t,i,r,s,a,o){const l=this._renderer,c=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const u=3,f=new On(this._lodPlanes[r],c),d=c.uniforms,m=this._sizeLods[i]-1,g=isFinite(s)?Math.PI/(2*m):2*Math.PI/(2*Bi-1),_=s/g,p=isFinite(s)?1+Math.floor(u*_):Bi;p>Bi&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${p} samples when the maximum is set to ${Bi}`);const h=[];let S=0;for(let T=0;T<Bi;++T){const C=T/_,x=Math.exp(-C*C/2);h.push(x),T===0?S+=x:T<p&&(S+=2*x)}for(let T=0;T<h.length;T++)h[T]=h[T]/S;d.envMap.value=e.texture,d.samples.value=p,d.weights.value=h,d.latitudinal.value=a==="latitudinal",o&&(d.poleAxis.value=o);const{_lodMax:M}=this;d.dTheta.value=g,d.mipInt.value=M-i;const E=this._sizeLods[r],D=3*E*(r>M-_r?r-M+_r:0),L=4*(this._cubeSize-E);Xs(t,D,L,3*E,2*E),l.setRenderTarget(t),l.render(f,Ma)}}function Cv(n){const e=[],t=[],i=[];let r=n;const s=n-_r+1+hu.length;for(let a=0;a<s;a++){const o=Math.pow(2,r);t.push(o);let l=1/o;a>n-_r?l=hu[a-n+_r-1]:a===0&&(l=0),i.push(l);const c=1/(o-2),u=-c,f=1+c,d=[u,u,f,u,f,f,u,u,f,f,u,f],m=6,g=6,_=3,p=2,h=1,S=new Float32Array(_*g*m),M=new Float32Array(p*g*m),E=new Float32Array(h*g*m);for(let L=0;L<m;L++){const T=L%3*2/3-1,C=L>2?0:-1,x=[T,C,0,T+2/3,C,0,T+2/3,C+1,0,T,C,0,T+2/3,C+1,0,T,C+1,0];S.set(x,_*g*L),M.set(d,p*g*L);const A=[L,L,L,L,L,L];E.set(A,h*g*L)}const D=new Gn;D.setAttribute("position",new jt(S,_)),D.setAttribute("uv",new jt(M,p)),D.setAttribute("faceIndex",new jt(E,h)),e.push(D),r>_r&&r--}return{lodPlanes:e,sizeLods:t,sigmas:i}}function gu(n,e,t){const i=new qi(n,e,t);return i.texture.mapping=Ro,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function Xs(n,e,t,i,r){n.viewport.set(e,t,i,r),n.scissor.set(e,t,i,r)}function Lv(n,e,t){const i=new Float32Array(Bi),r=new V(0,1,0);return new ji({name:"SphericalGaussianBlur",defines:{n:Bi,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:Tl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:xi,depthTest:!1,depthWrite:!1})}function _u(){return new ji({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Tl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:xi,depthTest:!1,depthWrite:!1})}function vu(){return new ji({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Tl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:xi,depthTest:!1,depthWrite:!1})}function Tl(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function Pv(n){let e=new WeakMap,t=null;function i(o){if(o&&o.isTexture){const l=o.mapping,c=l===Wa||l===Xa,u=l===Tr||l===Ar;if(c||u)if(o.isRenderTargetTexture&&o.needsPMREMUpdate===!0){o.needsPMREMUpdate=!1;let f=e.get(o);return t===null&&(t=new mu(n)),f=c?t.fromEquirectangular(o,f):t.fromCubemap(o,f),e.set(o,f),f.texture}else{if(e.has(o))return e.get(o).texture;{const f=o.image;if(c&&f&&f.height>0||u&&f&&r(f)){t===null&&(t=new mu(n));const d=c?t.fromEquirectangular(o):t.fromCubemap(o);return e.set(o,d),o.addEventListener("dispose",s),d.texture}else return null}}}return o}function r(o){let l=0;const c=6;for(let u=0;u<c;u++)o[u]!==void 0&&l++;return l===c}function s(o){const l=o.target;l.removeEventListener("dispose",s);const c=e.get(l);c!==void 0&&(e.delete(l),c.dispose())}function a(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:i,dispose:a}}function Dv(n){const e={};function t(i){if(e[i]!==void 0)return e[i];let r;switch(i){case"WEBGL_depth_texture":r=n.getExtension("WEBGL_depth_texture")||n.getExtension("MOZ_WEBGL_depth_texture")||n.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=n.getExtension("EXT_texture_filter_anisotropic")||n.getExtension("MOZ_EXT_texture_filter_anisotropic")||n.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=n.getExtension("WEBGL_compressed_texture_s3tc")||n.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=n.getExtension("WEBGL_compressed_texture_pvrtc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=n.getExtension(i)}return e[i]=r,r}return{has:function(i){return t(i)!==null},init:function(i){i.isWebGL2?(t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance")):(t("WEBGL_depth_texture"),t("OES_texture_float"),t("OES_texture_half_float"),t("OES_texture_half_float_linear"),t("OES_standard_derivatives"),t("OES_element_index_uint"),t("OES_vertex_array_object"),t("ANGLE_instanced_arrays")),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture")},get:function(i){const r=t(i);return r===null&&console.warn("THREE.WebGLRenderer: "+i+" extension not supported."),r}}}function Uv(n,e,t,i){const r={},s=new WeakMap;function a(f){const d=f.target;d.index!==null&&e.remove(d.index);for(const g in d.attributes)e.remove(d.attributes[g]);for(const g in d.morphAttributes){const _=d.morphAttributes[g];for(let p=0,h=_.length;p<h;p++)e.remove(_[p])}d.removeEventListener("dispose",a),delete r[d.id];const m=s.get(d);m&&(e.remove(m),s.delete(d)),i.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,t.memory.geometries--}function o(f,d){return r[d.id]===!0||(d.addEventListener("dispose",a),r[d.id]=!0,t.memory.geometries++),d}function l(f){const d=f.attributes;for(const g in d)e.update(d[g],n.ARRAY_BUFFER);const m=f.morphAttributes;for(const g in m){const _=m[g];for(let p=0,h=_.length;p<h;p++)e.update(_[p],n.ARRAY_BUFFER)}}function c(f){const d=[],m=f.index,g=f.attributes.position;let _=0;if(m!==null){const S=m.array;_=m.version;for(let M=0,E=S.length;M<E;M+=3){const D=S[M+0],L=S[M+1],T=S[M+2];d.push(D,L,L,T,T,D)}}else if(g!==void 0){const S=g.array;_=g.version;for(let M=0,E=S.length/3-1;M<E;M+=3){const D=M+0,L=M+1,T=M+2;d.push(D,L,L,T,T,D)}}else return;const p=new(xh(d)?Ah:Th)(d,1);p.version=_;const h=s.get(f);h&&e.remove(h),s.set(f,p)}function u(f){const d=s.get(f);if(d){const m=f.index;m!==null&&d.version<m.version&&c(f)}else c(f);return s.get(f)}return{get:o,update:l,getWireframeAttribute:u}}function Iv(n,e,t,i){const r=i.isWebGL2;let s;function a(m){s=m}let o,l;function c(m){o=m.type,l=m.bytesPerElement}function u(m,g){n.drawElements(s,g,o,m*l),t.update(g,s,1)}function f(m,g,_){if(_===0)return;let p,h;if(r)p=n,h="drawElementsInstanced";else if(p=e.get("ANGLE_instanced_arrays"),h="drawElementsInstancedANGLE",p===null){console.error("THREE.WebGLIndexedBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}p[h](s,g,o,m*l,_),t.update(g,s,_)}function d(m,g,_){if(_===0)return;const p=e.get("WEBGL_multi_draw");if(p===null)for(let h=0;h<_;h++)this.render(m[h]/l,g[h]);else{p.multiDrawElementsWEBGL(s,g,0,o,m,0,_);let h=0;for(let S=0;S<_;S++)h+=g[S];t.update(h,s,1)}}this.setMode=a,this.setIndex=c,this.render=u,this.renderInstances=f,this.renderMultiDraw=d}function Nv(n){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(s,a,o){switch(t.calls++,a){case n.TRIANGLES:t.triangles+=o*(s/3);break;case n.LINES:t.lines+=o*(s/2);break;case n.LINE_STRIP:t.lines+=o*(s-1);break;case n.LINE_LOOP:t.lines+=o*s;break;case n.POINTS:t.points+=o*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",a);break}}function r(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:r,update:i}}function Ov(n,e){return n[0]-e[0]}function Fv(n,e){return Math.abs(e[1])-Math.abs(n[1])}function Bv(n,e,t){const i={},r=new Float32Array(8),s=new WeakMap,a=new wt,o=[];for(let c=0;c<8;c++)o[c]=[c,0];function l(c,u,f){const d=c.morphTargetInfluences;if(e.isWebGL2===!0){const g=u.morphAttributes.position||u.morphAttributes.normal||u.morphAttributes.color,_=g!==void 0?g.length:0;let p=s.get(u);if(p===void 0||p.count!==_){let W=function(){se.dispose(),s.delete(u),u.removeEventListener("dispose",W)};var m=W;p!==void 0&&p.texture.dispose();const M=u.morphAttributes.position!==void 0,E=u.morphAttributes.normal!==void 0,D=u.morphAttributes.color!==void 0,L=u.morphAttributes.position||[],T=u.morphAttributes.normal||[],C=u.morphAttributes.color||[];let x=0;M===!0&&(x=1),E===!0&&(x=2),D===!0&&(x=3);let A=u.attributes.position.count*x,k=1;A>e.maxTextureSize&&(k=Math.ceil(A/e.maxTextureSize),A=e.maxTextureSize);const te=new Float32Array(A*k*4*_),se=new yh(te,A,k,_);se.type=mi,se.needsUpdate=!0;const N=x*4;for(let G=0;G<_;G++){const Q=L[G],$=T[G],re=C[G],ae=A*k*4*G;for(let pe=0;pe<Q.count;pe++){const he=pe*N;M===!0&&(a.fromBufferAttribute(Q,pe),te[ae+he+0]=a.x,te[ae+he+1]=a.y,te[ae+he+2]=a.z,te[ae+he+3]=0),E===!0&&(a.fromBufferAttribute($,pe),te[ae+he+4]=a.x,te[ae+he+5]=a.y,te[ae+he+6]=a.z,te[ae+he+7]=0),D===!0&&(a.fromBufferAttribute(re,pe),te[ae+he+8]=a.x,te[ae+he+9]=a.y,te[ae+he+10]=a.z,te[ae+he+11]=re.itemSize===4?a.w:1)}}p={count:_,texture:se,size:new Xe(A,k)},s.set(u,p),u.addEventListener("dispose",W)}let h=0;for(let M=0;M<d.length;M++)h+=d[M];const S=u.morphTargetsRelative?1:1-h;f.getUniforms().setValue(n,"morphTargetBaseInfluence",S),f.getUniforms().setValue(n,"morphTargetInfluences",d),f.getUniforms().setValue(n,"morphTargetsTexture",p.texture,t),f.getUniforms().setValue(n,"morphTargetsTextureSize",p.size)}else{const g=d===void 0?0:d.length;let _=i[u.id];if(_===void 0||_.length!==g){_=[];for(let E=0;E<g;E++)_[E]=[E,0];i[u.id]=_}for(let E=0;E<g;E++){const D=_[E];D[0]=E,D[1]=d[E]}_.sort(Fv);for(let E=0;E<8;E++)E<g&&_[E][1]?(o[E][0]=_[E][0],o[E][1]=_[E][1]):(o[E][0]=Number.MAX_SAFE_INTEGER,o[E][1]=0);o.sort(Ov);const p=u.morphAttributes.position,h=u.morphAttributes.normal;let S=0;for(let E=0;E<8;E++){const D=o[E],L=D[0],T=D[1];L!==Number.MAX_SAFE_INTEGER&&T?(p&&u.getAttribute("morphTarget"+E)!==p[L]&&u.setAttribute("morphTarget"+E,p[L]),h&&u.getAttribute("morphNormal"+E)!==h[L]&&u.setAttribute("morphNormal"+E,h[L]),r[E]=T,S+=T):(p&&u.hasAttribute("morphTarget"+E)===!0&&u.deleteAttribute("morphTarget"+E),h&&u.hasAttribute("morphNormal"+E)===!0&&u.deleteAttribute("morphNormal"+E),r[E]=0)}const M=u.morphTargetsRelative?1:1-S;f.getUniforms().setValue(n,"morphTargetBaseInfluence",M),f.getUniforms().setValue(n,"morphTargetInfluences",r)}}return{update:l}}function zv(n,e,t,i){let r=new WeakMap;function s(l){const c=i.render.frame,u=l.geometry,f=e.get(l,u);if(r.get(f)!==c&&(e.update(f),r.set(f,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",o)===!1&&l.addEventListener("dispose",o),r.get(l)!==c&&(t.update(l.instanceMatrix,n.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,n.ARRAY_BUFFER),r.set(l,c))),l.isSkinnedMesh){const d=l.skeleton;r.get(d)!==c&&(d.update(),r.set(d,c))}return f}function a(){r=new WeakMap}function o(l){const c=l.target;c.removeEventListener("dispose",o),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:s,dispose:a}}class Dh extends en{constructor(e,t,i,r,s,a,o,l,c,u){if(u=u!==void 0?u:Wi,u!==Wi&&u!==wr)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");i===void 0&&u===Wi&&(i=pi),i===void 0&&u===wr&&(i=ki),super(null,r,s,a,o,l,u,i,c),this.isDepthTexture=!0,this.image={width:e,height:t},this.magFilter=o!==void 0?o:Gt,this.minFilter=l!==void 0?l:Gt,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}const Uh=new en,Ih=new Dh(1,1);Ih.compareFunction=vh;const Nh=new yh,Oh=new Eg,Fh=new Ch,xu=[],Mu=[],Su=new Float32Array(16),yu=new Float32Array(9),Eu=new Float32Array(4);function Lr(n,e,t){const i=n[0];if(i<=0||i>0)return n;const r=e*t;let s=xu[r];if(s===void 0&&(s=new Float32Array(r),xu[r]=s),e!==0){i.toArray(s,0);for(let a=1,o=0;a!==e;++a)o+=t,n[a].toArray(s,o)}return s}function Et(n,e){if(n.length!==e.length)return!1;for(let t=0,i=n.length;t<i;t++)if(n[t]!==e[t])return!1;return!0}function bt(n,e){for(let t=0,i=e.length;t<i;t++)n[t]=e[t]}function Do(n,e){let t=Mu[e];t===void 0&&(t=new Int32Array(e),Mu[e]=t);for(let i=0;i!==e;++i)t[i]=n.allocateTextureUnit();return t}function Hv(n,e){const t=this.cache;t[0]!==e&&(n.uniform1f(this.addr,e),t[0]=e)}function Vv(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Et(t,e))return;n.uniform2fv(this.addr,e),bt(t,e)}}function Gv(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(n.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Et(t,e))return;n.uniform3fv(this.addr,e),bt(t,e)}}function kv(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Et(t,e))return;n.uniform4fv(this.addr,e),bt(t,e)}}function Wv(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(Et(t,e))return;n.uniformMatrix2fv(this.addr,!1,e),bt(t,e)}else{if(Et(t,i))return;Eu.set(i),n.uniformMatrix2fv(this.addr,!1,Eu),bt(t,i)}}function Xv(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(Et(t,e))return;n.uniformMatrix3fv(this.addr,!1,e),bt(t,e)}else{if(Et(t,i))return;yu.set(i),n.uniformMatrix3fv(this.addr,!1,yu),bt(t,i)}}function qv(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(Et(t,e))return;n.uniformMatrix4fv(this.addr,!1,e),bt(t,e)}else{if(Et(t,i))return;Su.set(i),n.uniformMatrix4fv(this.addr,!1,Su),bt(t,i)}}function Yv(n,e){const t=this.cache;t[0]!==e&&(n.uniform1i(this.addr,e),t[0]=e)}function jv(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Et(t,e))return;n.uniform2iv(this.addr,e),bt(t,e)}}function $v(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Et(t,e))return;n.uniform3iv(this.addr,e),bt(t,e)}}function Kv(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Et(t,e))return;n.uniform4iv(this.addr,e),bt(t,e)}}function Zv(n,e){const t=this.cache;t[0]!==e&&(n.uniform1ui(this.addr,e),t[0]=e)}function Jv(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Et(t,e))return;n.uniform2uiv(this.addr,e),bt(t,e)}}function Qv(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Et(t,e))return;n.uniform3uiv(this.addr,e),bt(t,e)}}function ex(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Et(t,e))return;n.uniform4uiv(this.addr,e),bt(t,e)}}function tx(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r);const s=this.type===n.SAMPLER_2D_SHADOW?Ih:Uh;t.setTexture2D(e||s,r)}function nx(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTexture3D(e||Oh,r)}function ix(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTextureCube(e||Fh,r)}function rx(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTexture2DArray(e||Nh,r)}function sx(n){switch(n){case 5126:return Hv;case 35664:return Vv;case 35665:return Gv;case 35666:return kv;case 35674:return Wv;case 35675:return Xv;case 35676:return qv;case 5124:case 35670:return Yv;case 35667:case 35671:return jv;case 35668:case 35672:return $v;case 35669:case 35673:return Kv;case 5125:return Zv;case 36294:return Jv;case 36295:return Qv;case 36296:return ex;case 35678:case 36198:case 36298:case 36306:case 35682:return tx;case 35679:case 36299:case 36307:return nx;case 35680:case 36300:case 36308:case 36293:return ix;case 36289:case 36303:case 36311:case 36292:return rx}}function ox(n,e){n.uniform1fv(this.addr,e)}function ax(n,e){const t=Lr(e,this.size,2);n.uniform2fv(this.addr,t)}function lx(n,e){const t=Lr(e,this.size,3);n.uniform3fv(this.addr,t)}function cx(n,e){const t=Lr(e,this.size,4);n.uniform4fv(this.addr,t)}function ux(n,e){const t=Lr(e,this.size,4);n.uniformMatrix2fv(this.addr,!1,t)}function fx(n,e){const t=Lr(e,this.size,9);n.uniformMatrix3fv(this.addr,!1,t)}function hx(n,e){const t=Lr(e,this.size,16);n.uniformMatrix4fv(this.addr,!1,t)}function dx(n,e){n.uniform1iv(this.addr,e)}function px(n,e){n.uniform2iv(this.addr,e)}function mx(n,e){n.uniform3iv(this.addr,e)}function gx(n,e){n.uniform4iv(this.addr,e)}function _x(n,e){n.uniform1uiv(this.addr,e)}function vx(n,e){n.uniform2uiv(this.addr,e)}function xx(n,e){n.uniform3uiv(this.addr,e)}function Mx(n,e){n.uniform4uiv(this.addr,e)}function Sx(n,e,t){const i=this.cache,r=e.length,s=Do(t,r);Et(i,s)||(n.uniform1iv(this.addr,s),bt(i,s));for(let a=0;a!==r;++a)t.setTexture2D(e[a]||Uh,s[a])}function yx(n,e,t){const i=this.cache,r=e.length,s=Do(t,r);Et(i,s)||(n.uniform1iv(this.addr,s),bt(i,s));for(let a=0;a!==r;++a)t.setTexture3D(e[a]||Oh,s[a])}function Ex(n,e,t){const i=this.cache,r=e.length,s=Do(t,r);Et(i,s)||(n.uniform1iv(this.addr,s),bt(i,s));for(let a=0;a!==r;++a)t.setTextureCube(e[a]||Fh,s[a])}function bx(n,e,t){const i=this.cache,r=e.length,s=Do(t,r);Et(i,s)||(n.uniform1iv(this.addr,s),bt(i,s));for(let a=0;a!==r;++a)t.setTexture2DArray(e[a]||Nh,s[a])}function Tx(n){switch(n){case 5126:return ox;case 35664:return ax;case 35665:return lx;case 35666:return cx;case 35674:return ux;case 35675:return fx;case 35676:return hx;case 5124:case 35670:return dx;case 35667:case 35671:return px;case 35668:case 35672:return mx;case 35669:case 35673:return gx;case 5125:return _x;case 36294:return vx;case 36295:return xx;case 36296:return Mx;case 35678:case 36198:case 36298:case 36306:case 35682:return Sx;case 35679:case 36299:case 36307:return yx;case 35680:case 36300:case 36308:case 36293:return Ex;case 36289:case 36303:case 36311:case 36292:return bx}}class Ax{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.setValue=sx(t.type)}}class wx{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Tx(t.type)}}class Rx{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,i){const r=this.seq;for(let s=0,a=r.length;s!==a;++s){const o=r[s];o.setValue(e,t[o.id],i)}}}const ba=/(\w+)(\])?(\[|\.)?/g;function bu(n,e){n.seq.push(e),n.map[e.id]=e}function Cx(n,e,t){const i=n.name,r=i.length;for(ba.lastIndex=0;;){const s=ba.exec(i),a=ba.lastIndex;let o=s[1];const l=s[2]==="]",c=s[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===r){bu(t,c===void 0?new Ax(o,n,e):new wx(o,n,e));break}else{let f=t.map[o];f===void 0&&(f=new Rx(o),bu(t,f)),t=f}}}class eo{constructor(e,t){this.seq=[],this.map={};const i=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<i;++r){const s=e.getActiveUniform(t,r),a=e.getUniformLocation(t,s.name);Cx(s,a,this)}}setValue(e,t,i,r){const s=this.map[t];s!==void 0&&s.setValue(e,i,r)}setOptional(e,t,i){const r=t[i];r!==void 0&&this.setValue(e,i,r)}static upload(e,t,i,r){for(let s=0,a=t.length;s!==a;++s){const o=t[s],l=i[o.id];l.needsUpdate!==!1&&o.setValue(e,l.value,r)}}static seqWithValue(e,t){const i=[];for(let r=0,s=e.length;r!==s;++r){const a=e[r];a.id in t&&i.push(a)}return i}}function Tu(n,e,t){const i=n.createShader(e);return n.shaderSource(i,t),n.compileShader(i),i}const Lx=37297;let Px=0;function Dx(n,e){const t=n.split(`
`),i=[],r=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let a=r;a<s;a++){const o=a+1;i.push(`${o===e?">":" "} ${o}: ${t[a]}`)}return i.join(`
`)}function Ux(n){const e=ot.getPrimaries(ot.workingColorSpace),t=ot.getPrimaries(n);let i;switch(e===t?i="":e===po&&t===ho?i="LinearDisplayP3ToLinearSRGB":e===ho&&t===po&&(i="LinearSRGBToLinearDisplayP3"),n){case ri:case Co:return[i,"LinearTransferOETF"];case Lt:case Sl:return[i,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space:",n),[i,"LinearTransferOETF"]}}function Au(n,e,t){const i=n.getShaderParameter(e,n.COMPILE_STATUS),r=n.getShaderInfoLog(e).trim();if(i&&r==="")return"";const s=/ERROR: 0:(\d+)/.exec(r);if(s){const a=parseInt(s[1]);return t.toUpperCase()+`

`+r+`

`+Dx(n.getShaderSource(e),a)}else return r}function Ix(n,e){const t=Ux(e);return`vec4 ${n}( vec4 value ) { return ${t[0]}( ${t[1]}( value ) ); }`}function Nx(n,e){let t;switch(e){case Xm:t="Linear";break;case qm:t="Reinhard";break;case Ym:t="OptimizedCineon";break;case jm:t="ACESFilmic";break;case Km:t="AgX";break;case $m:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+n+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}function Ox(n){return[n.extensionDerivatives||n.envMapCubeUVHeight||n.bumpMap||n.normalMapTangentSpace||n.clearcoatNormalMap||n.flatShading||n.shaderID==="physical"?"#extension GL_OES_standard_derivatives : enable":"",(n.extensionFragDepth||n.logarithmicDepthBuffer)&&n.rendererExtensionFragDepth?"#extension GL_EXT_frag_depth : enable":"",n.extensionDrawBuffers&&n.rendererExtensionDrawBuffers?"#extension GL_EXT_draw_buffers : require":"",(n.extensionShaderTextureLOD||n.envMap||n.transmission)&&n.rendererExtensionShaderTextureLod?"#extension GL_EXT_shader_texture_lod : enable":""].filter(vr).join(`
`)}function Fx(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":""].filter(vr).join(`
`)}function Bx(n){const e=[];for(const t in n){const i=n[t];i!==!1&&e.push("#define "+t+" "+i)}return e.join(`
`)}function zx(n,e){const t={},i=n.getProgramParameter(e,n.ACTIVE_ATTRIBUTES);for(let r=0;r<i;r++){const s=n.getActiveAttrib(e,r),a=s.name;let o=1;s.type===n.FLOAT_MAT2&&(o=2),s.type===n.FLOAT_MAT3&&(o=3),s.type===n.FLOAT_MAT4&&(o=4),t[a]={type:s.type,location:n.getAttribLocation(e,a),locationSize:o}}return t}function vr(n){return n!==""}function wu(n,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return n.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Ru(n,e){return n.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const Hx=/^[ \t]*#include +<([\w\d./]+)>/gm;function Za(n){return n.replace(Hx,Gx)}const Vx=new Map([["encodings_fragment","colorspace_fragment"],["encodings_pars_fragment","colorspace_pars_fragment"],["output_fragment","opaque_fragment"]]);function Gx(n,e){let t=je[e];if(t===void 0){const i=Vx.get(e);if(i!==void 0)t=je[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i);else throw new Error("Can not resolve #include <"+e+">")}return Za(t)}const kx=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Cu(n){return n.replace(kx,Wx)}function Wx(n,e,t,i){let r="";for(let s=parseInt(e);s<parseInt(t);s++)r+=i.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function Lu(n){let e="precision "+n.precision+` float;
precision `+n.precision+" int;";return n.precision==="highp"?e+=`
#define HIGH_PRECISION`:n.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function Xx(n){let e="SHADOWMAP_TYPE_BASIC";return n.shadowMapType===oh?e="SHADOWMAP_TYPE_PCF":n.shadowMapType===xm?e="SHADOWMAP_TYPE_PCF_SOFT":n.shadowMapType===Kn&&(e="SHADOWMAP_TYPE_VSM"),e}function qx(n){let e="ENVMAP_TYPE_CUBE";if(n.envMap)switch(n.envMapMode){case Tr:case Ar:e="ENVMAP_TYPE_CUBE";break;case Ro:e="ENVMAP_TYPE_CUBE_UV";break}return e}function Yx(n){let e="ENVMAP_MODE_REFLECTION";if(n.envMap)switch(n.envMapMode){case Ar:e="ENVMAP_MODE_REFRACTION";break}return e}function jx(n){let e="ENVMAP_BLENDING_NONE";if(n.envMap)switch(n.combine){case ah:e="ENVMAP_BLENDING_MULTIPLY";break;case km:e="ENVMAP_BLENDING_MIX";break;case Wm:e="ENVMAP_BLENDING_ADD";break}return e}function $x(n){const e=n.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),7*16)),texelHeight:i,maxMip:t}}function Kx(n,e,t,i){const r=n.getContext(),s=t.defines;let a=t.vertexShader,o=t.fragmentShader;const l=Xx(t),c=qx(t),u=Yx(t),f=jx(t),d=$x(t),m=t.isWebGL2?"":Ox(t),g=Fx(t),_=Bx(s),p=r.createProgram();let h,S,M=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(h=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,_].filter(vr).join(`
`),h.length>0&&(h+=`
`),S=[m,"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,_].filter(vr).join(`
`),S.length>0&&(S+=`
`)):(h=[Lu(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,_,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors&&t.isWebGL2?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0&&t.isWebGL2?"#define MORPHTARGETS_TEXTURE":"",t.morphTargetsCount>0&&t.isWebGL2?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0&&t.isWebGL2?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.useLegacyLights?"#define LEGACY_LIGHTS":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.logarithmicDepthBuffer&&t.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#if ( defined( USE_MORPHTARGETS ) && ! defined( MORPHTARGETS_TEXTURE ) )","	attribute vec3 morphTarget0;","	attribute vec3 morphTarget1;","	attribute vec3 morphTarget2;","	attribute vec3 morphTarget3;","	#ifdef USE_MORPHNORMALS","		attribute vec3 morphNormal0;","		attribute vec3 morphNormal1;","		attribute vec3 morphNormal2;","		attribute vec3 morphNormal3;","	#else","		attribute vec3 morphTarget4;","		attribute vec3 morphTarget5;","		attribute vec3 morphTarget6;","		attribute vec3 morphTarget7;","	#endif","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(vr).join(`
`),S=[m,Lu(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,_,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+u:"",t.envMap?"#define "+f:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.useLegacyLights?"#define LEGACY_LIGHTS":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.logarithmicDepthBuffer&&t.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Mi?"#define TONE_MAPPING":"",t.toneMapping!==Mi?je.tonemapping_pars_fragment:"",t.toneMapping!==Mi?Nx("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",je.colorspace_pars_fragment,Ix("linearToOutputTexel",t.outputColorSpace),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(vr).join(`
`)),a=Za(a),a=wu(a,t),a=Ru(a,t),o=Za(o),o=wu(o,t),o=Ru(o,t),a=Cu(a),o=Cu(o),t.isWebGL2&&t.isRawShaderMaterial!==!0&&(M=`#version 300 es
`,h=[g,"precision mediump sampler2DArray;","#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+h,S=["precision mediump sampler2DArray;","#define varying in",t.glslVersion===jc?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===jc?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+S);const E=M+h+a,D=M+S+o,L=Tu(r,r.VERTEX_SHADER,E),T=Tu(r,r.FRAGMENT_SHADER,D);r.attachShader(p,L),r.attachShader(p,T),t.index0AttributeName!==void 0?r.bindAttribLocation(p,0,t.index0AttributeName):t.morphTargets===!0&&r.bindAttribLocation(p,0,"position"),r.linkProgram(p);function C(te){if(n.debug.checkShaderErrors){const se=r.getProgramInfoLog(p).trim(),N=r.getShaderInfoLog(L).trim(),W=r.getShaderInfoLog(T).trim();let G=!0,Q=!0;if(r.getProgramParameter(p,r.LINK_STATUS)===!1)if(G=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(r,p,L,T);else{const $=Au(r,L,"vertex"),re=Au(r,T,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(p,r.VALIDATE_STATUS)+`

Program Info Log: `+se+`
`+$+`
`+re)}else se!==""?console.warn("THREE.WebGLProgram: Program Info Log:",se):(N===""||W==="")&&(Q=!1);Q&&(te.diagnostics={runnable:G,programLog:se,vertexShader:{log:N,prefix:h},fragmentShader:{log:W,prefix:S}})}r.deleteShader(L),r.deleteShader(T),x=new eo(r,p),A=zx(r,p)}let x;this.getUniforms=function(){return x===void 0&&C(this),x};let A;this.getAttributes=function(){return A===void 0&&C(this),A};let k=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return k===!1&&(k=r.getProgramParameter(p,Lx)),k},this.destroy=function(){i.releaseStatesOfProgram(this),r.deleteProgram(p),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Px++,this.cacheKey=e,this.usedTimes=1,this.program=p,this.vertexShader=L,this.fragmentShader=T,this}let Zx=0;class Jx{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,i=e.fragmentShader,r=this._getShaderStage(t),s=this._getShaderStage(i),a=this._getShaderCacheForMaterial(e);return a.has(r)===!1&&(a.add(r),r.usedTimes++),a.has(s)===!1&&(a.add(s),s.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let i=t.get(e);return i===void 0&&(i=new Set,t.set(e,i)),i}_getShaderStage(e){const t=this.shaderCache;let i=t.get(e);return i===void 0&&(i=new Qx(e),t.set(e,i)),i}}class Qx{constructor(e){this.id=Zx++,this.code=e,this.usedTimes=0}}function eM(n,e,t,i,r,s,a){const o=new Eh,l=new Jx,c=[],u=r.isWebGL2,f=r.logarithmicDepthBuffer,d=r.vertexTextures;let m=r.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function _(x){return x===0?"uv":`uv${x}`}function p(x,A,k,te,se){const N=te.fog,W=se.geometry,G=x.isMeshStandardMaterial?te.environment:null,Q=(x.isMeshStandardMaterial?t:e).get(x.envMap||G),$=Q&&Q.mapping===Ro?Q.image.height:null,re=g[x.type];x.precision!==null&&(m=r.getMaxPrecision(x.precision),m!==x.precision&&console.warn("THREE.WebGLProgram.getParameters:",x.precision,"not supported, using",m,"instead."));const ae=W.morphAttributes.position||W.morphAttributes.normal||W.morphAttributes.color,pe=ae!==void 0?ae.length:0;let he=0;W.morphAttributes.position!==void 0&&(he=1),W.morphAttributes.normal!==void 0&&(he=2),W.morphAttributes.color!==void 0&&(he=3);let ne,ue,Ee,Re;if(re){const _t=Ln[re];ne=_t.vertexShader,ue=_t.fragmentShader}else ne=x.vertexShader,ue=x.fragmentShader,l.update(x),Ee=l.getVertexShaderID(x),Re=l.getFragmentShaderID(x);const Ce=n.getRenderTarget(),Ve=se.isInstancedMesh===!0,Oe=se.isBatchedMesh===!0,Ne=!!x.map,R=!!x.matcap,b=!!Q,j=!!x.aoMap,Y=!!x.lightMap,X=!!x.bumpMap,z=!!x.normalMap,le=!!x.displacementMap,ie=!!x.emissiveMap,y=!!x.metalnessMap,v=!!x.roughnessMap,O=x.anisotropy>0,B=x.clearcoat>0,q=x.iridescence>0,Z=x.sheen>0,me=x.transmission>0,ce=O&&!!x.anisotropyMap,de=B&&!!x.clearcoatMap,be=B&&!!x.clearcoatNormalMap,Le=B&&!!x.clearcoatRoughnessMap,oe=q&&!!x.iridescenceMap,ke=q&&!!x.iridescenceThicknessMap,Fe=Z&&!!x.sheenColorMap,Be=Z&&!!x.sheenRoughnessMap,Te=!!x.specularMap,xe=!!x.specularColorMap,P=!!x.specularIntensityMap,ge=me&&!!x.transmissionMap,Pe=me&&!!x.thicknessMap,we=!!x.gradientMap,fe=!!x.alphaMap,I=x.alphaTest>0,ve=!!x.alphaHash,ye=!!x.extensions,ze=!!W.attributes.uv1,Ue=!!W.attributes.uv2,et=!!W.attributes.uv3;let tt=Mi;return x.toneMapped&&(Ce===null||Ce.isXRRenderTarget===!0)&&(tt=n.toneMapping),{isWebGL2:u,shaderID:re,shaderType:x.type,shaderName:x.name,vertexShader:ne,fragmentShader:ue,defines:x.defines,customVertexShaderID:Ee,customFragmentShaderID:Re,isRawShaderMaterial:x.isRawShaderMaterial===!0,glslVersion:x.glslVersion,precision:m,batching:Oe,instancing:Ve,instancingColor:Ve&&se.instanceColor!==null,supportsVertexTextures:d,outputColorSpace:Ce===null?n.outputColorSpace:Ce.isXRRenderTarget===!0?Ce.texture.colorSpace:ri,map:Ne,matcap:R,envMap:b,envMapMode:b&&Q.mapping,envMapCubeUVHeight:$,aoMap:j,lightMap:Y,bumpMap:X,normalMap:z,displacementMap:d&&le,emissiveMap:ie,normalMapObjectSpace:z&&x.normalMapType===lg,normalMapTangentSpace:z&&x.normalMapType===_h,metalnessMap:y,roughnessMap:v,anisotropy:O,anisotropyMap:ce,clearcoat:B,clearcoatMap:de,clearcoatNormalMap:be,clearcoatRoughnessMap:Le,iridescence:q,iridescenceMap:oe,iridescenceThicknessMap:ke,sheen:Z,sheenColorMap:Fe,sheenRoughnessMap:Be,specularMap:Te,specularColorMap:xe,specularIntensityMap:P,transmission:me,transmissionMap:ge,thicknessMap:Pe,gradientMap:we,opaque:x.transparent===!1&&x.blending===Mr,alphaMap:fe,alphaTest:I,alphaHash:ve,combine:x.combine,mapUv:Ne&&_(x.map.channel),aoMapUv:j&&_(x.aoMap.channel),lightMapUv:Y&&_(x.lightMap.channel),bumpMapUv:X&&_(x.bumpMap.channel),normalMapUv:z&&_(x.normalMap.channel),displacementMapUv:le&&_(x.displacementMap.channel),emissiveMapUv:ie&&_(x.emissiveMap.channel),metalnessMapUv:y&&_(x.metalnessMap.channel),roughnessMapUv:v&&_(x.roughnessMap.channel),anisotropyMapUv:ce&&_(x.anisotropyMap.channel),clearcoatMapUv:de&&_(x.clearcoatMap.channel),clearcoatNormalMapUv:be&&_(x.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Le&&_(x.clearcoatRoughnessMap.channel),iridescenceMapUv:oe&&_(x.iridescenceMap.channel),iridescenceThicknessMapUv:ke&&_(x.iridescenceThicknessMap.channel),sheenColorMapUv:Fe&&_(x.sheenColorMap.channel),sheenRoughnessMapUv:Be&&_(x.sheenRoughnessMap.channel),specularMapUv:Te&&_(x.specularMap.channel),specularColorMapUv:xe&&_(x.specularColorMap.channel),specularIntensityMapUv:P&&_(x.specularIntensityMap.channel),transmissionMapUv:ge&&_(x.transmissionMap.channel),thicknessMapUv:Pe&&_(x.thicknessMap.channel),alphaMapUv:fe&&_(x.alphaMap.channel),vertexTangents:!!W.attributes.tangent&&(z||O),vertexColors:x.vertexColors,vertexAlphas:x.vertexColors===!0&&!!W.attributes.color&&W.attributes.color.itemSize===4,vertexUv1s:ze,vertexUv2s:Ue,vertexUv3s:et,pointsUvs:se.isPoints===!0&&!!W.attributes.uv&&(Ne||fe),fog:!!N,useFog:x.fog===!0,fogExp2:N&&N.isFogExp2,flatShading:x.flatShading===!0,sizeAttenuation:x.sizeAttenuation===!0,logarithmicDepthBuffer:f,skinning:se.isSkinnedMesh===!0,morphTargets:W.morphAttributes.position!==void 0,morphNormals:W.morphAttributes.normal!==void 0,morphColors:W.morphAttributes.color!==void 0,morphTargetsCount:pe,morphTextureStride:he,numDirLights:A.directional.length,numPointLights:A.point.length,numSpotLights:A.spot.length,numSpotLightMaps:A.spotLightMap.length,numRectAreaLights:A.rectArea.length,numHemiLights:A.hemi.length,numDirLightShadows:A.directionalShadowMap.length,numPointLightShadows:A.pointShadowMap.length,numSpotLightShadows:A.spotShadowMap.length,numSpotLightShadowsWithMaps:A.numSpotLightShadowsWithMaps,numLightProbes:A.numLightProbes,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:x.dithering,shadowMapEnabled:n.shadowMap.enabled&&k.length>0,shadowMapType:n.shadowMap.type,toneMapping:tt,useLegacyLights:n._useLegacyLights,decodeVideoTexture:Ne&&x.map.isVideoTexture===!0&&ot.getTransfer(x.map.colorSpace)===ft,premultipliedAlpha:x.premultipliedAlpha,doubleSided:x.side===In,flipSided:x.side===$t,useDepthPacking:x.depthPacking>=0,depthPacking:x.depthPacking||0,index0AttributeName:x.index0AttributeName,extensionDerivatives:ye&&x.extensions.derivatives===!0,extensionFragDepth:ye&&x.extensions.fragDepth===!0,extensionDrawBuffers:ye&&x.extensions.drawBuffers===!0,extensionShaderTextureLOD:ye&&x.extensions.shaderTextureLOD===!0,extensionClipCullDistance:ye&&x.extensions.clipCullDistance&&i.has("WEBGL_clip_cull_distance"),rendererExtensionFragDepth:u||i.has("EXT_frag_depth"),rendererExtensionDrawBuffers:u||i.has("WEBGL_draw_buffers"),rendererExtensionShaderTextureLod:u||i.has("EXT_shader_texture_lod"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:x.customProgramCacheKey()}}function h(x){const A=[];if(x.shaderID?A.push(x.shaderID):(A.push(x.customVertexShaderID),A.push(x.customFragmentShaderID)),x.defines!==void 0)for(const k in x.defines)A.push(k),A.push(x.defines[k]);return x.isRawShaderMaterial===!1&&(S(A,x),M(A,x),A.push(n.outputColorSpace)),A.push(x.customProgramCacheKey),A.join()}function S(x,A){x.push(A.precision),x.push(A.outputColorSpace),x.push(A.envMapMode),x.push(A.envMapCubeUVHeight),x.push(A.mapUv),x.push(A.alphaMapUv),x.push(A.lightMapUv),x.push(A.aoMapUv),x.push(A.bumpMapUv),x.push(A.normalMapUv),x.push(A.displacementMapUv),x.push(A.emissiveMapUv),x.push(A.metalnessMapUv),x.push(A.roughnessMapUv),x.push(A.anisotropyMapUv),x.push(A.clearcoatMapUv),x.push(A.clearcoatNormalMapUv),x.push(A.clearcoatRoughnessMapUv),x.push(A.iridescenceMapUv),x.push(A.iridescenceThicknessMapUv),x.push(A.sheenColorMapUv),x.push(A.sheenRoughnessMapUv),x.push(A.specularMapUv),x.push(A.specularColorMapUv),x.push(A.specularIntensityMapUv),x.push(A.transmissionMapUv),x.push(A.thicknessMapUv),x.push(A.combine),x.push(A.fogExp2),x.push(A.sizeAttenuation),x.push(A.morphTargetsCount),x.push(A.morphAttributeCount),x.push(A.numDirLights),x.push(A.numPointLights),x.push(A.numSpotLights),x.push(A.numSpotLightMaps),x.push(A.numHemiLights),x.push(A.numRectAreaLights),x.push(A.numDirLightShadows),x.push(A.numPointLightShadows),x.push(A.numSpotLightShadows),x.push(A.numSpotLightShadowsWithMaps),x.push(A.numLightProbes),x.push(A.shadowMapType),x.push(A.toneMapping),x.push(A.numClippingPlanes),x.push(A.numClipIntersection),x.push(A.depthPacking)}function M(x,A){o.disableAll(),A.isWebGL2&&o.enable(0),A.supportsVertexTextures&&o.enable(1),A.instancing&&o.enable(2),A.instancingColor&&o.enable(3),A.matcap&&o.enable(4),A.envMap&&o.enable(5),A.normalMapObjectSpace&&o.enable(6),A.normalMapTangentSpace&&o.enable(7),A.clearcoat&&o.enable(8),A.iridescence&&o.enable(9),A.alphaTest&&o.enable(10),A.vertexColors&&o.enable(11),A.vertexAlphas&&o.enable(12),A.vertexUv1s&&o.enable(13),A.vertexUv2s&&o.enable(14),A.vertexUv3s&&o.enable(15),A.vertexTangents&&o.enable(16),A.anisotropy&&o.enable(17),A.alphaHash&&o.enable(18),A.batching&&o.enable(19),x.push(o.mask),o.disableAll(),A.fog&&o.enable(0),A.useFog&&o.enable(1),A.flatShading&&o.enable(2),A.logarithmicDepthBuffer&&o.enable(3),A.skinning&&o.enable(4),A.morphTargets&&o.enable(5),A.morphNormals&&o.enable(6),A.morphColors&&o.enable(7),A.premultipliedAlpha&&o.enable(8),A.shadowMapEnabled&&o.enable(9),A.useLegacyLights&&o.enable(10),A.doubleSided&&o.enable(11),A.flipSided&&o.enable(12),A.useDepthPacking&&o.enable(13),A.dithering&&o.enable(14),A.transmission&&o.enable(15),A.sheen&&o.enable(16),A.opaque&&o.enable(17),A.pointsUvs&&o.enable(18),A.decodeVideoTexture&&o.enable(19),x.push(o.mask)}function E(x){const A=g[x.type];let k;if(A){const te=Ln[A];k=Og.clone(te.uniforms)}else k=x.uniforms;return k}function D(x,A){let k;for(let te=0,se=c.length;te<se;te++){const N=c[te];if(N.cacheKey===A){k=N,++k.usedTimes;break}}return k===void 0&&(k=new Kx(n,A,x,s),c.push(k)),k}function L(x){if(--x.usedTimes===0){const A=c.indexOf(x);c[A]=c[c.length-1],c.pop(),x.destroy()}}function T(x){l.remove(x)}function C(){l.dispose()}return{getParameters:p,getProgramCacheKey:h,getUniforms:E,acquireProgram:D,releaseProgram:L,releaseShaderCache:T,programs:c,dispose:C}}function tM(){let n=new WeakMap;function e(s){let a=n.get(s);return a===void 0&&(a={},n.set(s,a)),a}function t(s){n.delete(s)}function i(s,a,o){n.get(s)[a]=o}function r(){n=new WeakMap}return{get:e,remove:t,update:i,dispose:r}}function nM(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.material.id!==e.material.id?n.material.id-e.material.id:n.z!==e.z?n.z-e.z:n.id-e.id}function Pu(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.z!==e.z?e.z-n.z:n.id-e.id}function Du(){const n=[];let e=0;const t=[],i=[],r=[];function s(){e=0,t.length=0,i.length=0,r.length=0}function a(f,d,m,g,_,p){let h=n[e];return h===void 0?(h={id:f.id,object:f,geometry:d,material:m,groupOrder:g,renderOrder:f.renderOrder,z:_,group:p},n[e]=h):(h.id=f.id,h.object=f,h.geometry=d,h.material=m,h.groupOrder=g,h.renderOrder=f.renderOrder,h.z=_,h.group=p),e++,h}function o(f,d,m,g,_,p){const h=a(f,d,m,g,_,p);m.transmission>0?i.push(h):m.transparent===!0?r.push(h):t.push(h)}function l(f,d,m,g,_,p){const h=a(f,d,m,g,_,p);m.transmission>0?i.unshift(h):m.transparent===!0?r.unshift(h):t.unshift(h)}function c(f,d){t.length>1&&t.sort(f||nM),i.length>1&&i.sort(d||Pu),r.length>1&&r.sort(d||Pu)}function u(){for(let f=e,d=n.length;f<d;f++){const m=n[f];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return{opaque:t,transmissive:i,transparent:r,init:s,push:o,unshift:l,finish:u,sort:c}}function iM(){let n=new WeakMap;function e(i,r){const s=n.get(i);let a;return s===void 0?(a=new Du,n.set(i,[a])):r>=s.length?(a=new Du,s.push(a)):a=s[r],a}function t(){n=new WeakMap}return{get:e,dispose:t}}function rM(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new V,color:new nt};break;case"SpotLight":t={position:new V,direction:new V,color:new nt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new V,color:new nt,distance:0,decay:0};break;case"HemisphereLight":t={direction:new V,skyColor:new nt,groundColor:new nt};break;case"RectAreaLight":t={color:new nt,position:new V,halfWidth:new V,halfHeight:new V};break}return n[e.id]=t,t}}}function sM(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Xe};break;case"SpotLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Xe};break;case"PointLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Xe,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[e.id]=t,t}}}let oM=0;function aM(n,e){return(e.castShadow?2:0)-(n.castShadow?2:0)+(e.map?1:0)-(n.map?1:0)}function lM(n,e){const t=new rM,i=sM(),r={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let u=0;u<9;u++)r.probe.push(new V);const s=new V,a=new yt,o=new yt;function l(u,f){let d=0,m=0,g=0;for(let te=0;te<9;te++)r.probe[te].set(0,0,0);let _=0,p=0,h=0,S=0,M=0,E=0,D=0,L=0,T=0,C=0,x=0;u.sort(aM);const A=f===!0?Math.PI:1;for(let te=0,se=u.length;te<se;te++){const N=u[te],W=N.color,G=N.intensity,Q=N.distance,$=N.shadow&&N.shadow.map?N.shadow.map.texture:null;if(N.isAmbientLight)d+=W.r*G*A,m+=W.g*G*A,g+=W.b*G*A;else if(N.isLightProbe){for(let re=0;re<9;re++)r.probe[re].addScaledVector(N.sh.coefficients[re],G);x++}else if(N.isDirectionalLight){const re=t.get(N);if(re.color.copy(N.color).multiplyScalar(N.intensity*A),N.castShadow){const ae=N.shadow,pe=i.get(N);pe.shadowBias=ae.bias,pe.shadowNormalBias=ae.normalBias,pe.shadowRadius=ae.radius,pe.shadowMapSize=ae.mapSize,r.directionalShadow[_]=pe,r.directionalShadowMap[_]=$,r.directionalShadowMatrix[_]=N.shadow.matrix,E++}r.directional[_]=re,_++}else if(N.isSpotLight){const re=t.get(N);re.position.setFromMatrixPosition(N.matrixWorld),re.color.copy(W).multiplyScalar(G*A),re.distance=Q,re.coneCos=Math.cos(N.angle),re.penumbraCos=Math.cos(N.angle*(1-N.penumbra)),re.decay=N.decay,r.spot[h]=re;const ae=N.shadow;if(N.map&&(r.spotLightMap[T]=N.map,T++,ae.updateMatrices(N),N.castShadow&&C++),r.spotLightMatrix[h]=ae.matrix,N.castShadow){const pe=i.get(N);pe.shadowBias=ae.bias,pe.shadowNormalBias=ae.normalBias,pe.shadowRadius=ae.radius,pe.shadowMapSize=ae.mapSize,r.spotShadow[h]=pe,r.spotShadowMap[h]=$,L++}h++}else if(N.isRectAreaLight){const re=t.get(N);re.color.copy(W).multiplyScalar(G),re.halfWidth.set(N.width*.5,0,0),re.halfHeight.set(0,N.height*.5,0),r.rectArea[S]=re,S++}else if(N.isPointLight){const re=t.get(N);if(re.color.copy(N.color).multiplyScalar(N.intensity*A),re.distance=N.distance,re.decay=N.decay,N.castShadow){const ae=N.shadow,pe=i.get(N);pe.shadowBias=ae.bias,pe.shadowNormalBias=ae.normalBias,pe.shadowRadius=ae.radius,pe.shadowMapSize=ae.mapSize,pe.shadowCameraNear=ae.camera.near,pe.shadowCameraFar=ae.camera.far,r.pointShadow[p]=pe,r.pointShadowMap[p]=$,r.pointShadowMatrix[p]=N.shadow.matrix,D++}r.point[p]=re,p++}else if(N.isHemisphereLight){const re=t.get(N);re.skyColor.copy(N.color).multiplyScalar(G*A),re.groundColor.copy(N.groundColor).multiplyScalar(G*A),r.hemi[M]=re,M++}}S>0&&(e.isWebGL2?n.has("OES_texture_float_linear")===!0?(r.rectAreaLTC1=Me.LTC_FLOAT_1,r.rectAreaLTC2=Me.LTC_FLOAT_2):(r.rectAreaLTC1=Me.LTC_HALF_1,r.rectAreaLTC2=Me.LTC_HALF_2):n.has("OES_texture_float_linear")===!0?(r.rectAreaLTC1=Me.LTC_FLOAT_1,r.rectAreaLTC2=Me.LTC_FLOAT_2):n.has("OES_texture_half_float_linear")===!0?(r.rectAreaLTC1=Me.LTC_HALF_1,r.rectAreaLTC2=Me.LTC_HALF_2):console.error("THREE.WebGLRenderer: Unable to use RectAreaLight. Missing WebGL extensions.")),r.ambient[0]=d,r.ambient[1]=m,r.ambient[2]=g;const k=r.hash;(k.directionalLength!==_||k.pointLength!==p||k.spotLength!==h||k.rectAreaLength!==S||k.hemiLength!==M||k.numDirectionalShadows!==E||k.numPointShadows!==D||k.numSpotShadows!==L||k.numSpotMaps!==T||k.numLightProbes!==x)&&(r.directional.length=_,r.spot.length=h,r.rectArea.length=S,r.point.length=p,r.hemi.length=M,r.directionalShadow.length=E,r.directionalShadowMap.length=E,r.pointShadow.length=D,r.pointShadowMap.length=D,r.spotShadow.length=L,r.spotShadowMap.length=L,r.directionalShadowMatrix.length=E,r.pointShadowMatrix.length=D,r.spotLightMatrix.length=L+T-C,r.spotLightMap.length=T,r.numSpotLightShadowsWithMaps=C,r.numLightProbes=x,k.directionalLength=_,k.pointLength=p,k.spotLength=h,k.rectAreaLength=S,k.hemiLength=M,k.numDirectionalShadows=E,k.numPointShadows=D,k.numSpotShadows=L,k.numSpotMaps=T,k.numLightProbes=x,r.version=oM++)}function c(u,f){let d=0,m=0,g=0,_=0,p=0;const h=f.matrixWorldInverse;for(let S=0,M=u.length;S<M;S++){const E=u[S];if(E.isDirectionalLight){const D=r.directional[d];D.direction.setFromMatrixPosition(E.matrixWorld),s.setFromMatrixPosition(E.target.matrixWorld),D.direction.sub(s),D.direction.transformDirection(h),d++}else if(E.isSpotLight){const D=r.spot[g];D.position.setFromMatrixPosition(E.matrixWorld),D.position.applyMatrix4(h),D.direction.setFromMatrixPosition(E.matrixWorld),s.setFromMatrixPosition(E.target.matrixWorld),D.direction.sub(s),D.direction.transformDirection(h),g++}else if(E.isRectAreaLight){const D=r.rectArea[_];D.position.setFromMatrixPosition(E.matrixWorld),D.position.applyMatrix4(h),o.identity(),a.copy(E.matrixWorld),a.premultiply(h),o.extractRotation(a),D.halfWidth.set(E.width*.5,0,0),D.halfHeight.set(0,E.height*.5,0),D.halfWidth.applyMatrix4(o),D.halfHeight.applyMatrix4(o),_++}else if(E.isPointLight){const D=r.point[m];D.position.setFromMatrixPosition(E.matrixWorld),D.position.applyMatrix4(h),m++}else if(E.isHemisphereLight){const D=r.hemi[p];D.direction.setFromMatrixPosition(E.matrixWorld),D.direction.transformDirection(h),p++}}}return{setup:l,setupView:c,state:r}}function Uu(n,e){const t=new lM(n,e),i=[],r=[];function s(){i.length=0,r.length=0}function a(f){i.push(f)}function o(f){r.push(f)}function l(f){t.setup(i,f)}function c(f){t.setupView(i,f)}return{init:s,state:{lightsArray:i,shadowsArray:r,lights:t},setupLights:l,setupLightsView:c,pushLight:a,pushShadow:o}}function cM(n,e){let t=new WeakMap;function i(s,a=0){const o=t.get(s);let l;return o===void 0?(l=new Uu(n,e),t.set(s,[l])):a>=o.length?(l=new Uu(n,e),o.push(l)):l=o[a],l}function r(){t=new WeakMap}return{get:i,dispose:r}}class uM extends Cr{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=og,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class fM extends Cr{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const hM=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,dM=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function pM(n,e,t){let i=new bl;const r=new Xe,s=new Xe,a=new wt,o=new uM({depthPacking:ag}),l=new fM,c={},u=t.maxTextureSize,f={[bi]:$t,[$t]:bi,[In]:In},d=new ji({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Xe},radius:{value:4}},vertexShader:hM,fragmentShader:dM}),m=d.clone();m.defines.HORIZONTAL_PASS=1;const g=new Gn;g.setAttribute("position",new jt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const _=new On(g,d),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=oh;let h=this.type;this.render=function(L,T,C){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||L.length===0)return;const x=n.getRenderTarget(),A=n.getActiveCubeFace(),k=n.getActiveMipmapLevel(),te=n.state;te.setBlending(xi),te.buffers.color.setClear(1,1,1,1),te.buffers.depth.setTest(!0),te.setScissorTest(!1);const se=h!==Kn&&this.type===Kn,N=h===Kn&&this.type!==Kn;for(let W=0,G=L.length;W<G;W++){const Q=L[W],$=Q.shadow;if($===void 0){console.warn("THREE.WebGLShadowMap:",Q,"has no shadow.");continue}if($.autoUpdate===!1&&$.needsUpdate===!1)continue;r.copy($.mapSize);const re=$.getFrameExtents();if(r.multiply(re),s.copy($.mapSize),(r.x>u||r.y>u)&&(r.x>u&&(s.x=Math.floor(u/re.x),r.x=s.x*re.x,$.mapSize.x=s.x),r.y>u&&(s.y=Math.floor(u/re.y),r.y=s.y*re.y,$.mapSize.y=s.y)),$.map===null||se===!0||N===!0){const pe=this.type!==Kn?{minFilter:Gt,magFilter:Gt}:{};$.map!==null&&$.map.dispose(),$.map=new qi(r.x,r.y,pe),$.map.texture.name=Q.name+".shadowMap",$.camera.updateProjectionMatrix()}n.setRenderTarget($.map),n.clear();const ae=$.getViewportCount();for(let pe=0;pe<ae;pe++){const he=$.getViewport(pe);a.set(s.x*he.x,s.y*he.y,s.x*he.z,s.y*he.w),te.viewport(a),$.updateMatrices(Q,pe),i=$.getFrustum(),E(T,C,$.camera,Q,this.type)}$.isPointLightShadow!==!0&&this.type===Kn&&S($,C),$.needsUpdate=!1}h=this.type,p.needsUpdate=!1,n.setRenderTarget(x,A,k)};function S(L,T){const C=e.update(_);d.defines.VSM_SAMPLES!==L.blurSamples&&(d.defines.VSM_SAMPLES=L.blurSamples,m.defines.VSM_SAMPLES=L.blurSamples,d.needsUpdate=!0,m.needsUpdate=!0),L.mapPass===null&&(L.mapPass=new qi(r.x,r.y)),d.uniforms.shadow_pass.value=L.map.texture,d.uniforms.resolution.value=L.mapSize,d.uniforms.radius.value=L.radius,n.setRenderTarget(L.mapPass),n.clear(),n.renderBufferDirect(T,null,C,d,_,null),m.uniforms.shadow_pass.value=L.mapPass.texture,m.uniforms.resolution.value=L.mapSize,m.uniforms.radius.value=L.radius,n.setRenderTarget(L.map),n.clear(),n.renderBufferDirect(T,null,C,m,_,null)}function M(L,T,C,x){let A=null;const k=C.isPointLight===!0?L.customDistanceMaterial:L.customDepthMaterial;if(k!==void 0)A=k;else if(A=C.isPointLight===!0?l:o,n.localClippingEnabled&&T.clipShadows===!0&&Array.isArray(T.clippingPlanes)&&T.clippingPlanes.length!==0||T.displacementMap&&T.displacementScale!==0||T.alphaMap&&T.alphaTest>0||T.map&&T.alphaTest>0){const te=A.uuid,se=T.uuid;let N=c[te];N===void 0&&(N={},c[te]=N);let W=N[se];W===void 0&&(W=A.clone(),N[se]=W,T.addEventListener("dispose",D)),A=W}if(A.visible=T.visible,A.wireframe=T.wireframe,x===Kn?A.side=T.shadowSide!==null?T.shadowSide:T.side:A.side=T.shadowSide!==null?T.shadowSide:f[T.side],A.alphaMap=T.alphaMap,A.alphaTest=T.alphaTest,A.map=T.map,A.clipShadows=T.clipShadows,A.clippingPlanes=T.clippingPlanes,A.clipIntersection=T.clipIntersection,A.displacementMap=T.displacementMap,A.displacementScale=T.displacementScale,A.displacementBias=T.displacementBias,A.wireframeLinewidth=T.wireframeLinewidth,A.linewidth=T.linewidth,C.isPointLight===!0&&A.isMeshDistanceMaterial===!0){const te=n.properties.get(A);te.light=C}return A}function E(L,T,C,x,A){if(L.visible===!1)return;if(L.layers.test(T.layers)&&(L.isMesh||L.isLine||L.isPoints)&&(L.castShadow||L.receiveShadow&&A===Kn)&&(!L.frustumCulled||i.intersectsObject(L))){L.modelViewMatrix.multiplyMatrices(C.matrixWorldInverse,L.matrixWorld);const se=e.update(L),N=L.material;if(Array.isArray(N)){const W=se.groups;for(let G=0,Q=W.length;G<Q;G++){const $=W[G],re=N[$.materialIndex];if(re&&re.visible){const ae=M(L,re,x,A);L.onBeforeShadow(n,L,T,C,se,ae,$),n.renderBufferDirect(C,null,se,ae,L,$),L.onAfterShadow(n,L,T,C,se,ae,$)}}}else if(N.visible){const W=M(L,N,x,A);L.onBeforeShadow(n,L,T,C,se,W,null),n.renderBufferDirect(C,null,se,W,L,null),L.onAfterShadow(n,L,T,C,se,W,null)}}const te=L.children;for(let se=0,N=te.length;se<N;se++)E(te[se],T,C,x,A)}function D(L){L.target.removeEventListener("dispose",D);for(const C in c){const x=c[C],A=L.target.uuid;A in x&&(x[A].dispose(),delete x[A])}}}function mM(n,e,t){const i=t.isWebGL2;function r(){let I=!1;const ve=new wt;let ye=null;const ze=new wt(0,0,0,0);return{setMask:function(Ue){ye!==Ue&&!I&&(n.colorMask(Ue,Ue,Ue,Ue),ye=Ue)},setLocked:function(Ue){I=Ue},setClear:function(Ue,et,tt,pt,_t){_t===!0&&(Ue*=pt,et*=pt,tt*=pt),ve.set(Ue,et,tt,pt),ze.equals(ve)===!1&&(n.clearColor(Ue,et,tt,pt),ze.copy(ve))},reset:function(){I=!1,ye=null,ze.set(-1,0,0,0)}}}function s(){let I=!1,ve=null,ye=null,ze=null;return{setTest:function(Ue){Ue?Oe(n.DEPTH_TEST):Ne(n.DEPTH_TEST)},setMask:function(Ue){ve!==Ue&&!I&&(n.depthMask(Ue),ve=Ue)},setFunc:function(Ue){if(ye!==Ue){switch(Ue){case Om:n.depthFunc(n.NEVER);break;case Fm:n.depthFunc(n.ALWAYS);break;case Bm:n.depthFunc(n.LESS);break;case uo:n.depthFunc(n.LEQUAL);break;case zm:n.depthFunc(n.EQUAL);break;case Hm:n.depthFunc(n.GEQUAL);break;case Vm:n.depthFunc(n.GREATER);break;case Gm:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}ye=Ue}},setLocked:function(Ue){I=Ue},setClear:function(Ue){ze!==Ue&&(n.clearDepth(Ue),ze=Ue)},reset:function(){I=!1,ve=null,ye=null,ze=null}}}function a(){let I=!1,ve=null,ye=null,ze=null,Ue=null,et=null,tt=null,pt=null,_t=null;return{setTest:function(it){I||(it?Oe(n.STENCIL_TEST):Ne(n.STENCIL_TEST))},setMask:function(it){ve!==it&&!I&&(n.stencilMask(it),ve=it)},setFunc:function(it,Mt,bn){(ye!==it||ze!==Mt||Ue!==bn)&&(n.stencilFunc(it,Mt,bn),ye=it,ze=Mt,Ue=bn)},setOp:function(it,Mt,bn){(et!==it||tt!==Mt||pt!==bn)&&(n.stencilOp(it,Mt,bn),et=it,tt=Mt,pt=bn)},setLocked:function(it){I=it},setClear:function(it){_t!==it&&(n.clearStencil(it),_t=it)},reset:function(){I=!1,ve=null,ye=null,ze=null,Ue=null,et=null,tt=null,pt=null,_t=null}}}const o=new r,l=new s,c=new a,u=new WeakMap,f=new WeakMap;let d={},m={},g=new WeakMap,_=[],p=null,h=!1,S=null,M=null,E=null,D=null,L=null,T=null,C=null,x=new nt(0,0,0),A=0,k=!1,te=null,se=null,N=null,W=null,G=null;const Q=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let $=!1,re=0;const ae=n.getParameter(n.VERSION);ae.indexOf("WebGL")!==-1?(re=parseFloat(/^WebGL (\d)/.exec(ae)[1]),$=re>=1):ae.indexOf("OpenGL ES")!==-1&&(re=parseFloat(/^OpenGL ES (\d)/.exec(ae)[1]),$=re>=2);let pe=null,he={};const ne=n.getParameter(n.SCISSOR_BOX),ue=n.getParameter(n.VIEWPORT),Ee=new wt().fromArray(ne),Re=new wt().fromArray(ue);function Ce(I,ve,ye,ze){const Ue=new Uint8Array(4),et=n.createTexture();n.bindTexture(I,et),n.texParameteri(I,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(I,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let tt=0;tt<ye;tt++)i&&(I===n.TEXTURE_3D||I===n.TEXTURE_2D_ARRAY)?n.texImage3D(ve,0,n.RGBA,1,1,ze,0,n.RGBA,n.UNSIGNED_BYTE,Ue):n.texImage2D(ve+tt,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,Ue);return et}const Ve={};Ve[n.TEXTURE_2D]=Ce(n.TEXTURE_2D,n.TEXTURE_2D,1),Ve[n.TEXTURE_CUBE_MAP]=Ce(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),i&&(Ve[n.TEXTURE_2D_ARRAY]=Ce(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),Ve[n.TEXTURE_3D]=Ce(n.TEXTURE_3D,n.TEXTURE_3D,1,1)),o.setClear(0,0,0,1),l.setClear(1),c.setClear(0),Oe(n.DEPTH_TEST),l.setFunc(uo),ie(!1),y(pc),Oe(n.CULL_FACE),z(xi);function Oe(I){d[I]!==!0&&(n.enable(I),d[I]=!0)}function Ne(I){d[I]!==!1&&(n.disable(I),d[I]=!1)}function R(I,ve){return m[I]!==ve?(n.bindFramebuffer(I,ve),m[I]=ve,i&&(I===n.DRAW_FRAMEBUFFER&&(m[n.FRAMEBUFFER]=ve),I===n.FRAMEBUFFER&&(m[n.DRAW_FRAMEBUFFER]=ve)),!0):!1}function b(I,ve){let ye=_,ze=!1;if(I)if(ye=g.get(ve),ye===void 0&&(ye=[],g.set(ve,ye)),I.isWebGLMultipleRenderTargets){const Ue=I.texture;if(ye.length!==Ue.length||ye[0]!==n.COLOR_ATTACHMENT0){for(let et=0,tt=Ue.length;et<tt;et++)ye[et]=n.COLOR_ATTACHMENT0+et;ye.length=Ue.length,ze=!0}}else ye[0]!==n.COLOR_ATTACHMENT0&&(ye[0]=n.COLOR_ATTACHMENT0,ze=!0);else ye[0]!==n.BACK&&(ye[0]=n.BACK,ze=!0);ze&&(t.isWebGL2?n.drawBuffers(ye):e.get("WEBGL_draw_buffers").drawBuffersWEBGL(ye))}function j(I){return p!==I?(n.useProgram(I),p=I,!0):!1}const Y={[Fi]:n.FUNC_ADD,[Sm]:n.FUNC_SUBTRACT,[ym]:n.FUNC_REVERSE_SUBTRACT};if(i)Y[vc]=n.MIN,Y[xc]=n.MAX;else{const I=e.get("EXT_blend_minmax");I!==null&&(Y[vc]=I.MIN_EXT,Y[xc]=I.MAX_EXT)}const X={[Em]:n.ZERO,[bm]:n.ONE,[Tm]:n.SRC_COLOR,[Ga]:n.SRC_ALPHA,[Pm]:n.SRC_ALPHA_SATURATE,[Cm]:n.DST_COLOR,[wm]:n.DST_ALPHA,[Am]:n.ONE_MINUS_SRC_COLOR,[ka]:n.ONE_MINUS_SRC_ALPHA,[Lm]:n.ONE_MINUS_DST_COLOR,[Rm]:n.ONE_MINUS_DST_ALPHA,[Dm]:n.CONSTANT_COLOR,[Um]:n.ONE_MINUS_CONSTANT_COLOR,[Im]:n.CONSTANT_ALPHA,[Nm]:n.ONE_MINUS_CONSTANT_ALPHA};function z(I,ve,ye,ze,Ue,et,tt,pt,_t,it){if(I===xi){h===!0&&(Ne(n.BLEND),h=!1);return}if(h===!1&&(Oe(n.BLEND),h=!0),I!==Mm){if(I!==S||it!==k){if((M!==Fi||L!==Fi)&&(n.blendEquation(n.FUNC_ADD),M=Fi,L=Fi),it)switch(I){case Mr:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case mc:n.blendFunc(n.ONE,n.ONE);break;case gc:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case _c:n.blendFuncSeparate(n.ZERO,n.SRC_COLOR,n.ZERO,n.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",I);break}else switch(I){case Mr:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case mc:n.blendFunc(n.SRC_ALPHA,n.ONE);break;case gc:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case _c:n.blendFunc(n.ZERO,n.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",I);break}E=null,D=null,T=null,C=null,x.set(0,0,0),A=0,S=I,k=it}return}Ue=Ue||ve,et=et||ye,tt=tt||ze,(ve!==M||Ue!==L)&&(n.blendEquationSeparate(Y[ve],Y[Ue]),M=ve,L=Ue),(ye!==E||ze!==D||et!==T||tt!==C)&&(n.blendFuncSeparate(X[ye],X[ze],X[et],X[tt]),E=ye,D=ze,T=et,C=tt),(pt.equals(x)===!1||_t!==A)&&(n.blendColor(pt.r,pt.g,pt.b,_t),x.copy(pt),A=_t),S=I,k=!1}function le(I,ve){I.side===In?Ne(n.CULL_FACE):Oe(n.CULL_FACE);let ye=I.side===$t;ve&&(ye=!ye),ie(ye),I.blending===Mr&&I.transparent===!1?z(xi):z(I.blending,I.blendEquation,I.blendSrc,I.blendDst,I.blendEquationAlpha,I.blendSrcAlpha,I.blendDstAlpha,I.blendColor,I.blendAlpha,I.premultipliedAlpha),l.setFunc(I.depthFunc),l.setTest(I.depthTest),l.setMask(I.depthWrite),o.setMask(I.colorWrite);const ze=I.stencilWrite;c.setTest(ze),ze&&(c.setMask(I.stencilWriteMask),c.setFunc(I.stencilFunc,I.stencilRef,I.stencilFuncMask),c.setOp(I.stencilFail,I.stencilZFail,I.stencilZPass)),O(I.polygonOffset,I.polygonOffsetFactor,I.polygonOffsetUnits),I.alphaToCoverage===!0?Oe(n.SAMPLE_ALPHA_TO_COVERAGE):Ne(n.SAMPLE_ALPHA_TO_COVERAGE)}function ie(I){te!==I&&(I?n.frontFace(n.CW):n.frontFace(n.CCW),te=I)}function y(I){I!==_m?(Oe(n.CULL_FACE),I!==se&&(I===pc?n.cullFace(n.BACK):I===vm?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):Ne(n.CULL_FACE),se=I}function v(I){I!==N&&($&&n.lineWidth(I),N=I)}function O(I,ve,ye){I?(Oe(n.POLYGON_OFFSET_FILL),(W!==ve||G!==ye)&&(n.polygonOffset(ve,ye),W=ve,G=ye)):Ne(n.POLYGON_OFFSET_FILL)}function B(I){I?Oe(n.SCISSOR_TEST):Ne(n.SCISSOR_TEST)}function q(I){I===void 0&&(I=n.TEXTURE0+Q-1),pe!==I&&(n.activeTexture(I),pe=I)}function Z(I,ve,ye){ye===void 0&&(pe===null?ye=n.TEXTURE0+Q-1:ye=pe);let ze=he[ye];ze===void 0&&(ze={type:void 0,texture:void 0},he[ye]=ze),(ze.type!==I||ze.texture!==ve)&&(pe!==ye&&(n.activeTexture(ye),pe=ye),n.bindTexture(I,ve||Ve[I]),ze.type=I,ze.texture=ve)}function me(){const I=he[pe];I!==void 0&&I.type!==void 0&&(n.bindTexture(I.type,null),I.type=void 0,I.texture=void 0)}function ce(){try{n.compressedTexImage2D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function de(){try{n.compressedTexImage3D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function be(){try{n.texSubImage2D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Le(){try{n.texSubImage3D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function oe(){try{n.compressedTexSubImage2D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function ke(){try{n.compressedTexSubImage3D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Fe(){try{n.texStorage2D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Be(){try{n.texStorage3D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Te(){try{n.texImage2D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function xe(){try{n.texImage3D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function P(I){Ee.equals(I)===!1&&(n.scissor(I.x,I.y,I.z,I.w),Ee.copy(I))}function ge(I){Re.equals(I)===!1&&(n.viewport(I.x,I.y,I.z,I.w),Re.copy(I))}function Pe(I,ve){let ye=f.get(ve);ye===void 0&&(ye=new WeakMap,f.set(ve,ye));let ze=ye.get(I);ze===void 0&&(ze=n.getUniformBlockIndex(ve,I.name),ye.set(I,ze))}function we(I,ve){const ze=f.get(ve).get(I);u.get(ve)!==ze&&(n.uniformBlockBinding(ve,ze,I.__bindingPointIndex),u.set(ve,ze))}function fe(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),i===!0&&(n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null)),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),d={},pe=null,he={},m={},g=new WeakMap,_=[],p=null,h=!1,S=null,M=null,E=null,D=null,L=null,T=null,C=null,x=new nt(0,0,0),A=0,k=!1,te=null,se=null,N=null,W=null,G=null,Ee.set(0,0,n.canvas.width,n.canvas.height),Re.set(0,0,n.canvas.width,n.canvas.height),o.reset(),l.reset(),c.reset()}return{buffers:{color:o,depth:l,stencil:c},enable:Oe,disable:Ne,bindFramebuffer:R,drawBuffers:b,useProgram:j,setBlending:z,setMaterial:le,setFlipSided:ie,setCullFace:y,setLineWidth:v,setPolygonOffset:O,setScissorTest:B,activeTexture:q,bindTexture:Z,unbindTexture:me,compressedTexImage2D:ce,compressedTexImage3D:de,texImage2D:Te,texImage3D:xe,updateUBOMapping:Pe,uniformBlockBinding:we,texStorage2D:Fe,texStorage3D:Be,texSubImage2D:be,texSubImage3D:Le,compressedTexSubImage2D:oe,compressedTexSubImage3D:ke,scissor:P,viewport:ge,reset:fe}}function gM(n,e,t,i,r,s,a){const o=r.isWebGL2,l=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),u=new WeakMap;let f;const d=new WeakMap;let m=!1;try{m=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(y,v){return m?new OffscreenCanvas(y,v):go("canvas")}function _(y,v,O,B){let q=1;if((y.width>B||y.height>B)&&(q=B/Math.max(y.width,y.height)),q<1||v===!0)if(typeof HTMLImageElement<"u"&&y instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&y instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&y instanceof ImageBitmap){const Z=v?Ka:Math.floor,me=Z(q*y.width),ce=Z(q*y.height);f===void 0&&(f=g(me,ce));const de=O?g(me,ce):f;return de.width=me,de.height=ce,de.getContext("2d").drawImage(y,0,0,me,ce),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+y.width+"x"+y.height+") to ("+me+"x"+ce+")."),de}else return"data"in y&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+y.width+"x"+y.height+")."),y;return y}function p(y){return $c(y.width)&&$c(y.height)}function h(y){return o?!1:y.wrapS!==_n||y.wrapT!==_n||y.minFilter!==Gt&&y.minFilter!==sn}function S(y,v){return y.generateMipmaps&&v&&y.minFilter!==Gt&&y.minFilter!==sn}function M(y){n.generateMipmap(y)}function E(y,v,O,B,q=!1){if(o===!1)return v;if(y!==null){if(n[y]!==void 0)return n[y];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+y+"'")}let Z=v;if(v===n.RED&&(O===n.FLOAT&&(Z=n.R32F),O===n.HALF_FLOAT&&(Z=n.R16F),O===n.UNSIGNED_BYTE&&(Z=n.R8)),v===n.RED_INTEGER&&(O===n.UNSIGNED_BYTE&&(Z=n.R8UI),O===n.UNSIGNED_SHORT&&(Z=n.R16UI),O===n.UNSIGNED_INT&&(Z=n.R32UI),O===n.BYTE&&(Z=n.R8I),O===n.SHORT&&(Z=n.R16I),O===n.INT&&(Z=n.R32I)),v===n.RG&&(O===n.FLOAT&&(Z=n.RG32F),O===n.HALF_FLOAT&&(Z=n.RG16F),O===n.UNSIGNED_BYTE&&(Z=n.RG8)),v===n.RGBA){const me=q?fo:ot.getTransfer(B);O===n.FLOAT&&(Z=n.RGBA32F),O===n.HALF_FLOAT&&(Z=n.RGBA16F),O===n.UNSIGNED_BYTE&&(Z=me===ft?n.SRGB8_ALPHA8:n.RGBA8),O===n.UNSIGNED_SHORT_4_4_4_4&&(Z=n.RGBA4),O===n.UNSIGNED_SHORT_5_5_5_1&&(Z=n.RGB5_A1)}return(Z===n.R16F||Z===n.R32F||Z===n.RG16F||Z===n.RG32F||Z===n.RGBA16F||Z===n.RGBA32F)&&e.get("EXT_color_buffer_float"),Z}function D(y,v,O){return S(y,O)===!0||y.isFramebufferTexture&&y.minFilter!==Gt&&y.minFilter!==sn?Math.log2(Math.max(v.width,v.height))+1:y.mipmaps!==void 0&&y.mipmaps.length>0?y.mipmaps.length:y.isCompressedTexture&&Array.isArray(y.image)?v.mipmaps.length:1}function L(y){return y===Gt||y===Mc||y===Ko?n.NEAREST:n.LINEAR}function T(y){const v=y.target;v.removeEventListener("dispose",T),x(v),v.isVideoTexture&&u.delete(v)}function C(y){const v=y.target;v.removeEventListener("dispose",C),k(v)}function x(y){const v=i.get(y);if(v.__webglInit===void 0)return;const O=y.source,B=d.get(O);if(B){const q=B[v.__cacheKey];q.usedTimes--,q.usedTimes===0&&A(y),Object.keys(B).length===0&&d.delete(O)}i.remove(y)}function A(y){const v=i.get(y);n.deleteTexture(v.__webglTexture);const O=y.source,B=d.get(O);delete B[v.__cacheKey],a.memory.textures--}function k(y){const v=y.texture,O=i.get(y),B=i.get(v);if(B.__webglTexture!==void 0&&(n.deleteTexture(B.__webglTexture),a.memory.textures--),y.depthTexture&&y.depthTexture.dispose(),y.isWebGLCubeRenderTarget)for(let q=0;q<6;q++){if(Array.isArray(O.__webglFramebuffer[q]))for(let Z=0;Z<O.__webglFramebuffer[q].length;Z++)n.deleteFramebuffer(O.__webglFramebuffer[q][Z]);else n.deleteFramebuffer(O.__webglFramebuffer[q]);O.__webglDepthbuffer&&n.deleteRenderbuffer(O.__webglDepthbuffer[q])}else{if(Array.isArray(O.__webglFramebuffer))for(let q=0;q<O.__webglFramebuffer.length;q++)n.deleteFramebuffer(O.__webglFramebuffer[q]);else n.deleteFramebuffer(O.__webglFramebuffer);if(O.__webglDepthbuffer&&n.deleteRenderbuffer(O.__webglDepthbuffer),O.__webglMultisampledFramebuffer&&n.deleteFramebuffer(O.__webglMultisampledFramebuffer),O.__webglColorRenderbuffer)for(let q=0;q<O.__webglColorRenderbuffer.length;q++)O.__webglColorRenderbuffer[q]&&n.deleteRenderbuffer(O.__webglColorRenderbuffer[q]);O.__webglDepthRenderbuffer&&n.deleteRenderbuffer(O.__webglDepthRenderbuffer)}if(y.isWebGLMultipleRenderTargets)for(let q=0,Z=v.length;q<Z;q++){const me=i.get(v[q]);me.__webglTexture&&(n.deleteTexture(me.__webglTexture),a.memory.textures--),i.remove(v[q])}i.remove(v),i.remove(y)}let te=0;function se(){te=0}function N(){const y=te;return y>=r.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+y+" texture units while this GPU supports only "+r.maxTextures),te+=1,y}function W(y){const v=[];return v.push(y.wrapS),v.push(y.wrapT),v.push(y.wrapR||0),v.push(y.magFilter),v.push(y.minFilter),v.push(y.anisotropy),v.push(y.internalFormat),v.push(y.format),v.push(y.type),v.push(y.generateMipmaps),v.push(y.premultiplyAlpha),v.push(y.flipY),v.push(y.unpackAlignment),v.push(y.colorSpace),v.join()}function G(y,v){const O=i.get(y);if(y.isVideoTexture&&le(y),y.isRenderTargetTexture===!1&&y.version>0&&O.__version!==y.version){const B=y.image;if(B===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(B.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{Ee(O,y,v);return}}t.bindTexture(n.TEXTURE_2D,O.__webglTexture,n.TEXTURE0+v)}function Q(y,v){const O=i.get(y);if(y.version>0&&O.__version!==y.version){Ee(O,y,v);return}t.bindTexture(n.TEXTURE_2D_ARRAY,O.__webglTexture,n.TEXTURE0+v)}function $(y,v){const O=i.get(y);if(y.version>0&&O.__version!==y.version){Ee(O,y,v);return}t.bindTexture(n.TEXTURE_3D,O.__webglTexture,n.TEXTURE0+v)}function re(y,v){const O=i.get(y);if(y.version>0&&O.__version!==y.version){Re(O,y,v);return}t.bindTexture(n.TEXTURE_CUBE_MAP,O.__webglTexture,n.TEXTURE0+v)}const ae={[qa]:n.REPEAT,[_n]:n.CLAMP_TO_EDGE,[Ya]:n.MIRRORED_REPEAT},pe={[Gt]:n.NEAREST,[Mc]:n.NEAREST_MIPMAP_NEAREST,[Ko]:n.NEAREST_MIPMAP_LINEAR,[sn]:n.LINEAR,[Zm]:n.LINEAR_MIPMAP_NEAREST,[os]:n.LINEAR_MIPMAP_LINEAR},he={[cg]:n.NEVER,[mg]:n.ALWAYS,[ug]:n.LESS,[vh]:n.LEQUAL,[fg]:n.EQUAL,[pg]:n.GEQUAL,[hg]:n.GREATER,[dg]:n.NOTEQUAL};function ne(y,v,O){if(O?(n.texParameteri(y,n.TEXTURE_WRAP_S,ae[v.wrapS]),n.texParameteri(y,n.TEXTURE_WRAP_T,ae[v.wrapT]),(y===n.TEXTURE_3D||y===n.TEXTURE_2D_ARRAY)&&n.texParameteri(y,n.TEXTURE_WRAP_R,ae[v.wrapR]),n.texParameteri(y,n.TEXTURE_MAG_FILTER,pe[v.magFilter]),n.texParameteri(y,n.TEXTURE_MIN_FILTER,pe[v.minFilter])):(n.texParameteri(y,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(y,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE),(y===n.TEXTURE_3D||y===n.TEXTURE_2D_ARRAY)&&n.texParameteri(y,n.TEXTURE_WRAP_R,n.CLAMP_TO_EDGE),(v.wrapS!==_n||v.wrapT!==_n)&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.wrapS and Texture.wrapT should be set to THREE.ClampToEdgeWrapping."),n.texParameteri(y,n.TEXTURE_MAG_FILTER,L(v.magFilter)),n.texParameteri(y,n.TEXTURE_MIN_FILTER,L(v.minFilter)),v.minFilter!==Gt&&v.minFilter!==sn&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.minFilter should be set to THREE.NearestFilter or THREE.LinearFilter.")),v.compareFunction&&(n.texParameteri(y,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(y,n.TEXTURE_COMPARE_FUNC,he[v.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){const B=e.get("EXT_texture_filter_anisotropic");if(v.magFilter===Gt||v.minFilter!==Ko&&v.minFilter!==os||v.type===mi&&e.has("OES_texture_float_linear")===!1||o===!1&&v.type===as&&e.has("OES_texture_half_float_linear")===!1)return;(v.anisotropy>1||i.get(v).__currentAnisotropy)&&(n.texParameterf(y,B.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(v.anisotropy,r.getMaxAnisotropy())),i.get(v).__currentAnisotropy=v.anisotropy)}}function ue(y,v){let O=!1;y.__webglInit===void 0&&(y.__webglInit=!0,v.addEventListener("dispose",T));const B=v.source;let q=d.get(B);q===void 0&&(q={},d.set(B,q));const Z=W(v);if(Z!==y.__cacheKey){q[Z]===void 0&&(q[Z]={texture:n.createTexture(),usedTimes:0},a.memory.textures++,O=!0),q[Z].usedTimes++;const me=q[y.__cacheKey];me!==void 0&&(q[y.__cacheKey].usedTimes--,me.usedTimes===0&&A(v)),y.__cacheKey=Z,y.__webglTexture=q[Z].texture}return O}function Ee(y,v,O){let B=n.TEXTURE_2D;(v.isDataArrayTexture||v.isCompressedArrayTexture)&&(B=n.TEXTURE_2D_ARRAY),v.isData3DTexture&&(B=n.TEXTURE_3D);const q=ue(y,v),Z=v.source;t.bindTexture(B,y.__webglTexture,n.TEXTURE0+O);const me=i.get(Z);if(Z.version!==me.__version||q===!0){t.activeTexture(n.TEXTURE0+O);const ce=ot.getPrimaries(ot.workingColorSpace),de=v.colorSpace===an?null:ot.getPrimaries(v.colorSpace),be=v.colorSpace===an||ce===de?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,v.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,v.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,be);const Le=h(v)&&p(v.image)===!1;let oe=_(v.image,Le,!1,r.maxTextureSize);oe=ie(v,oe);const ke=p(oe)||o,Fe=s.convert(v.format,v.colorSpace);let Be=s.convert(v.type),Te=E(v.internalFormat,Fe,Be,v.colorSpace,v.isVideoTexture);ne(B,v,ke);let xe;const P=v.mipmaps,ge=o&&v.isVideoTexture!==!0&&Te!==mh,Pe=me.__version===void 0||q===!0,we=D(v,oe,ke);if(v.isDepthTexture)Te=n.DEPTH_COMPONENT,o?v.type===mi?Te=n.DEPTH_COMPONENT32F:v.type===pi?Te=n.DEPTH_COMPONENT24:v.type===ki?Te=n.DEPTH24_STENCIL8:Te=n.DEPTH_COMPONENT16:v.type===mi&&console.error("WebGLRenderer: Floating point depth texture requires WebGL2."),v.format===Wi&&Te===n.DEPTH_COMPONENT&&v.type!==Ml&&v.type!==pi&&(console.warn("THREE.WebGLRenderer: Use UnsignedShortType or UnsignedIntType for DepthFormat DepthTexture."),v.type=pi,Be=s.convert(v.type)),v.format===wr&&Te===n.DEPTH_COMPONENT&&(Te=n.DEPTH_STENCIL,v.type!==ki&&(console.warn("THREE.WebGLRenderer: Use UnsignedInt248Type for DepthStencilFormat DepthTexture."),v.type=ki,Be=s.convert(v.type))),Pe&&(ge?t.texStorage2D(n.TEXTURE_2D,1,Te,oe.width,oe.height):t.texImage2D(n.TEXTURE_2D,0,Te,oe.width,oe.height,0,Fe,Be,null));else if(v.isDataTexture)if(P.length>0&&ke){ge&&Pe&&t.texStorage2D(n.TEXTURE_2D,we,Te,P[0].width,P[0].height);for(let fe=0,I=P.length;fe<I;fe++)xe=P[fe],ge?t.texSubImage2D(n.TEXTURE_2D,fe,0,0,xe.width,xe.height,Fe,Be,xe.data):t.texImage2D(n.TEXTURE_2D,fe,Te,xe.width,xe.height,0,Fe,Be,xe.data);v.generateMipmaps=!1}else ge?(Pe&&t.texStorage2D(n.TEXTURE_2D,we,Te,oe.width,oe.height),t.texSubImage2D(n.TEXTURE_2D,0,0,0,oe.width,oe.height,Fe,Be,oe.data)):t.texImage2D(n.TEXTURE_2D,0,Te,oe.width,oe.height,0,Fe,Be,oe.data);else if(v.isCompressedTexture)if(v.isCompressedArrayTexture){ge&&Pe&&t.texStorage3D(n.TEXTURE_2D_ARRAY,we,Te,P[0].width,P[0].height,oe.depth);for(let fe=0,I=P.length;fe<I;fe++)xe=P[fe],v.format!==vn?Fe!==null?ge?t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,fe,0,0,0,xe.width,xe.height,oe.depth,Fe,xe.data,0,0):t.compressedTexImage3D(n.TEXTURE_2D_ARRAY,fe,Te,xe.width,xe.height,oe.depth,0,xe.data,0,0):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):ge?t.texSubImage3D(n.TEXTURE_2D_ARRAY,fe,0,0,0,xe.width,xe.height,oe.depth,Fe,Be,xe.data):t.texImage3D(n.TEXTURE_2D_ARRAY,fe,Te,xe.width,xe.height,oe.depth,0,Fe,Be,xe.data)}else{ge&&Pe&&t.texStorage2D(n.TEXTURE_2D,we,Te,P[0].width,P[0].height);for(let fe=0,I=P.length;fe<I;fe++)xe=P[fe],v.format!==vn?Fe!==null?ge?t.compressedTexSubImage2D(n.TEXTURE_2D,fe,0,0,xe.width,xe.height,Fe,xe.data):t.compressedTexImage2D(n.TEXTURE_2D,fe,Te,xe.width,xe.height,0,xe.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):ge?t.texSubImage2D(n.TEXTURE_2D,fe,0,0,xe.width,xe.height,Fe,Be,xe.data):t.texImage2D(n.TEXTURE_2D,fe,Te,xe.width,xe.height,0,Fe,Be,xe.data)}else if(v.isDataArrayTexture)ge?(Pe&&t.texStorage3D(n.TEXTURE_2D_ARRAY,we,Te,oe.width,oe.height,oe.depth),t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,oe.width,oe.height,oe.depth,Fe,Be,oe.data)):t.texImage3D(n.TEXTURE_2D_ARRAY,0,Te,oe.width,oe.height,oe.depth,0,Fe,Be,oe.data);else if(v.isData3DTexture)ge?(Pe&&t.texStorage3D(n.TEXTURE_3D,we,Te,oe.width,oe.height,oe.depth),t.texSubImage3D(n.TEXTURE_3D,0,0,0,0,oe.width,oe.height,oe.depth,Fe,Be,oe.data)):t.texImage3D(n.TEXTURE_3D,0,Te,oe.width,oe.height,oe.depth,0,Fe,Be,oe.data);else if(v.isFramebufferTexture){if(Pe)if(ge)t.texStorage2D(n.TEXTURE_2D,we,Te,oe.width,oe.height);else{let fe=oe.width,I=oe.height;for(let ve=0;ve<we;ve++)t.texImage2D(n.TEXTURE_2D,ve,Te,fe,I,0,Fe,Be,null),fe>>=1,I>>=1}}else if(P.length>0&&ke){ge&&Pe&&t.texStorage2D(n.TEXTURE_2D,we,Te,P[0].width,P[0].height);for(let fe=0,I=P.length;fe<I;fe++)xe=P[fe],ge?t.texSubImage2D(n.TEXTURE_2D,fe,0,0,Fe,Be,xe):t.texImage2D(n.TEXTURE_2D,fe,Te,Fe,Be,xe);v.generateMipmaps=!1}else ge?(Pe&&t.texStorage2D(n.TEXTURE_2D,we,Te,oe.width,oe.height),t.texSubImage2D(n.TEXTURE_2D,0,0,0,Fe,Be,oe)):t.texImage2D(n.TEXTURE_2D,0,Te,Fe,Be,oe);S(v,ke)&&M(B),me.__version=Z.version,v.onUpdate&&v.onUpdate(v)}y.__version=v.version}function Re(y,v,O){if(v.image.length!==6)return;const B=ue(y,v),q=v.source;t.bindTexture(n.TEXTURE_CUBE_MAP,y.__webglTexture,n.TEXTURE0+O);const Z=i.get(q);if(q.version!==Z.__version||B===!0){t.activeTexture(n.TEXTURE0+O);const me=ot.getPrimaries(ot.workingColorSpace),ce=v.colorSpace===an?null:ot.getPrimaries(v.colorSpace),de=v.colorSpace===an||me===ce?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,v.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,v.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,de);const be=v.isCompressedTexture||v.image[0].isCompressedTexture,Le=v.image[0]&&v.image[0].isDataTexture,oe=[];for(let fe=0;fe<6;fe++)!be&&!Le?oe[fe]=_(v.image[fe],!1,!0,r.maxCubemapSize):oe[fe]=Le?v.image[fe].image:v.image[fe],oe[fe]=ie(v,oe[fe]);const ke=oe[0],Fe=p(ke)||o,Be=s.convert(v.format,v.colorSpace),Te=s.convert(v.type),xe=E(v.internalFormat,Be,Te,v.colorSpace),P=o&&v.isVideoTexture!==!0,ge=Z.__version===void 0||B===!0;let Pe=D(v,ke,Fe);ne(n.TEXTURE_CUBE_MAP,v,Fe);let we;if(be){P&&ge&&t.texStorage2D(n.TEXTURE_CUBE_MAP,Pe,xe,ke.width,ke.height);for(let fe=0;fe<6;fe++){we=oe[fe].mipmaps;for(let I=0;I<we.length;I++){const ve=we[I];v.format!==vn?Be!==null?P?t.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+fe,I,0,0,ve.width,ve.height,Be,ve.data):t.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+fe,I,xe,ve.width,ve.height,0,ve.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):P?t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+fe,I,0,0,ve.width,ve.height,Be,Te,ve.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+fe,I,xe,ve.width,ve.height,0,Be,Te,ve.data)}}}else{we=v.mipmaps,P&&ge&&(we.length>0&&Pe++,t.texStorage2D(n.TEXTURE_CUBE_MAP,Pe,xe,oe[0].width,oe[0].height));for(let fe=0;fe<6;fe++)if(Le){P?t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+fe,0,0,0,oe[fe].width,oe[fe].height,Be,Te,oe[fe].data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+fe,0,xe,oe[fe].width,oe[fe].height,0,Be,Te,oe[fe].data);for(let I=0;I<we.length;I++){const ye=we[I].image[fe].image;P?t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+fe,I+1,0,0,ye.width,ye.height,Be,Te,ye.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+fe,I+1,xe,ye.width,ye.height,0,Be,Te,ye.data)}}else{P?t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+fe,0,0,0,Be,Te,oe[fe]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+fe,0,xe,Be,Te,oe[fe]);for(let I=0;I<we.length;I++){const ve=we[I];P?t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+fe,I+1,0,0,Be,Te,ve.image[fe]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+fe,I+1,xe,Be,Te,ve.image[fe])}}}S(v,Fe)&&M(n.TEXTURE_CUBE_MAP),Z.__version=q.version,v.onUpdate&&v.onUpdate(v)}y.__version=v.version}function Ce(y,v,O,B,q,Z){const me=s.convert(O.format,O.colorSpace),ce=s.convert(O.type),de=E(O.internalFormat,me,ce,O.colorSpace);if(!i.get(v).__hasExternalTextures){const Le=Math.max(1,v.width>>Z),oe=Math.max(1,v.height>>Z);q===n.TEXTURE_3D||q===n.TEXTURE_2D_ARRAY?t.texImage3D(q,Z,de,Le,oe,v.depth,0,me,ce,null):t.texImage2D(q,Z,de,Le,oe,0,me,ce,null)}t.bindFramebuffer(n.FRAMEBUFFER,y),z(v)?l.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,B,q,i.get(O).__webglTexture,0,X(v)):(q===n.TEXTURE_2D||q>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&q<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,B,q,i.get(O).__webglTexture,Z),t.bindFramebuffer(n.FRAMEBUFFER,null)}function Ve(y,v,O){if(n.bindRenderbuffer(n.RENDERBUFFER,y),v.depthBuffer&&!v.stencilBuffer){let B=o===!0?n.DEPTH_COMPONENT24:n.DEPTH_COMPONENT16;if(O||z(v)){const q=v.depthTexture;q&&q.isDepthTexture&&(q.type===mi?B=n.DEPTH_COMPONENT32F:q.type===pi&&(B=n.DEPTH_COMPONENT24));const Z=X(v);z(v)?l.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,Z,B,v.width,v.height):n.renderbufferStorageMultisample(n.RENDERBUFFER,Z,B,v.width,v.height)}else n.renderbufferStorage(n.RENDERBUFFER,B,v.width,v.height);n.framebufferRenderbuffer(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.RENDERBUFFER,y)}else if(v.depthBuffer&&v.stencilBuffer){const B=X(v);O&&z(v)===!1?n.renderbufferStorageMultisample(n.RENDERBUFFER,B,n.DEPTH24_STENCIL8,v.width,v.height):z(v)?l.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,B,n.DEPTH24_STENCIL8,v.width,v.height):n.renderbufferStorage(n.RENDERBUFFER,n.DEPTH_STENCIL,v.width,v.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.RENDERBUFFER,y)}else{const B=v.isWebGLMultipleRenderTargets===!0?v.texture:[v.texture];for(let q=0;q<B.length;q++){const Z=B[q],me=s.convert(Z.format,Z.colorSpace),ce=s.convert(Z.type),de=E(Z.internalFormat,me,ce,Z.colorSpace),be=X(v);O&&z(v)===!1?n.renderbufferStorageMultisample(n.RENDERBUFFER,be,de,v.width,v.height):z(v)?l.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,be,de,v.width,v.height):n.renderbufferStorage(n.RENDERBUFFER,de,v.width,v.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function Oe(y,v){if(v&&v.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(n.FRAMEBUFFER,y),!(v.depthTexture&&v.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");(!i.get(v.depthTexture).__webglTexture||v.depthTexture.image.width!==v.width||v.depthTexture.image.height!==v.height)&&(v.depthTexture.image.width=v.width,v.depthTexture.image.height=v.height,v.depthTexture.needsUpdate=!0),G(v.depthTexture,0);const B=i.get(v.depthTexture).__webglTexture,q=X(v);if(v.depthTexture.format===Wi)z(v)?l.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,B,0,q):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,B,0);else if(v.depthTexture.format===wr)z(v)?l.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,B,0,q):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,B,0);else throw new Error("Unknown depthTexture format")}function Ne(y){const v=i.get(y),O=y.isWebGLCubeRenderTarget===!0;if(y.depthTexture&&!v.__autoAllocateDepthBuffer){if(O)throw new Error("target.depthTexture not supported in Cube render targets");Oe(v.__webglFramebuffer,y)}else if(O){v.__webglDepthbuffer=[];for(let B=0;B<6;B++)t.bindFramebuffer(n.FRAMEBUFFER,v.__webglFramebuffer[B]),v.__webglDepthbuffer[B]=n.createRenderbuffer(),Ve(v.__webglDepthbuffer[B],y,!1)}else t.bindFramebuffer(n.FRAMEBUFFER,v.__webglFramebuffer),v.__webglDepthbuffer=n.createRenderbuffer(),Ve(v.__webglDepthbuffer,y,!1);t.bindFramebuffer(n.FRAMEBUFFER,null)}function R(y,v,O){const B=i.get(y);v!==void 0&&Ce(B.__webglFramebuffer,y,y.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),O!==void 0&&Ne(y)}function b(y){const v=y.texture,O=i.get(y),B=i.get(v);y.addEventListener("dispose",C),y.isWebGLMultipleRenderTargets!==!0&&(B.__webglTexture===void 0&&(B.__webglTexture=n.createTexture()),B.__version=v.version,a.memory.textures++);const q=y.isWebGLCubeRenderTarget===!0,Z=y.isWebGLMultipleRenderTargets===!0,me=p(y)||o;if(q){O.__webglFramebuffer=[];for(let ce=0;ce<6;ce++)if(o&&v.mipmaps&&v.mipmaps.length>0){O.__webglFramebuffer[ce]=[];for(let de=0;de<v.mipmaps.length;de++)O.__webglFramebuffer[ce][de]=n.createFramebuffer()}else O.__webglFramebuffer[ce]=n.createFramebuffer()}else{if(o&&v.mipmaps&&v.mipmaps.length>0){O.__webglFramebuffer=[];for(let ce=0;ce<v.mipmaps.length;ce++)O.__webglFramebuffer[ce]=n.createFramebuffer()}else O.__webglFramebuffer=n.createFramebuffer();if(Z)if(r.drawBuffers){const ce=y.texture;for(let de=0,be=ce.length;de<be;de++){const Le=i.get(ce[de]);Le.__webglTexture===void 0&&(Le.__webglTexture=n.createTexture(),a.memory.textures++)}}else console.warn("THREE.WebGLRenderer: WebGLMultipleRenderTargets can only be used with WebGL2 or WEBGL_draw_buffers extension.");if(o&&y.samples>0&&z(y)===!1){const ce=Z?v:[v];O.__webglMultisampledFramebuffer=n.createFramebuffer(),O.__webglColorRenderbuffer=[],t.bindFramebuffer(n.FRAMEBUFFER,O.__webglMultisampledFramebuffer);for(let de=0;de<ce.length;de++){const be=ce[de];O.__webglColorRenderbuffer[de]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,O.__webglColorRenderbuffer[de]);const Le=s.convert(be.format,be.colorSpace),oe=s.convert(be.type),ke=E(be.internalFormat,Le,oe,be.colorSpace,y.isXRRenderTarget===!0),Fe=X(y);n.renderbufferStorageMultisample(n.RENDERBUFFER,Fe,ke,y.width,y.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+de,n.RENDERBUFFER,O.__webglColorRenderbuffer[de])}n.bindRenderbuffer(n.RENDERBUFFER,null),y.depthBuffer&&(O.__webglDepthRenderbuffer=n.createRenderbuffer(),Ve(O.__webglDepthRenderbuffer,y,!0)),t.bindFramebuffer(n.FRAMEBUFFER,null)}}if(q){t.bindTexture(n.TEXTURE_CUBE_MAP,B.__webglTexture),ne(n.TEXTURE_CUBE_MAP,v,me);for(let ce=0;ce<6;ce++)if(o&&v.mipmaps&&v.mipmaps.length>0)for(let de=0;de<v.mipmaps.length;de++)Ce(O.__webglFramebuffer[ce][de],y,v,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+ce,de);else Ce(O.__webglFramebuffer[ce],y,v,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+ce,0);S(v,me)&&M(n.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Z){const ce=y.texture;for(let de=0,be=ce.length;de<be;de++){const Le=ce[de],oe=i.get(Le);t.bindTexture(n.TEXTURE_2D,oe.__webglTexture),ne(n.TEXTURE_2D,Le,me),Ce(O.__webglFramebuffer,y,Le,n.COLOR_ATTACHMENT0+de,n.TEXTURE_2D,0),S(Le,me)&&M(n.TEXTURE_2D)}t.unbindTexture()}else{let ce=n.TEXTURE_2D;if((y.isWebGL3DRenderTarget||y.isWebGLArrayRenderTarget)&&(o?ce=y.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY:console.error("THREE.WebGLTextures: THREE.Data3DTexture and THREE.DataArrayTexture only supported with WebGL2.")),t.bindTexture(ce,B.__webglTexture),ne(ce,v,me),o&&v.mipmaps&&v.mipmaps.length>0)for(let de=0;de<v.mipmaps.length;de++)Ce(O.__webglFramebuffer[de],y,v,n.COLOR_ATTACHMENT0,ce,de);else Ce(O.__webglFramebuffer,y,v,n.COLOR_ATTACHMENT0,ce,0);S(v,me)&&M(ce),t.unbindTexture()}y.depthBuffer&&Ne(y)}function j(y){const v=p(y)||o,O=y.isWebGLMultipleRenderTargets===!0?y.texture:[y.texture];for(let B=0,q=O.length;B<q;B++){const Z=O[B];if(S(Z,v)){const me=y.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:n.TEXTURE_2D,ce=i.get(Z).__webglTexture;t.bindTexture(me,ce),M(me),t.unbindTexture()}}}function Y(y){if(o&&y.samples>0&&z(y)===!1){const v=y.isWebGLMultipleRenderTargets?y.texture:[y.texture],O=y.width,B=y.height;let q=n.COLOR_BUFFER_BIT;const Z=[],me=y.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,ce=i.get(y),de=y.isWebGLMultipleRenderTargets===!0;if(de)for(let be=0;be<v.length;be++)t.bindFramebuffer(n.FRAMEBUFFER,ce.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+be,n.RENDERBUFFER,null),t.bindFramebuffer(n.FRAMEBUFFER,ce.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+be,n.TEXTURE_2D,null,0);t.bindFramebuffer(n.READ_FRAMEBUFFER,ce.__webglMultisampledFramebuffer),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,ce.__webglFramebuffer);for(let be=0;be<v.length;be++){Z.push(n.COLOR_ATTACHMENT0+be),y.depthBuffer&&Z.push(me);const Le=ce.__ignoreDepthValues!==void 0?ce.__ignoreDepthValues:!1;if(Le===!1&&(y.depthBuffer&&(q|=n.DEPTH_BUFFER_BIT),y.stencilBuffer&&(q|=n.STENCIL_BUFFER_BIT)),de&&n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,ce.__webglColorRenderbuffer[be]),Le===!0&&(n.invalidateFramebuffer(n.READ_FRAMEBUFFER,[me]),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[me])),de){const oe=i.get(v[be]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,oe,0)}n.blitFramebuffer(0,0,O,B,0,0,O,B,q,n.NEAREST),c&&n.invalidateFramebuffer(n.READ_FRAMEBUFFER,Z)}if(t.bindFramebuffer(n.READ_FRAMEBUFFER,null),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),de)for(let be=0;be<v.length;be++){t.bindFramebuffer(n.FRAMEBUFFER,ce.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+be,n.RENDERBUFFER,ce.__webglColorRenderbuffer[be]);const Le=i.get(v[be]).__webglTexture;t.bindFramebuffer(n.FRAMEBUFFER,ce.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+be,n.TEXTURE_2D,Le,0)}t.bindFramebuffer(n.DRAW_FRAMEBUFFER,ce.__webglMultisampledFramebuffer)}}function X(y){return Math.min(r.maxSamples,y.samples)}function z(y){const v=i.get(y);return o&&y.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&v.__useRenderToTexture!==!1}function le(y){const v=a.render.frame;u.get(y)!==v&&(u.set(y,v),y.update())}function ie(y,v){const O=y.colorSpace,B=y.format,q=y.type;return y.isCompressedTexture===!0||y.isVideoTexture===!0||y.format===ja||O!==ri&&O!==an&&(ot.getTransfer(O)===ft?o===!1?e.has("EXT_sRGB")===!0&&B===vn?(y.format=ja,y.minFilter=sn,y.generateMipmaps=!1):v=Mh.sRGBToLinear(v):(B!==vn||q!==Si)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",O)),v}this.allocateTextureUnit=N,this.resetTextureUnits=se,this.setTexture2D=G,this.setTexture2DArray=Q,this.setTexture3D=$,this.setTextureCube=re,this.rebindTextures=R,this.setupRenderTarget=b,this.updateRenderTargetMipmap=j,this.updateMultisampleRenderTarget=Y,this.setupDepthRenderbuffer=Ne,this.setupFrameBufferTexture=Ce,this.useMultisampledRTT=z}function _M(n,e,t){const i=t.isWebGL2;function r(s,a=an){let o;const l=ot.getTransfer(a);if(s===Si)return n.UNSIGNED_BYTE;if(s===uh)return n.UNSIGNED_SHORT_4_4_4_4;if(s===fh)return n.UNSIGNED_SHORT_5_5_5_1;if(s===Jm)return n.BYTE;if(s===Qm)return n.SHORT;if(s===Ml)return n.UNSIGNED_SHORT;if(s===ch)return n.INT;if(s===pi)return n.UNSIGNED_INT;if(s===mi)return n.FLOAT;if(s===as)return i?n.HALF_FLOAT:(o=e.get("OES_texture_half_float"),o!==null?o.HALF_FLOAT_OES:null);if(s===eg)return n.ALPHA;if(s===vn)return n.RGBA;if(s===tg)return n.LUMINANCE;if(s===ng)return n.LUMINANCE_ALPHA;if(s===Wi)return n.DEPTH_COMPONENT;if(s===wr)return n.DEPTH_STENCIL;if(s===ja)return o=e.get("EXT_sRGB"),o!==null?o.SRGB_ALPHA_EXT:null;if(s===ig)return n.RED;if(s===hh)return n.RED_INTEGER;if(s===rg)return n.RG;if(s===dh)return n.RG_INTEGER;if(s===ph)return n.RGBA_INTEGER;if(s===Zo||s===Jo||s===Qo||s===ea)if(l===ft)if(o=e.get("WEBGL_compressed_texture_s3tc_srgb"),o!==null){if(s===Zo)return o.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(s===Jo)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(s===Qo)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(s===ea)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(o=e.get("WEBGL_compressed_texture_s3tc"),o!==null){if(s===Zo)return o.COMPRESSED_RGB_S3TC_DXT1_EXT;if(s===Jo)return o.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(s===Qo)return o.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(s===ea)return o.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(s===Sc||s===yc||s===Ec||s===bc)if(o=e.get("WEBGL_compressed_texture_pvrtc"),o!==null){if(s===Sc)return o.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(s===yc)return o.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(s===Ec)return o.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(s===bc)return o.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(s===mh)return o=e.get("WEBGL_compressed_texture_etc1"),o!==null?o.COMPRESSED_RGB_ETC1_WEBGL:null;if(s===Tc||s===Ac)if(o=e.get("WEBGL_compressed_texture_etc"),o!==null){if(s===Tc)return l===ft?o.COMPRESSED_SRGB8_ETC2:o.COMPRESSED_RGB8_ETC2;if(s===Ac)return l===ft?o.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:o.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(s===wc||s===Rc||s===Cc||s===Lc||s===Pc||s===Dc||s===Uc||s===Ic||s===Nc||s===Oc||s===Fc||s===Bc||s===zc||s===Hc)if(o=e.get("WEBGL_compressed_texture_astc"),o!==null){if(s===wc)return l===ft?o.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:o.COMPRESSED_RGBA_ASTC_4x4_KHR;if(s===Rc)return l===ft?o.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:o.COMPRESSED_RGBA_ASTC_5x4_KHR;if(s===Cc)return l===ft?o.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:o.COMPRESSED_RGBA_ASTC_5x5_KHR;if(s===Lc)return l===ft?o.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:o.COMPRESSED_RGBA_ASTC_6x5_KHR;if(s===Pc)return l===ft?o.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:o.COMPRESSED_RGBA_ASTC_6x6_KHR;if(s===Dc)return l===ft?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:o.COMPRESSED_RGBA_ASTC_8x5_KHR;if(s===Uc)return l===ft?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:o.COMPRESSED_RGBA_ASTC_8x6_KHR;if(s===Ic)return l===ft?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:o.COMPRESSED_RGBA_ASTC_8x8_KHR;if(s===Nc)return l===ft?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:o.COMPRESSED_RGBA_ASTC_10x5_KHR;if(s===Oc)return l===ft?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:o.COMPRESSED_RGBA_ASTC_10x6_KHR;if(s===Fc)return l===ft?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:o.COMPRESSED_RGBA_ASTC_10x8_KHR;if(s===Bc)return l===ft?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:o.COMPRESSED_RGBA_ASTC_10x10_KHR;if(s===zc)return l===ft?o.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:o.COMPRESSED_RGBA_ASTC_12x10_KHR;if(s===Hc)return l===ft?o.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:o.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(s===ta||s===Vc||s===Gc)if(o=e.get("EXT_texture_compression_bptc"),o!==null){if(s===ta)return l===ft?o.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:o.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(s===Vc)return o.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(s===Gc)return o.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(s===sg||s===kc||s===Wc||s===Xc)if(o=e.get("EXT_texture_compression_rgtc"),o!==null){if(s===ta)return o.COMPRESSED_RED_RGTC1_EXT;if(s===kc)return o.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(s===Wc)return o.COMPRESSED_RED_GREEN_RGTC2_EXT;if(s===Xc)return o.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return s===ki?i?n.UNSIGNED_INT_24_8:(o=e.get("WEBGL_depth_texture"),o!==null?o.UNSIGNED_INT_24_8_WEBGL:null):n[s]!==void 0?n[s]:null}return{convert:r}}class vM extends on{constructor(e=[]){super(),this.isArrayCamera=!0,this.cameras=e}}class qs extends Pt{constructor(){super(),this.isGroup=!0,this.type="Group"}}const xM={type:"move"};class Ta{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new qs,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new qs,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new V,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new V),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new qs,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new V,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new V),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const i of e.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,i){let r=null,s=null,a=null;const o=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){a=!0;for(const _ of e.hand.values()){const p=t.getJointPose(_,i),h=this._getHandJoint(c,_);p!==null&&(h.matrix.fromArray(p.transform.matrix),h.matrix.decompose(h.position,h.rotation,h.scale),h.matrixWorldNeedsUpdate=!0,h.jointRadius=p.radius),h.visible=p!==null}const u=c.joints["index-finger-tip"],f=c.joints["thumb-tip"],d=u.position.distanceTo(f.position),m=.02,g=.005;c.inputState.pinching&&d>m+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&d<=m-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,i),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1));o!==null&&(r=t.getPose(e.targetRaySpace,i),r===null&&s!==null&&(r=s),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(xM)))}return o!==null&&(o.visible=r!==null),l!==null&&(l.visible=s!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const i=new qs;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[t.jointName]=i,e.add(i)}return e.joints[t.jointName]}}class MM extends Ki{constructor(e,t){super();const i=this;let r=null,s=1,a=null,o="local-floor",l=1,c=null,u=null,f=null,d=null,m=null,g=null;const _=t.getContextAttributes();let p=null,h=null;const S=[],M=[],E=new Xe;let D=null;const L=new on;L.layers.enable(1),L.viewport=new wt;const T=new on;T.layers.enable(2),T.viewport=new wt;const C=[L,T],x=new vM;x.layers.enable(1),x.layers.enable(2);let A=null,k=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(ne){let ue=S[ne];return ue===void 0&&(ue=new Ta,S[ne]=ue),ue.getTargetRaySpace()},this.getControllerGrip=function(ne){let ue=S[ne];return ue===void 0&&(ue=new Ta,S[ne]=ue),ue.getGripSpace()},this.getHand=function(ne){let ue=S[ne];return ue===void 0&&(ue=new Ta,S[ne]=ue),ue.getHandSpace()};function te(ne){const ue=M.indexOf(ne.inputSource);if(ue===-1)return;const Ee=S[ue];Ee!==void 0&&(Ee.update(ne.inputSource,ne.frame,c||a),Ee.dispatchEvent({type:ne.type,data:ne.inputSource}))}function se(){r.removeEventListener("select",te),r.removeEventListener("selectstart",te),r.removeEventListener("selectend",te),r.removeEventListener("squeeze",te),r.removeEventListener("squeezestart",te),r.removeEventListener("squeezeend",te),r.removeEventListener("end",se),r.removeEventListener("inputsourceschange",N);for(let ne=0;ne<S.length;ne++){const ue=M[ne];ue!==null&&(M[ne]=null,S[ne].disconnect(ue))}A=null,k=null,e.setRenderTarget(p),m=null,d=null,f=null,r=null,h=null,he.stop(),i.isPresenting=!1,e.setPixelRatio(D),e.setSize(E.width,E.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(ne){s=ne,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(ne){o=ne,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(ne){c=ne},this.getBaseLayer=function(){return d!==null?d:m},this.getBinding=function(){return f},this.getFrame=function(){return g},this.getSession=function(){return r},this.setSession=async function(ne){if(r=ne,r!==null){if(p=e.getRenderTarget(),r.addEventListener("select",te),r.addEventListener("selectstart",te),r.addEventListener("selectend",te),r.addEventListener("squeeze",te),r.addEventListener("squeezestart",te),r.addEventListener("squeezeend",te),r.addEventListener("end",se),r.addEventListener("inputsourceschange",N),_.xrCompatible!==!0&&await t.makeXRCompatible(),D=e.getPixelRatio(),e.getSize(E),r.renderState.layers===void 0||e.capabilities.isWebGL2===!1){const ue={antialias:r.renderState.layers===void 0?_.antialias:!0,alpha:!0,depth:_.depth,stencil:_.stencil,framebufferScaleFactor:s};m=new XRWebGLLayer(r,t,ue),r.updateRenderState({baseLayer:m}),e.setPixelRatio(1),e.setSize(m.framebufferWidth,m.framebufferHeight,!1),h=new qi(m.framebufferWidth,m.framebufferHeight,{format:vn,type:Si,colorSpace:e.outputColorSpace,stencilBuffer:_.stencil})}else{let ue=null,Ee=null,Re=null;_.depth&&(Re=_.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,ue=_.stencil?wr:Wi,Ee=_.stencil?ki:pi);const Ce={colorFormat:t.RGBA8,depthFormat:Re,scaleFactor:s};f=new XRWebGLBinding(r,t),d=f.createProjectionLayer(Ce),r.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),h=new qi(d.textureWidth,d.textureHeight,{format:vn,type:Si,depthTexture:new Dh(d.textureWidth,d.textureHeight,Ee,void 0,void 0,void 0,void 0,void 0,void 0,ue),stencilBuffer:_.stencil,colorSpace:e.outputColorSpace,samples:_.antialias?4:0});const Ve=e.properties.get(h);Ve.__ignoreDepthValues=d.ignoreDepthValues}h.isXRRenderTarget=!0,this.setFoveation(l),c=null,a=await r.requestReferenceSpace(o),he.setContext(r),he.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode};function N(ne){for(let ue=0;ue<ne.removed.length;ue++){const Ee=ne.removed[ue],Re=M.indexOf(Ee);Re>=0&&(M[Re]=null,S[Re].disconnect(Ee))}for(let ue=0;ue<ne.added.length;ue++){const Ee=ne.added[ue];let Re=M.indexOf(Ee);if(Re===-1){for(let Ve=0;Ve<S.length;Ve++)if(Ve>=M.length){M.push(Ee),Re=Ve;break}else if(M[Ve]===null){M[Ve]=Ee,Re=Ve;break}if(Re===-1)break}const Ce=S[Re];Ce&&Ce.connect(Ee)}}const W=new V,G=new V;function Q(ne,ue,Ee){W.setFromMatrixPosition(ue.matrixWorld),G.setFromMatrixPosition(Ee.matrixWorld);const Re=W.distanceTo(G),Ce=ue.projectionMatrix.elements,Ve=Ee.projectionMatrix.elements,Oe=Ce[14]/(Ce[10]-1),Ne=Ce[14]/(Ce[10]+1),R=(Ce[9]+1)/Ce[5],b=(Ce[9]-1)/Ce[5],j=(Ce[8]-1)/Ce[0],Y=(Ve[8]+1)/Ve[0],X=Oe*j,z=Oe*Y,le=Re/(-j+Y),ie=le*-j;ue.matrixWorld.decompose(ne.position,ne.quaternion,ne.scale),ne.translateX(ie),ne.translateZ(le),ne.matrixWorld.compose(ne.position,ne.quaternion,ne.scale),ne.matrixWorldInverse.copy(ne.matrixWorld).invert();const y=Oe+le,v=Ne+le,O=X-ie,B=z+(Re-ie),q=R*Ne/v*y,Z=b*Ne/v*y;ne.projectionMatrix.makePerspective(O,B,q,Z,y,v),ne.projectionMatrixInverse.copy(ne.projectionMatrix).invert()}function $(ne,ue){ue===null?ne.matrixWorld.copy(ne.matrix):ne.matrixWorld.multiplyMatrices(ue.matrixWorld,ne.matrix),ne.matrixWorldInverse.copy(ne.matrixWorld).invert()}this.updateCamera=function(ne){if(r===null)return;x.near=T.near=L.near=ne.near,x.far=T.far=L.far=ne.far,(A!==x.near||k!==x.far)&&(r.updateRenderState({depthNear:x.near,depthFar:x.far}),A=x.near,k=x.far);const ue=ne.parent,Ee=x.cameras;$(x,ue);for(let Re=0;Re<Ee.length;Re++)$(Ee[Re],ue);Ee.length===2?Q(x,L,T):x.projectionMatrix.copy(L.projectionMatrix),re(ne,x,ue)};function re(ne,ue,Ee){Ee===null?ne.matrix.copy(ue.matrixWorld):(ne.matrix.copy(Ee.matrixWorld),ne.matrix.invert(),ne.matrix.multiply(ue.matrixWorld)),ne.matrix.decompose(ne.position,ne.quaternion,ne.scale),ne.updateMatrixWorld(!0),ne.projectionMatrix.copy(ue.projectionMatrix),ne.projectionMatrixInverse.copy(ue.projectionMatrixInverse),ne.isPerspectiveCamera&&(ne.fov=$a*2*Math.atan(1/ne.projectionMatrix.elements[5]),ne.zoom=1)}this.getCamera=function(){return x},this.getFoveation=function(){if(!(d===null&&m===null))return l},this.setFoveation=function(ne){l=ne,d!==null&&(d.fixedFoveation=ne),m!==null&&m.fixedFoveation!==void 0&&(m.fixedFoveation=ne)};let ae=null;function pe(ne,ue){if(u=ue.getViewerPose(c||a),g=ue,u!==null){const Ee=u.views;m!==null&&(e.setRenderTargetFramebuffer(h,m.framebuffer),e.setRenderTarget(h));let Re=!1;Ee.length!==x.cameras.length&&(x.cameras.length=0,Re=!0);for(let Ce=0;Ce<Ee.length;Ce++){const Ve=Ee[Ce];let Oe=null;if(m!==null)Oe=m.getViewport(Ve);else{const R=f.getViewSubImage(d,Ve);Oe=R.viewport,Ce===0&&(e.setRenderTargetTextures(h,R.colorTexture,d.ignoreDepthValues?void 0:R.depthStencilTexture),e.setRenderTarget(h))}let Ne=C[Ce];Ne===void 0&&(Ne=new on,Ne.layers.enable(Ce),Ne.viewport=new wt,C[Ce]=Ne),Ne.matrix.fromArray(Ve.transform.matrix),Ne.matrix.decompose(Ne.position,Ne.quaternion,Ne.scale),Ne.projectionMatrix.fromArray(Ve.projectionMatrix),Ne.projectionMatrixInverse.copy(Ne.projectionMatrix).invert(),Ne.viewport.set(Oe.x,Oe.y,Oe.width,Oe.height),Ce===0&&(x.matrix.copy(Ne.matrix),x.matrix.decompose(x.position,x.quaternion,x.scale)),Re===!0&&x.cameras.push(Ne)}}for(let Ee=0;Ee<S.length;Ee++){const Re=M[Ee],Ce=S[Ee];Re!==null&&Ce!==void 0&&Ce.update(Re,ue,c||a)}ae&&ae(ne,ue),ue.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:ue}),g=null}const he=new Lh;he.setAnimationLoop(pe),this.setAnimationLoop=function(ne){ae=ne},this.dispose=function(){}}}function SM(n,e){function t(p,h){p.matrixAutoUpdate===!0&&p.updateMatrix(),h.value.copy(p.matrix)}function i(p,h){h.color.getRGB(p.fogColor.value,wh(n)),h.isFog?(p.fogNear.value=h.near,p.fogFar.value=h.far):h.isFogExp2&&(p.fogDensity.value=h.density)}function r(p,h,S,M,E){h.isMeshBasicMaterial||h.isMeshLambertMaterial?s(p,h):h.isMeshToonMaterial?(s(p,h),f(p,h)):h.isMeshPhongMaterial?(s(p,h),u(p,h)):h.isMeshStandardMaterial?(s(p,h),d(p,h),h.isMeshPhysicalMaterial&&m(p,h,E)):h.isMeshMatcapMaterial?(s(p,h),g(p,h)):h.isMeshDepthMaterial?s(p,h):h.isMeshDistanceMaterial?(s(p,h),_(p,h)):h.isMeshNormalMaterial?s(p,h):h.isLineBasicMaterial?(a(p,h),h.isLineDashedMaterial&&o(p,h)):h.isPointsMaterial?l(p,h,S,M):h.isSpriteMaterial?c(p,h):h.isShadowMaterial?(p.color.value.copy(h.color),p.opacity.value=h.opacity):h.isShaderMaterial&&(h.uniformsNeedUpdate=!1)}function s(p,h){p.opacity.value=h.opacity,h.color&&p.diffuse.value.copy(h.color),h.emissive&&p.emissive.value.copy(h.emissive).multiplyScalar(h.emissiveIntensity),h.map&&(p.map.value=h.map,t(h.map,p.mapTransform)),h.alphaMap&&(p.alphaMap.value=h.alphaMap,t(h.alphaMap,p.alphaMapTransform)),h.bumpMap&&(p.bumpMap.value=h.bumpMap,t(h.bumpMap,p.bumpMapTransform),p.bumpScale.value=h.bumpScale,h.side===$t&&(p.bumpScale.value*=-1)),h.normalMap&&(p.normalMap.value=h.normalMap,t(h.normalMap,p.normalMapTransform),p.normalScale.value.copy(h.normalScale),h.side===$t&&p.normalScale.value.negate()),h.displacementMap&&(p.displacementMap.value=h.displacementMap,t(h.displacementMap,p.displacementMapTransform),p.displacementScale.value=h.displacementScale,p.displacementBias.value=h.displacementBias),h.emissiveMap&&(p.emissiveMap.value=h.emissiveMap,t(h.emissiveMap,p.emissiveMapTransform)),h.specularMap&&(p.specularMap.value=h.specularMap,t(h.specularMap,p.specularMapTransform)),h.alphaTest>0&&(p.alphaTest.value=h.alphaTest);const S=e.get(h).envMap;if(S&&(p.envMap.value=S,p.flipEnvMap.value=S.isCubeTexture&&S.isRenderTargetTexture===!1?-1:1,p.reflectivity.value=h.reflectivity,p.ior.value=h.ior,p.refractionRatio.value=h.refractionRatio),h.lightMap){p.lightMap.value=h.lightMap;const M=n._useLegacyLights===!0?Math.PI:1;p.lightMapIntensity.value=h.lightMapIntensity*M,t(h.lightMap,p.lightMapTransform)}h.aoMap&&(p.aoMap.value=h.aoMap,p.aoMapIntensity.value=h.aoMapIntensity,t(h.aoMap,p.aoMapTransform))}function a(p,h){p.diffuse.value.copy(h.color),p.opacity.value=h.opacity,h.map&&(p.map.value=h.map,t(h.map,p.mapTransform))}function o(p,h){p.dashSize.value=h.dashSize,p.totalSize.value=h.dashSize+h.gapSize,p.scale.value=h.scale}function l(p,h,S,M){p.diffuse.value.copy(h.color),p.opacity.value=h.opacity,p.size.value=h.size*S,p.scale.value=M*.5,h.map&&(p.map.value=h.map,t(h.map,p.uvTransform)),h.alphaMap&&(p.alphaMap.value=h.alphaMap,t(h.alphaMap,p.alphaMapTransform)),h.alphaTest>0&&(p.alphaTest.value=h.alphaTest)}function c(p,h){p.diffuse.value.copy(h.color),p.opacity.value=h.opacity,p.rotation.value=h.rotation,h.map&&(p.map.value=h.map,t(h.map,p.mapTransform)),h.alphaMap&&(p.alphaMap.value=h.alphaMap,t(h.alphaMap,p.alphaMapTransform)),h.alphaTest>0&&(p.alphaTest.value=h.alphaTest)}function u(p,h){p.specular.value.copy(h.specular),p.shininess.value=Math.max(h.shininess,1e-4)}function f(p,h){h.gradientMap&&(p.gradientMap.value=h.gradientMap)}function d(p,h){p.metalness.value=h.metalness,h.metalnessMap&&(p.metalnessMap.value=h.metalnessMap,t(h.metalnessMap,p.metalnessMapTransform)),p.roughness.value=h.roughness,h.roughnessMap&&(p.roughnessMap.value=h.roughnessMap,t(h.roughnessMap,p.roughnessMapTransform)),e.get(h).envMap&&(p.envMapIntensity.value=h.envMapIntensity)}function m(p,h,S){p.ior.value=h.ior,h.sheen>0&&(p.sheenColor.value.copy(h.sheenColor).multiplyScalar(h.sheen),p.sheenRoughness.value=h.sheenRoughness,h.sheenColorMap&&(p.sheenColorMap.value=h.sheenColorMap,t(h.sheenColorMap,p.sheenColorMapTransform)),h.sheenRoughnessMap&&(p.sheenRoughnessMap.value=h.sheenRoughnessMap,t(h.sheenRoughnessMap,p.sheenRoughnessMapTransform))),h.clearcoat>0&&(p.clearcoat.value=h.clearcoat,p.clearcoatRoughness.value=h.clearcoatRoughness,h.clearcoatMap&&(p.clearcoatMap.value=h.clearcoatMap,t(h.clearcoatMap,p.clearcoatMapTransform)),h.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=h.clearcoatRoughnessMap,t(h.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),h.clearcoatNormalMap&&(p.clearcoatNormalMap.value=h.clearcoatNormalMap,t(h.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(h.clearcoatNormalScale),h.side===$t&&p.clearcoatNormalScale.value.negate())),h.iridescence>0&&(p.iridescence.value=h.iridescence,p.iridescenceIOR.value=h.iridescenceIOR,p.iridescenceThicknessMinimum.value=h.iridescenceThicknessRange[0],p.iridescenceThicknessMaximum.value=h.iridescenceThicknessRange[1],h.iridescenceMap&&(p.iridescenceMap.value=h.iridescenceMap,t(h.iridescenceMap,p.iridescenceMapTransform)),h.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=h.iridescenceThicknessMap,t(h.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),h.transmission>0&&(p.transmission.value=h.transmission,p.transmissionSamplerMap.value=S.texture,p.transmissionSamplerSize.value.set(S.width,S.height),h.transmissionMap&&(p.transmissionMap.value=h.transmissionMap,t(h.transmissionMap,p.transmissionMapTransform)),p.thickness.value=h.thickness,h.thicknessMap&&(p.thicknessMap.value=h.thicknessMap,t(h.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=h.attenuationDistance,p.attenuationColor.value.copy(h.attenuationColor)),h.anisotropy>0&&(p.anisotropyVector.value.set(h.anisotropy*Math.cos(h.anisotropyRotation),h.anisotropy*Math.sin(h.anisotropyRotation)),h.anisotropyMap&&(p.anisotropyMap.value=h.anisotropyMap,t(h.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=h.specularIntensity,p.specularColor.value.copy(h.specularColor),h.specularColorMap&&(p.specularColorMap.value=h.specularColorMap,t(h.specularColorMap,p.specularColorMapTransform)),h.specularIntensityMap&&(p.specularIntensityMap.value=h.specularIntensityMap,t(h.specularIntensityMap,p.specularIntensityMapTransform))}function g(p,h){h.matcap&&(p.matcap.value=h.matcap)}function _(p,h){const S=e.get(h).light;p.referencePosition.value.setFromMatrixPosition(S.matrixWorld),p.nearDistance.value=S.shadow.camera.near,p.farDistance.value=S.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:r}}function yM(n,e,t,i){let r={},s={},a=[];const o=t.isWebGL2?n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS):0;function l(S,M){const E=M.program;i.uniformBlockBinding(S,E)}function c(S,M){let E=r[S.id];E===void 0&&(g(S),E=u(S),r[S.id]=E,S.addEventListener("dispose",p));const D=M.program;i.updateUBOMapping(S,D);const L=e.render.frame;s[S.id]!==L&&(d(S),s[S.id]=L)}function u(S){const M=f();S.__bindingPointIndex=M;const E=n.createBuffer(),D=S.__size,L=S.usage;return n.bindBuffer(n.UNIFORM_BUFFER,E),n.bufferData(n.UNIFORM_BUFFER,D,L),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,M,E),E}function f(){for(let S=0;S<o;S++)if(a.indexOf(S)===-1)return a.push(S),S;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(S){const M=r[S.id],E=S.uniforms,D=S.__cache;n.bindBuffer(n.UNIFORM_BUFFER,M);for(let L=0,T=E.length;L<T;L++){const C=Array.isArray(E[L])?E[L]:[E[L]];for(let x=0,A=C.length;x<A;x++){const k=C[x];if(m(k,L,x,D)===!0){const te=k.__offset,se=Array.isArray(k.value)?k.value:[k.value];let N=0;for(let W=0;W<se.length;W++){const G=se[W],Q=_(G);typeof G=="number"||typeof G=="boolean"?(k.__data[0]=G,n.bufferSubData(n.UNIFORM_BUFFER,te+N,k.__data)):G.isMatrix3?(k.__data[0]=G.elements[0],k.__data[1]=G.elements[1],k.__data[2]=G.elements[2],k.__data[3]=0,k.__data[4]=G.elements[3],k.__data[5]=G.elements[4],k.__data[6]=G.elements[5],k.__data[7]=0,k.__data[8]=G.elements[6],k.__data[9]=G.elements[7],k.__data[10]=G.elements[8],k.__data[11]=0):(G.toArray(k.__data,N),N+=Q.storage/Float32Array.BYTES_PER_ELEMENT)}n.bufferSubData(n.UNIFORM_BUFFER,te,k.__data)}}}n.bindBuffer(n.UNIFORM_BUFFER,null)}function m(S,M,E,D){const L=S.value,T=M+"_"+E;if(D[T]===void 0)return typeof L=="number"||typeof L=="boolean"?D[T]=L:D[T]=L.clone(),!0;{const C=D[T];if(typeof L=="number"||typeof L=="boolean"){if(C!==L)return D[T]=L,!0}else if(C.equals(L)===!1)return C.copy(L),!0}return!1}function g(S){const M=S.uniforms;let E=0;const D=16;for(let T=0,C=M.length;T<C;T++){const x=Array.isArray(M[T])?M[T]:[M[T]];for(let A=0,k=x.length;A<k;A++){const te=x[A],se=Array.isArray(te.value)?te.value:[te.value];for(let N=0,W=se.length;N<W;N++){const G=se[N],Q=_(G),$=E%D;$!==0&&D-$<Q.boundary&&(E+=D-$),te.__data=new Float32Array(Q.storage/Float32Array.BYTES_PER_ELEMENT),te.__offset=E,E+=Q.storage}}}const L=E%D;return L>0&&(E+=D-L),S.__size=E,S.__cache={},this}function _(S){const M={boundary:0,storage:0};return typeof S=="number"||typeof S=="boolean"?(M.boundary=4,M.storage=4):S.isVector2?(M.boundary=8,M.storage=8):S.isVector3||S.isColor?(M.boundary=16,M.storage=12):S.isVector4?(M.boundary=16,M.storage=16):S.isMatrix3?(M.boundary=48,M.storage=48):S.isMatrix4?(M.boundary=64,M.storage=64):S.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",S),M}function p(S){const M=S.target;M.removeEventListener("dispose",p);const E=a.indexOf(M.__bindingPointIndex);a.splice(E,1),n.deleteBuffer(r[M.id]),delete r[M.id],delete s[M.id]}function h(){for(const S in r)n.deleteBuffer(r[S]);a=[],r={},s={}}return{bind:l,update:c,dispose:h}}class Bh{constructor(e={}){const{canvas:t=vg(),context:i=null,depth:r=!0,stencil:s=!0,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:f=!1}=e;this.isWebGLRenderer=!0;let d;i!==null?d=i.getContextAttributes().alpha:d=a;const m=new Uint32Array(4),g=new Int32Array(4);let _=null,p=null;const h=[],S=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=Lt,this._useLegacyLights=!1,this.toneMapping=Mi,this.toneMappingExposure=1;const M=this;let E=!1,D=0,L=0,T=null,C=-1,x=null;const A=new wt,k=new wt;let te=null;const se=new nt(0);let N=0,W=t.width,G=t.height,Q=1,$=null,re=null;const ae=new wt(0,0,W,G),pe=new wt(0,0,W,G);let he=!1;const ne=new bl;let ue=!1,Ee=!1,Re=null;const Ce=new yt,Ve=new Xe,Oe=new V,Ne={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};function R(){return T===null?Q:1}let b=i;function j(w,H){for(let J=0;J<w.length;J++){const ee=w[J],K=t.getContext(ee,H);if(K!==null)return K}return null}try{const w={alpha:!0,depth:r,stencil:s,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:u,failIfMajorPerformanceCaveat:f};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${xl}`),t.addEventListener("webglcontextlost",fe,!1),t.addEventListener("webglcontextrestored",I,!1),t.addEventListener("webglcontextcreationerror",ve,!1),b===null){const H=["webgl2","webgl","experimental-webgl"];if(M.isWebGL1Renderer===!0&&H.shift(),b=j(H,w),b===null)throw j(H)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}typeof WebGLRenderingContext<"u"&&b instanceof WebGLRenderingContext&&console.warn("THREE.WebGLRenderer: WebGL 1 support was deprecated in r153 and will be removed in r163."),b.getShaderPrecisionFormat===void 0&&(b.getShaderPrecisionFormat=function(){return{rangeMin:1,rangeMax:1,precision:1}})}catch(w){throw console.error("THREE.WebGLRenderer: "+w.message),w}let Y,X,z,le,ie,y,v,O,B,q,Z,me,ce,de,be,Le,oe,ke,Fe,Be,Te,xe,P,ge;function Pe(){Y=new Dv(b),X=new Av(b,Y,e),Y.init(X),xe=new _M(b,Y,X),z=new mM(b,Y,X),le=new Nv(b),ie=new tM,y=new gM(b,Y,z,ie,X,xe,le),v=new Rv(M),O=new Pv(M),B=new kg(b,X),P=new bv(b,Y,B,X),q=new Uv(b,B,le,P),Z=new zv(b,q,B,le),Fe=new Bv(b,X,y),Le=new wv(ie),me=new eM(M,v,O,Y,X,P,Le),ce=new SM(M,ie),de=new iM,be=new cM(Y,X),ke=new Ev(M,v,O,z,Z,d,l),oe=new pM(M,Z,X),ge=new yM(b,le,X,z),Be=new Tv(b,Y,le,X),Te=new Iv(b,Y,le,X),le.programs=me.programs,M.capabilities=X,M.extensions=Y,M.properties=ie,M.renderLists=de,M.shadowMap=oe,M.state=z,M.info=le}Pe();const we=new MM(M,b);this.xr=we,this.getContext=function(){return b},this.getContextAttributes=function(){return b.getContextAttributes()},this.forceContextLoss=function(){const w=Y.get("WEBGL_lose_context");w&&w.loseContext()},this.forceContextRestore=function(){const w=Y.get("WEBGL_lose_context");w&&w.restoreContext()},this.getPixelRatio=function(){return Q},this.setPixelRatio=function(w){w!==void 0&&(Q=w,this.setSize(W,G,!1))},this.getSize=function(w){return w.set(W,G)},this.setSize=function(w,H,J=!0){if(we.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}W=w,G=H,t.width=Math.floor(w*Q),t.height=Math.floor(H*Q),J===!0&&(t.style.width=w+"px",t.style.height=H+"px"),this.setViewport(0,0,w,H)},this.getDrawingBufferSize=function(w){return w.set(W*Q,G*Q).floor()},this.setDrawingBufferSize=function(w,H,J){W=w,G=H,Q=J,t.width=Math.floor(w*J),t.height=Math.floor(H*J),this.setViewport(0,0,w,H)},this.getCurrentViewport=function(w){return w.copy(A)},this.getViewport=function(w){return w.copy(ae)},this.setViewport=function(w,H,J,ee){w.isVector4?ae.set(w.x,w.y,w.z,w.w):ae.set(w,H,J,ee),z.viewport(A.copy(ae).multiplyScalar(Q).floor())},this.getScissor=function(w){return w.copy(pe)},this.setScissor=function(w,H,J,ee){w.isVector4?pe.set(w.x,w.y,w.z,w.w):pe.set(w,H,J,ee),z.scissor(k.copy(pe).multiplyScalar(Q).floor())},this.getScissorTest=function(){return he},this.setScissorTest=function(w){z.setScissorTest(he=w)},this.setOpaqueSort=function(w){$=w},this.setTransparentSort=function(w){re=w},this.getClearColor=function(w){return w.copy(ke.getClearColor())},this.setClearColor=function(){ke.setClearColor.apply(ke,arguments)},this.getClearAlpha=function(){return ke.getClearAlpha()},this.setClearAlpha=function(){ke.setClearAlpha.apply(ke,arguments)},this.clear=function(w=!0,H=!0,J=!0){let ee=0;if(w){let K=!1;if(T!==null){const Ae=T.texture.format;K=Ae===ph||Ae===dh||Ae===hh}if(K){const Ae=T.texture.type,De=Ae===Si||Ae===pi||Ae===Ml||Ae===ki||Ae===uh||Ae===fh,He=ke.getClearColor(),Ge=ke.getClearAlpha(),Ke=He.r,We=He.g,Ye=He.b;De?(m[0]=Ke,m[1]=We,m[2]=Ye,m[3]=Ge,b.clearBufferuiv(b.COLOR,0,m)):(g[0]=Ke,g[1]=We,g[2]=Ye,g[3]=Ge,b.clearBufferiv(b.COLOR,0,g))}else ee|=b.COLOR_BUFFER_BIT}H&&(ee|=b.DEPTH_BUFFER_BIT),J&&(ee|=b.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),b.clear(ee)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",fe,!1),t.removeEventListener("webglcontextrestored",I,!1),t.removeEventListener("webglcontextcreationerror",ve,!1),de.dispose(),be.dispose(),ie.dispose(),v.dispose(),O.dispose(),Z.dispose(),P.dispose(),ge.dispose(),me.dispose(),we.dispose(),we.removeEventListener("sessionstart",_t),we.removeEventListener("sessionend",it),Re&&(Re.dispose(),Re=null),Mt.stop()};function fe(w){w.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),E=!0}function I(){console.log("THREE.WebGLRenderer: Context Restored."),E=!1;const w=le.autoReset,H=oe.enabled,J=oe.autoUpdate,ee=oe.needsUpdate,K=oe.type;Pe(),le.autoReset=w,oe.enabled=H,oe.autoUpdate=J,oe.needsUpdate=ee,oe.type=K}function ve(w){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",w.statusMessage)}function ye(w){const H=w.target;H.removeEventListener("dispose",ye),ze(H)}function ze(w){Ue(w),ie.remove(w)}function Ue(w){const H=ie.get(w).programs;H!==void 0&&(H.forEach(function(J){me.releaseProgram(J)}),w.isShaderMaterial&&me.releaseShaderCache(w))}this.renderBufferDirect=function(w,H,J,ee,K,Ae){H===null&&(H=Ne);const De=K.isMesh&&K.matrixWorld.determinant()<0,He=Gh(w,H,J,ee,K);z.setMaterial(ee,De);let Ge=J.index,Ke=1;if(ee.wireframe===!0){if(Ge=q.getWireframeAttribute(J),Ge===void 0)return;Ke=2}const We=J.drawRange,Ye=J.attributes.position;let vt=We.start*Ke,Kt=(We.start+We.count)*Ke;Ae!==null&&(vt=Math.max(vt,Ae.start*Ke),Kt=Math.min(Kt,(Ae.start+Ae.count)*Ke)),Ge!==null?(vt=Math.max(vt,0),Kt=Math.min(Kt,Ge.count)):Ye!=null&&(vt=Math.max(vt,0),Kt=Math.min(Kt,Ye.count));const Tt=Kt-vt;if(Tt<0||Tt===1/0)return;P.setup(K,ee,He,J,Ge);let kn,dt=Be;if(Ge!==null&&(kn=B.get(Ge),dt=Te,dt.setIndex(kn)),K.isMesh)ee.wireframe===!0?(z.setLineWidth(ee.wireframeLinewidth*R()),dt.setMode(b.LINES)):dt.setMode(b.TRIANGLES);else if(K.isLine){let Je=ee.linewidth;Je===void 0&&(Je=1),z.setLineWidth(Je*R()),K.isLineSegments?dt.setMode(b.LINES):K.isLineLoop?dt.setMode(b.LINE_LOOP):dt.setMode(b.LINE_STRIP)}else K.isPoints?dt.setMode(b.POINTS):K.isSprite&&dt.setMode(b.TRIANGLES);if(K.isBatchedMesh)dt.renderMultiDraw(K._multiDrawStarts,K._multiDrawCounts,K._multiDrawCount);else if(K.isInstancedMesh)dt.renderInstances(vt,Tt,K.count);else if(J.isInstancedBufferGeometry){const Je=J._maxInstanceCount!==void 0?J._maxInstanceCount:1/0,Uo=Math.min(J.instanceCount,Je);dt.renderInstances(vt,Tt,Uo)}else dt.render(vt,Tt)};function et(w,H,J){w.transparent===!0&&w.side===In&&w.forceSinglePass===!1?(w.side=$t,w.needsUpdate=!0,_s(w,H,J),w.side=bi,w.needsUpdate=!0,_s(w,H,J),w.side=In):_s(w,H,J)}this.compile=function(w,H,J=null){J===null&&(J=w),p=be.get(J),p.init(),S.push(p),J.traverseVisible(function(K){K.isLight&&K.layers.test(H.layers)&&(p.pushLight(K),K.castShadow&&p.pushShadow(K))}),w!==J&&w.traverseVisible(function(K){K.isLight&&K.layers.test(H.layers)&&(p.pushLight(K),K.castShadow&&p.pushShadow(K))}),p.setupLights(M._useLegacyLights);const ee=new Set;return w.traverse(function(K){const Ae=K.material;if(Ae)if(Array.isArray(Ae))for(let De=0;De<Ae.length;De++){const He=Ae[De];et(He,J,K),ee.add(He)}else et(Ae,J,K),ee.add(Ae)}),S.pop(),p=null,ee},this.compileAsync=function(w,H,J=null){const ee=this.compile(w,H,J);return new Promise(K=>{function Ae(){if(ee.forEach(function(De){ie.get(De).currentProgram.isReady()&&ee.delete(De)}),ee.size===0){K(w);return}setTimeout(Ae,10)}Y.get("KHR_parallel_shader_compile")!==null?Ae():setTimeout(Ae,10)})};let tt=null;function pt(w){tt&&tt(w)}function _t(){Mt.stop()}function it(){Mt.start()}const Mt=new Lh;Mt.setAnimationLoop(pt),typeof self<"u"&&Mt.setContext(self),this.setAnimationLoop=function(w){tt=w,we.setAnimationLoop(w),w===null?Mt.stop():Mt.start()},we.addEventListener("sessionstart",_t),we.addEventListener("sessionend",it),this.render=function(w,H){if(H!==void 0&&H.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(E===!0)return;w.matrixWorldAutoUpdate===!0&&w.updateMatrixWorld(),H.parent===null&&H.matrixWorldAutoUpdate===!0&&H.updateMatrixWorld(),we.enabled===!0&&we.isPresenting===!0&&(we.cameraAutoUpdate===!0&&we.updateCamera(H),H=we.getCamera()),w.isScene===!0&&w.onBeforeRender(M,w,H,T),p=be.get(w,S.length),p.init(),S.push(p),Ce.multiplyMatrices(H.projectionMatrix,H.matrixWorldInverse),ne.setFromProjectionMatrix(Ce),Ee=this.localClippingEnabled,ue=Le.init(this.clippingPlanes,Ee),_=de.get(w,h.length),_.init(),h.push(_),bn(w,H,0,M.sortObjects),_.finish(),M.sortObjects===!0&&_.sort($,re),this.info.render.frame++,ue===!0&&Le.beginShadows();const J=p.state.shadowsArray;if(oe.render(J,w,H),ue===!0&&Le.endShadows(),this.info.autoReset===!0&&this.info.reset(),ke.render(_,w),p.setupLights(M._useLegacyLights),H.isArrayCamera){const ee=H.cameras;for(let K=0,Ae=ee.length;K<Ae;K++){const De=ee[K];Rl(_,w,De,De.viewport)}}else Rl(_,w,H);T!==null&&(y.updateMultisampleRenderTarget(T),y.updateRenderTargetMipmap(T)),w.isScene===!0&&w.onAfterRender(M,w,H),P.resetDefaultState(),C=-1,x=null,S.pop(),S.length>0?p=S[S.length-1]:p=null,h.pop(),h.length>0?_=h[h.length-1]:_=null};function bn(w,H,J,ee){if(w.visible===!1)return;if(w.layers.test(H.layers)){if(w.isGroup)J=w.renderOrder;else if(w.isLOD)w.autoUpdate===!0&&w.update(H);else if(w.isLight)p.pushLight(w),w.castShadow&&p.pushShadow(w);else if(w.isSprite){if(!w.frustumCulled||ne.intersectsSprite(w)){ee&&Oe.setFromMatrixPosition(w.matrixWorld).applyMatrix4(Ce);const De=Z.update(w),He=w.material;He.visible&&_.push(w,De,He,J,Oe.z,null)}}else if((w.isMesh||w.isLine||w.isPoints)&&(!w.frustumCulled||ne.intersectsObject(w))){const De=Z.update(w),He=w.material;if(ee&&(w.boundingSphere!==void 0?(w.boundingSphere===null&&w.computeBoundingSphere(),Oe.copy(w.boundingSphere.center)):(De.boundingSphere===null&&De.computeBoundingSphere(),Oe.copy(De.boundingSphere.center)),Oe.applyMatrix4(w.matrixWorld).applyMatrix4(Ce)),Array.isArray(He)){const Ge=De.groups;for(let Ke=0,We=Ge.length;Ke<We;Ke++){const Ye=Ge[Ke],vt=He[Ye.materialIndex];vt&&vt.visible&&_.push(w,De,vt,J,Oe.z,Ye)}}else He.visible&&_.push(w,De,He,J,Oe.z,null)}}const Ae=w.children;for(let De=0,He=Ae.length;De<He;De++)bn(Ae[De],H,J,ee)}function Rl(w,H,J,ee){const K=w.opaque,Ae=w.transmissive,De=w.transparent;p.setupLightsView(J),ue===!0&&Le.setGlobalState(M.clippingPlanes,J),Ae.length>0&&Vh(K,Ae,H,J),ee&&z.viewport(A.copy(ee)),K.length>0&&gs(K,H,J),Ae.length>0&&gs(Ae,H,J),De.length>0&&gs(De,H,J),z.buffers.depth.setTest(!0),z.buffers.depth.setMask(!0),z.buffers.color.setMask(!0),z.setPolygonOffset(!1)}function Vh(w,H,J,ee){if((J.isScene===!0?J.overrideMaterial:null)!==null)return;const Ae=X.isWebGL2;Re===null&&(Re=new qi(1,1,{generateMipmaps:!0,type:Y.has("EXT_color_buffer_half_float")?as:Si,minFilter:os,samples:Ae?4:0})),M.getDrawingBufferSize(Ve),Ae?Re.setSize(Ve.x,Ve.y):Re.setSize(Ka(Ve.x),Ka(Ve.y));const De=M.getRenderTarget();M.setRenderTarget(Re),M.getClearColor(se),N=M.getClearAlpha(),N<1&&M.setClearColor(16777215,.5),M.clear();const He=M.toneMapping;M.toneMapping=Mi,gs(w,J,ee),y.updateMultisampleRenderTarget(Re),y.updateRenderTargetMipmap(Re);let Ge=!1;for(let Ke=0,We=H.length;Ke<We;Ke++){const Ye=H[Ke],vt=Ye.object,Kt=Ye.geometry,Tt=Ye.material,kn=Ye.group;if(Tt.side===In&&vt.layers.test(ee.layers)){const dt=Tt.side;Tt.side=$t,Tt.needsUpdate=!0,Cl(vt,J,ee,Kt,Tt,kn),Tt.side=dt,Tt.needsUpdate=!0,Ge=!0}}Ge===!0&&(y.updateMultisampleRenderTarget(Re),y.updateRenderTargetMipmap(Re)),M.setRenderTarget(De),M.setClearColor(se,N),M.toneMapping=He}function gs(w,H,J){const ee=H.isScene===!0?H.overrideMaterial:null;for(let K=0,Ae=w.length;K<Ae;K++){const De=w[K],He=De.object,Ge=De.geometry,Ke=ee===null?De.material:ee,We=De.group;He.layers.test(J.layers)&&Cl(He,H,J,Ge,Ke,We)}}function Cl(w,H,J,ee,K,Ae){w.onBeforeRender(M,H,J,ee,K,Ae),w.modelViewMatrix.multiplyMatrices(J.matrixWorldInverse,w.matrixWorld),w.normalMatrix.getNormalMatrix(w.modelViewMatrix),K.onBeforeRender(M,H,J,ee,w,Ae),K.transparent===!0&&K.side===In&&K.forceSinglePass===!1?(K.side=$t,K.needsUpdate=!0,M.renderBufferDirect(J,H,ee,K,w,Ae),K.side=bi,K.needsUpdate=!0,M.renderBufferDirect(J,H,ee,K,w,Ae),K.side=In):M.renderBufferDirect(J,H,ee,K,w,Ae),w.onAfterRender(M,H,J,ee,K,Ae)}function _s(w,H,J){H.isScene!==!0&&(H=Ne);const ee=ie.get(w),K=p.state.lights,Ae=p.state.shadowsArray,De=K.state.version,He=me.getParameters(w,K.state,Ae,H,J),Ge=me.getProgramCacheKey(He);let Ke=ee.programs;ee.environment=w.isMeshStandardMaterial?H.environment:null,ee.fog=H.fog,ee.envMap=(w.isMeshStandardMaterial?O:v).get(w.envMap||ee.environment),Ke===void 0&&(w.addEventListener("dispose",ye),Ke=new Map,ee.programs=Ke);let We=Ke.get(Ge);if(We!==void 0){if(ee.currentProgram===We&&ee.lightsStateVersion===De)return Pl(w,He),We}else He.uniforms=me.getUniforms(w),w.onBuild(J,He,M),w.onBeforeCompile(He,M),We=me.acquireProgram(He,Ge),Ke.set(Ge,We),ee.uniforms=He.uniforms;const Ye=ee.uniforms;return(!w.isShaderMaterial&&!w.isRawShaderMaterial||w.clipping===!0)&&(Ye.clippingPlanes=Le.uniform),Pl(w,He),ee.needsLights=Wh(w),ee.lightsStateVersion=De,ee.needsLights&&(Ye.ambientLightColor.value=K.state.ambient,Ye.lightProbe.value=K.state.probe,Ye.directionalLights.value=K.state.directional,Ye.directionalLightShadows.value=K.state.directionalShadow,Ye.spotLights.value=K.state.spot,Ye.spotLightShadows.value=K.state.spotShadow,Ye.rectAreaLights.value=K.state.rectArea,Ye.ltc_1.value=K.state.rectAreaLTC1,Ye.ltc_2.value=K.state.rectAreaLTC2,Ye.pointLights.value=K.state.point,Ye.pointLightShadows.value=K.state.pointShadow,Ye.hemisphereLights.value=K.state.hemi,Ye.directionalShadowMap.value=K.state.directionalShadowMap,Ye.directionalShadowMatrix.value=K.state.directionalShadowMatrix,Ye.spotShadowMap.value=K.state.spotShadowMap,Ye.spotLightMatrix.value=K.state.spotLightMatrix,Ye.spotLightMap.value=K.state.spotLightMap,Ye.pointShadowMap.value=K.state.pointShadowMap,Ye.pointShadowMatrix.value=K.state.pointShadowMatrix),ee.currentProgram=We,ee.uniformsList=null,We}function Ll(w){if(w.uniformsList===null){const H=w.currentProgram.getUniforms();w.uniformsList=eo.seqWithValue(H.seq,w.uniforms)}return w.uniformsList}function Pl(w,H){const J=ie.get(w);J.outputColorSpace=H.outputColorSpace,J.batching=H.batching,J.instancing=H.instancing,J.instancingColor=H.instancingColor,J.skinning=H.skinning,J.morphTargets=H.morphTargets,J.morphNormals=H.morphNormals,J.morphColors=H.morphColors,J.morphTargetsCount=H.morphTargetsCount,J.numClippingPlanes=H.numClippingPlanes,J.numIntersection=H.numClipIntersection,J.vertexAlphas=H.vertexAlphas,J.vertexTangents=H.vertexTangents,J.toneMapping=H.toneMapping}function Gh(w,H,J,ee,K){H.isScene!==!0&&(H=Ne),y.resetTextureUnits();const Ae=H.fog,De=ee.isMeshStandardMaterial?H.environment:null,He=T===null?M.outputColorSpace:T.isXRRenderTarget===!0?T.texture.colorSpace:ri,Ge=(ee.isMeshStandardMaterial?O:v).get(ee.envMap||De),Ke=ee.vertexColors===!0&&!!J.attributes.color&&J.attributes.color.itemSize===4,We=!!J.attributes.tangent&&(!!ee.normalMap||ee.anisotropy>0),Ye=!!J.morphAttributes.position,vt=!!J.morphAttributes.normal,Kt=!!J.morphAttributes.color;let Tt=Mi;ee.toneMapped&&(T===null||T.isXRRenderTarget===!0)&&(Tt=M.toneMapping);const kn=J.morphAttributes.position||J.morphAttributes.normal||J.morphAttributes.color,dt=kn!==void 0?kn.length:0,Je=ie.get(ee),Uo=p.state.lights;if(ue===!0&&(Ee===!0||w!==x)){const tn=w===x&&ee.id===C;Le.setState(ee,w,tn)}let mt=!1;ee.version===Je.__version?(Je.needsLights&&Je.lightsStateVersion!==Uo.state.version||Je.outputColorSpace!==He||K.isBatchedMesh&&Je.batching===!1||!K.isBatchedMesh&&Je.batching===!0||K.isInstancedMesh&&Je.instancing===!1||!K.isInstancedMesh&&Je.instancing===!0||K.isSkinnedMesh&&Je.skinning===!1||!K.isSkinnedMesh&&Je.skinning===!0||K.isInstancedMesh&&Je.instancingColor===!0&&K.instanceColor===null||K.isInstancedMesh&&Je.instancingColor===!1&&K.instanceColor!==null||Je.envMap!==Ge||ee.fog===!0&&Je.fog!==Ae||Je.numClippingPlanes!==void 0&&(Je.numClippingPlanes!==Le.numPlanes||Je.numIntersection!==Le.numIntersection)||Je.vertexAlphas!==Ke||Je.vertexTangents!==We||Je.morphTargets!==Ye||Je.morphNormals!==vt||Je.morphColors!==Kt||Je.toneMapping!==Tt||X.isWebGL2===!0&&Je.morphTargetsCount!==dt)&&(mt=!0):(mt=!0,Je.__version=ee.version);let wi=Je.currentProgram;mt===!0&&(wi=_s(ee,H,K));let Dl=!1,Dr=!1,Io=!1;const Dt=wi.getUniforms(),Ri=Je.uniforms;if(z.useProgram(wi.program)&&(Dl=!0,Dr=!0,Io=!0),ee.id!==C&&(C=ee.id,Dr=!0),Dl||x!==w){Dt.setValue(b,"projectionMatrix",w.projectionMatrix),Dt.setValue(b,"viewMatrix",w.matrixWorldInverse);const tn=Dt.map.cameraPosition;tn!==void 0&&tn.setValue(b,Oe.setFromMatrixPosition(w.matrixWorld)),X.logarithmicDepthBuffer&&Dt.setValue(b,"logDepthBufFC",2/(Math.log(w.far+1)/Math.LN2)),(ee.isMeshPhongMaterial||ee.isMeshToonMaterial||ee.isMeshLambertMaterial||ee.isMeshBasicMaterial||ee.isMeshStandardMaterial||ee.isShaderMaterial)&&Dt.setValue(b,"isOrthographic",w.isOrthographicCamera===!0),x!==w&&(x=w,Dr=!0,Io=!0)}if(K.isSkinnedMesh){Dt.setOptional(b,K,"bindMatrix"),Dt.setOptional(b,K,"bindMatrixInverse");const tn=K.skeleton;tn&&(X.floatVertexTextures?(tn.boneTexture===null&&tn.computeBoneTexture(),Dt.setValue(b,"boneTexture",tn.boneTexture,y)):console.warn("THREE.WebGLRenderer: SkinnedMesh can only be used with WebGL 2. With WebGL 1 OES_texture_float and vertex textures support is required."))}K.isBatchedMesh&&(Dt.setOptional(b,K,"batchingTexture"),Dt.setValue(b,"batchingTexture",K._matricesTexture,y));const No=J.morphAttributes;if((No.position!==void 0||No.normal!==void 0||No.color!==void 0&&X.isWebGL2===!0)&&Fe.update(K,J,wi),(Dr||Je.receiveShadow!==K.receiveShadow)&&(Je.receiveShadow=K.receiveShadow,Dt.setValue(b,"receiveShadow",K.receiveShadow)),ee.isMeshGouraudMaterial&&ee.envMap!==null&&(Ri.envMap.value=Ge,Ri.flipEnvMap.value=Ge.isCubeTexture&&Ge.isRenderTargetTexture===!1?-1:1),Dr&&(Dt.setValue(b,"toneMappingExposure",M.toneMappingExposure),Je.needsLights&&kh(Ri,Io),Ae&&ee.fog===!0&&ce.refreshFogUniforms(Ri,Ae),ce.refreshMaterialUniforms(Ri,ee,Q,G,Re),eo.upload(b,Ll(Je),Ri,y)),ee.isShaderMaterial&&ee.uniformsNeedUpdate===!0&&(eo.upload(b,Ll(Je),Ri,y),ee.uniformsNeedUpdate=!1),ee.isSpriteMaterial&&Dt.setValue(b,"center",K.center),Dt.setValue(b,"modelViewMatrix",K.modelViewMatrix),Dt.setValue(b,"normalMatrix",K.normalMatrix),Dt.setValue(b,"modelMatrix",K.matrixWorld),ee.isShaderMaterial||ee.isRawShaderMaterial){const tn=ee.uniformsGroups;for(let Oo=0,Xh=tn.length;Oo<Xh;Oo++)if(X.isWebGL2){const Ul=tn[Oo];ge.update(Ul,wi),ge.bind(Ul,wi)}else console.warn("THREE.WebGLRenderer: Uniform Buffer Objects can only be used with WebGL 2.")}return wi}function kh(w,H){w.ambientLightColor.needsUpdate=H,w.lightProbe.needsUpdate=H,w.directionalLights.needsUpdate=H,w.directionalLightShadows.needsUpdate=H,w.pointLights.needsUpdate=H,w.pointLightShadows.needsUpdate=H,w.spotLights.needsUpdate=H,w.spotLightShadows.needsUpdate=H,w.rectAreaLights.needsUpdate=H,w.hemisphereLights.needsUpdate=H}function Wh(w){return w.isMeshLambertMaterial||w.isMeshToonMaterial||w.isMeshPhongMaterial||w.isMeshStandardMaterial||w.isShadowMaterial||w.isShaderMaterial&&w.lights===!0}this.getActiveCubeFace=function(){return D},this.getActiveMipmapLevel=function(){return L},this.getRenderTarget=function(){return T},this.setRenderTargetTextures=function(w,H,J){ie.get(w.texture).__webglTexture=H,ie.get(w.depthTexture).__webglTexture=J;const ee=ie.get(w);ee.__hasExternalTextures=!0,ee.__hasExternalTextures&&(ee.__autoAllocateDepthBuffer=J===void 0,ee.__autoAllocateDepthBuffer||Y.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),ee.__useRenderToTexture=!1))},this.setRenderTargetFramebuffer=function(w,H){const J=ie.get(w);J.__webglFramebuffer=H,J.__useDefaultFramebuffer=H===void 0},this.setRenderTarget=function(w,H=0,J=0){T=w,D=H,L=J;let ee=!0,K=null,Ae=!1,De=!1;if(w){const Ge=ie.get(w);Ge.__useDefaultFramebuffer!==void 0?(z.bindFramebuffer(b.FRAMEBUFFER,null),ee=!1):Ge.__webglFramebuffer===void 0?y.setupRenderTarget(w):Ge.__hasExternalTextures&&y.rebindTextures(w,ie.get(w.texture).__webglTexture,ie.get(w.depthTexture).__webglTexture);const Ke=w.texture;(Ke.isData3DTexture||Ke.isDataArrayTexture||Ke.isCompressedArrayTexture)&&(De=!0);const We=ie.get(w).__webglFramebuffer;w.isWebGLCubeRenderTarget?(Array.isArray(We[H])?K=We[H][J]:K=We[H],Ae=!0):X.isWebGL2&&w.samples>0&&y.useMultisampledRTT(w)===!1?K=ie.get(w).__webglMultisampledFramebuffer:Array.isArray(We)?K=We[J]:K=We,A.copy(w.viewport),k.copy(w.scissor),te=w.scissorTest}else A.copy(ae).multiplyScalar(Q).floor(),k.copy(pe).multiplyScalar(Q).floor(),te=he;if(z.bindFramebuffer(b.FRAMEBUFFER,K)&&X.drawBuffers&&ee&&z.drawBuffers(w,K),z.viewport(A),z.scissor(k),z.setScissorTest(te),Ae){const Ge=ie.get(w.texture);b.framebufferTexture2D(b.FRAMEBUFFER,b.COLOR_ATTACHMENT0,b.TEXTURE_CUBE_MAP_POSITIVE_X+H,Ge.__webglTexture,J)}else if(De){const Ge=ie.get(w.texture),Ke=H||0;b.framebufferTextureLayer(b.FRAMEBUFFER,b.COLOR_ATTACHMENT0,Ge.__webglTexture,J||0,Ke)}C=-1},this.readRenderTargetPixels=function(w,H,J,ee,K,Ae,De){if(!(w&&w.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let He=ie.get(w).__webglFramebuffer;if(w.isWebGLCubeRenderTarget&&De!==void 0&&(He=He[De]),He){z.bindFramebuffer(b.FRAMEBUFFER,He);try{const Ge=w.texture,Ke=Ge.format,We=Ge.type;if(Ke!==vn&&xe.convert(Ke)!==b.getParameter(b.IMPLEMENTATION_COLOR_READ_FORMAT)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}const Ye=We===as&&(Y.has("EXT_color_buffer_half_float")||X.isWebGL2&&Y.has("EXT_color_buffer_float"));if(We!==Si&&xe.convert(We)!==b.getParameter(b.IMPLEMENTATION_COLOR_READ_TYPE)&&!(We===mi&&(X.isWebGL2||Y.has("OES_texture_float")||Y.has("WEBGL_color_buffer_float")))&&!Ye){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}H>=0&&H<=w.width-ee&&J>=0&&J<=w.height-K&&b.readPixels(H,J,ee,K,xe.convert(Ke),xe.convert(We),Ae)}finally{const Ge=T!==null?ie.get(T).__webglFramebuffer:null;z.bindFramebuffer(b.FRAMEBUFFER,Ge)}}},this.copyFramebufferToTexture=function(w,H,J=0){const ee=Math.pow(2,-J),K=Math.floor(H.image.width*ee),Ae=Math.floor(H.image.height*ee);y.setTexture2D(H,0),b.copyTexSubImage2D(b.TEXTURE_2D,J,0,0,w.x,w.y,K,Ae),z.unbindTexture()},this.copyTextureToTexture=function(w,H,J,ee=0){const K=H.image.width,Ae=H.image.height,De=xe.convert(J.format),He=xe.convert(J.type);y.setTexture2D(J,0),b.pixelStorei(b.UNPACK_FLIP_Y_WEBGL,J.flipY),b.pixelStorei(b.UNPACK_PREMULTIPLY_ALPHA_WEBGL,J.premultiplyAlpha),b.pixelStorei(b.UNPACK_ALIGNMENT,J.unpackAlignment),H.isDataTexture?b.texSubImage2D(b.TEXTURE_2D,ee,w.x,w.y,K,Ae,De,He,H.image.data):H.isCompressedTexture?b.compressedTexSubImage2D(b.TEXTURE_2D,ee,w.x,w.y,H.mipmaps[0].width,H.mipmaps[0].height,De,H.mipmaps[0].data):b.texSubImage2D(b.TEXTURE_2D,ee,w.x,w.y,De,He,H.image),ee===0&&J.generateMipmaps&&b.generateMipmap(b.TEXTURE_2D),z.unbindTexture()},this.copyTextureToTexture3D=function(w,H,J,ee,K=0){if(M.isWebGL1Renderer){console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: can only be used with WebGL2.");return}const Ae=w.max.x-w.min.x+1,De=w.max.y-w.min.y+1,He=w.max.z-w.min.z+1,Ge=xe.convert(ee.format),Ke=xe.convert(ee.type);let We;if(ee.isData3DTexture)y.setTexture3D(ee,0),We=b.TEXTURE_3D;else if(ee.isDataArrayTexture||ee.isCompressedArrayTexture)y.setTexture2DArray(ee,0),We=b.TEXTURE_2D_ARRAY;else{console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: only supports THREE.DataTexture3D and THREE.DataTexture2DArray.");return}b.pixelStorei(b.UNPACK_FLIP_Y_WEBGL,ee.flipY),b.pixelStorei(b.UNPACK_PREMULTIPLY_ALPHA_WEBGL,ee.premultiplyAlpha),b.pixelStorei(b.UNPACK_ALIGNMENT,ee.unpackAlignment);const Ye=b.getParameter(b.UNPACK_ROW_LENGTH),vt=b.getParameter(b.UNPACK_IMAGE_HEIGHT),Kt=b.getParameter(b.UNPACK_SKIP_PIXELS),Tt=b.getParameter(b.UNPACK_SKIP_ROWS),kn=b.getParameter(b.UNPACK_SKIP_IMAGES),dt=J.isCompressedTexture?J.mipmaps[K]:J.image;b.pixelStorei(b.UNPACK_ROW_LENGTH,dt.width),b.pixelStorei(b.UNPACK_IMAGE_HEIGHT,dt.height),b.pixelStorei(b.UNPACK_SKIP_PIXELS,w.min.x),b.pixelStorei(b.UNPACK_SKIP_ROWS,w.min.y),b.pixelStorei(b.UNPACK_SKIP_IMAGES,w.min.z),J.isDataTexture||J.isData3DTexture?b.texSubImage3D(We,K,H.x,H.y,H.z,Ae,De,He,Ge,Ke,dt.data):J.isCompressedArrayTexture?(console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: untested support for compressed srcTexture."),b.compressedTexSubImage3D(We,K,H.x,H.y,H.z,Ae,De,He,Ge,dt.data)):b.texSubImage3D(We,K,H.x,H.y,H.z,Ae,De,He,Ge,Ke,dt),b.pixelStorei(b.UNPACK_ROW_LENGTH,Ye),b.pixelStorei(b.UNPACK_IMAGE_HEIGHT,vt),b.pixelStorei(b.UNPACK_SKIP_PIXELS,Kt),b.pixelStorei(b.UNPACK_SKIP_ROWS,Tt),b.pixelStorei(b.UNPACK_SKIP_IMAGES,kn),K===0&&ee.generateMipmaps&&b.generateMipmap(We),z.unbindTexture()},this.initTexture=function(w){w.isCubeTexture?y.setTextureCube(w,0):w.isData3DTexture?y.setTexture3D(w,0):w.isDataArrayTexture||w.isCompressedArrayTexture?y.setTexture2DArray(w,0):y.setTexture2D(w,0),z.unbindTexture()},this.resetState=function(){D=0,L=0,T=null,z.reset(),P.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return ti}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=e===Sl?"display-p3":"srgb",t.unpackColorSpace=ot.workingColorSpace===Co?"display-p3":"srgb"}get outputEncoding(){return console.warn("THREE.WebGLRenderer: Property .outputEncoding has been removed. Use .outputColorSpace instead."),this.outputColorSpace===Lt?Xi:gh}set outputEncoding(e){console.warn("THREE.WebGLRenderer: Property .outputEncoding has been removed. Use .outputColorSpace instead."),this.outputColorSpace=e===Xi?Lt:ri}get useLegacyLights(){return console.warn("THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733."),this._useLegacyLights}set useLegacyLights(e){console.warn("THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733."),this._useLegacyLights=e}}class EM extends Bh{}EM.prototype.isWebGL1Renderer=!0;class bM extends Pt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t}}class zh extends Cr{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new nt(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const Iu=new V,Nu=new V,Ou=new yt,Aa=new yl,Ys=new Lo;class TM extends Pt{constructor(e=new Gn,t=new zh){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,i=[0];for(let r=1,s=t.count;r<s;r++)Iu.fromBufferAttribute(t,r-1),Nu.fromBufferAttribute(t,r),i[r]=i[r-1],i[r]+=Iu.distanceTo(Nu);e.setAttribute("lineDistance",new Sn(i,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const i=this.geometry,r=this.matrixWorld,s=e.params.Line.threshold,a=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),Ys.copy(i.boundingSphere),Ys.applyMatrix4(r),Ys.radius+=s,e.ray.intersectsSphere(Ys)===!1)return;Ou.copy(r).invert(),Aa.copy(e.ray).applyMatrix4(Ou);const o=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=new V,u=new V,f=new V,d=new V,m=this.isLineSegments?2:1,g=i.index,p=i.attributes.position;if(g!==null){const h=Math.max(0,a.start),S=Math.min(g.count,a.start+a.count);for(let M=h,E=S-1;M<E;M+=m){const D=g.getX(M),L=g.getX(M+1);if(c.fromBufferAttribute(p,D),u.fromBufferAttribute(p,L),Aa.distanceSqToSegment(c,u,d,f)>l)continue;d.applyMatrix4(this.matrixWorld);const C=e.ray.origin.distanceTo(d);C<e.near||C>e.far||t.push({distance:C,point:f.clone().applyMatrix4(this.matrixWorld),index:M,face:null,faceIndex:null,object:this})}}else{const h=Math.max(0,a.start),S=Math.min(p.count,a.start+a.count);for(let M=h,E=S-1;M<E;M+=m){if(c.fromBufferAttribute(p,M),u.fromBufferAttribute(p,M+1),Aa.distanceSqToSegment(c,u,d,f)>l)continue;d.applyMatrix4(this.matrixWorld);const L=e.ray.origin.distanceTo(d);L<e.near||L>e.far||t.push({distance:L,point:f.clone().applyMatrix4(this.matrixWorld),index:M,face:null,faceIndex:null,object:this})}}}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const r=t[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){const o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}}const Fu=new V,Bu=new V;class AM extends TM{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,i=[];for(let r=0,s=t.count;r<s;r+=2)Fu.fromBufferAttribute(t,r),Bu.fromBufferAttribute(t,r+1),i[r]=r===0?0:i[r-1],i[r+1]=i[r]+Fu.distanceTo(Bu);e.setAttribute("lineDistance",new Sn(i,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class wM extends Cr{constructor(e){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.type="MeshStandardMaterial",this.color=new nt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new nt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=_h,this.normalScale=new Xe(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Hh extends Pt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new nt(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),t}}const wa=new yt,zu=new V,Hu=new V;class RM{constructor(e){this.camera=e,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Xe(512,512),this.map=null,this.mapPass=null,this.matrix=new yt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new bl,this._frameExtents=new Xe(1,1),this._viewportCount=1,this._viewports=[new wt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,i=this.matrix;zu.setFromMatrixPosition(e.matrixWorld),t.position.copy(zu),Hu.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Hu),t.updateMatrixWorld(),wa.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(wa),i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply(wa)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.bias=e.bias,this.radius=e.radius,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}class CM extends RM{constructor(){super(new Ph(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Vu extends Hh{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Pt.DEFAULT_UP),this.updateMatrix(),this.target=new Pt,this.shadow=new CM}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}class LM extends Hh{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}class Gu{constructor(e=1,t=0,i=0){return this.radius=e,this.phi=t,this.theta=i,this}set(e,t,i){return this.radius=e,this.phi=t,this.theta=i,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=Math.max(1e-6,Math.min(Math.PI-1e-6,this.phi)),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,i){return this.radius=Math.sqrt(e*e+t*t+i*i),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,i),this.phi=Math.acos(Wt(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}class PM extends AM{constructor(e=10,t=10,i=4473924,r=8947848){i=new nt(i),r=new nt(r);const s=t/2,a=e/t,o=e/2,l=[],c=[];for(let d=0,m=0,g=-o;d<=t;d++,g+=a){l.push(-o,0,g,o,0,g),l.push(g,0,-o,g,0,o);const _=d===s?i:r;_.toArray(c,m),m+=3,_.toArray(c,m),m+=3,_.toArray(c,m),m+=3,_.toArray(c,m),m+=3}const u=new Gn;u.setAttribute("position",new Sn(l,3)),u.setAttribute("color",new Sn(c,3));const f=new zh({vertexColors:!0,toneMapped:!1});super(u,f),this.type="GridHelper"}dispose(){this.geometry.dispose(),this.material.dispose()}}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:xl}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=xl);const ku={type:"change"},Ra={type:"start"},Wu={type:"end"},js=new yl,Xu=new hi,DM=Math.cos(70*_g.DEG2RAD);class UM extends Ki{constructor(e,t){super(),this.object=e,this.domElement=t,this.domElement.style.touchAction="none",this.enabled=!0,this.target=new V,this.cursor=new V,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Ji.ROTATE,MIDDLE:Ji.DOLLY,RIGHT:Ji.PAN},this.touches={ONE:Qi.ROTATE,TWO:Qi.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this.getPolarAngle=function(){return o.phi},this.getAzimuthalAngle=function(){return o.theta},this.getDistance=function(){return this.object.position.distanceTo(this.target)},this.listenToKeyEvents=function(P){P.addEventListener("keydown",be),this._domElementKeyEvents=P},this.stopListenToKeyEvents=function(){this._domElementKeyEvents.removeEventListener("keydown",be),this._domElementKeyEvents=null},this.saveState=function(){i.target0.copy(i.target),i.position0.copy(i.object.position),i.zoom0=i.object.zoom},this.reset=function(){i.target.copy(i.target0),i.object.position.copy(i.position0),i.object.zoom=i.zoom0,i.object.updateProjectionMatrix(),i.dispatchEvent(ku),i.update(),s=r.NONE},this.update=function(){const P=new V,ge=new Yi().setFromUnitVectors(e.up,new V(0,1,0)),Pe=ge.clone().invert(),we=new V,fe=new Yi,I=new V,ve=2*Math.PI;return function(ze=null){const Ue=i.object.position;P.copy(Ue).sub(i.target),P.applyQuaternion(ge),o.setFromVector3(P),i.autoRotate&&s===r.NONE&&te(A(ze)),i.enableDamping?(o.theta+=l.theta*i.dampingFactor,o.phi+=l.phi*i.dampingFactor):(o.theta+=l.theta,o.phi+=l.phi);let et=i.minAzimuthAngle,tt=i.maxAzimuthAngle;isFinite(et)&&isFinite(tt)&&(et<-Math.PI?et+=ve:et>Math.PI&&(et-=ve),tt<-Math.PI?tt+=ve:tt>Math.PI&&(tt-=ve),et<=tt?o.theta=Math.max(et,Math.min(tt,o.theta)):o.theta=o.theta>(et+tt)/2?Math.max(et,o.theta):Math.min(tt,o.theta)),o.phi=Math.max(i.minPolarAngle,Math.min(i.maxPolarAngle,o.phi)),o.makeSafe(),i.enableDamping===!0?i.target.addScaledVector(u,i.dampingFactor):i.target.add(u),i.target.sub(i.cursor),i.target.clampLength(i.minTargetRadius,i.maxTargetRadius),i.target.add(i.cursor),i.zoomToCursor&&L||i.object.isOrthographicCamera?o.radius=ae(o.radius):o.radius=ae(o.radius*c),P.setFromSpherical(o),P.applyQuaternion(Pe),Ue.copy(i.target).add(P),i.object.lookAt(i.target),i.enableDamping===!0?(l.theta*=1-i.dampingFactor,l.phi*=1-i.dampingFactor,u.multiplyScalar(1-i.dampingFactor)):(l.set(0,0,0),u.set(0,0,0));let pt=!1;if(i.zoomToCursor&&L){let _t=null;if(i.object.isPerspectiveCamera){const it=P.length();_t=ae(it*c);const Mt=it-_t;i.object.position.addScaledVector(E,Mt),i.object.updateMatrixWorld()}else if(i.object.isOrthographicCamera){const it=new V(D.x,D.y,0);it.unproject(i.object),i.object.zoom=Math.max(i.minZoom,Math.min(i.maxZoom,i.object.zoom/c)),i.object.updateProjectionMatrix(),pt=!0;const Mt=new V(D.x,D.y,0);Mt.unproject(i.object),i.object.position.sub(Mt).add(it),i.object.updateMatrixWorld(),_t=P.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),i.zoomToCursor=!1;_t!==null&&(this.screenSpacePanning?i.target.set(0,0,-1).transformDirection(i.object.matrix).multiplyScalar(_t).add(i.object.position):(js.origin.copy(i.object.position),js.direction.set(0,0,-1).transformDirection(i.object.matrix),Math.abs(i.object.up.dot(js.direction))<DM?e.lookAt(i.target):(Xu.setFromNormalAndCoplanarPoint(i.object.up,i.target),js.intersectPlane(Xu,i.target))))}else i.object.isOrthographicCamera&&(i.object.zoom=Math.max(i.minZoom,Math.min(i.maxZoom,i.object.zoom/c)),i.object.updateProjectionMatrix(),pt=!0);return c=1,L=!1,pt||we.distanceToSquared(i.object.position)>a||8*(1-fe.dot(i.object.quaternion))>a||I.distanceToSquared(i.target)>0?(i.dispatchEvent(ku),we.copy(i.object.position),fe.copy(i.object.quaternion),I.copy(i.target),!0):!1}}(),this.dispose=function(){i.domElement.removeEventListener("contextmenu",ke),i.domElement.removeEventListener("pointerdown",y),i.domElement.removeEventListener("pointercancel",O),i.domElement.removeEventListener("wheel",Z),i.domElement.removeEventListener("pointermove",v),i.domElement.removeEventListener("pointerup",O),i._domElementKeyEvents!==null&&(i._domElementKeyEvents.removeEventListener("keydown",be),i._domElementKeyEvents=null)};const i=this,r={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6};let s=r.NONE;const a=1e-6,o=new Gu,l=new Gu;let c=1;const u=new V,f=new Xe,d=new Xe,m=new Xe,g=new Xe,_=new Xe,p=new Xe,h=new Xe,S=new Xe,M=new Xe,E=new V,D=new Xe;let L=!1;const T=[],C={};let x=!1;function A(P){return P!==null?2*Math.PI/60*i.autoRotateSpeed*P:2*Math.PI/60/60*i.autoRotateSpeed}function k(P){const ge=Math.abs(P*.01);return Math.pow(.95,i.zoomSpeed*ge)}function te(P){l.theta-=P}function se(P){l.phi-=P}const N=function(){const P=new V;return function(Pe,we){P.setFromMatrixColumn(we,0),P.multiplyScalar(-Pe),u.add(P)}}(),W=function(){const P=new V;return function(Pe,we){i.screenSpacePanning===!0?P.setFromMatrixColumn(we,1):(P.setFromMatrixColumn(we,0),P.crossVectors(i.object.up,P)),P.multiplyScalar(Pe),u.add(P)}}(),G=function(){const P=new V;return function(Pe,we){const fe=i.domElement;if(i.object.isPerspectiveCamera){const I=i.object.position;P.copy(I).sub(i.target);let ve=P.length();ve*=Math.tan(i.object.fov/2*Math.PI/180),N(2*Pe*ve/fe.clientHeight,i.object.matrix),W(2*we*ve/fe.clientHeight,i.object.matrix)}else i.object.isOrthographicCamera?(N(Pe*(i.object.right-i.object.left)/i.object.zoom/fe.clientWidth,i.object.matrix),W(we*(i.object.top-i.object.bottom)/i.object.zoom/fe.clientHeight,i.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),i.enablePan=!1)}}();function Q(P){i.object.isPerspectiveCamera||i.object.isOrthographicCamera?c/=P:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),i.enableZoom=!1)}function $(P){i.object.isPerspectiveCamera||i.object.isOrthographicCamera?c*=P:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),i.enableZoom=!1)}function re(P,ge){if(!i.zoomToCursor)return;L=!0;const Pe=i.domElement.getBoundingClientRect(),we=P-Pe.left,fe=ge-Pe.top,I=Pe.width,ve=Pe.height;D.x=we/I*2-1,D.y=-(fe/ve)*2+1,E.set(D.x,D.y,1).unproject(i.object).sub(i.object.position).normalize()}function ae(P){return Math.max(i.minDistance,Math.min(i.maxDistance,P))}function pe(P){f.set(P.clientX,P.clientY)}function he(P){re(P.clientX,P.clientX),h.set(P.clientX,P.clientY)}function ne(P){g.set(P.clientX,P.clientY)}function ue(P){d.set(P.clientX,P.clientY),m.subVectors(d,f).multiplyScalar(i.rotateSpeed);const ge=i.domElement;te(2*Math.PI*m.x/ge.clientHeight),se(2*Math.PI*m.y/ge.clientHeight),f.copy(d),i.update()}function Ee(P){S.set(P.clientX,P.clientY),M.subVectors(S,h),M.y>0?Q(k(M.y)):M.y<0&&$(k(M.y)),h.copy(S),i.update()}function Re(P){_.set(P.clientX,P.clientY),p.subVectors(_,g).multiplyScalar(i.panSpeed),G(p.x,p.y),g.copy(_),i.update()}function Ce(P){re(P.clientX,P.clientY),P.deltaY<0?$(k(P.deltaY)):P.deltaY>0&&Q(k(P.deltaY)),i.update()}function Ve(P){let ge=!1;switch(P.code){case i.keys.UP:P.ctrlKey||P.metaKey||P.shiftKey?se(2*Math.PI*i.rotateSpeed/i.domElement.clientHeight):G(0,i.keyPanSpeed),ge=!0;break;case i.keys.BOTTOM:P.ctrlKey||P.metaKey||P.shiftKey?se(-2*Math.PI*i.rotateSpeed/i.domElement.clientHeight):G(0,-i.keyPanSpeed),ge=!0;break;case i.keys.LEFT:P.ctrlKey||P.metaKey||P.shiftKey?te(2*Math.PI*i.rotateSpeed/i.domElement.clientHeight):G(i.keyPanSpeed,0),ge=!0;break;case i.keys.RIGHT:P.ctrlKey||P.metaKey||P.shiftKey?te(-2*Math.PI*i.rotateSpeed/i.domElement.clientHeight):G(-i.keyPanSpeed,0),ge=!0;break}ge&&(P.preventDefault(),i.update())}function Oe(P){if(T.length===1)f.set(P.pageX,P.pageY);else{const ge=xe(P),Pe=.5*(P.pageX+ge.x),we=.5*(P.pageY+ge.y);f.set(Pe,we)}}function Ne(P){if(T.length===1)g.set(P.pageX,P.pageY);else{const ge=xe(P),Pe=.5*(P.pageX+ge.x),we=.5*(P.pageY+ge.y);g.set(Pe,we)}}function R(P){const ge=xe(P),Pe=P.pageX-ge.x,we=P.pageY-ge.y,fe=Math.sqrt(Pe*Pe+we*we);h.set(0,fe)}function b(P){i.enableZoom&&R(P),i.enablePan&&Ne(P)}function j(P){i.enableZoom&&R(P),i.enableRotate&&Oe(P)}function Y(P){if(T.length==1)d.set(P.pageX,P.pageY);else{const Pe=xe(P),we=.5*(P.pageX+Pe.x),fe=.5*(P.pageY+Pe.y);d.set(we,fe)}m.subVectors(d,f).multiplyScalar(i.rotateSpeed);const ge=i.domElement;te(2*Math.PI*m.x/ge.clientHeight),se(2*Math.PI*m.y/ge.clientHeight),f.copy(d)}function X(P){if(T.length===1)_.set(P.pageX,P.pageY);else{const ge=xe(P),Pe=.5*(P.pageX+ge.x),we=.5*(P.pageY+ge.y);_.set(Pe,we)}p.subVectors(_,g).multiplyScalar(i.panSpeed),G(p.x,p.y),g.copy(_)}function z(P){const ge=xe(P),Pe=P.pageX-ge.x,we=P.pageY-ge.y,fe=Math.sqrt(Pe*Pe+we*we);S.set(0,fe),M.set(0,Math.pow(S.y/h.y,i.zoomSpeed)),Q(M.y),h.copy(S);const I=(P.pageX+ge.x)*.5,ve=(P.pageY+ge.y)*.5;re(I,ve)}function le(P){i.enableZoom&&z(P),i.enablePan&&X(P)}function ie(P){i.enableZoom&&z(P),i.enableRotate&&Y(P)}function y(P){i.enabled!==!1&&(T.length===0&&(i.domElement.setPointerCapture(P.pointerId),i.domElement.addEventListener("pointermove",v),i.domElement.addEventListener("pointerup",O)),Fe(P),P.pointerType==="touch"?Le(P):B(P))}function v(P){i.enabled!==!1&&(P.pointerType==="touch"?oe(P):q(P))}function O(P){Be(P),T.length===0&&(i.domElement.releasePointerCapture(P.pointerId),i.domElement.removeEventListener("pointermove",v),i.domElement.removeEventListener("pointerup",O)),i.dispatchEvent(Wu),s=r.NONE}function B(P){let ge;switch(P.button){case 0:ge=i.mouseButtons.LEFT;break;case 1:ge=i.mouseButtons.MIDDLE;break;case 2:ge=i.mouseButtons.RIGHT;break;default:ge=-1}switch(ge){case Ji.DOLLY:if(i.enableZoom===!1)return;he(P),s=r.DOLLY;break;case Ji.ROTATE:if(P.ctrlKey||P.metaKey||P.shiftKey){if(i.enablePan===!1)return;ne(P),s=r.PAN}else{if(i.enableRotate===!1)return;pe(P),s=r.ROTATE}break;case Ji.PAN:if(P.ctrlKey||P.metaKey||P.shiftKey){if(i.enableRotate===!1)return;pe(P),s=r.ROTATE}else{if(i.enablePan===!1)return;ne(P),s=r.PAN}break;default:s=r.NONE}s!==r.NONE&&i.dispatchEvent(Ra)}function q(P){switch(s){case r.ROTATE:if(i.enableRotate===!1)return;ue(P);break;case r.DOLLY:if(i.enableZoom===!1)return;Ee(P);break;case r.PAN:if(i.enablePan===!1)return;Re(P);break}}function Z(P){i.enabled===!1||i.enableZoom===!1||s!==r.NONE||(P.preventDefault(),i.dispatchEvent(Ra),Ce(me(P)),i.dispatchEvent(Wu))}function me(P){const ge=P.deltaMode,Pe={clientX:P.clientX,clientY:P.clientY,deltaY:P.deltaY};switch(ge){case 1:Pe.deltaY*=16;break;case 2:Pe.deltaY*=100;break}return P.ctrlKey&&!x&&(Pe.deltaY*=10),Pe}function ce(P){P.key==="Control"&&(x=!0,document.addEventListener("keyup",de,{passive:!0,capture:!0}))}function de(P){P.key==="Control"&&(x=!1,document.removeEventListener("keyup",de,{passive:!0,capture:!0}))}function be(P){i.enabled===!1||i.enablePan===!1||Ve(P)}function Le(P){switch(Te(P),T.length){case 1:switch(i.touches.ONE){case Qi.ROTATE:if(i.enableRotate===!1)return;Oe(P),s=r.TOUCH_ROTATE;break;case Qi.PAN:if(i.enablePan===!1)return;Ne(P),s=r.TOUCH_PAN;break;default:s=r.NONE}break;case 2:switch(i.touches.TWO){case Qi.DOLLY_PAN:if(i.enableZoom===!1&&i.enablePan===!1)return;b(P),s=r.TOUCH_DOLLY_PAN;break;case Qi.DOLLY_ROTATE:if(i.enableZoom===!1&&i.enableRotate===!1)return;j(P),s=r.TOUCH_DOLLY_ROTATE;break;default:s=r.NONE}break;default:s=r.NONE}s!==r.NONE&&i.dispatchEvent(Ra)}function oe(P){switch(Te(P),s){case r.TOUCH_ROTATE:if(i.enableRotate===!1)return;Y(P),i.update();break;case r.TOUCH_PAN:if(i.enablePan===!1)return;X(P),i.update();break;case r.TOUCH_DOLLY_PAN:if(i.enableZoom===!1&&i.enablePan===!1)return;le(P),i.update();break;case r.TOUCH_DOLLY_ROTATE:if(i.enableZoom===!1&&i.enableRotate===!1)return;ie(P),i.update();break;default:s=r.NONE}}function ke(P){i.enabled!==!1&&P.preventDefault()}function Fe(P){T.push(P.pointerId)}function Be(P){delete C[P.pointerId];for(let ge=0;ge<T.length;ge++)if(T[ge]==P.pointerId){T.splice(ge,1);return}}function Te(P){let ge=C[P.pointerId];ge===void 0&&(ge=new Xe,C[P.pointerId]=ge),ge.set(P.pageX,P.pageY)}function xe(P){const ge=P.pointerId===T[0]?T[1]:T[0];return C[ge]}i.domElement.addEventListener("contextmenu",ke),i.domElement.addEventListener("pointerdown",y),i.domElement.addEventListener("pointercancel",O),i.domElement.addEventListener("wheel",Z,{passive:!1}),document.addEventListener("keydown",ce,{passive:!0,capture:!0}),this.update()}}function Al(n,e){const t=[n.nx,n.ny,n.nz],i=n.cell,r=n.data,s=t[0],a=t[2],o=(g,_,p)=>r[(_*a+p)*s+g],l=[],c=[],u=[],f=[],d=[0,0,0],m=[0,0,0];for(let g=0;g<3;g++){const _=(g+1)%3,p=(g+2)%3,h=t[_],S=t[p],M=new Int32Array(h*S);for(m[0]=m[1]=m[2]=0,m[g]=1,d[g]=-1;d[g]<t[g];){let E=0;for(d[p]=0;d[p]<S;d[p]++)for(d[_]=0;d[_]<h;d[_]++,E++){const D=d[g]>=0?o(d[0],d[1],d[2]):0,L=d[g]<t[g]-1?o(d[0]+m[0],d[1]+m[1],d[2]+m[2]):0;M[E]=D===L?0:D!==0?D:-L}d[g]++,E=0;for(let D=0;D<S;D++)for(let L=0;L<h;){const T=M[E];if(!T){L++,E++;continue}let C=1;for(;L+C<h&&M[E+C]===T;)C++;let x=1;e:for(;D+x<S;x++)for(let $=0;$<C;$++)if(M[E+$+x*h]!==T)break e;for(let $=0;$<x;$++)for(let re=0;re<C;re++)M[E+re+$*h]=0;d[_]=L,d[p]=D;const A=[0,0,0];A[_]=C;const k=[0,0,0];k[p]=x;const te=T>0?T:-T,se=e(te),N=l.length/3,W=[[d[0],d[1],d[2]],[d[0]+A[0],d[1]+A[1],d[2]+A[2]],[d[0]+A[0]+k[0],d[1]+A[1]+k[1],d[2]+A[2]+k[2]],[d[0]+k[0],d[1]+k[1],d[2]+k[2]]],G=[0,0,0];G[g]=T>0?1:-1;const Q=T>0?[0,1,2,3]:[0,3,2,1];for(const $ of Q){const re=W[$];l.push(re[0]*i,re[1]*i,re[2]*i),c.push(G[0],G[1],G[2]),u.push(se[0],se[1],se[2])}f.push(N,N+1,N+2,N,N+2,N+3),L+=C,E+=C}}}return{positions:new Float32Array(l),normals:new Float32Array(c),colors:new Float32Array(u),indices:l.length/3>65535?new Uint32Array(f):new Uint16Array(f),faceCount:f.length/3}}function wl(n,e,t){if(t<=0||n.faceCount===0)return n;const i=e*(1+t*6),r=n.positions,s=n.colors,a=n.indices,o=new Map,l=new Array(r.length/3);for(let S=0,M=0;S<r.length;S+=3,M++){const E=Math.floor(r[S]/i)+","+Math.floor(r[S+1]/i)+","+Math.floor(r[S+2]/i);l[M]=E;let D=o.get(E);D||(D={sx:0,sy:0,sz:0,cr:0,cg:0,cb:0,count:0},o.set(E,D)),D.sx+=r[S],D.sy+=r[S+1],D.sz+=r[S+2],D.cr+=s[S],D.cg+=s[S+1],D.cb+=s[S+2],D.count++}const c=new Map,u=o.size,f=new Float32Array(u*3),d=new Float32Array(u*3);{let S=0;for(const[M,E]of o)c.set(M,S),f[S*3]=E.sx/E.count,f[S*3+1]=E.sy/E.count,f[S*3+2]=E.sz/E.count,d[S*3]=E.cr/E.count,d[S*3+1]=E.cg/E.count,d[S*3+2]=E.cb/E.count,S++}const m=new Uint32Array(l.length);for(let S=0;S<l.length;S++)m[S]=c.get(l[S]);const g=[],_=new Set;for(let S=0;S<a.length;S+=3){const M=m[a[S]],E=m[a[S+1]],D=m[a[S+2]];if(M===E||E===D||M===D)continue;const L=Math.min(M,E,D),T=Math.max(M,E,D),C=M+E+D-L-T,x=L+"_"+C+"_"+T;_.has(x)||(_.add(x),g.push(M,E,D))}const p=new Float32Array(u*3);for(let S=0;S<g.length;S+=3){const M=g[S]*3,E=g[S+1]*3,D=g[S+2]*3,L=f[E]-f[M],T=f[E+1]-f[M+1],C=f[E+2]-f[M+2],x=f[D]-f[M],A=f[D+1]-f[M+1],k=f[D+2]-f[M+2],te=T*k-C*A,se=C*x-L*k,N=L*A-T*x;p[M]+=te,p[M+1]+=se,p[M+2]+=N,p[E]+=te,p[E+1]+=se,p[E+2]+=N,p[D]+=te,p[D+1]+=se,p[D+2]+=N}for(let S=0;S<p.length;S+=3){const M=Math.hypot(p[S],p[S+1],p[S+2])||1;p[S]/=M,p[S+1]/=M,p[S+2]/=M}const h=u>65535?new Uint32Array(g):new Uint16Array(g);return{positions:f,normals:p,colors:d,indices:h,faceCount:g.length/3}}const Pr=(n,e)=>{const t=n.__vccOpts||n;for(const[i,r]of e)t[i]=r;return t},IM={class:"hud"},NM={class:"accent"},OM={__name:"Viewport3D",setup(n){const e=Dn(null),t=Dn(null);let i,r,s,a,o,l,c,u=0,f=!1;function d(){const M=F.model,E=Al(M,vl),D=wl(E,M.cell,F.decimation);F.mesh.facesRaw=E.faceCount,F.mesh.faces=D.faceCount,F.mesh.voxels=M.count(),F.mesh.volume=M.volume();const L=new Gn;if(L.setAttribute("position",new jt(D.positions,3)),L.setAttribute("normal",new jt(D.normals,3)),L.setAttribute("color",new jt(D.colors,3)),L.setIndex(new jt(D.indices,1)),o)o.geometry.dispose(),o.geometry=L;else{const A=new wM({vertexColors:!0,roughness:.88,metalness:.02});o=new On(L,A),r.add(o)}const T=M.nx*M.cell;M.ny*M.cell;const C=M.nz*M.cell;c&&(r.remove(c),c.geometry.dispose());const x=Math.max(M.nx,M.nz);c=new PM(Math.max(T,C),Math.min(x,64),4477030,2896704),c.position.set(T/2,0,C/2),r.add(c),l&&(l.geometry.dispose(),l.geometry=new ls(T,C)),m(),_()}function m(){if(!l)return;const M=F.model;l.position.set(M.nx*M.cell/2,(F.currentLayer+1)*M.cell+.001,M.nz*M.cell/2)}let g=!1;function _(M){if(g)return;g=!0;const E=F.model,D=E.nx*E.cell,L=E.ny*E.cell,T=E.nz*E.cell,C=Math.max(D,L,T);s.position.set(D/2+C,L+C*.7,T/2+C),a.target.set(D/2,L/2,T/2),s.near=C/100,s.far=C*20,s.updateProjectionMatrix(),a.update()}function p(){f||(f=!0,requestAnimationFrame(()=>{f=!1,d()}))}function h(){if(!e.value)return;const M=e.value.clientWidth,E=e.value.clientHeight;!M||!E||(i.setSize(M,E,!1),s.aspect=M/E,s.updateProjectionMatrix())}let S;return dl(()=>{i=new Bh({canvas:t.value,antialias:!0}),i.setPixelRatio(Math.min(devicePixelRatio,2)),r=new bM,r.background=new nt(1448223),s=new on(50,1,.01,500),a=new UM(s,t.value),a.enableDamping=!0,r.add(new LM(16777215,.55));const M=new Vu(16773856,1.4);M.position.set(3,6,2),r.add(M);const E=new Vu(13623551,.35);E.position.set(-4,2,-3),r.add(E),l=new On(new ls(1,1),new El({color:5088255,transparent:!0,opacity:.12,side:In,depthWrite:!1})),l.rotation.x=-Math.PI/2,r.add(l),d(),h(),S=new ResizeObserver(h),S.observe(e.value);const D=()=>{u=requestAnimationFrame(D),a.update(),i.render(r,s)};D(),vi(()=>F.rev,p),vi(()=>F.decimation,p),vi(()=>F.currentLayer,m)}),pl(()=>{cancelAnimationFrame(u),S&&S.disconnect(),i&&i.dispose()}),(M,E)=>($e(),Ze("div",{ref_key:"wrap",ref:e,class:"viewport"},[U("canvas",{ref_key:"canvas",ref:t},null,512),U("div",IM,[U("span",null,"体素 "+_e(Se(F).mesh.voxels.toLocaleString()),1),U("span",null,"体积 "+_e(Se(F).mesh.volume.toFixed(3))+" m³",1),U("span",null,"合并后面 "+_e(Se(F).mesh.facesRaw.toLocaleString()),1),U("span",NM,"减面后 "+_e(Se(F).mesh.faces.toLocaleString())+" 面",1)])],512))}},FM=Pr(OM,[["__scopeId","data-v-c73d9cf9"]]),BM={class:"layer-editor"},zM={class:"layer-bar"},HM=["disabled"],VM=["max"],GM=["disabled"],kM={class:"layer-label"},WM={__name:"LayerEditor",setup(n){const e=Dn(null),t=Dn(null);let i=!1,r=null,s=null,a=null;function o(){const p=e.value;return p?Math.min(p.width/F.model.nx,p.height/F.model.nz):8}function l(p){const h=e.value,S=h.getBoundingClientRect(),M=o(),E=h.width/S.width,D=h.height/S.height,L=Math.floor((p.clientX-S.left)*E/M),T=Math.floor((p.clientY-S.top)*D/M);return{x:Math.max(0,Math.min(F.model.nx-1,L)),z:Math.max(0,Math.min(F.model.nz-1,T))}}function c(p,h){const S=F.tool==="erase"?0:F.material;F.model.setMirrored(p,F.currentLayer,h,S,F.mirrorX,F.mirrorZ)}function u(p){const{x:h,z:S}=l(p);F.tool==="select"?(r={x:h,z:S},s={x0:h,z0:S,x1:h,z1:S},F.selection=null):F.tool==="paste"?F.clipboard&&(F.model.pasteRegion(F.currentLayer,F.clipboard,h,S,F.mirrorX,F.mirrorZ),Cn()):(i=!0,c(h,S),Cn()),g()}function f(p){const{x:h,z:S}=l(p);F.tool==="select"&&r?(s={x0:Math.min(r.x,h),z0:Math.min(r.z,S),x1:Math.max(r.x,h),z1:Math.max(r.z,S)},g()):i&&(F.tool==="paint"||F.tool==="erase")&&(c(h,S),Cn(),g())}function d(){F.tool==="select"&&s&&(F.selection=s,s=null,r=null),i=!1,g()}function m(p){F.currentLayer=Math.max(0,Math.min(F.model.ny-1,F.currentLayer+p))}function g(){const p=e.value;if(!p)return;const h=p.getContext("2d"),S=F.model,M=o(),E=F.currentLayer;h.fillStyle="#10131a",h.fillRect(0,0,p.width,p.height);const D=E*S.nz*S.nx;for(let T=0;T<S.nz;T++)for(let C=0;C<S.nx;C++){const x=S.data[D+T*S.nx+C];x&&(h.fillStyle=sh(x),h.fillRect(C*M,T*M,Math.ceil(M),Math.ceil(M)))}h.strokeStyle="rgba(255,255,255,0.06)",h.lineWidth=1,h.beginPath();for(let T=0;T<=S.nx;T++)h.moveTo(T*M+.5,0),h.lineTo(T*M+.5,S.nz*M);for(let T=0;T<=S.nz;T++)h.moveTo(0,T*M+.5),h.lineTo(S.nx*M,T*M+.5);h.stroke(),h.setLineDash([5,4]),F.mirrorX&&(h.strokeStyle="rgba(255,120,120,0.7)",h.beginPath(),h.moveTo(S.nx/2*M,0),h.lineTo(S.nx/2*M,S.nz*M),h.stroke()),F.mirrorZ&&(h.strokeStyle="rgba(120,200,255,0.7)",h.beginPath(),h.moveTo(0,S.nz/2*M),h.lineTo(S.nx*M,S.nz/2*M),h.stroke()),h.setLineDash([]);const L=s||F.selection;L&&(h.strokeStyle="#ffd54a",h.lineWidth=2,h.setLineDash([6,3]),h.strokeRect(L.x0*M,L.z0*M,(L.x1-L.x0+1)*M,(L.z1-L.z0+1)*M),h.setLineDash([]))}function _(){const p=e.value,h=t.value;!p||!h||(p.width=h.clientWidth,p.height=h.clientHeight,g())}return dl(()=>{_(),a=new ResizeObserver(_),a.observe(t.value),vi(()=>[F.rev,F.currentLayer,F.mirrorX,F.mirrorZ,F.selection],g)}),pl(()=>a&&a.disconnect()),(p,h)=>($e(),Ze("div",BM,[U("div",zM,[U("button",{class:"btn sm",onClick:h[0]||(h[0]=S=>m(-1)),disabled:Se(F).currentLayer<=0},"▼ 下层",8,HM),ut(U("input",{type:"range",class:"layer-slider",min:0,max:Se(F).model.ny-1,"onUpdate:modelValue":h[1]||(h[1]=S=>Se(F).currentLayer=S)},null,8,VM),[[Nt,Se(F).currentLayer,void 0,{number:!0}]]),U("button",{class:"btn sm",onClick:h[2]||(h[2]=S=>m(1)),disabled:Se(F).currentLayer>=Se(F).model.ny-1},"▲ 上层",8,GM),U("span",kM," 第 "+_e(Se(F).currentLayer+1)+" / "+_e(Se(F).model.ny)+" 层 ("+_e((Se(F).currentLayer*Se(F).model.cell*100).toFixed(0))+"–"+_e(((Se(F).currentLayer+1)*Se(F).model.cell*100).toFixed(0))+"cm) ",1)]),U("div",{class:"canvas-wrap",ref_key:"wrapRef",ref:t},[U("canvas",{ref_key:"canvasRef",ref:e,onPointerdown:u,onPointermove:f,onPointerup:d,onPointerleave:d},null,544)],512)]))}},XM=Pr(WM,[["__scopeId","data-v-1d881dd1"]]);function qM(n){return n.slice(0,256).trimStart().startsWith("ply")?jM(n):YM(n)}function YM(n){const e=[],t=n.split(/\r?\n/);for(const i of t){const r=i.trim();if(!r||r.startsWith("#")||r.startsWith("//"))continue;const s=r.split(/[,\s;]+/).map(Number);s.length>=3&&s.slice(0,3).every(Number.isFinite)&&e.push(s[0],s[1],s[2])}if(!e.length)throw new Error("未解析到任何点,请检查格式(每行 x y z)");return Float32Array.from(e)}function jM(n){const e=n.indexOf("end_header");if(e<0)throw new Error("PLY 头不完整");const t=n.slice(0,e);if(!/format\s+ascii/.test(t))throw new Error("仅支持 ASCII 格式的 PLY");const i=t.match(/element\s+vertex\s+(\d+)/);if(!i)throw new Error("PLY 中找不到 vertex 元素");const r=parseInt(i[1],10),s=[];for(const m of t.split(/\r?\n/)){const g=m.trim().match(/^property\s+\S+\s+(\S+)$/);g&&s.push(g[1])}const a=s.indexOf("x"),o=s.indexOf("y"),l=s.indexOf("z");if(a<0||o<0||l<0)throw new Error("PLY 缺少 x/y/z 属性");const u=n.slice(e+10).split(/\r?\n/),f=new Float32Array(r*3);let d=0;for(const m of u){if(d>=r)break;const g=m.trim();if(!g)continue;const _=g.split(/\s+/).map(Number);f[d*3]=_[a],f[d*3+1]=_[o],f[d*3+2]=_[l],d++}if(!d)throw new Error("PLY 中没有点数据");return d===r?f:f.slice(0,d*3)}function $M(n){const{positions:e,normals:t,colors:i,indices:r}=n,s=N=>N+3&-4,a=e.buffer.slice(e.byteOffset,e.byteOffset+e.byteLength),o=t.buffer.slice(t.byteOffset,t.byteOffset+t.byteLength),l=i.buffer.slice(i.byteOffset,i.byteOffset+i.byteLength),c=r.buffer.slice(r.byteOffset,r.byteOffset+r.byteLength),u=r instanceof Uint32Array?5125:5123;c.byteLength;const f=[],d=[];let m=0;const g=(N,W)=>{const G=m;return d.push({start:G,buf:N}),m+=s(N.byteLength),f.push({buffer:0,byteOffset:G,byteLength:N.byteLength,target:W}),f.length-1},_=g(a,34962),p=g(o,34962),h=g(l,34962),S=g(c,34963),M=[1/0,1/0,1/0],E=[-1/0,-1/0,-1/0];for(let N=0;N<e.length;N+=3)for(let W=0;W<3;W++){const G=e[N+W];G<M[W]&&(M[W]=G),G>E[W]&&(E[W]=G)}const D={asset:{version:"2.0",generator:"taihu-voxel-studio"},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0,name:"taihu-stone"}],meshes:[{name:"taihu-stone",primitives:[{attributes:{POSITION:0,NORMAL:1,COLOR_0:2},indices:3,material:0}]}],materials:[{name:"stone",pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:.9}}],accessors:[{bufferView:_,componentType:5126,count:e.length/3,type:"VEC3",min:M,max:E},{bufferView:p,componentType:5126,count:t.length/3,type:"VEC3"},{bufferView:h,componentType:5126,count:i.length/3,type:"VEC3"},{bufferView:S,componentType:u,count:r.length,type:"SCALAR"}],bufferViews:f,buffers:[{byteLength:m}]};let L=JSON.stringify(D);for(;L.length%4!==0;)L+=" ";const T=new TextEncoder().encode(L),C=m,x=20+T.length+8+C,A=new ArrayBuffer(x),k=new DataView(A),te=new Uint8Array(A);let se=0;k.setUint32(se,1179937895,!0),se+=4,k.setUint32(se,2,!0),se+=4,k.setUint32(se,x,!0),se+=4,k.setUint32(se,T.length,!0),se+=4,k.setUint32(se,1313821514,!0),se+=4,te.set(T,se),se+=T.length,k.setUint32(se,C,!0),se+=4,k.setUint32(se,5130562,!0),se+=4;for(const N of d)te.set(new Uint8Array(N.buf),se+N.start);return A}function qu(n,e,t="application/octet-stream"){const i=n instanceof Blob?n:new Blob([n],{type:t}),r=URL.createObjectURL(i),s=document.createElement("a");s.href=r,s.download=e,s.click(),setTimeout(()=>URL.revokeObjectURL(r),5e3)}const KM={class:"tool-panel"},ZM={class:"row dim"},JM={class:"muted"},QM={class:"row"},eS={class:"seg"},tS=["onClick"],nS={class:"row"},iS={class:"row"},rS={class:"chk"},sS={class:"chk"},oS={class:"materials"},aS=["onClick"],lS={class:"seg wrap"},cS=["disabled"],uS={key:0,class:"row"},fS={key:1,class:"hint"},hS={class:"row"},dS={class:"seg"},pS={class:"row"},mS={class:"seg"},gS={class:"row"},_S={class:"hint"},vS={__name:"ToolPanel",setup(n){const e=Dn(null);function t(m){m!==F.model.cell&&(F.model.resample(m),F.selection=null,Cn(),Vt(`体素尺寸已切换为 ${m*100}cm`))}function i(){const m=parseInt(prompt("X 向格数","64"),10),g=parseInt(prompt("Y 向层数","40"),10),_=parseInt(prompt("Z 向格数","64"),10);if(![m,g,_].every(p=>Number.isInteger(p)&&p>0&&p<=256)){Vt("尺寸无效(1–256)");return}co(new Ei(m,g,_,F.model.cell)),Vt("已新建空白模型")}function r(){confirm("确定清空整个模型?")&&(F.model.clear(),Cn())}function s(m){const g=m.target.files[0];if(m.target.value="",!g)return;const _=new FileReader;_.onload=()=>{try{const p=qM(String(_.result)),h=Ei.fromPoints(p,F.model.cell,F.material);co(h),Vt(`点云 ${p.length/3} 点 → ${h.nx}×${h.ny}×${h.nz} 体素`)}catch(p){Vt("点云解析失败:"+p.message)}},_.readAsText(g)}function a(){const m=F.selection;m&&(F.clipboard=F.model.copyRegion(F.currentLayer,m.x0,m.z0,m.x1,m.z1),Vt(`已复制 ${F.clipboard.w}×${F.clipboard.h} 选区`))}function o(){a();const m=F.selection;for(let g=m.z0;g<=m.z1;g++)for(let _=m.x0;_<=m.x1;_++)F.model.set(_,F.currentLayer,g,0);F.selection=null,Cn()}function l(m,g){F.model.layerTranslate(F.currentLayer,m,g),Cn()}function c(m){F.model.layerRotate(F.currentLayer,m),Cn()}function u(){confirm(`清空第 ${F.currentLayer+1} 层?`)&&(F.model.layerClear(F.currentLayer),Cn())}function f(){const m=Al(F.model,vl),g=wl(m,F.model.cell,F.decimation),_=$M(g);qu(_,`taihu-stone-${Date.now()}.glb`,"model/gltf-binary"),Vt(`已导出 GLB(${g.faceCount} 面)`)}function d(){const m=F.model,g=["x,y,z,material"];for(let _=0;_<m.ny;_++)for(let p=0;p<m.nz;p++)for(let h=0;h<m.nx;h++){const S=m.data[m.index(h,_,p)];S&&g.push(`${h},${_},${p},${S}`)}qu(new Blob([g.join(`
`)],{type:"text/csv"}),`voxels-${Date.now()}.csv`),Vt(`已导出 ${g.length-1} 条体素坐标`)}return(m,g)=>($e(),Ze("div",KM,[U("section",null,[g[16]||(g[16]=U("h3",null,"模型",-1)),U("div",ZM,[U("span",null,_e(Se(F).model.nx)+"×"+_e(Se(F).model.ny)+"×"+_e(Se(F).model.nz),1),U("span",JM,_e((Se(F).model.nx*Se(F).model.cell).toFixed(1))+"× "+_e((Se(F).model.ny*Se(F).model.cell).toFixed(1))+"× "+_e((Se(F).model.nz*Se(F).model.cell).toFixed(1))+" m ",1)]),U("div",QM,[g[15]||(g[15]=U("label",null,"体素尺寸",-1)),U("div",eS,[($e(),Ze(ht,null,pn([.05,.1,.2],_=>U("button",{key:_,class:rn({on:Se(F).model.cell===_}),onClick:p=>t(_)},_e(_*100)+"cm",11,tS)),64))])]),U("div",{class:"row"},[U("button",{class:"btn",onClick:i},"新建空白模型"),U("button",{class:"btn warn",onClick:r},"清空")])]),U("section",null,[g[17]||(g[17]=U("h3",null,"点云导入",-1)),U("div",nS,[U("input",{ref_key:"fileRef",ref:e,type:"file",accept:".ply,.xyz,.csv,.txt",hidden:"",onChange:s},null,544),U("button",{class:"btn",onClick:g[0]||(g[0]=_=>e.value.click())},"选择点云文件…")]),g[18]||(g[18]=U("p",{class:"hint"},"支持 ASCII PLY / xyz / csv,按当前体素尺寸粗格化,替换当前模型",-1))]),U("section",null,[g[21]||(g[21]=U("h3",null,"镜像对称",-1)),U("div",iS,[U("label",rS,[ut(U("input",{type:"checkbox","onUpdate:modelValue":g[1]||(g[1]=_=>Se(F).mirrorX=_)},null,512),[[Ha,Se(F).mirrorX]]),g[19]||(g[19]=xt(" X 方向镜像",-1))]),U("label",sS,[ut(U("input",{type:"checkbox","onUpdate:modelValue":g[2]||(g[2]=_=>Se(F).mirrorZ=_)},null,512),[[Ha,Se(F).mirrorZ]]),g[20]||(g[20]=xt(" Z 方向镜像",-1))])])]),U("section",null,[g[22]||(g[22]=U("h3",null,"石材",-1)),U("div",oS,[($e(!0),Ze(ht,null,pn(Se(rh),_=>($e(),Ze("button",{key:_.id,class:rn(["mat",{on:Se(F).material===_.id}]),onClick:p=>Se(F).material=_.id},[U("i",{style:So({background:_.color})},null,4),xt(_e(_.name),1)],10,aS))),128))])]),U("section",null,[g[23]||(g[23]=U("h3",null,"编辑工具",-1)),U("div",lS,[U("button",{class:rn({on:Se(F).tool==="paint"}),onClick:g[3]||(g[3]=_=>Se(F).tool="paint")},"画笔",2),U("button",{class:rn({on:Se(F).tool==="erase"}),onClick:g[4]||(g[4]=_=>Se(F).tool="erase")},"橡皮",2),U("button",{class:rn({on:Se(F).tool==="select"}),onClick:g[5]||(g[5]=_=>Se(F).tool="select")},"框选",2),U("button",{class:rn({on:Se(F).tool==="paste"}),onClick:g[6]||(g[6]=_=>Se(F).tool="paste"),disabled:!Se(F).clipboard},"粘贴",10,cS)]),Se(F).selection?($e(),Ze("div",uS,[U("button",{class:"btn sm",onClick:a},"复制选区"),U("button",{class:"btn sm",onClick:o},"剪切"),U("button",{class:"btn sm",onClick:g[7]||(g[7]=_=>Se(F).selection=null)},"取消选区")])):Un("",!0),Se(F).clipboard?($e(),Ze("p",fS,"剪贴板 "+_e(Se(F).clipboard.w)+"×"+_e(Se(F).clipboard.h)+",选“粘贴”后在层图上点击放置",1)):Un("",!0)]),U("section",null,[U("h3",null,"整层操作(第 "+_e(Se(F).currentLayer+1)+" 层)",1),U("div",hS,[g[24]||(g[24]=U("label",null,"平移",-1)),U("div",dS,[U("button",{onClick:g[8]||(g[8]=_=>l(-1,0))},"←X"),U("button",{onClick:g[9]||(g[9]=_=>l(1,0))},"X→"),U("button",{onClick:g[10]||(g[10]=_=>l(0,-1))},"←Z"),U("button",{onClick:g[11]||(g[11]=_=>l(0,1))},"Z→")])]),U("div",pS,[g[25]||(g[25]=U("label",null,"旋转90°",-1)),U("div",mS,[U("button",{onClick:g[12]||(g[12]=_=>c(-1))},"↺ 逆时针"),U("button",{onClick:g[13]||(g[13]=_=>c(1))},"↻ 顺时针")])]),U("div",{class:"row"},[U("button",{class:"btn warn sm",onClick:u},"清空本层")])]),U("section",null,[g[26]||(g[26]=U("h3",null,"网格减面",-1)),U("div",gS,[ut(U("input",{type:"range",min:"0",max:"0.9",step:"0.05","onUpdate:modelValue":g[14]||(g[14]=_=>Se(F).decimation=_)},null,512),[[Nt,Se(F).decimation,void 0,{number:!0}]]),U("span",null,_e(Math.round(Se(F).decimation*100))+"%",1)]),U("p",_S," 合并后 "+_e(Se(F).mesh.facesRaw.toLocaleString())+" 面 → 减面后 "+_e(Se(F).mesh.faces.toLocaleString())+" 面 ",1)]),U("section",null,[g[27]||(g[27]=U("h3",null,"导出",-1)),U("div",{class:"row"},[U("button",{class:"btn",onClick:f},"导出 GLB"),U("button",{class:"btn",onClick:d},"体素坐标清单")])])]))}},xS=Pr(vS,[["__scopeId","data-v-eb9b18d4"]]),MS="taihu-archive",SS=1;let $s=null;function Ti(){return $s||($s=new Promise((n,e)=>{const t=indexedDB.open(MS,SS);t.onupgradeneeded=()=>{const i=t.result;i.objectStoreNames.contains("stones")||i.createObjectStore("stones",{keyPath:"id",autoIncrement:!0}),i.objectStoreNames.contains("versions")||i.createObjectStore("versions",{keyPath:"id",autoIncrement:!0}).createIndex("stoneId","stoneId",{unique:!1})},t.onsuccess=()=>n(t.result),t.onerror=()=>e(t.error)}),$s)}function Ai(n){return new Promise((e,t)=>{n.onsuccess=()=>e(n.result),n.onerror=()=>t(n.error)})}async function yS(){const n=await Ti();return Ai(n.transaction("stones").objectStore("stones").getAll())}async function ES(n){const e=await Ti();return Ai(e.transaction("stones","readwrite").objectStore("stones").add(n))}async function bS(n){const e=await Ti();await Ai(e.transaction("stones","readwrite").objectStore("stones").delete(n));const t=await Ja(n),i=e.transaction("versions","readwrite"),r=i.objectStore("versions");for(const s of t)r.delete(s.id);return new Promise((s,a)=>{i.oncomplete=s,i.onerror=()=>a(i.error)})}async function Ja(n){const e=await Ti();return(await Ai(e.transaction("versions").objectStore("versions").index("stoneId").getAll(n))).sort((i,r)=>i.createdAt-r.createdAt)}async function TS(){const n=await Ti();return Ai(n.transaction("versions").objectStore("versions").getAll())}async function AS(n){const e=await Ti();return Ai(e.transaction("versions","readwrite").objectStore("versions").add(n))}async function wS(n){const e=await Ti();return Ai(e.transaction("versions","readwrite").objectStore("versions").put(n))}async function RS(n){const e=await Ti();return Ai(e.transaction("versions","readwrite").objectStore("versions").delete(n))}const CS={class:"archive"},LS={class:"tabs"},PS=["onClick"],DS={class:"pane"},US={class:"form"},IS={class:"dims"},NS={class:"stone-list"},OS=["onClick"],FS={class:"stone-head"},BS={class:"muted"},zS={class:"muted sm"},HS={class:"stone-ops"},VS=["onClick"],GS=["onClick"],kS={key:0,class:"hint"},WS={class:"pane"},XS={class:"form"},qS={class:"stone-head"},YS=["value","onChange"],jS=["value"],$S={class:"muted sm"},KS={class:"muted sm"},ZS={class:"stone-ops"},JS=["onClick"],QS=["onClick"],ey=["onClick"],ty={key:0,class:"hint"},ny={key:1,class:"hint"},iy={class:"pane"},ry={class:"row"},sy=["value"],oy=["value"],ay={key:0,class:"cmp"},ly={key:1,class:"hint"},cy={class:"pane"},uy={class:"form"},fy={class:"dims"},hy={class:"dims"},dy={class:"row"},py=["value"],my={class:"stone-list"},gy=["onClick"],_y={class:"stone-head"},vy={class:"muted"},xy={class:"muted sm"},My={key:0,class:"hint"},Sy={__name:"ArchivePanel",setup(n,{expose:e}){const t=[{key:"stones",label:"建档"},{key:"versions",label:"版本"},{key:"compare",label:"比对"},{key:"search",label:"检索"}],i=Dn("stones"),r=yr({code:"",origin:"",L:100,W:80,H:120,note:""}),s=Dn(""),a=Dn(0),o=Dn(0),l=yr({origin:"",Lmin:null,Lmax:null,Wmin:null,Wmax:null,Hmin:null,Hmax:null,status:[]}),c=Dn([]),u=Gi(()=>F.stones.find(T=>T.id===F.currentStoneId));async function f(){F.stones=(await yS()).sort((T,C)=>C.createdAt-T.createdAt),c.value=await TS(),F.currentStoneId&&(F.versions=await Ja(F.currentStoneId))}f(),vi(()=>F.versions,T=>{T.length>=2&&(a.value=T[T.length-2].id,o.value=T[T.length-1].id)});async function d(){if(!r.code){Vt("请填写编号");return}if(F.stones.some(x=>x.code===r.code)){Vt("编号已存在");return}const T={code:r.code,origin:r.origin||"未知",L:r.L||0,W:r.W||0,H:r.H||0,note:r.note,createdAt:Date.now()},C=await ES(T);await f(),F.currentStoneId=C,Vt(`已建档 ${r.code}`)}async function m(T){F.currentStoneId=T,F.versions=await Ja(T)}async function g(T){confirm(`删除石块 ${T.code} 及其全部版本?`)&&(await bS(T.id),F.currentStoneId===T.id&&(F.currentStoneId=null,F.versions=[]),await f())}function _(T){const C=F.model.cell,x=Math.max(1,Math.round(T.L/100/C)),A=Math.max(1,Math.round(T.H/100/C)),k=Math.max(1,Math.round(T.W/100/C));if(x*A*k>8e6){Vt("按当前体素尺寸模型过大,请先切到更大的体素");return}co(new Ei(x,A,k,C)),F.currentStoneId=T.id,Vt(`已按 ${T.code} 尺寸新建 ${x}×${A}×${k} 模型`)}async function p(){if(!u.value)return;const T=F.model,C=Al(T,vl),x=wl(C,T.cell,F.decimation),A=T.serialize(),k={stoneId:u.value.id,n:F.versions.length+1,status:"加工中",note:s.value,createdAt:Date.now(),cell:T.cell,nx:T.nx,ny:T.ny,nz:T.nz,data:A.data,voxels:T.count(),volume:T.volume(),facesRaw:C.faceCount,facesDec:x.faceCount};await AS(k),s.value="",await f(),Vt(`已保存 V${k.n}`)}async function h(T){co(Ei.deserialize(T)),Vt(`已载入 V${T.n}`)}async function S(T,C){await wS({...T,status:C}),await f()}async function M(T){confirm(`删除 V${T.n}?`)&&(await RS(T.id),await f())}function E(T){return new Date(T).toLocaleString("zh-CN",{hour12:!1})}const D=Gi(()=>{const T=F.versions.find(te=>te.id===a.value),C=F.versions.find(te=>te.id===o.value);if(!T||!C||T===C)return null;const x=(te,se,N,W,G="")=>{const Q=N-se;return{label:te,a:W(se)+G,b:W(N)+G,d:(Q>0?"+":"")+W(Q)+G,cls:Q>0?"up":Q<0?"down":""}},A=te=>Math.round(te).toLocaleString(),k=te=>te.toFixed(3);return{a:T,b:C,rows:[x("体素数",T.voxels,C.voxels,A),x("体积",T.volume,C.volume,k," m³"),x("合并后面数",T.facesRaw,C.facesRaw,A),x("减面后面数",T.facesDec,C.facesDec,A)]}}),L=Gi(()=>{const T=(C,x,A)=>(x==null||x===""||C>=x)&&(A==null||A===""||C<=A);return F.stones.filter(C=>!(l.origin&&!C.origin.includes(l.origin)||!T(C.L,l.Lmin,l.Lmax)||!T(C.W,l.Wmin,l.Wmax)||!T(C.H,l.Hmin,l.Hmax)||l.status.length&&!c.value.filter(A=>A.stoneId===C.id).some(A=>l.status.includes(A.status)))).map(C=>({stone:C,versions:c.value.filter(x=>x.stoneId===C.id).sort((x,A)=>x.createdAt-A.createdAt)}))});return e({refresh:f}),(T,C)=>($e(),Ze("div",CS,[U("div",LS,[($e(),Ze(ht,null,pn(t,x=>U("button",{key:x.key,class:rn({on:i.value===x.key}),onClick:A=>i.value=x.key},_e(x.label),11,PS)),64))]),ut(U("div",DS,[C[23]||(C[23]=U("h3",null,"石块建档",-1)),U("div",US,[U("label",null,[C[17]||(C[17]=xt("编号",-1)),ut(U("input",{"onUpdate:modelValue":C[0]||(C[0]=x=>r.code=x),placeholder:"如 TH-2026-001"},null,512),[[Nt,r.code,void 0,{trim:!0}]])]),U("label",null,[C[18]||(C[18]=xt("产地",-1)),ut(U("input",{"onUpdate:modelValue":C[1]||(C[1]=x=>r.origin=x),placeholder:"如 苏州西山"},null,512),[[Nt,r.origin,void 0,{trim:!0}]])]),U("div",IS,[U("label",null,[C[19]||(C[19]=xt("长(cm)",-1)),ut(U("input",{type:"number","onUpdate:modelValue":C[2]||(C[2]=x=>r.L=x),min:"0"},null,512),[[Nt,r.L,void 0,{number:!0}]])]),U("label",null,[C[20]||(C[20]=xt("宽(cm)",-1)),ut(U("input",{type:"number","onUpdate:modelValue":C[3]||(C[3]=x=>r.W=x),min:"0"},null,512),[[Nt,r.W,void 0,{number:!0}]])]),U("label",null,[C[21]||(C[21]=xt("高(cm)",-1)),ut(U("input",{type:"number","onUpdate:modelValue":C[4]||(C[4]=x=>r.H=x),min:"0"},null,512),[[Nt,r.H,void 0,{number:!0}]])])]),U("label",null,[C[22]||(C[22]=xt("备注",-1)),ut(U("input",{"onUpdate:modelValue":C[5]||(C[5]=x=>r.note=x),placeholder:"可空"},null,512),[[Nt,r.note,void 0,{trim:!0}]])]),U("button",{class:"btn primary",onClick:d},"建档入库")]),U("h3",null,"石块列表("+_e(Se(F).stones.length)+")",1),U("div",NS,[($e(!0),Ze(ht,null,pn(Se(F).stones,x=>($e(),Ze("div",{key:x.id,class:rn(["stone",{on:Se(F).currentStoneId===x.id}]),onClick:A=>m(x.id)},[U("div",FS,[U("b",null,_e(x.code),1),U("span",BS,_e(x.origin),1)]),U("div",zS,_e(x.L)+"×"+_e(x.W)+"×"+_e(x.H)+" cm",1),U("div",HS,[U("button",{class:"btn sm",onClick:Va(A=>_(x),["stop"])},"按尺寸建模型",8,VS),U("button",{class:"btn sm warn",onClick:Va(A=>g(x),["stop"])},"删除",8,GS)])],10,OS))),128)),Se(F).stones.length?Un("",!0):($e(),Ze("p",kS,"暂无档案,先建档"))])],512),[[Ss,i.value==="stones"]]),ut(U("div",WS,[u.value?($e(),Ze(ht,{key:0},[U("h3",null,_e(u.value.code)+" · 加工版本",1),U("div",XS,[U("label",null,[C[24]||(C[24]=xt("本次加工说明",-1)),ut(U("input",{"onUpdate:modelValue":C[6]||(C[6]=x=>s.value=x),placeholder:"如:顶部瘦身,开洞"},null,512),[[Nt,s.value,void 0,{trim:!0}]])]),U("button",{class:"btn primary",onClick:p},"保存当前模型为新版本")]),($e(!0),Ze(ht,null,pn(Se(F).versions,x=>($e(),Ze("div",{key:x.id,class:"version"},[U("div",qS,[U("b",null,"V"+_e(x.n),1),U("select",{value:x.status,onChange:A=>S(x,A.target.value)},[($e(!0),Ze(ht,null,pn(Se(dc),A=>($e(),Ze("option",{key:A,value:A},_e(A),9,jS))),128))],40,YS)]),U("div",$S,_e(E(x.createdAt))+" · "+_e(x.note||"—"),1),U("div",KS,_e(x.nx)+"×"+_e(x.ny)+"×"+_e(x.nz)+" @"+_e(x.cell*100)+"cm · "+_e(x.voxels.toLocaleString())+" 体素 · "+_e(x.volume.toFixed(3))+"m³ · "+_e(x.facesRaw.toLocaleString())+"/"+_e(x.facesDec.toLocaleString())+" 面 ",1),U("div",ZS,[U("button",{class:"btn sm",onClick:A=>h(x)},"载入编辑",8,JS),U("button",{class:"btn sm",onClick:A=>Se(F).recordVersion=x},"加工记录单",8,QS),U("button",{class:"btn sm warn",onClick:A=>M(x)},"删除",8,ey)])]))),128)),Se(F).versions.length?Un("",!0):($e(),Ze("p",ty,"还没有版本,加工后点上方保存"))],64)):($e(),Ze("p",ny,"先在“建档”页选中一块石头"))],512),[[Ss,i.value==="versions"]]),ut(U("div",iy,[C[29]||(C[29]=U("h3",null,"版本比对",-1)),u.value&&Se(F).versions.length>=2?($e(),Ze(ht,{key:0},[U("div",ry,[C[25]||(C[25]=U("label",null,"A",-1)),ut(U("select",{"onUpdate:modelValue":C[7]||(C[7]=x=>a.value=x)},[($e(!0),Ze(ht,null,pn(Se(F).versions,x=>($e(),Ze("option",{key:x.id,value:x.id},"V"+_e(x.n)+" · "+_e(E(x.createdAt)),9,sy))),128))],512),[[uc,a.value,void 0,{number:!0}]]),C[26]||(C[26]=U("label",null,"B",-1)),ut(U("select",{"onUpdate:modelValue":C[8]||(C[8]=x=>o.value=x)},[($e(!0),Ze(ht,null,pn(Se(F).versions,x=>($e(),Ze("option",{key:x.id,value:x.id},"V"+_e(x.n)+" · "+_e(E(x.createdAt)),9,oy))),128))],512),[[uc,o.value,void 0,{number:!0}]])]),D.value?($e(),Ze("table",ay,[U("thead",null,[U("tr",null,[C[27]||(C[27]=U("th",null,null,-1)),U("th",null,"V"+_e(D.value.a.n),1),U("th",null,"V"+_e(D.value.b.n),1),C[28]||(C[28]=U("th",null,"差异(B−A)",-1))])]),U("tbody",null,[($e(!0),Ze(ht,null,pn(D.value.rows,x=>($e(),Ze("tr",{key:x.label},[U("td",null,_e(x.label),1),U("td",null,_e(x.a),1),U("td",null,_e(x.b),1),U("td",{class:rn(x.cls)},_e(x.d),3)]))),128))])])):Un("",!0)],64)):($e(),Ze("p",ly,"需要当前石块至少有两个版本"))],512),[[Ss,i.value==="compare"]]),ut(U("div",cy,[C[38]||(C[38]=U("h3",null,"档案检索",-1)),U("div",uy,[U("label",null,[C[30]||(C[30]=xt("产地",-1)),ut(U("input",{"onUpdate:modelValue":C[9]||(C[9]=x=>l.origin=x),placeholder:"模糊匹配,可空"},null,512),[[Nt,l.origin,void 0,{trim:!0}]])]),U("div",fy,[U("label",null,[C[31]||(C[31]=xt("长≥",-1)),ut(U("input",{type:"number","onUpdate:modelValue":C[10]||(C[10]=x=>l.Lmin=x)},null,512),[[Nt,l.Lmin,void 0,{number:!0}]])]),U("label",null,[C[32]||(C[32]=xt("宽≥",-1)),ut(U("input",{type:"number","onUpdate:modelValue":C[11]||(C[11]=x=>l.Wmin=x)},null,512),[[Nt,l.Wmin,void 0,{number:!0}]])]),U("label",null,[C[33]||(C[33]=xt("高≥",-1)),ut(U("input",{type:"number","onUpdate:modelValue":C[12]||(C[12]=x=>l.Hmin=x)},null,512),[[Nt,l.Hmin,void 0,{number:!0}]])])]),U("div",hy,[U("label",null,[C[34]||(C[34]=xt("长≤",-1)),ut(U("input",{type:"number","onUpdate:modelValue":C[13]||(C[13]=x=>l.Lmax=x)},null,512),[[Nt,l.Lmax,void 0,{number:!0}]])]),U("label",null,[C[35]||(C[35]=xt("宽≤",-1)),ut(U("input",{type:"number","onUpdate:modelValue":C[14]||(C[14]=x=>l.Wmax=x)},null,512),[[Nt,l.Wmax,void 0,{number:!0}]])]),U("label",null,[C[36]||(C[36]=xt("高≤",-1)),ut(U("input",{type:"number","onUpdate:modelValue":C[15]||(C[15]=x=>l.Hmax=x)},null,512),[[Nt,l.Hmax,void 0,{number:!0}]])])]),U("div",dy,[C[37]||(C[37]=U("label",null,"版本状态",-1)),($e(!0),Ze(ht,null,pn(Se(dc),x=>($e(),Ze("label",{key:x,class:"chk"},[ut(U("input",{type:"checkbox",value:x,"onUpdate:modelValue":C[16]||(C[16]=A=>l.status=A)},null,8,py),[[Ha,l.status]]),xt(_e(x),1)]))),128))])]),U("div",my,[($e(!0),Ze(ht,null,pn(L.value,x=>($e(),Ze("div",{key:x.stone.id,class:"stone",onClick:A=>{m(x.stone.id),i.value="versions"}},[U("div",_y,[U("b",null,_e(x.stone.code),1),U("span",vy,_e(x.stone.origin),1)]),U("div",xy,[xt(_e(x.stone.L)+"×"+_e(x.stone.W)+"×"+_e(x.stone.H)+" cm · "+_e(x.versions.length)+" 个版本 ",1),x.versions.length?($e(),Ze(ht,{key:0},[xt(" · 最新 V"+_e(x.versions[x.versions.length-1].n)+"("+_e(x.versions[x.versions.length-1].status)+") ",1)],64)):Un("",!0)])],8,gy))),128)),L.value.length?Un("",!0):($e(),Ze("p",My,"无匹配档案"))])],512),[[Ss,i.value==="search"]])]))}},yy=Pr(Sy,[["__scopeId","data-v-c1050b77"]]),Ey={class:"sheet-wrap"},by={class:"sheet-actions no-print"},Ty={class:"sheet",id:"record-sheet"},Ay={class:"sheet-no"},wy={colspan:"3"},Ry={colspan:"3"},Cy={__name:"RecordSheet",setup(n){const e=Gi(()=>F.recordVersion||{}),t=Gi(()=>F.stones.find(a=>a.id===(F.recordVersion&&F.recordVersion.stoneId)));function i(a){return new Date(a).toLocaleString("zh-CN",{hour12:!1})}function r(a){const o=new Date(a);return`${o.getFullYear()}${String(o.getMonth()+1).padStart(2,"0")}${String(o.getDate()).padStart(2,"0")}`}function s(){window.print()}return(a,o)=>{var l,c,u;return Se(F).recordVersion?($e(),Ze("div",{key:0,class:"overlay",onClick:o[1]||(o[1]=Va(f=>Se(F).recordVersion=null,["self"]))},[U("div",Ey,[U("div",by,[U("button",{class:"btn",onClick:s},"打印"),U("button",{class:"btn",onClick:o[0]||(o[0]=f=>Se(F).recordVersion=null)},"关闭")]),U("div",Ty,[o[14]||(o[14]=U("h1",null,"假山石加工记录单",-1)),U("div",Ay,"记录单号:JL-"+_e(e.value.id)+"-"+_e(r(e.value.createdAt)),1),U("table",null,[U("tbody",null,[U("tr",null,[o[2]||(o[2]=U("th",null,"石块编号",-1)),U("td",null,_e(((l=t.value)==null?void 0:l.code)||"—"),1),o[3]||(o[3]=U("th",null,"产地",-1)),U("td",null,_e(((c=t.value)==null?void 0:c.origin)||"—"),1)]),U("tr",null,[o[4]||(o[4]=U("th",null,"石块尺寸",-1)),U("td",null,_e(t.value?`${t.value.L}×${t.value.W}×${t.value.H} cm`:"—"),1),o[5]||(o[5]=U("th",null,"版本",-1)),U("td",null,"V"+_e(e.value.n)+"("+_e(e.value.status)+")",1)]),U("tr",null,[o[6]||(o[6]=U("th",null,"加工时间",-1)),U("td",null,_e(i(e.value.createdAt)),1),o[7]||(o[7]=U("th",null,"体素尺寸",-1)),U("td",null,_e(e.value.cell*100)+" cm",1)]),U("tr",null,[o[8]||(o[8]=U("th",null,"网格规模",-1)),U("td",null,_e(e.value.nx)+"×"+_e(e.value.ny)+"×"+_e(e.value.nz),1),o[9]||(o[9]=U("th",null,"体素数",-1)),U("td",null,_e(e.value.voxels.toLocaleString()),1)]),U("tr",null,[o[10]||(o[10]=U("th",null,"成型体积",-1)),U("td",null,_e(e.value.volume.toFixed(3))+" m³",1),o[11]||(o[11]=U("th",null,"面数",-1)),U("td",null,"合并 "+_e(e.value.facesRaw.toLocaleString())+" / 减面 "+_e(e.value.facesDec.toLocaleString()),1)]),U("tr",null,[o[12]||(o[12]=U("th",null,"加工说明",-1)),U("td",wy,_e(e.value.note||"—"),1)]),U("tr",null,[o[13]||(o[13]=U("th",null,"备注",-1)),U("td",Ry,_e(((u=t.value)==null?void 0:u.note)||"—"),1)])])]),o[15]||(o[15]=U("div",{class:"sign"},[U("span",null,"施工员:____________"),U("span",null,"质检员:____________"),U("span",null,"日期:____________")],-1))])])])):Un("",!0)}}},Ly=Pr(Cy,[["__scopeId","data-v-10b10be1"]]),Py={class:"app"},Dy={class:"head-stats"},Uy={class:"accent"},Iy={key:0,class:"head-stone"},Ny={class:"left"},Oy={class:"center"},Fy={class:"view3d"},By={class:"view2d"},zy={class:"right"},Hy={key:0,class:"toast"},Vy={__name:"App",setup(n){const e=Gi(()=>F.stones.find(t=>t.id===F.currentStoneId));return(t,i)=>($e(),Ze("div",Py,[U("header",null,[i[0]||(i[0]=U("h1",null,"太湖石体素建模与档案加工工具",-1)),U("div",Dy,[U("span",null,"体素 "+_e(Se(F).mesh.voxels.toLocaleString()),1),U("span",null,"体积 "+_e(Se(F).mesh.volume.toFixed(3))+" m³",1),U("span",null,"合并 "+_e(Se(F).mesh.facesRaw.toLocaleString())+" 面",1),U("span",Uy,"减面 "+_e(Se(F).mesh.faces.toLocaleString())+" 面("+_e(Math.round(Se(F).decimation*100))+"%)",1)]),e.value?($e(),Ze("div",Iy," 当前石块:"+_e(e.value.code)+" · "+_e(e.value.origin),1)):Un("",!0)]),U("main",null,[U("aside",Ny,[Yt(xS)]),U("section",Oy,[U("div",Fy,[Yt(FM)]),U("div",By,[Yt(XM)])]),U("aside",zy,[Yt(yy)])]),Se(F).notice?($e(),Ze("div",Hy,_e(Se(F).notice),1)):Un("",!0),Yt(Ly)]))}},Gy=Pr(Vy,[["__scopeId","data-v-2a426b6a"]]);dm(Gy).mount("#app");
