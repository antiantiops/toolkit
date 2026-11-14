// Catalog mapping Vietnamese static UI phrases in ImageCrop to en, ja, ko, zh-TW.
// Vietnamese returns unchanged; unknown phrases are preserved verbatim.
export const CROP_UI_TRANSLATIONS = Object.freeze({
  'Kéo chọn vùng lớn hơn.': Object.freeze({
    en: 'Drag to select a larger area.',
    ja: 'ドラッグしてより大きな領域を選択してください。',
    ko: '더 큰 영역을 선택하도록 드래그하세요.',
    'zh-TW': '請拖曳選取更大的區域。',
  }),
  'Các vùng quá lớn. Chọn ít vùng hơn.': Object.freeze({
    en: 'Regions are too large. Select fewer regions.',
    ja: '選択領域が大きすぎます。領域の数を減らしてください。',
    ko: '영역이 너무 큽니다. 영역 수를 줄이세요.',
    'zh-TW': '區域過大。請選取較少區域。',
  }),
  'Không cắt được ảnh. Thử chọn lại.': Object.freeze({
    en: 'Failed to crop image. Please try selecting again.',
    ja: '画像を切り抜けませんでした。もう一度選択してください。',
    ko: '이미지를 자를 수 없습니다. 다시 선택해 보세요.',
    'zh-TW': '無法裁切圖片。請重新選取。',
  }),
  'Vùng quá nhỏ. Kéo chọn lại.': Object.freeze({
    en: 'Region is too small. Drag to select again.',
    ja: '領域が小さすぎます。ドラッグして選び直してください。',
    ko: '영역이 너무 작습니다. 다시 드래그하여 선택하세요.',
    'zh-TW': '區域太小。請重新拖曳選取。',
  }),
  'Tối đa 8 vùng mỗi bài nghe.': Object.freeze({
    en: 'Maximum of 8 regions per listening exercise.',
    ja: 'リスニング1回につき最大8つの領域までです。',
    ko: '듣기 문제당 최대 8개 영역까지 가능합니다.',
    'zh-TW': '每篇聽力最多 8 個區域。',
  }),
  'Cắt vùng cần đọc': Object.freeze({
    en: 'Crop reading area',
    ja: '読み取り領域を切り抜く',
    ko: '읽을 영역 자르기',
    'zh-TW': '裁切閱讀區域',
  }),
  'Đóng chọn vùng ảnh': Object.freeze({
    en: 'Close image crop',
    ja: '画像範囲選択を閉じる',
    ko: '이미지 영역 선택 닫기',
    'zh-TW': '關閉圖片選取',
  }),
  'Chạm vùng để chỉnh: kéo bên trong để di chuyển, kéo góc để đổi kích thước. Khoanh ngoài vùng để thêm; tối đa 8 vùng.': Object.freeze({
    en: 'Tap a region to adjust: drag inside to move, drag corners to resize. Drag outside to add; max 8 regions.',
    ja: '領域をタップして調整: 内側をドラッグして移動、角をドラッグしてサイズ変更。領域外をドラッグして追加（最大8個）。',
    ko: '영역을 탭하여 조정: 내부를 드래그해 이동, 모서리를 드래그해 크기 조절. 영역 밖을 드래그해 추가(최대 8개).',
    'zh-TW': '輕點區域即可調整：拖曳內部可移動，拖曳角落可縮放。在區域外圈選可新增；最多 8 個區域。',
  }),
  'Kéo các góc hoặc khoanh trên ảnh để chọn vùng chữ.': Object.freeze({
    en: 'Drag corners or draw on the image to select text area.',
    ja: '角をドラッグするか画像上を囲んでテキスト領域を選択してください。',
    ko: '모서리를 드래그하거나 이미지 위를 드래그하여 텍스트 영역을 선택하세요.',
    'zh-TW': '拖曳角落或在圖片上圈選以選取文字區域。',
  }),
  'Ảnh gốc để chọn vùng đọc': Object.freeze({
    en: 'Original image for reading selection',
    ja: '読み取り範囲を選択する元の画像',
    ko: '읽을 영역을 선택할 원본 이미지',
    'zh-TW': '用於選取閱讀區域的原始圖片',
  }),
  'Không đọc được ảnh. Chọn ảnh JPEG hoặc PNG.': Object.freeze({
    en: 'Failed to read image. Please select a JPEG or PNG image.',
    ja: '画像を読み込めませんでした。JPEGまたはPNG画像を選択してください。',
    ko: '이미지를 읽을 수 없습니다. JPEG 또는 PNG 이미지를 선택하세요.',
    'zh-TW': '無法讀取圖片。請選擇 JPEG 或 PNG 圖片。',
  }),
  'Chỉnh góc ': Object.freeze({
    en: 'Adjust corner ',
    ja: '角を調整: ',
    ko: '모서리 조절: ',
    'zh-TW': '調整角落 ',
  }),
  'Xóa vùng ': Object.freeze({
    en: 'Remove region ',
    ja: '領域を削除: ',
    ko: '영역 삭제: ',
    'zh-TW': '刪除區域 ',
  }),
  'Vùng ': Object.freeze({
    en: 'Region ',
    ja: '領域 ',
    ko: '영역 ',
    'zh-TW': '區域 ',
  }),
  'Đặt lại vùng chọn': Object.freeze({
    en: 'Reset selection',
    ja: '選択範囲をリセット',
    ko: '선택 영역 초기화',
    'zh-TW': '重設選取範圍',
  }),
  'Đang cắt...': Object.freeze({
    en: 'Cropping…',
    ja: '切り抜き中…',
    ko: '자르는 중…',
    'zh-TW': '正在裁切…',
  }),
  'Ghép và dùng ': Object.freeze({
    en: 'Combine and use ',
    ja: '結合して使用: ',
    ko: '병합하여 사용: ',
    'zh-TW': '合併並使用 ',
  }),
  ' vùng': Object.freeze({
    en: ' regions',
    ja: ' 個の領域',
    ko: '개 영역',
    'zh-TW': ' 個區域',
  }),
  'Dùng vùng đã chọn': Object.freeze({
    en: 'Use selected area',
    ja: '選択した領域を使用',
    ko: '선택한 영역 사용',
    'zh-TW': '使用所選區域',
  }),
  'Dùng ảnh này': Object.freeze({
    en: 'Use this image',
    ja: 'この画像を使用',
    ko: '이 이미지 사용',
    'zh-TW': '使用此圖片',
  }),
  '📁 Dùng nguyên ảnh gốc (Giữ 100% chất lượng)': Object.freeze({
    en: '📁 Use original image (Keep 100% quality)',
    ja: '📁 元の画像をそのまま使用 (品質100%保持)',
    ko: '📁 원본 이미지 그대로 사용 (100% 품질 유지)',
    'zh-TW': '📁 使用原始圖片 (保持 100% 品質)',
  }),
  'Chỉ vùng đã chọn được gửi AI': Object.freeze({
    en: 'Only selected area will be sent to AI',
    ja: '選択した領域のみがAIに送信されます',
    ko: '선택한 영역만 AI로 전송됩니다',
    'zh-TW': '僅將所選區域傳送給 AI',
  }),
  'Chưa chỉnh vùng: dùng toàn ảnh': Object.freeze({
    en: 'No crop: use full image',
    ja: '領域未調整: 画像全体を使用',
    ko: '영역 미조정: 전체 이미지 사용',
    'zh-TW': '未調整區域：使用全圖',
  }),
});

export function translateCrop(text, locale = 'vi') {
  if (typeof text !== 'string') return text;
  if (!locale || locale === 'vi') return text;
  const entry = CROP_UI_TRANSLATIONS[text];
  if (!entry) return text;
  return entry[locale] ?? text;
}
