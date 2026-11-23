import express from 'express';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const app=express();
const dir='/tmp/xauusd-output';mkdirSync(dir,{recursive:true});
let job={status:'idle',message:'Ready',file:null};
app.use(express.static('public'));
app.post('/api/start',(req,res)=>{
 if(job.status==='running') return res.json(job);
 job={status:'running',message:'Downloading XAUUSD 5-minute candles from Dukascopy. This may take several minutes.',file:null};
 const args=['dukascopy-node','-i','xauusd','-from','2024-11-23','-to','2026-11-24','-t','m5','-f','csv','-v','-p','bid','-dir',dir,'-fn','xauusd_m5_2024-11-23_to_2026-11-23','--cache','--retries','3','--batch-size','5','--batch-pause','1000'];
 const child=spawn(join(process.cwd(),'node_modules','.bin',args[0]),args.slice(1),{cwd:process.cwd(),env:process.env});
 let log='';
 child.stdout.on('data',b=>{log=(log+b.toString()).slice(-3000);});
 child.stderr.on('data',b=>{log=(log+b.toString()).slice(-3000);});
 child.on('error',e=>{job={status:'error',message:e.message,file:null};});
 child.on('close',code=>{
  if(job.status==='error')return;
  const files=readdirSync(dir).filter(f=>f.endsWith('.csv'));
  const file=files.find(f=>f.startsWith('xauusd_m5_'));
  if(code===0 && file && statSync(join(dir,file)).size>1000){job={status:'ready',message:'Your CSV is ready.',file};}
  else job={status:'error',message:`Download failed (exit ${code}). ${log.slice(-600)}`,file:null};
 });
 res.json(job);
});
app.get('/api/status',(req,res)=>res.json(job));
app.get('/api/download',(req,res)=>{
 if(job.status!=='ready'||!job.file||!existsSync(join(dir,job.file)))return res.status(404).send('CSV not ready');
 res.download(join(dir,job.file),job.file);
});
app.listen(process.env.PORT||3000,'0.0.0.0');
