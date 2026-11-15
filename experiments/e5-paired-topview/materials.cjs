const fs=require('fs'),path=require('path'),sharp=require('sharp');
const p=name=>path.join(__dirname,name);
async function run(){
 const image=fs.readFileSync(p('B2-L-lowkey.png'));
 const curves=['M459.6 340.4 Q464 338 471.8 334.8 Q473.3 334.3 475 334.3 H539.2 Q541 334.3 542.4 334.9 Q549.4 337.8 554.8 340.4','M460.7 532.8 Q466.7 529.3 472 526.7 Q474 525.8 476 525.8 H539 Q540.9 525.8 542.7 526.6 Q548.2 529.1 554.6 532.8'];
 const paths=curves.map(d=>'<path d="'+d+'"/>').join('');
 const overlay=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><g fill="none" stroke-linejoin="round" stroke-linecap="round"><g transform="translate(0 .85)" stroke="#fff" stroke-opacity=".40" stroke-width="1.05">'+paths+'</g><g stroke="#363536" stroke-opacity=".50" stroke-width="1.05">'+paths+'</g></g></svg>');
 await sharp(image).ensureAlpha().composite([{input:overlay}]).removeAlpha().png().toFile(p('cover-comparison.png'));
}
run().catch(e=>{console.error(e);process.exit(1)});
