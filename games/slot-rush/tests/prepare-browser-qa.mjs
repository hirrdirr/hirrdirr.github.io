// Prepare a standalone local QA site; does not modify the repository or real records.
// node games/slot-rush/tests/prepare-browser-qa.mjs /absolute/output [baseline-ref]
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const output=process.argv[2],ref=process.argv[3]||'3adf5a85f5a51452972d8257681804d40c7e1bd6';
if(!output||!path.isAbsolute(output))throw Error('Supply an absolute output directory outside the repository.');
const tests=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(tests,'../../..');
if(output===repo||output.startsWith(repo+path.sep))throw Error('QA output must be outside the repository.');
const dist=path.join(output,'dist');fs.mkdirSync(path.join(output,'.openai'),{recursive:true});
fs.writeFileSync(path.join(output,'.openai/hosting.json'),JSON.stringify({static:{directory:'dist'}}));
for(const variant of ['baseline','game','mobile']){
 const dir=path.join(dist,variant);fs.mkdirSync(dir,{recursive:true});
 for(const name of ['index.html','scenery.js',...(variant==='baseline'?[]:['audio.js'])]){
  let source=variant==='baseline'?execFileSync('git',['show',`${ref}:games/slot-rush/${name}`],{cwd:repo,encoding:'utf8'}):fs.readFileSync(path.join(tests,'..',name),'utf8');
  if(name==='index.html'&&variant!=='mobile')source=source.replace('<script src="scenery.js','<script src="../instrument.js"></script>\n<script src="scenery.js');
  fs.writeFileSync(path.join(dir,name),source);
 }
}
for(const [source,target] of [['browser.html','index.html'],['responsive.html','responsive.html'],['instrument.js','instrument.js'],['audio-browser.html','audio-browser.html']])fs.copyFileSync(path.join(tests,source),path.join(dist,target));
console.log(`QA site ready at ${output}`);
