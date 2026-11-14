// Translation dictionary for PronunciationRecorder UI controls
// Locales: en, ja, ko, zh-TW. Vietnamese identity returns original text.
// Preserves model assessment, source English, IPA, and scores unchanged.

export const PRONUNCIATION_UI_TRANSLATIONS = Object.freeze({
  'Luyện phát âm': Object.freeze({
    en: 'Pronunciation practice',
    ja: '発音練習',
    ko: '발음 연습',
    'zh-TW': '發音練習',
  }),
  'Chưa có điểm': Object.freeze({
    en: 'No score yet',
    ja: 'スコアなし',
    ko: '점수 없음',
    'zh-TW': '尚無評分',
  }),
  'Độ chính xác': Object.freeze({
    en: 'Accuracy',
    ja: '正確さ',
    ko: '정확도',
    'zh-TW': '準確度',
  }),
  'Hãy nói từ / cụm sau': Object.freeze({
    en: 'Speak the following word / phrase',
    ja: '次の単語・フレーズを発音してください',
    ko: '다음 단어 / 문구를 말해보세요',
    'zh-TW': '請讀出下列單字／片語',
  }),
  'Bản ghi cần dài 0,2–30 giây.': Object.freeze({
    en: 'Recording must be 0.2–30 seconds long.',
    ja: '録音は0.2〜30秒間である必要があります。',
    ko: '녹음은 0.2~30초 사이여야 합니다.',
    'zh-TW': '錄音長度需介於 0.2 至 30 秒。',
  }),
  'Ghi âm cần HTTPS và trình duyệt hỗ trợ microphone.': Object.freeze({
    en: 'Recording requires HTTPS and browser microphone support.',
    ja: '録音にはHTTPSとマイク対応ブラウザが必要です。',
    ko: '녹음에는 HTTPS 및 마이크 지원 브라우저가 필요합니다.',
    'zh-TW': '錄音需要 HTTPS 與支援麥克風的瀏覽器。',
  }),
  'Ghi âm lỗi. Thử thu lại.': Object.freeze({
    en: 'Recording error. Try recording again.',
    ja: '録音エラー。もう一度録音してください。',
    ko: '녹음 오류입니다. 다시 녹음해 보세요.',
    'zh-TW': '錄音發生錯誤。請重新錄音。',
  }),
  'Microphone bị từ chối. Cho phép microphone trong cài đặt trình duyệt rồi thử lại.': Object.freeze({
    en: 'Microphone access denied. Allow microphone in browser settings and try again.',
    ja: 'マイクへのアクセスが拒否されました。ブラウザ設定でマイクを許可して再試行してください。',
    ko: '마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크를 허용한 후 다시 시도하세요.',
    'zh-TW': '麥克風已被拒絕存取。請在瀏覽器設定中允許麥克風後再試。',
  }),
  'Yêu cầu thất bại': Object.freeze({
    en: 'Request failed',
    ja: 'リクエスト失敗',
    ko: '요청 실패',
    'zh-TW': '請求失敗',
  }),
  'Gemini phản hồi chậm. Server đang thử lại, không cần gửi thêm.': Object.freeze({
    en: 'Gemini is responding slowly. Server is retrying, no need to resend.',
    ja: 'Geminiの応答が遅延しています。サーバーが再試行中のため再送信は不要です。',
    ko: 'Gemini 응답이 지연되고 있습니다. 서버가 재시도 중이므로 다시 제출할 필요가 없습니다.',
    'zh-TW': 'Gemini 回應較慢。伺服器重試中，無須重複提交。',
  }),
  'Server đã lưu bản ghi. Đang chờ Gemini đánh giá…': Object.freeze({
    en: 'Recording saved on server. Waiting for Gemini assessment…',
    ja: '録音がサーバーに保存されました。Geminiによる評価を待機中…',
    ko: '서버에 녹음이 저장되었습니다. Gemini 평가를 대기 중…',
    'zh-TW': '伺服器已儲存錄音。正在等待 Gemini 評估…',
  }),
  'Kết nối gián đoạn. Đang nối lại để nhận kết quả; không gửi lại audio.': Object.freeze({
    en: 'Connection interrupted. Reconnecting to fetch result; not resending audio.',
    ja: '接続が中断されました。結果取得のために再接続中（音声の再送信は行いません）。',
    ko: '연결이 중단되었습니다. 결과를 받기 위해 재연결 중입니다 (오디오 재전송 안 함).',
    'zh-TW': '連線中斷。正在重新連線以取得結果；不重新傳送音訊。',
  }),
  'Bản ghi đã lưu. Bấm Kiểm tra kết quả để nối lại.': Object.freeze({
    en: 'Recording saved. Click Check Result to reconnect.',
    ja: '録音が保存されました。「結果を確認」をクリックして再接続してください。',
    ko: '녹음이 저장되었습니다. 결과를 확인하려면 결과 확인을 누르세요.',
    'zh-TW': '錄音已儲存。請點擊「檢查結果」重新連線。',
  }),
  'Đang nối lại bản ghi đã lưu…': Object.freeze({
    en: 'Reconnecting to saved recording…',
    ja: '保存された録音に再接続中…',
    ko: '저장된 녹음에 다시 연결 중…',
    'zh-TW': '正在重新連線至已儲存的錄音…',
  }),
  'Đang gửi bản ghi lên server…': Object.freeze({
    en: 'Sending recording to server…',
    ja: '録音をサーバーに送信中…',
    ko: '녹음을 서버로 전송 중…',
    'zh-TW': '正在將錄音傳送至伺服器…',
  }),
  'Chưa có bản ghi để đánh giá.': Object.freeze({
    en: 'No recording to assess.',
    ja: '評価する録音がありません。',
    ko: '평가할 녹음이 없습니다.',
    'zh-TW': '尚無可評估的錄音。',
  }),
  'Server chưa xác nhận lưu bản ghi. Thử gửi lại.': Object.freeze({
    en: 'Server did not confirm recording save. Try sending again.',
    ja: 'サーバーが録音の保存を確認していません。再送信してください。',
    ko: '서버에서 녹음 저장을 확인하지 못했습니다. 다시 전송해 보세요.',
    'zh-TW': '伺服器未確認儲存錄音。請嘗試重新傳送。',
  }),
  'Chưa nhận xác nhận từ server. Bản ghi còn đây; gửi lại sẽ tự nhận diện, không tạo đánh giá trùng.': Object.freeze({
    en: 'No confirmation from server yet. Recording preserved; resending will recognize it without creating duplicate assessment.',
    ja: 'サーバーからの確認がまだありません。録音は保持されており、再送信しても重複評価は発生しません。',
    ko: '서버 확인을 아직 받지 못했습니다. 녹음은 보존되며, 다시 전송해도 중복 평가가 생성되지 않습니다.',
    'zh-TW': '尚未收到伺服器確認。錄音仍保留；重新傳送將自動識別，不會產生重複評估。',
  }),
  '🔗 Đang luyện Collocation': Object.freeze({
    en: '🔗 Practicing Collocation',
    ja: '🔗 コロケーション練習中',
    ko: '🔗 콜로케이션 연습 중',
    'zh-TW': '🔗 搭配詞練習中',
  }),
  '📝 Đang luyện Câu': Object.freeze({
    en: '📝 Practicing Sentence',
    ja: '📝 文練習中',
    ko: '📝 문장 연습 중',
    'zh-TW': '📝 句子練習中',
  }),
  'Luyện lại từ gốc: ': Object.freeze({
    en: 'Practice root word: ',
    ja: '元の単語を再練習: ',
    ko: '원래 단어 다시 연습: ',
    'zh-TW': '重新練習原字: ',
  }),
  'Bạn đọc nghe như: ': Object.freeze({
    en: 'Heard as: ',
    ja: '聞こえた音声: ',
    ko: '들린 내용: ',
    'zh-TW': '聽起來像: ',
  }),
  'Nội dung cần đọc: ': Object.freeze({
    en: 'Target content: ',
    ja: '読むべき内容: ',
    ko: '읽을 내용: ',
    'zh-TW': '應讀內容: ',
  }),
  'Luyện nâng cao sau điểm > 90': Object.freeze({
    en: 'Advanced practice after score > 90',
    ja: 'スコア90超の応用練習',
    ko: '90점 초과 심화 연습',
    'zh-TW': '90 分以上進階練習',
  }),
  'Đang chuẩn bị collocation và câu ví dụ…': Object.freeze({
    en: 'Preparing collocation and example sentence…',
    ja: 'コロケーションと例文を準備中…',
    ko: '콜로케이션과 예문을 준비 중…',
    'zh-TW': '正在準備搭配詞與例句…',
  }),
  '1. Collocation': Object.freeze({
    en: '1. Collocation',
    ja: '1. コロケーション',
    ko: '1. 콜로케이션',
    'zh-TW': '1. 搭配詞',
  }),
  'Luyện collocation': Object.freeze({
    en: 'Practice collocation',
    ja: 'コロケーションを練習',
    ko: '콜로케이션 연습',
    'zh-TW': '練習搭配詞',
  }),
  '2. Câu chứa từ và collocation': Object.freeze({
    en: '2. Sentence with word and collocation',
    ja: '2. 単語とコロケーションを含む文',
    ko: '2. 단어와 콜로케이션을 포함한 문장',
    'zh-TW': '2. 包含單字與搭配詞的句子',
  }),
  'Luyện câu': Object.freeze({
    en: 'Practice sentence',
    ja: '文を練習',
    ko: '문장 연습',
    'zh-TW': '練習句子',
  }),
  'Xuất sắc!': Object.freeze({
    en: 'Excellent!',
    ja: '素晴らしい！',
    ko: '훌륭해요!',
    'zh-TW': '太棒了！',
  }),
  'Cần chú ý nguyên âm / phụ âm': Object.freeze({
    en: 'Pay attention to vowels / consonants',
    ja: '母音・子音に注意しましょう',
    ko: '모음 / 자음에 주의하세요',
    'zh-TW': '注意母音／子音發音',
  }),
  'Nhấn để dừng': Object.freeze({
    en: 'Tap to stop',
    ja: 'タップして停止',
    ko: '눌러서 정지',
    'zh-TW': '點擊停止',
  }),
  'Dừng ghi âm và gửi AI đánh giá': Object.freeze({
    en: 'Stop recording and submit for AI assessment',
    ja: '録音を停止してAI評価を送信',
    ko: '녹음 중지 후 AI 평가 제출',
    'zh-TW': '停止錄音並送交 AI 評估',
  }),
  'Ghi âm lại': Object.freeze({
    en: 'Record again',
    ja: 'もう一度録音',
    ko: '다시 녹음',
    'zh-TW': '重新錄音',
  }),
  'Bắt đầu ghi âm': Object.freeze({
    en: 'Start recording',
    ja: '録音開始',
    ko: '녹음 시작',
    'zh-TW': '開始錄音',
  }),
  'Đang lắng nghe bạn nói…': Object.freeze({
    en: 'Listening to your speech…',
    ja: '音声を聞き取り中…',
    ko: '음성을 듣는 중…',
    'zh-TW': '正在聆聽您的發音…',
  }),
  'Đang phân tích phát âm…': Object.freeze({
    en: 'Analyzing pronunciation…',
    ja: '発音を分析中…',
    ko: '발음 분석 중…',
    'zh-TW': '正在分析發音…',
  }),
  'Bấm mic để bắt đầu nói': Object.freeze({
    en: 'Tap mic to start speaking',
    ja: 'マイクをタップして話し始める',
    ko: '마이크를 눌러 말하기 시작',
    'zh-TW': '點擊麥克風開始說話',
  }),
  'Bấm mic để nói lại': Object.freeze({
    en: 'Tap mic to speak again',
    ja: 'マイクをタップしてもう一度話す',
    ko: '마이크를 눌러 다시 말하기',
    'zh-TW': '點擊麥克風再說一次',
  }),
  'Thử đánh giá lại': Object.freeze({
    en: 'Retry assessment',
    ja: '再評価を試す',
    ko: '평가 다시 시도',
    'zh-TW': '重試評估',
  }),
  'Gửi đánh giá': Object.freeze({
    en: 'Submit assessment',
    ja: '評価を送信',
    ko: '평가 제출',
    'zh-TW': '送出評估',
  }),
  'Nghe lại bản ghi': Object.freeze({
    en: 'Listen to recording',
    ja: '録音を聞き直す',
    ko: '녹음 다시 듣기',
    'zh-TW': '重新聆聽錄音',
  }),
  'Mẹo cải thiện:': Object.freeze({
    en: 'Tips for improvement:',
    ja: '改善のアドバイス:',
    ko: '개선 팁:',
    'zh-TW': '改善建議：',
  }),
  'Điểm phát âm ': Object.freeze({
    en: 'Pronunciation score ',
    ja: '発音スコア ',
    ko: '발음 점수 ',
    'zh-TW': '發音得分 ',
  }),
});

export function translatePronunciation(text, locale) {
  if (typeof text !== 'string') return text;
  if (!locale || locale === 'vi') return text;
  const entry = PRONUNCIATION_UI_TRANSLATIONS[text];
  if (!entry) return text;
  return entry[locale] || text;
}
