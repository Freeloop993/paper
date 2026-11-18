// Add an embedded workflow to a local software-control image.
export function tagPNG(bytes,graph){
  const header=Buffer.from('tEXt'),payload=Buffer.from('prompt\0'+JSON.stringify(graph)),typeData=Buffer.concat([header,payload]);
  let crc=0xffffffff;
  for(const byte of typeData){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  const n=Buffer.alloc(4),sum=Buffer.alloc(4);n.writeUInt32BE(payload.length);sum.writeUInt32BE((crc^0xffffffff)>>>0);
  return Buffer.concat([bytes.subarray(0,-12),n,typeData,sum,bytes.subarray(-12)]);
}
