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
