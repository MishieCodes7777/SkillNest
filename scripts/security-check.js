// Narrow working-tree/staged file hygiene check; never prints secret values.
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const files=execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard'],{encoding:'utf8'}).split('\0').filter(Boolean);
let failed=false;
for(const file of files){
    if(!fs.existsSync(file)||file==='AGENTS.md')continue;
    if(/(^|\/)\.env(?:\.|$)/.test(file)&&!file.endsWith('.env.example')){console.error('Forbidden environment file:',file);failed=true;continue;}
    const stat=fs.statSync(file);if(!stat.isFile()||stat.size>2e6)continue;
    if(/\.(?:png|jpg|jpeg|webp|woff2?|pdf|zip)$/.test(file))continue;
    const content=fs.readFileSync(file,'utf8');
    if(/(?:gsk_|github_pat_|ghp_)[A-Za-z0-9_]{25,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|postgres(?:ql)?:\/\/[^\s:'"]+:[^\s@'"]+@/.test(content)){
        console.error('Possible secret in file (value withheld):',file);failed=true;
    }
}
if(failed)process.exitCode=1;else console.log('PASS: narrow secret/file hygiene check. This is not a full-history audit or credential rotation.');
