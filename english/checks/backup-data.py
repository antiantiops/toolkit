#!/usr/bin/python3
"""Quiesced local backup; leaves services in their original running state."""
import datetime,fcntl,hashlib,json,os,signal,sqlite3,subprocess,sys,tarfile

LOCK_PATH=os.environ.get('VOCAB_BACKUP_LOCK','/tmp/vocab-backup-internal.lock')
lock_fd=os.open(LOCK_PATH,os.O_RDWR|os.O_CREAT,0o600)
try:
 fcntl.flock(lock_fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
except BlockingIOError:
 sys.stderr.write('Backup already running\n')
 sys.exit(1)

def _sigterm_handler(signum,frame):
 sys.exit(128+signum)

signal.signal(signal.SIGTERM,_sigterm_handler)

base=os.environ.get('VOCAB_BACKUP_DIR','/home/docker/vocab-backups/scheduled')
names=['vocab-learner','english-spotify-worker'];running=[]
restart_failures=[]
backup_success=False
r=None

try:
 os.makedirs(base,mode=0o700,exist_ok=True)
 r=base+'/'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
 os.makedirs(r,mode=0o700,exist_ok=True)
 for name in names:
  c=json.loads(subprocess.check_output(['docker','inspect',name]))[0]
  if name=='vocab-learner':
   fd=os.open(r+'/container.json',os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
   with os.fdopen(fd,'w') as f:json.dump(c,f)
  if c['State']['Running']:running.append(name)
 for name in running:subprocess.run(['docker','stop','--time','60',name],check=True,stdout=subprocess.DEVNULL)
 for name in ['words','lookup']:
  p='/home/docker/vocab-learner/data/'+name+'.sqlite'
  if not os.path.exists(p):
   raise FileNotFoundError(f'Database missing: {p}')
  with sqlite3.connect('file:'+p+'?mode=ro',uri=True) as src,sqlite3.connect(r+'/'+name+'.sqlite') as dst:
   src.backup(dst);assert dst.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
 with tarfile.open(r+'/data.tar.gz','w:gz') as t:t.add('/home/docker/vocab-learner/data',arcname='data')
 with open(r+'/SHA256SUMS','w') as f:
  for name in ['words.sqlite','lookup.sqlite','data.tar.gz']:
   h=hashlib.sha256()
   with open(r+'/'+name,'rb') as s:
    for b in iter(lambda:s.read(1024*1024),b''):h.update(b)
   f.write(h.hexdigest()+'  '+name+'\n')
 backup_success=True
finally:
 for name in running:
  res=subprocess.run(['docker','start',name],stdout=subprocess.DEVNULL)
  if res.returncode!=0:
   restart_failures.append(name)
 if restart_failures:
  sys.stderr.write(f"Failed to restart services: {', '.join(restart_failures)}\n")
 elif backup_success:
  print('BACKUP_OK',r)
 try:
  fcntl.flock(lock_fd,fcntl.LOCK_UN)
  os.close(lock_fd)
 except OSError:
  pass
 if restart_failures:
  sys.exit(2)
# Keep all incident snapshots outside scheduled/. Keep >=14 daily and 8 weekly
# scheduled generations; no retention deletion until policy is separately reviewed.
