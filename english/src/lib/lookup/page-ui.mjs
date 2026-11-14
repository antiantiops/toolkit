// Catalog mapping Vietnamese lower-page controls in Home to translations in en, ja, ko, zh-TW
// Vietnamese returns unchanged; unknown phrases are preserved verbatim.
export const PAGE_UI_TRANSLATIONS = Object.freeze({
  // 1. Vocab upload & controls
  'Kéo thả ảnh trang từ vựng vào đây hoặc bấm chọn': Object.freeze({
    en: 'Drag and drop vocab page image here or click to browse',
    ja: 'ここに語彙ページの画像をドラッグ＆ドロップするか、クリックして選択',
    ko: '여기에 어휘 페이지 이미지를 드래그 앤 드롭하거나 클릭하여 선택하세요',
    'zh-TW': '將單字頁面圖片拖曳至此或點擊選取',
  }),
  'Đang phân tích...': Object.freeze({
    en: 'Analyzing...',
    ja: '分析中...',
    ko: '분석 중...',
    'zh-TW': '正在分析...',
  }),
  '🔍 Phân tích từ vựng': Object.freeze({
    en: '🔍 Analyze vocabulary',
    ja: '🔍 語彙を分析',
    ko: '🔍 어휘 분석',
    'zh-TW': '🔍 分析單字',
  }),
  'Thử lại nhóm lỗi': Object.freeze({
    en: 'Retry failed groups',
    ja: 'エラーグループを再試行',
    ko: '실패한 그룹 재시도',
    'zh-TW': '重試失敗組別',
  }),
  '✕ Xóa bài / Bài mới': Object.freeze({
    en: '✕ Clear lesson / New lesson',
    ja: '✕ レッスンを消去 / 新規レッスン',
    ko: '✕ 단원 삭제 / 새 단원',
    'zh-TW': '✕ 清除課文 / 新課文',
  }),
  '✍️ Practice test': Object.freeze({
    en: '✍️ Practice test',
    ja: '✍️ 練習テスト',
    ko: '✍️ 연습 시험',
    'zh-TW': '✍️ 練習測驗',
  }),

  // 2. Vocab practice controls & headings
  '← Quay lại từ vựng': Object.freeze({
    en: '← Back to vocabulary',
    ja: '← 語彙に戻る',
    ko: '← 어휘로 돌아가기',
    'zh-TW': '← 返回單字',
  }),
  'Bài 1: Chọn từ lạc nhóm': Object.freeze({
    en: 'Test 1: Odd one out',
    ja: 'テスト 1: 仲間外れを選ぶ',
    ko: '연습 1: 다른 종류 단어 고르기',
    'zh-TW': '測驗 1：選出異類單字',
  }),
  'Bài 2: Điền từ': Object.freeze({
    en: 'Test 2: Fill in the blanks',
    ja: 'テスト 2: 穴埋め',
    ko: '연습 2: 빈칸 채우기',
    'zh-TW': '測驗 2：填空題',
  }),
  'Tạo bài 1': Object.freeze({
    en: 'Generate Test 1',
    ja: 'テスト 1 を作成',
    ko: '연습 1 만들기',
    'zh-TW': '建立測驗 1',
  }),
  'Chấm điểm': Object.freeze({
    en: 'Check score',
    ja: '採点する',
    ko: '채점하기',
    'zh-TW': '評分',
  }),
  'Điền từ vào đây': Object.freeze({
    en: 'Enter word here',
    ja: 'ここに単語を入力',
    ko: '여기에 단어 입력',
    'zh-TW': '在此填入單字',
  }),

  // 3. Grammar upload & controls
  'Kéo thả ảnh trang ngữ pháp vào đây hoặc bấm chọn': Object.freeze({
    en: 'Drag and drop grammar page image here or click to browse',
    ja: 'ここに文法ページの画像をドラッグ＆ドロップするか、クリックして選択',
    ko: '여기에 문법 페이지 이미지를 드래그 앤 드롭하거나 클릭하여 선택하세요',
    'zh-TW': '將文法頁面圖片拖曳至此或點擊選取',
  }),
  '🔍 Phân tích ngữ pháp': Object.freeze({
    en: '🔍 Analyze grammar',
    ja: '🔍 文法を分析',
    ko: '🔍 문법 분석',
    'zh-TW': '🔍 分析文法',
  }),
  'Thử lại phần lỗi': Object.freeze({
    en: 'Retry failed parts',
    ja: 'エラー部分を再試行',
    ko: '실패한 부분 재시도',
    'zh-TW': '重試失敗部分',
  }),
  '✍️ Luyện tập': Object.freeze({
    en: '✍️ Practice',
    ja: '✍️ 練習する',
    ko: '✍️ 연습하기',
    'zh-TW': '✍️ 練習',
  }),

  // 4. Grammar practice controls & headings
  '← Quay lại ngữ pháp': Object.freeze({
    en: '← Back to grammar',
    ja: '← 文法に戻る',
    ko: '← 문법으로 돌아가기',
    'zh-TW': '← 返回文法',
  }),
  'Bài 1: Trắc nghiệm': Object.freeze({
    en: 'Test 1: Multiple choice',
    ja: 'テスト 1: 選択式問題',
    ko: '연습 1: 객관식',
    'zh-TW': '測驗 1：選擇題',
  }),
  'Bài 2: Viết lại câu': Object.freeze({
    en: 'Test 2: Sentence rewrite',
    ja: 'テスト 2: 文の書き換え',
    ko: '연습 2: 문장 다시 쓰기',
    'zh-TW': '測驗 2：改寫句子',
  }),
  'Viết lại câu ở đây': Object.freeze({
    en: 'Rewrite the sentence here',
    ja: 'ここに文を書き換えて入力',
    ko: '여기에 문장을 다시 작성하세요',
    'zh-TW': '在此改寫句子',
  }),

  // 5. Writing upload & controls
  'Trang 1 · Bài mẫu (Sample)': Object.freeze({
    en: 'Page 1 · Sample Writing',
    ja: 'ページ 1 · 例文 (Sample)',
    ko: '1페이지 · 모범 예문 (Sample)',
    'zh-TW': '第 1 頁 · 範文 (Sample)',
  }),
  'Đang tải...': Object.freeze({
    en: 'Uploading...',
    ja: 'アップロード中...',
    ko: '업로드 중...',
    'zh-TW': '正在上傳...',
  }),
  '✓ Đã lưu server': Object.freeze({
    en: '✓ Saved on server',
    ja: '✓ サーバー保存完了',
    ko: '✓ 서버에 저장됨',
    'zh-TW': '✓ 已儲存於伺服器',
  }),
  '✕ Xóa': Object.freeze({
    en: '✕ Remove',
    ja: '✕ 削除',
    ko: '✕ 삭제',
    'zh-TW': '✕ 刪除',
  }),
  'Thử tải lại': Object.freeze({
    en: 'Retry upload',
    ja: '再アップロード',
    ko: '다시 업로드',
    'zh-TW': '重試上傳',
  }),
  'Đổi ảnh khác': Object.freeze({
    en: 'Change image',
    ja: '別の画像に変更',
    ko: '다른 이미지로 변경',
    'zh-TW': '更換其他圖片',
  }),
  'Ảnh trang bài mẫu': Object.freeze({
    en: 'Sample writing page image',
    ja: '例文ページの画像',
    ko: '모범 예문 페이지 이미지',
    'zh-TW': '範文頁面圖片',
  }),
  'Trang 2 · Bài tập (Self-Writing)': Object.freeze({
    en: 'Page 2 · Exercise (Self-Writing)',
    ja: 'ページ 2 · 演習 (Self-Writing)',
    ko: '2페이지 · 연습 과제 (Self-Writing)',
    'zh-TW': '第 2 頁 · 練習題 (Self-Writing)',
  }),
  'Chờ Trang 1 tải lên xong': Object.freeze({
    en: 'Wait for Page 1 to finish uploading',
    ja: 'ページ 1 のアップロード完了をお待ちください',
    ko: '1페이지 업로드가 완료될 때까지 기다리세요',
    'zh-TW': '等待第 1 頁上傳完成',
  }),
  'Bỏ qua Trang 1 → Tải thẳng Trang 2': Object.freeze({
    en: 'Skip Page 1 → Upload Page 2 directly',
    ja: 'ページ 1 をスキップ → ページ 2 を直接アップロード',
    ko: '1페이지 건너뛰기 → 2페이지 직접 업로드',
    'zh-TW': '略過第 1 頁 → 直接上傳第 2 頁',
  }),
  'Ảnh trang bài tập': Object.freeze({
    en: 'Exercise page image',
    ja: '演習ページの画像',
    ko: '연습 과제 페이지 이미지',
    'zh-TW': '練習題頁面圖片',
  }),
  'Đang phân tích bài viết...': Object.freeze({
    en: 'Analyzing writing lesson...',
    ja: 'ライティングを分析中...',
    ko: '작문 분석 중...',
    'zh-TW': '正在分析寫作...',
  }),
  'Đang tải ảnh lên server...': Object.freeze({
    en: 'Uploading images to server...',
    ja: '画像をサーバーにアップロード中...',
    ko: '서버에 이미지를 업로드하는 중...',
    'zh-TW': '正在上傳圖片至伺服器...',
  }),
  'Vui lòng chọn ảnh': Object.freeze({
    en: 'Please select an image',
    ja: '画像を選択してください',
    ko: '이미지를 선택해주세요',
    'zh-TW': '請選取圖片',
  }),

  // 6. Writing analyze button text variations
  '🔍 Phân tích trọn bộ Unit (Bài mẫu + Bài tập Self-Writing)': Object.freeze({
    en: '🔍 Analyze full Unit (Sample + Self-Writing exercise)',
    ja: '🔍 ユニット全体を分析 (例文 + 演習課題)',
    ko: '🔍 전체 단원 분석 (모범 예문 + Self-Writing 연습)',
    'zh-TW': '🔍 分析完整單元 (範文 + Self-Writing 練習)',
  }),
  '🔍 Phân tích bài mẫu (Trang 1)': Object.freeze({
    en: '🔍 Analyze sample (Page 1)',
    ja: '🔍 例文を分析 (ページ 1)',
    ko: '🔍 모범 예문 분석 (1페이지)',
    'zh-TW': '🔍 分析範文 (第 1 頁)',
  }),
  '🔍 Phân tích bài tập (Trang 2)': Object.freeze({
    en: '🔍 Analyze exercise (Page 2)',
    ja: '🔍 演習を分析 (ページ 2)',
    ko: '🔍 연습 과제 분석 (2페이지)',
    'zh-TW': '🔍 分析練習題 (第 2 頁)',
  }),

  // 7. Listening source tabs
  'Ảnh bài nghe': Object.freeze({
    en: 'Listening image',
    ja: 'リスニング画像',
    ko: '듣기 이미지',
    'zh-TW': '聽力圖片',
  }),
  'File audio': Object.freeze({
    en: 'Audio file',
    ja: '音声ファイル',
    ko: '오디오 파일',
    'zh-TW': '音訊檔案',
  }),
  'Văn bản': Object.freeze({
    en: 'Text',
    ja: 'テキスト',
    ko: '텍스트',
    'zh-TW': '文字',
  }),
  'Spotify': Object.freeze({
    en: 'Spotify',
    ja: 'Spotify',
    ko: 'Spotify',
    'zh-TW': 'Spotify',
  }),

  // 8. Popup / Lookup
  'Ghi âm để luyện phát âm': Object.freeze({
    en: 'Record to practice pronunciation',
    ja: '発音練習のために録音',
    ko: '발음 연습을 위해 녹음',
    'zh-TW': '錄音以練習發音',
  }),
  'Luyện nói': Object.freeze({
    en: 'Speaking practice',
    ja: 'スピーキング練習',
    ko: '말하기 연습',
    'zh-TW': '口說練習',
  }),
  'Thu gọn': Object.freeze({
    en: 'Collapse',
    ja: '折りたたむ',
    ko: '접기',
    'zh-TW': '收起',
  }),
  'Đang tra nghĩa…': Object.freeze({
    en: 'Looking up meaning…',
    ja: '意味を検索中…',
    ko: '의미 찾는 중…',
    'zh-TW': '正在查詢釋義…',
  }),

  // 9. Upload confirmation modal
  'Đang tải ảnh lên server...': Object.freeze({
    en: 'Uploading image to server...',
    ja: '画像をサーバーにアップロード中...',
    ko: '서버에 이미지를 업로드하는 중...',
    'zh-TW': '正在上傳圖片至伺服器...',
  }),
  'Tải ảnh không thành công': Object.freeze({
    en: 'Image upload failed',
    ja: '画像のアップロードに失敗しました',
    ko: '이미지 업로드에 실패했습니다',
    'zh-TW': '圖片上傳失敗',
  }),
  'Ảnh đã sẵn sàng!': Object.freeze({
    en: 'Image is ready!',
    ja: '画像の準備ができました！',
    ko: '이미지가 준비되었습니다!',
    'zh-TW': '圖片已準備就緒！',
  }),
  'Đang tải lên server (': Object.freeze({
    en: 'Uploading to server (',
    ja: 'サーバーにアップロード中 (',
    ko: '서버에 업로드 중 (',
    'zh-TW': '正在上傳至伺服器 (',
  }),
  ' MB)...': Object.freeze({
    en: ' MB)...',
    ja: ' MB)...',
    ko: ' MB)...',
    'zh-TW': ' MB)...',
  }),
  '✓ Đã lưu ảnh trên server (': Object.freeze({
    en: '✓ Saved image on server (',
    ja: '✓ サーバーに画像を保存しました (',
    ko: '✓ 서버에 이미지를 저장했습니다 (',
    'zh-TW': '✓ 已將圖片儲存至伺服器 (',
  }),
  ' MB). Nhấn bên dưới để AI phân tích.': Object.freeze({
    en: ' MB). Click below for AI analysis.',
    ja: ' MB). AI分析を開始するには下をクリックしてください。',
    ko: ' MB). AI 분석을 시작하려면 아래를 클릭하세요.',
    'zh-TW': ' MB)。點擊下方開始 AI 分析。',
  }),
  'Để sau': Object.freeze({
    en: 'Later',
    ja: '後で',
    ko: '나중에',
    'zh-TW': '稍後',
  }),
  'Thử lại': Object.freeze({
    en: 'Retry',
    ja: '再試行',
    ko: '다시 시도',
    'zh-TW': '重試',
  }),
  'Đang tải...': Object.freeze({
    en: 'Uploading...',
    ja: 'アップロード中...',
    ko: '업로드 중...',
    'zh-TW': '正在上傳...',
  }),
  'OK, phân tích': Object.freeze({
    en: 'OK, analyze',
    ja: 'OK、分析する',
    ko: '확인, 분석하기',
    'zh-TW': 'OK，開始分析',
  }),
});

/**
 * Translates lower-page static controls to the target locale.
 * Fallback to original text if unsupported or unknown.
 */
export function translatePage(text, locale = 'vi') {
  if (typeof text !== 'string' || !text || locale === 'vi') {
    return text;
  }
  const entry = PAGE_UI_TRANSLATIONS[text];
  if (!entry) {
    return text;
  }
  return entry[locale] ?? text;
}
