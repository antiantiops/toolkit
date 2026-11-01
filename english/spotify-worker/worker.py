import glob,json,os,subprocess,time,re,tempfile,shutil
from mutagen.mp3 import MP3
from mutagen.id3 import ID3
from quality import process,tone,edm
ROOT='/cache'
os.makedirs(ROOT,exist_ok=True)
while True:
    process()
    tone()
    edm()
    for marker in glob.glob(ROOT+'/*/redownload.json'):
        folder=os.path.dirname(marker)
        if not re.fullmatch(r'[A-Za-z0-9]{22}',os.path.basename(folder)):continue
        try:
            with tempfile.TemporaryDirectory(dir=folder) as stage:
                result=subprocess.run(['spotdl','download','https://open.spotify.com/track/'+os.path.basename(folder),'--format','mp3','--output',stage+'/{title} - {artists}.{output-ext}'],capture_output=True,text=True,timeout=600)
                files=glob.glob(stage+'/*.mp3')
                if result.returncode or len(files)!=1 or os.path.getsize(files[0])>100*1024*1024:raise ValueError('Download failed')
                tags=ID3(files[0]);duration=MP3(files[0]).info.length
                # Keep previous source recoverable; publish only validated download.
                shutil.copy2(folder+'/audio.mp3',folder+'/audio.before-redownload.mp3')
                os.replace(files[0],folder+'/audio.mp3')
                for name in ['quality.json','quality-request.json','tone.json','tone-request.json','tone.lock','edm.json','edm-request.json','edm.flac','balanced.flac','tone.flac']:
                    file=folder+'/'+name
                    if os.path.exists(file):os.replace(file,file+'.before-redownload')
                covers=tags.getall('APIC')
                if covers:
                    with open(folder+'/cover','wb') as f:f.write(covers[0].data)
                state={'status':'completed','title':str(tags.get('TIT2','')),'artist':str(tags.get('TPE1','')),'duration':duration,'cover':bool(covers),'created':time.time()}
                with open(folder+'/state.json.tmp','w') as f:json.dump(state,f)
                os.replace(folder+'/state.json.tmp',folder+'/state.json')
        except Exception:
            try:
                file=folder+'/state.json';state=json.load(open(file));state['reloadError']='Tải lại thất bại; giữ file cũ.'
                with open(file,'w') as f:json.dump(state,f)
            except Exception:pass
        finally:
            if os.path.exists(marker):os.unlink(marker)
    for request in glob.glob(ROOT+'/*/request.json'):
        folder=os.path.dirname(request)
        if not re.fullmatch(r'[A-Za-z0-9]{22}',os.path.basename(folder)): continue
        state=folder+'/state.json'
        if os.path.exists(state): continue
        def save(data):
            with open(state+'.tmp','w') as f: json.dump(data,f)
            os.replace(state+'.tmp',state)
        save({'status':'running'})
        try:
            result=subprocess.run(['spotdl','download','https://open.spotify.com/track/'+os.path.basename(folder),'--format','mp3','--output',folder+'/{title} - {artists}.{output-ext}'],capture_output=True,text=True,timeout=600)
            files=glob.glob(folder+'/*.mp3')
            if result.returncode or not files: raise RuntimeError('spotDL không tải được bài. Nguồn có thể chặn hoặc không tìm được bản khớp.')
            file=files[0]
            if os.path.getsize(file)>100*1024*1024: raise RuntimeError('Bài vượt giới hạn 100 MB')
            os.replace(file,folder+'/audio.mp3')
            tags=ID3(folder+'/audio.mp3')
            title=str(tags.get('TIT2',os.path.basename(file)[:-4]))
            artist=str(tags.get('TPE1',''))
            covers=tags.getall('APIC')
            if covers:
                with open(folder+'/cover','wb') as f: f.write(covers[0].data)
            save({'status':'completed','title':title,'artist':artist,'duration':MP3(folder+'/audio.mp3').info.length,'cover':bool(covers),'created':time.time()})
        except Exception as e: save({'status':'failed','error':str(e)[:300]})
    time.sleep(2)
