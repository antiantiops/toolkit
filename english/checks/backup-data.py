#!/usr/bin/python3
"""Quiesced local backup; leaves services in their original running state."""
import datetime,hashlib,json,os,sqlite3,subprocess,tarfile
base='/home/docker/vocab-backups/scheduled'
os.makedirs(base,mode=0o700,exist_ok=True)
r=base+'/'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
os.mkdir(r,0o700)
names=['vocab-learner','english-spotify-worker'];running=[]
try:
 for name in names:
  c=json.loads(subprocess.check_output(['docker','inspect',name]))[0]
  if name=='vocab-learner':
   fd=os.open(r+'/container.json',os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
   with os.fdopen(fd,'w') as f:json.dump(c,f)
  if c['State']['Running']:running.append(name)
 for name in running:subprocess.run(['docker','stop','--time','60',name],check=True,stdout=subprocess.DEVNULL)
 for name in ['words','lookup']:
  p='/home/docker/vocab-learner/data/'+name+'.sqlite'
  with sqlite3.connect('file:'+p+'?mode=ro',uri=True) as src,sqlite3.connect(r+'/'+name+'.sqlite') as dst:
   src.backup(dst);assert dst.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
 with tarfile.open(r+'/data.tar.gz','w:gz') as t:t.add('/home/docker/vocab-learner/data',arcname='data')
 with open(r+'/SHA256SUMS','w') as f:
  for name in ['words.sqlite','lookup.sqlite','data.tar.gz']:
   h=hashlib.sha256()
   with open(r+'/'+name,'rb') as s:
    for b in iter(lambda:s.read(1024*1024),b''):h.update(b)
   f.write(h.hexdigest()+'  '+name+'\n')
 print('BACKUP_OK',r)
finally:
 for name in running:subprocess.run(['docker','start',name],check=True,stdout=subprocess.DEVNULL)
# Keep all incident snapshots outside scheduled/. Keep >=14 daily and 8 weekly
# scheduled generations; no retention deletion until policy is separately reviewed.
