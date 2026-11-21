// Add an embedded workflow to a local software-control image.
export function tagPNG(bytes,graph){
  const header=Buffer.from('tEXt'),payload=Buffer.from('prompt\0'+JSON.stringify(graph)),typeData=Buffer.concat([header,payload]);
  let crc=0xffffffff;
  for(const byte of typeData){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  const n=Buffer.alloc(4),sum=Buffer.alloc(4);n.writeUInt32BE(payload.length);sum.writeUInt32BE((crc^0xffffffff)>>>0);
  return Buffer.concat([bytes.subarray(0,-12),n,typeData,sum,bytes.subarray(-12)]);
}

// 照 ComfyUI 存图的样子嵌入执行图：文字块在 IHDR 之后、图像数据之前，JSON 里的非 ASCII 字符写成 \\uXXXX（Python json.dumps 的默认行为）。
// 只读文件头、按 Latin-1 解文字块的工具（如 Pillow）这样才读得到、读得对。
export function tagPNGFront(source,graph){
  // 父图本身可能是上一轮的回图，带着上一轮的执行图；真实后端每次都出一张新图，所以先去掉旧的。
  const kept=[source.subarray(0,8)];
  for(let i=8;i+12<=source.length;){
    const size=source.readUInt32BE(i), end=i+12+size;
    const old=source.toString('latin1',i+4,i+8)==='tEXt' && source.toString('latin1',i+8,i+15)==='prompt\0';
    if(!old) kept.push(source.subarray(i,end));
    i=end;
  }
  const bytes=Buffer.concat(kept);
  const text=JSON.stringify(graph).replace(/[\u0080-\uffff]/g,ch=>'\\u'+ch.charCodeAt(0).toString(16).padStart(4,'0'));
  const typeData=Buffer.concat([Buffer.from('tEXt'),Buffer.from('prompt\0'+text,'latin1')]);
  let crc=0xffffffff;
  for(const byte of typeData){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  const n=Buffer.alloc(4),sum=Buffer.alloc(4);n.writeUInt32BE(typeData.length-4);sum.writeUInt32BE((crc^0xffffffff)>>>0);
  return Buffer.concat([bytes.subarray(0,33),n,typeData,sum,bytes.subarray(33)]);
}
