import glob,json,os,subprocess,time,re
ROOT='/cache'
os.makedirs(ROOT,exist_ok=True)
while True:
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
            save({'status':'completed','title':os.path.basename(file)[:-4]})
        except Exception as e: save({'status':'failed','error':str(e)[:300]})
    time.sleep(2)
