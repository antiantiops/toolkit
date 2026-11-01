import glob,json,os,re,subprocess,math

def process():
 for request in glob.glob('/cache/*/quality-request.json'):
  folder=os.path.dirname(request);report=folder+'/quality.json'
  if os.path.exists(report):continue
  def save(data):
   with open(report+'.tmp','w') as f:json.dump(data,f)
   os.replace(report+'.tmp',report)
  try:
   source=folder+'/audio.mp3'
   run=subprocess.run(['ffmpeg','-hide_banner','-i',source,'-af','loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True,timeout=180,check=True)
   m=re.search(r'\{\s*"input_i"[\s\S]*?\}',run.stderr)
   if not m:raise ValueError('Không đo được loudness')
   data=json.loads(m.group());i=float(data['input_i']);peak=float(data['input_tp']);lra=float(data['input_lra'])
   if not all(math.isfinite(v) for v in [i,peak,lra]):raise ValueError('Audio im lặng hoặc số đo không hợp lệ')
   gain=min(3.0,-16-i,-1.5-peak);gain=max(-12.0,gain)
   if peak+gain>-1.5+0.01:raise ValueError('Nguồn vượt giới hạn gain an toàn; giữ bản gốc')
   if abs(gain)<0.25:gain=0.0
   subprocess.run(['ffmpeg','-y','-v','error','-i',source,'-map','0:a:0','-af',f'volume={gain}dB','-c:a','flac','-sample_fmt','s32',folder+'/balanced.tmp.flac'],capture_output=True,timeout=180,check=True)
   os.replace(folder+'/balanced.tmp.flac',folder+'/balanced.flac')
   save({'status':'completed','integratedLufs':i,'truePeakDbtp':peak,'lraLu':lra,'gainDb':round(gain,3),'note':'Chỉ gain cố định; không EQ, compressor, denoise, đổi tốc độ/cao độ. FLAC mã hóa lossless từ MP3 đã giải mã, không phục hồi dữ liệu nguồn.'})
  except Exception:save({'status':'failed','error':'Không xử lý an toàn được audio; giữ file gốc.'})

def tone():
 for request in glob.glob('/cache/*/tone-request.json'):
  folder=os.path.dirname(request);report=folder+'/tone.json'
  if os.path.exists(report):continue
  try:
   plan=json.load(open(request));bass=float(plan['bassDb']);presence=float(plan['presenceDb'])
   if not all(math.isfinite(v) and 0<=v<=2 for v in [bass,presence]):raise ValueError('Invalid EQ')
   eq=f'equalizer=f=90:t=q:w=0.7:g={bass},equalizer=f=2500:t=q:w=0.8:g={presence}'
   def measure(filters):
    r=subprocess.run(['ffmpeg','-hide_banner','-i',folder+'/audio.mp3','-af',filters+',loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True,timeout=180,check=True)
    d=json.loads(re.search(r'\{\s*"input_i"[\s\S]*?\}',r.stderr).group());return float(d['input_i']),float(d['input_tp'])
   loud,peak=measure(eq)
   if not all(math.isfinite(v) for v in [loud,peak]):raise ValueError('Invalid audio')
   gain=min(3,-16-loud,-1.5-peak)
   if gain < -18:raise ValueError('Unsafe gain')
   subprocess.run(['ffmpeg','-y','-v','error','-i',folder+'/audio.mp3','-map','0:a:0','-af',eq+f',volume={gain}dB','-c:a','flac','-sample_fmt','s32',folder+'/tone.tmp.flac'],capture_output=True,timeout=180,check=True)
   # Verify final encoded output, not only estimated gain.
   r=subprocess.run(['ffmpeg','-hide_banner','-i',folder+'/tone.tmp.flac','-af','loudnorm=print_format=json','-f','null','-'],capture_output=True,text=True,timeout=180,check=True)
   out=json.loads(re.search(r'\{\s*"input_i"[\s\S]*?\}',r.stderr).group())
   if float(out['input_tp']) > -1.4:raise ValueError('Peak unsafe')
   os.replace(folder+'/tone.tmp.flac',folder+'/tone.flac')
   result={'status':'completed',**plan,'outputLufs':float(out['input_i']),'outputTruePeak':float(out['input_tp']),'sourceLufs':plan['sourceLufs']}
  except Exception:result={'status':'failed','error':'Không tạo được EQ trong ngưỡng an toàn; giữ bản gốc.'}
  with open(report+'.tmp','w') as f:json.dump(result,f)
  os.replace(report+'.tmp',report)
