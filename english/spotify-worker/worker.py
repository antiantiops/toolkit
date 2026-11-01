import glob,json,os,subprocess,time,re
from mutagen.mp3 import MP3
from mutagen.id3 import ID3
from quality import process,tone
ROOT='/cache'
os.makedirs(ROOT,exist_ok=True)
while True:
    process()
    tone()
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
