import{h as s,o as t,l as h}from"./index-Cai4QnPE.js";/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=[["path",{d:"M16 5h6",key:"1vod17"}],["path",{d:"M19 2v6",key:"4bpg5p"}],["path",{d:"M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5",key:"1ue2ih"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}]],y=s("image-plus",d);/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _=[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"17 8 12 3 7 8",key:"t8dd8p"}],["line",{x1:"12",x2:"12",y1:"3",y2:"15",key:"widbto"}]],M=s("upload",_),c="mmpns_home_image_slots",p="mmpns_home_image_edit_mode",i=45e5,a={heroMain:t.home.heroMain,heroGarden:t.home.heroGarden,heroChristmas:t.home.heroChristmas,heroMass:t.home.heroMass,foundressLegacy:t.home.foundressLegacy,academicKindergarten:t.home.academicKindergarten,academicElementary:t.home.academicElementary,academicJuniorHigh:t.home.academicJuniorHigh},g=Object.keys(a),m=e=>typeof TextEncoder<"u"?new TextEncoder().encode(e).length:e.length*2,E=e=>m(JSON.stringify(e)),u=e=>E(e)<=i,S=()=>{try{const e=localStorage.getItem(c);if(!e)return{...a};const o=JSON.parse(e),r={...a,...o};return g.forEach(n=>{r[n]=h(r[n],a[n])}),r}catch{return{...a}}},I=e=>{const o=JSON.stringify(e);if(m(o)>i)return!1;try{return localStorage.setItem(c,o),!0}catch{return!1}};export{a as H,y as I,M as U,p as a,u as c,S as r,I as w};
