import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root=fileURLToPath(new URL('../../',import.meta.url));
const output=new URL('../../public/c1-pilot/selection.js',import.meta.url);
const png=await readFile(new URL('./reference.png',output));
const hash=createHash('sha256').update(png).digest('hex');
if(hash!=='15c5ad1c924b8e1c46ae4ffe59c4f7785e8ff5c130f9000432821410b1fd1338')throw Error('共同参照 SHA-256 不符。');
const result=await build({
  define:{C1_STUDY_PNG:JSON.stringify('data:image/png;base64,'+png.toString('base64')),C1_STUDY_SHA:JSON.stringify(hash)},
  absWorkingDir:root, entryPoints:['src/design/c1Selection.ts'], bundle:true, write:false,
  format:'iife',globalName:'C1Selection',platform:'browser',target:'es2020',charset:'utf8',
  legalComments:'none',metafile:true,banner:{js:'// Generated with node src/design/c1Bundle.mjs. Edit src/design/c1*.ts.'},
});
// Only the offline, pure E design modules may enter this bundle.
const allowed=new Set(['c1Selection','c1Controls','c1Model','design','partPrompt','quadDirections','versions'].map(n=>'src/design/'+n+'.ts'));
for(const file of Object.keys(result.metafile.inputs))if(!allowed.has(file))throw Error('Unexpected dependency: '+file);
const bytes=result.outputFiles[0].contents;
if(process.argv.includes('--check')){
  if(!Buffer.from(bytes).equals(await readFile(output)))throw Error('selection.js differs; rebuild with node src/design/c1Bundle.mjs');
  console.log('selection.js matches the offline sources.');
}else{
  await writeFile(output,bytes);console.log('Built public/c1-pilot/selection.js ('+bytes.length+' bytes).');
}

