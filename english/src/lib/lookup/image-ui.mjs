// Catalog mapping Vietnamese static UI phrases in ListeningImage to en, ja, ko, zh-TW.
// Vietnamese returns unchanged; unknown phrases are preserved verbatim.
export const IMAGE_UI_TRANSLATIONS = Object.freeze({
  'Chọn tối đa 2 ảnh JPEG, PNG hoặc WebP, mỗi ảnh dưới 25 MB.': Object.freeze({
    en: 'Select up to 2 JPEG, PNG or WebP images, under 25 MB each.',
    ja: 'JPEG、PNGまたはWebP画像を最大2枚、各25 MB未満で選択してください。',
    ko: 'JPEG, PNG 또는 WebP 이미지를 최대 2장, 각 25MB 이하로 선택하세요.',
    'zh-TW': '最多選取 2 張 JPEG、PNG 或 WebP 圖片，每張小於 25 MB。',
  }),
  'Ảnh bài Listening': Object.freeze({
    en: 'Listening image',
    ja: 'リスニング画像',
    ko: '듣기 이미지',
    'zh-TW': '聽力圖片',
  }),
  'Đang phân tích nền: ': Object.freeze({
    en: 'Background analyzing: ',
    ja: 'バックグラウンド解析中: ',
    ko: '백그라운드 분석 중: ',
    'zh-TW': '背景分析中：',
  }),
  '. Có thể đổi tab, tải lại để tiếp tục.': Object.freeze({
    en: '. You can switch tabs or reload to continue.',
    ja: '。タブの切り替えや再読み込みを行っても続行できます。',
    ko: '. 탭을 전환하거나 새로고침해도 계속됩니다.',
    'zh-TW': '。可切換分頁或重新整理繼續。',
  }),
  'Chưa rõ giới tính: gán giọng khác nhau, không đoán từ tên. Tên chỉ hiện trong transcript, không đọc thành tiếng.': Object.freeze({
    en: 'Unclear gender: distinct voices assigned, not guessed from names. Names only appear in transcript, not voiced.',
    ja: '性別不明: 名前から推測せず別の音声を割り当てます。名前は書き起こしのみに表示され、読み上げられません。',
    ko: '성별 미확인: 이름으로 추측하지 않고 서로 다른 음성을 배정합니다. 이름은 스크립트에만 표시되며 소리 내어 읽지 않습니다.',
    'zh-TW': '未確認性別：分配不同語音，不依姓名猜測。姓名僅顯示於逐字稿，不朗讀。',
  }),
  'Giọng ': Object.freeze({
    en: 'Voice of ',
    ja: '音声: ',
    ko: '음성: ',
    'zh-TW': '聲音：',
  }),
  'Đang tạo MP3 ': Object.freeze({
    en: 'Generating MP3 ',
    ja: 'MP3生成中 ',
    ko: 'MP3 생성 중 ',
    'zh-TW': '正在產生 MP3 ',
  }),
  ' câu…': Object.freeze({
    en: ' sentences…',
    ja: ' 文…',
    ko: '개 문장…',
    'zh-TW': ' 句…',
  }),
  'LRC đo ở 1×. MP3 nối từng câu có thể có khoảng nghỉ. Lời nhúng và phát nền tùy trình nghe hỗ trợ.': Object.freeze({
    en: 'LRC measured at 1×. Joined sentence MP3s may have pauses. Embedded lyrics and background playback depend on player support.',
    ja: 'LRCは1倍速で計測。文ごとに結合されたMP3には無音区間がある場合があります。埋め込み歌詞とバックグラウンド再生はプレーヤーの対応状況によります。',
    ko: 'LRC는 1배속 측정 기준입니다. 문장별로 결합된 MP3에는 간격이 있을 수 있습니다. 가사 내장 및 백그라운드 재생은 플레이어 지원 여부에 따릅니다.',
    'zh-TW': 'LRC 以 1 倍速測量。逐句連接的 MP3 可能有暫停。內嵌歌詞與背景播放取決於播放器支援。',
  }),
  'Đã chọn ': Object.freeze({
    en: 'Selected ',
    ja: '選択済み: ',
    ko: '선택됨: ',
    'zh-TW': '已選取 ',
  }),
  ' ảnh Listening': Object.freeze({
    en: ' listening images',
    ja: ' 枚のリスニング画像',
    ko: '개의 듣기 이미지',
    'zh-TW': ' 張聽力圖片',
  }),
  'Thứ tự bài nghe: ': Object.freeze({
    en: 'Listening order: ',
    ja: 'リスニング順序: ',
    ko: '듣기 순서: ',
    'zh-TW': '聽力順序：',
  }),
  'Khoanh phần đầu trước, phần tiếp nối sau. Hai ảnh sẽ thành một bài nghe.': Object.freeze({
    en: 'Crop the beginning first, the continuation next. The two images will become one listening exercise.',
    ja: '前半を先に、続きを後に切り抜いてください。2枚の画像が1つのリスニング問題になります。',
    ko: '앞부분을 먼저, 이어지는 부분을 다음에 잘라내세요. 두 이미지가 하나의 듣기 학습이 됩니다.',
    'zh-TW': '先框選前半部分，接著框選接續部分。兩張圖片將合併為一課聽力。',
  }),
  'Khoanh vùng ảnh ': Object.freeze({
    en: 'Crop image ',
    ja: '画像を範囲指定 ',
    ko: '이미지 영역 자르기 ',
    'zh-TW': '選取圖片範圍 ',
  }),
  'Đang tải lên server (': Object.freeze({
    en: 'Uploading to server (',
    ja: 'サーバーにアップロード中 (',
    ko: '서버에 업로드 중 (',
    'zh-TW': '正在上傳至伺服器 (',
  }),
  ' MB)…': Object.freeze({
    en: ' MB)…',
    ja: ' MB)…',
    ko: ' MB)…',
    'zh-TW': ' MB)…',
  }),
  '✓ Đã lưu ảnh trên server (': Object.freeze({
    en: '✓ Saved image on server (',
    ja: '✓ サーバーに画像を保存しました (',
    ko: '✓ 서버에 이미지 저장 완료 (',
    'zh-TW': '✓ 已儲存圖片至伺服器 (',
  }),
  ' MB)': Object.freeze({
    en: ' MB)',
    ja: ' MB)',
    ko: ' MB)',
    'zh-TW': ' MB)',
  }),
  'TTS response không phải audio': Object.freeze({
    en: 'TTS response is not audio',
    ja: 'TTS応答が音声ではありません',
    ko: 'TTS 응답이 오디오가 아닙니다',
    'zh-TW': 'TTS 回應不是音訊',
  }),
  'MP3 rỗng': Object.freeze({
    en: 'Empty MP3',
    ja: '空のMP3',
    ko: '빈 MP3',
    'zh-TW': '空白 MP3',
  }),
});

export function translateImage(text, locale = 'vi') {
  if (typeof text !== 'string') return text;
  if (!locale || locale === 'vi') return text;
  const entry = IMAGE_UI_TRANSLATIONS[text];
  if (!entry) return text;
  return entry[locale] ?? text;
}
