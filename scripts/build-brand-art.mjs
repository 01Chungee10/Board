// Asset preparation from the existing Hyundai Steel/Yonggang-i source art.
// The original reference is held in the workspace's local brand asset folder.
import sharp from 'sharp';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
const src = join('design-sources','yonggang-reference-sheet.png');
const output = join('app','public','brand','yonggang-mascot.png');
// Extract only the central, neutral-expression mascot from the approved reference sheet.
const area={left:480,top:115,width:575,height:780};
const {data,info}=await sharp(src).extract(area).ensureAlpha().raw().toBuffer({resolveWithObject:true});
// Flood-fill the white outer background without destroying white lettering inside the uniform.
const {width,height,channels}=info;const seen=new Uint8Array(width*height);const stack=[];
const isWhite=i=>{const p=i*channels,r=data[p],g=data[p+1],b=data[p+2];return r>238&&g>238&&b>238&&Math.max(r,g,b)-Math.min(r,g,b)<17;};
for(let x=0;x<width;x++){stack.push(x,(height-1)*width+x);}
for(let y=0;y<height;y++){stack.push(y*width,y*width+width-1);}
while(stack.length){const pos=stack.pop();if(seen[pos])continue;seen[pos]=1;if(!isWhite(pos))continue;data[pos*channels+3]=0;const x=pos%width,y=(pos/width)|0;if(x>0)stack.push(pos-1);if(x+1<width)stack.push(pos+1);if(y>0)stack.push(pos-width);if(y+1<height)stack.push(pos+width);}
await sharp(data,{raw:{width,height,channels}}).trim({background:'#ffffff00',threshold:4}).png({compressionLevel:9}).toFile(output);
// White-centered, clean, branded decorative backdrop, designed to sit underneath actual HTML text.
// The page places readable content on top; artwork never contains textual content.
const W=1800,H=660;
const shapes=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><radialGradient id="blue"><stop stop-color="#d7e8f8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><linearGradient id="b"><stop stop-color="#f3f8ff"/><stop offset="1" stop-color="#fff"/></linearGradient></defs>
  <rect width="1800" height="660" fill="#ffffff"/>
  <circle cx="1650" cy="100" r="450" fill="url(#blue)" opacity=".65"/>
  <circle cx="-75" cy="545" r="355" fill="url(#blue)" opacity=".47"/>
  <g fill="none" stroke="#86a8cb" stroke-width="2" stroke-opacity=".3"><path d="M-50 65 Q 220 270 40 480"/><path d="M-70 110 Q 172 305 15 535" stroke-dasharray="8 13"/><path d="M1590 -70 Q 1805 180 1627 428"/><path d="M1545 -130 Q 1760 160 1564 420" stroke-dasharray="8 13"/></g>
  <g fill="#648cb7" opacity=".45"><circle cx="80" cy="195" r="9"/><circle cx="162" cy="275" r="5"/><circle cx="1570" cy="453" r="6"/><circle cx="1713" cy="355" r="12"/><circle cx="120" cy="520" r="4"/></g>
  <g fill="#002D62" opacity=".5"><path d="M144 100l4 14 14 4-14 4-4 14-4-14-14-4 14-4z"/><path d="M1592 507l4 12 12 4-12 4-4 12-4-12-12-4 12-4z"/></g>
  <g stroke="#cbd9eb" stroke-width="1" fill="none" opacity=".8"><path d="M0 585C300 400 365 640 700 550"/><path d="M1300 20C1560 180 1660 10 1860 155"/></g>
</svg>`;
const backgroundBuffer=await sharp(Buffer.from(shapes)).png().toBuffer();
const mascot=await readFile(output);
const lowerLeft=await sharp(mascot).resize({height:390}).ensureAlpha().modulate({brightness:1.13}).png().toBuffer();
await sharp(backgroundBuffer).composite([
  {input:lowerLeft, left:-65,top:340,blend:'over'}
]).webp({quality:86,effort:6}).toFile(join('app','public','brand','yonggang-atmosphere.webp'));
console.log('Generated brand assets:',output,'and',join('app','public','brand','yonggang-atmosphere.webp'));
