// ============================================================
// data.js — Demo data for Tử Vi Đẩu Số web app
// ============================================================

export const USER_INFO = {
  name: 'Nguyễn Minh Khôi',
  gender: 'Nam',
  birthDate: '15/03/1990',
  lunarYear: 'Canh Ngọ',
  birthHour: 'Giờ Mão (05:00 - 07:00)',
  menh: 'Kim',
  cuc: 'Kim Tứ Cục',
  chuMenh: 'Tham Lang',
  chuThan: 'Thiên Đồng',
  amDuong: 'Dương Nam',
  summary: 'Người có ý chí mạnh mẽ, khả năng thích ứng cao, luôn tìm cách vươn lên. Năng lượng nội tại thiên về sự kiên định và sáng tạo trong hành động.'
};

// Star categories for visual styling
export const STAR_TYPES = {
  chinh: 'chính tinh',
  phu: 'phụ tinh',
  sat: 'sát tinh',
  loc: 'lộc tinh',
  khoa: 'khoa tinh'
};

// 12 Palace definitions — standard Tử Vi layout
// Position index follows traditional grid: 0=Tý(bottom-center) going counter-clockwise
export const PALACES = [
  {
    id: 'menh',
    name: 'Mệnh',
    meaning: 'Bản chất con người, tính cách, xu hướng sống',
    position: 4, // Mão position for this chart
    stars: [
      { name: 'Tử Vi', type: 'chinh', brightness: 'miếu' },
      { name: 'Tham Lang', type: 'chinh', brightness: 'vượng' },
      { name: 'Văn Xương', type: 'phu', brightness: 'đắc' },
      { name: 'Hóa Lộc', type: 'loc', brightness: '' }
    ],
    overview: 'Cung Mệnh cho thấy bạn là người có tầm nhìn xa, ý chí kiên cường và khả năng lãnh đạo tự nhiên. Tử Vi tọa thủ mang đến sự uy nghi, kết hợp Tham Lang tạo nên cá tính đa tài, ham học hỏi.',
    advice: 'Xu hướng muốn kiểm soát mọi thứ đôi khi cần được nới lỏng. Hãy cho phép mình linh hoạt hơn trong cách tiếp cận vấn đề.',
    topics: {
      career: 'Bản chất lãnh đạo giúp bạn phù hợp với vai trò quản lý, điều hành. Tham Lang thêm sự sáng tạo trong công việc.',
      wealth: 'Hóa Lộc tại Mệnh là dấu hiệu tích cực về tài chính. Khả năng tạo ra giá trị gắn liền với năng lực cá nhân.',
      love: 'Cá tính mạnh có thể tạo sức hút nhưng cũng cần sự mềm mại trong tình cảm.',
      family: 'Vai trò trụ cột trong gia đình là điều tự nhiên với bạn.',
      health: 'Cần chú ý cân bằng giữa công việc và nghỉ ngơi. Áp lực tự đặt ra có thể ảnh hưởng sức khỏe.',
      social: 'Khả năng giao tiếp tốt, dễ tạo ấn tượng ban đầu. Nên xây dựng quan hệ sâu thay vì rộng.'
    }
  },
  {
    id: 'phuMau',
    name: 'Phụ Mẫu',
    meaning: 'Mối quan hệ với cha mẹ, học vấn, nguồn gốc',
    position: 5,
    stars: [
      { name: 'Thiên Cơ', type: 'chinh', brightness: 'miếu' },
      { name: 'Thiên Lương', type: 'chinh', brightness: 'vượng' },
      { name: 'Thiên Mã', type: 'phu', brightness: '' }
    ],
    overview: 'Mối quan hệ với cha mẹ có sự ấm áp và hỗ trợ. Thiên Cơ – Thiên Lương cho thấy nền tảng gia đình có học thức, định hướng tốt cho bạn từ nhỏ.',
    advice: 'Giữ liên lạc thường xuyên với gia đình gốc. Sự hỗ trợ từ cha mẹ là nguồn lực quý giá trong những giai đoạn khó khăn.',
    topics: {
      career: 'Cha mẹ có ảnh hưởng tích cực đến định hướng nghề nghiệp.',
      wealth: 'Có thể nhận được hỗ trợ tài chính từ gia đình khi cần.',
      love: 'Quan điểm về tình yêu chịu ảnh hưởng từ mô hình gia đình.',
      family: 'Mối quan hệ gần gũi, có xu hướng chăm sóc cha mẹ tốt.',
      health: 'Cần chú ý sức khỏe di truyền từ phía gia đình.',
      social: 'Nền tảng gia đình giúp mở rộng mạng lưới quan hệ.'
    }
  },
  {
    id: 'phucDuc',
    name: 'Phúc Đức',
    meaning: 'Phước đức tổ tiên, đời sống tinh thần, triết lý sống',
    position: 6,
    stars: [
      { name: 'Thái Dương', type: 'chinh', brightness: 'miếu' },
      { name: 'Hóa Quyền', type: 'loc', brightness: '' },
      { name: 'Đà La', type: 'sat', brightness: '' }
    ],
    overview: 'Phúc đức dày, có nền tảng tâm linh tốt. Thái Dương miếu địa mang đến ánh sáng cho đời sống nội tâm. Tuy nhiên Đà La nhắc nhở cần kiên nhẫn trên con đường tu dưỡng.',
    advice: 'Dành thời gian cho đời sống tinh thần sẽ giúp cân bằng cuộc sống. Đừng bỏ qua những tín hiệu từ trực giác.',
    topics: {
      career: 'Phúc đức hỗ trợ sự nghiệp bền vững dài hạn.',
      wealth: 'Của cải có tính bền vững, không phải loại giàu nhanh mất nhanh.',
      love: 'Duyên phận tốt, có xu hướng gặp người phù hợp.',
      family: 'Gia đình có nền tảng phúc đức, truyền thống tốt.',
      health: 'Đời sống tinh thần ổn định hỗ trợ sức khỏe tổng thể.',
      social: 'Được quý nhân phù trợ trong nhiều giai đoạn.'
    }
  },
  {
    id: 'dienTrach',
    name: 'Điền Trạch',
    meaning: 'Nhà cửa, bất động sản, môi trường sống',
    position: 7,
    stars: [
      { name: 'Vũ Khúc', type: 'chinh', brightness: 'vượng' },
      { name: 'Thiên Phủ', type: 'chinh', brightness: 'miếu' },
      { name: 'Lộc Tồn', type: 'loc', brightness: '' }
    ],
    overview: 'Cung Điền Trạch rất đẹp với Vũ Khúc – Thiên Phủ cùng Lộc Tồn. Xu hướng có nhà cửa ổn định, bất động sản là kênh đầu tư phù hợp.',
    advice: 'Đây là một trong những cung mạnh nhất trong lá số. Nên chú trọng đầu tư vào nhà cửa, bất động sản từ sớm.',
    topics: {
      career: 'Có thể phát triển tốt trong lĩnh vực bất động sản, xây dựng.',
      wealth: 'Bất động sản là kênh tích lũy tài sản chính. Lộc Tồn tại đây rất tốt.',
      love: 'Môi trường sống ổn định hỗ trợ đời sống tình cảm.',
      family: 'Nhà cửa khang trang, gia đình có nơi ở ổn định.',
      health: 'Không gian sống ảnh hưởng lớn đến sức khỏe — nên chọn nơi thoáng đãng.',
      social: 'Nhà là nơi tiếp đãi bạn bè, mở rộng quan hệ.'
    }
  },
  {
    id: 'quanLoc',
    name: 'Quan Lộc',
    meaning: 'Sự nghiệp, công danh, con đường phát triển nghề nghiệp',
    position: 8,
    stars: [
      { name: 'Liêm Trinh', type: 'chinh', brightness: 'vượng' },
      { name: 'Thất Sát', type: 'chinh', brightness: 'miếu' },
      { name: 'Hóa Khoa', type: 'khoa', brightness: '' },
      { name: 'Văn Khúc', type: 'phu', brightness: 'đắc' }
    ],
    overview: 'Cung Quan Lộc mạnh mẽ với Liêm Trinh – Thất Sát, cho thấy sự nghiệp có tính cạnh tranh cao. Hóa Khoa mang đến danh tiếng trong nghề nghiệp.',
    advice: 'Con đường sự nghiệp có nhiều thử thách nhưng cũng nhiều cơ hội đột phá. Kiên trì và không ngại khó khăn là chìa khóa.',
    topics: {
      career: 'Phù hợp với công việc đòi hỏi quyết đoán, cạnh tranh. Có thể thành công trong kinh doanh, quản lý, hoặc lĩnh vực kỹ thuật.',
      wealth: 'Thu nhập gắn liền với nỗ lực và vị trí công việc. Càng phấn đấu càng có thêm nguồn thu.',
      love: 'Công việc bận rộn có thể ảnh hưởng đời sống tình cảm. Cần cân bằng.',
      family: 'Sự nghiệp thành công mang đến ổn định cho gia đình.',
      health: 'Áp lực công việc cao — cần phương pháp giải tỏa stress hiệu quả.',
      social: 'Mạng lưới nghề nghiệp rộng, nhiều mối quan hệ chất lượng.'
    }
  },
  {
    id: 'noBoc',
    name: 'Nô Bộc',
    meaning: 'Bạn bè, đồng nghiệp, cấp dưới, mối quan hệ xã hội',
    position: 9,
    stars: [
      { name: 'Phá Quân', type: 'chinh', brightness: 'đắc' },
      { name: 'Hữu Bật', type: 'phu', brightness: '' },
      { name: 'Kình Dương', type: 'sat', brightness: '' }
    ],
    overview: 'Mối quan hệ bạn bè có tính hai mặt. Phá Quân mang đến bạn bè cá tính mạnh, Kình Dương cảnh báo cần chọn lọc trong giao tiếp.',
    advice: 'Chọn bạn mà chơi. Nên xây dựng nhóm bạn nhỏ nhưng tin cậy thay vì quá nhiều quan hệ hời hợt.',
    topics: {
      career: 'Đồng nghiệp và cấp dưới có thể hỗ trợ nhưng cũng cần cảnh giác.',
      wealth: 'Cẩn thận khi hợp tác kinh doanh với bạn bè.',
      love: 'Bạn bè có thể giới thiệu duyên mới.',
      family: 'Bạn bè tốt là nguồn hỗ trợ cho gia đình.',
      health: 'Bạn bè ảnh hưởng lối sống — chọn nhóm lành mạnh.',
      social: 'Quan hệ xã hội phong phú nhưng cần quản lý tốt.'
    }
  },
  {
    id: 'thienDi',
    name: 'Thiên Di',
    meaning: 'Giao tiếp bên ngoài, di chuyển, hoạt động xã hội',
    position: 10,
    stars: [
      { name: 'Thiên Đồng', type: 'chinh', brightness: 'miếu' },
      { name: 'Cự Môn', type: 'chinh', brightness: 'vượng' },
      { name: 'Tả Phù', type: 'phu', brightness: '' }
    ],
    overview: 'Cung Thiên Di tốt đẹp, cho thấy bạn được lòng người khi ra ngoài. Thiên Đồng mang đến sự dễ chịu trong giao tiếp, Cự Môn thêm khả năng thuyết phục.',
    advice: 'Hoạt động bên ngoài, di chuyển, giao lưu sẽ mang đến nhiều cơ hội. Đừng ngại bước ra khỏi vùng an toàn.',
    topics: {
      career: 'Công việc liên quan đến giao tiếp, đối ngoại rất phù hợp.',
      wealth: 'Cơ hội tài chính đến từ bên ngoài, từ các mối quan hệ.',
      love: 'Có duyên gặp người ở xa hoặc qua hoạt động xã hội.',
      family: 'Gia đình hỗ trợ khi bạn phải đi xa.',
      health: 'Di chuyển nhiều — chú ý sức khỏe khi đi đường.',
      social: 'Đây là cung chủ quan hệ xã hội — rất thuận lợi.'
    }
  },
  {
    id: 'tatAch',
    name: 'Tật Ách',
    meaning: 'Sức khỏe, thể chất, bệnh tật tiềm ẩn',
    position: 11,
    stars: [
      { name: 'Thái Âm', type: 'chinh', brightness: 'đắc' },
      { name: 'Thiên Hình', type: 'sat', brightness: '' },
      { name: 'Hóa Kỵ', type: 'sat', brightness: '' }
    ],
    overview: 'Cung Tật Ách cần chú ý với Hóa Kỵ hiện diện. Thái Âm liên quan đến hệ thần kinh, giấc ngủ. Thiên Hình nhắc nhở về các vấn đề phẫu thuật nhỏ.',
    advice: 'Giấc ngủ và sức khỏe tinh thần là ưu tiên hàng đầu. Nên khám sức khỏe định kỳ và không chủ quan với các triệu chứng nhỏ.',
    topics: {
      career: 'Sức khỏe ảnh hưởng trực tiếp đến hiệu suất công việc.',
      wealth: 'Chi phí y tế cần được dự phòng trong kế hoạch tài chính.',
      love: 'Sức khỏe tinh thần ảnh hưởng đời sống tình cảm.',
      family: 'Người thân cần theo dõi sức khỏe cùng bạn.',
      health: 'Chú ý: hệ thần kinh, giấc ngủ, mắt, hệ tiết niệu. Khám định kỳ.',
      social: 'Stress từ quan hệ xã hội có thể ảnh hưởng sức khỏe.'
    }
  },
  {
    id: 'taiBach',
    name: 'Tài Bạch',
    meaning: 'Tài chính, thu nhập, khả năng kiếm tiền',
    position: 0,
    stars: [
      { name: 'Thiên Tướng', type: 'chinh', brightness: 'miếu' },
      { name: 'Thiên Khôi', type: 'phu', brightness: '' },
      { name: 'Địa Kiếp', type: 'sat', brightness: '' }
    ],
    overview: 'Tài Bạch có Thiên Tướng miếu địa, cho thấy tài chính ổn định, có quý nhân giúp đỡ trong chuyện tiền bạc. Tuy nhiên Địa Kiếp nhắc nhở cần cẩn thận với rủi ro đầu tư.',
    advice: 'Quản lý tài chính cẩn thận, đặc biệt tránh đầu cơ mạo hiểm. Thu nhập chính từ lao động và vị trí xã hội.',
    topics: {
      career: 'Thu nhập tốt từ vị trí công việc, có quý nhân hỗ trợ.',
      wealth: 'Tài chính ổn định nhưng cần đề phòng biến động bất ngờ do Địa Kiếp. Tránh đầu cơ.',
      love: 'Tài chính ổn định hỗ trợ đời sống tình cảm.',
      family: 'Có khả năng chăm lo tài chính cho gia đình.',
      health: 'Đừng vì tiền mà bỏ qua sức khỏe.',
      social: 'Tài chính giúp mở rộng và duy trì quan hệ xã hội.'
    }
  },
  {
    id: 'tuTuc',
    name: 'Tử Tức',
    meaning: 'Con cái, sáng tạo, di sản',
    position: 1,
    stars: [
      { name: 'Thiên Lương', type: 'chinh', brightness: 'đắc' },
      { name: 'Thai', type: 'phu', brightness: '' },
      { name: 'Đào Hoa', type: 'phu', brightness: '' }
    ],
    overview: 'Cung Tử Tức khá tốt với Thiên Lương, cho thấy con cái ngoan, có học thức. Đào Hoa thêm tính sáng tạo, nghệ thuật trong mối quan hệ với con.',
    advice: 'Cho con không gian phát triển tự do. Con cái có xu hướng học giỏi và có năng khiếu nghệ thuật.',
    topics: {
      career: 'Sự sáng tạo từ cung này hỗ trợ nghề nghiệp.',
      wealth: 'Con cái không phải gánh nặng tài chính — ngược lại.',
      love: 'Tình yêu gắn liền với mong muốn xây dựng gia đình.',
      family: 'Con cái mang đến niềm vui và ý nghĩa cuộc sống.',
      health: 'Chú ý sức khỏe sinh sản khi đến tuổi.',
      social: 'Con cái giúp mở rộng mạng lưới xã hội qua trường học, hoạt động.'
    }
  },
  {
    id: 'phuThe',
    name: 'Phu Thê',
    meaning: 'Hôn nhân, tình duyên, đối tác đời sống',
    position: 2,
    stars: [
      { name: 'Thái Dương', type: 'chinh', brightness: 'vượng' },
      { name: 'Thiên Riêu', type: 'phu', brightness: '' },
      { name: 'Hồng Loan', type: 'phu', brightness: '' }
    ],
    overview: 'Cung Phu Thê sáng đẹp với Thái Dương vượng, Hồng Loan thêm duyên. Xu hướng gặp người bạn đời nhiệt tình, rộng lượng, có vị trí xã hội.',
    advice: 'Tình duyên thuận lợi nhưng cần tránh vội vàng. Người bạn đời phù hợp sẽ xuất hiện khi bạn đã đủ trưởng thành.',
    topics: {
      career: 'Bạn đời hỗ trợ sự nghiệp tích cực.',
      wealth: 'Hôn nhân mang đến sự ổn định tài chính.',
      love: 'Duyên tốt, Hồng Loan tại Phu Thê rất đẹp. Xu hướng tìm được người phù hợp.',
      family: 'Quan hệ vợ chồng hài hòa, gia đình hạnh phúc.',
      health: 'Bạn đời quan tâm sức khỏe lẫn nhau.',
      social: 'Cặp đôi cùng mở rộng mạng lưới xã hội.'
    }
  },
  {
    id: 'huynh',
    name: 'Huynh Đệ',
    meaning: 'Anh chị em, đồng liêu, bạn thân',
    position: 3,
    stars: [
      { name: 'Thiên Cơ', type: 'chinh', brightness: 'đắc' },
      { name: 'Tả Phù', type: 'phu', brightness: '' },
      { name: 'Địa Không', type: 'sat', brightness: '' }
    ],
    overview: 'Quan hệ anh chị em có sự hỗ trợ nhưng cũng có khoảng cách. Thiên Cơ mang đến sự thông minh trong giao tiếp, Địa Không cho thấy cần chấp nhận sự khác biệt.',
    advice: 'Mối quan hệ anh chị em cần được vun đắp chủ động. Không nên kỳ vọng quá nhiều nhưng cũng đừng xa cách.',
    topics: {
      career: 'Anh chị em có thể hợp tác trong một số lĩnh vực.',
      wealth: 'Cẩn thận chuyện tiền bạc với anh chị em để tránh rạn nứt.',
      love: 'Anh chị em có thể đóng vai trò tư vấn tình cảm.',
      family: 'Mối quan hệ cần được duy trì tích cực.',
      health: 'Cùng nhau quan tâm sức khỏe gia đình.',
      social: 'Anh chị em là mạng lưới xã hội tự nhiên.'
    }
  }
];

// Tam Hợp (Trine) groups — three palaces that support each other
export const TAM_HOP = [
  ['menh', 'quanLoc', 'taiBach'],        // Mệnh tam hợp
  ['phuMau', 'noBoc', 'tuTuc'],           // Phụ Mẫu tam hợp
  ['phucDuc', 'thienDi', 'phuThe'],       // Phúc Đức tam hợp
  ['dienTrach', 'tatAch', 'huynh']        // Điền Trạch tam hợp
];

// Xung Chiếu (Opposition) pairs
export const XUNG_CHIEU = [
  ['menh', 'thienDi'],
  ['phuMau', 'tatAch'],
  ['phucDuc', 'taiBach'],
  ['dienTrach', 'tuTuc'],
  ['quanLoc', 'phuThe'],
  ['noBoc', 'huynh']
];

// Topic → relevant palaces mapping
export const TOPIC_PALACES = {
  'tong-the': null, // all palaces
  'su-nghiep': ['menh', 'quanLoc', 'taiBach', 'thienDi'],
  'tai-loc': ['taiBach', 'dienTrach', 'phucDuc', 'quanLoc'],
  'tinh-duyen': ['phuThe', 'menh', 'phucDuc', 'tuTuc'],
  'gia-dao': ['phuMau', 'tuTuc', 'huynh', 'dienTrach'],
  'suc-khoe': ['tatAch', 'menh', 'phucDuc', 'dienTrach'],
  'quan-he': ['noBoc', 'thienDi', 'huynh', 'menh']
};

export const TOPICS = [
  { id: 'tong-the', label: 'Tổng thể', icon: '◎' },
  { id: 'su-nghiep', label: 'Sự nghiệp', icon: '⬡' },
  { id: 'tai-loc', label: 'Tài lộc', icon: '◇' },
  { id: 'tinh-duyen', label: 'Tình duyên', icon: '♡' },
  { id: 'gia-dao', label: 'Gia đạo', icon: '⌂' },
  { id: 'suc-khoe', label: 'Sức khỏe', icon: '✦' },
  { id: 'quan-he', label: 'Quan hệ', icon: '⊛' }
];

// Topic key mapping to data field
export const TOPIC_KEY_MAP = {
  'su-nghiep': 'career',
  'tai-loc': 'wealth',
  'tinh-duyen': 'love',
  'gia-dao': 'family',
  'suc-khoe': 'health',
  'quan-he': 'social'
};

// Year transit data (Đại Vận / Lưu Niên)
export const YEAR_DATA = {
  2024: {
    luuNien: 'Giáp Thìn',
    luuNienCung: 'dienTrach',
    summary: 'Năm 2024 tập trung vào nhà cửa và nền tảng. Cơ hội ổn định chỗ ở, đầu tư bất động sản thuận lợi.',
    highlights: ['dienTrach', 'taiBach', 'phucDuc'],
    events: [
      { palace: 'dienTrach', text: 'Cơ hội liên quan nhà cửa, bất động sản xuất hiện rõ nét.' },
      { palace: 'taiBach', text: 'Tài chính ổn định, có thể tích lũy.' },
      { palace: 'phucDuc', text: 'Phúc đức hỗ trợ, nhiều may mắn bất ngờ.' }
    ]
  },
  2025: {
    luuNien: 'Ất Tỵ',
    luuNienCung: 'quanLoc',
    summary: 'Năm 2025 là năm đột phá sự nghiệp. Có nhiều cơ hội thăng tiến, thay đổi công việc theo hướng tốt hơn.',
    highlights: ['quanLoc', 'menh', 'thienDi'],
    events: [
      { palace: 'quanLoc', text: 'Sự nghiệp có bước ngoặt quan trọng. Cơ hội thăng chức hoặc đổi hướng.' },
      { palace: 'menh', text: 'Bản thân tỏa sáng, được chú ý.' },
      { palace: 'thienDi', text: 'Giao tiếp bên ngoài mang lại nhiều cơ hội mới.' }
    ]
  },
  2026: {
    luuNien: 'Bính Ngọ',
    luuNienCung: 'noBoc',
    summary: 'Năm 2026 tập trung vào quan hệ xã hội. Mạng lưới bạn bè, đồng nghiệp đóng vai trò quan trọng. Cần chọn lọc người tin cậy.',
    highlights: ['noBoc', 'huynh', 'phuThe'],
    events: [
      { palace: 'noBoc', text: 'Mối quan hệ bạn bè thay đổi. Có thể gặp quý nhân hoặc tiểu nhân.' },
      { palace: 'huynh', text: 'Anh chị em cần sự quan tâm nhiều hơn.' },
      { palace: 'phuThe', text: 'Tình cảm có biến chuyển tích cực.' }
    ]
  },
  2027: {
    luuNien: 'Đinh Mùi',
    luuNienCung: 'thienDi',
    summary: 'Năm 2027 mở rộng tầm nhìn. Cơ hội đi xa, làm việc quốc tế, hoặc mở rộng hoạt động bên ngoài.',
    highlights: ['thienDi', 'quanLoc', 'menh'],
    events: [
      { palace: 'thienDi', text: 'Di chuyển, công tác xa, cơ hội ở nước ngoài.' },
      { palace: 'quanLoc', text: 'Sự nghiệp được hưởng lợi từ các mối quan hệ mới.' },
      { palace: 'menh', text: 'Giai đoạn phát triển cá nhân mạnh mẽ.' }
    ]
  },
  2028: {
    luuNien: 'Mậu Thân',
    luuNienCung: 'tatAch',
    summary: 'Năm 2028 cần chú ý sức khỏe. Làm việc vừa sức, nghỉ ngơi đầy đủ. Không nên ép bản thân quá mức.',
    highlights: ['tatAch', 'phucDuc', 'menh'],
    events: [
      { palace: 'tatAch', text: 'Sức khỏe cần được ưu tiên. Khám tổng quát đầu năm.' },
      { palace: 'phucDuc', text: 'Đời sống tinh thần giúp vượt qua giai đoạn khó khăn.' },
      { palace: 'menh', text: 'Cần tập trung vào bản thân, không phải công việc.' }
    ]
  }
};

// Story mode steps
export const STORY_STEPS = [
  {
    id: 'intro',
    title: 'Bạn là ai trong lá số này',
    palaces: ['menh'],
    content: `Lá số Tử Vi là bản đồ xu hướng cuộc đời, được lập từ thời điểm sinh của bạn. Cung Mệnh — trung tâm lá số — cho thấy bản chất con người bạn.\n\nVới Tử Vi và Tham Lang tọa thủ cung Mệnh, bạn là người có ý chí mạnh mẽ, tầm nhìn rộng, và bản năng lãnh đạo tự nhiên. Hóa Lộc đi kèm cho thấy xu hướng được may mắn trong nhiều lĩnh vực.`
  },
  {
    id: 'strength',
    title: 'Điểm mạnh nổi bật',
    palaces: ['menh', 'quanLoc', 'dienTrach'],
    content: `Ba cung sáng nhất trong lá số bạn:\n\n• **Mệnh** — Khả năng lãnh đạo, ý chí và sáng tạo\n• **Quan Lộc** — Sự nghiệp mạnh mẽ, có danh tiếng trong nghề\n• **Điền Trạch** — Nền tảng nhà cửa, bất động sản rất tốt\n\nĐây là tam giác vàng của lá số, cho thấy bạn có tiềm năng xây dựng cuộc sống vững chắc cả về sự nghiệp lẫn vật chất.`
  },
  {
    id: 'challenge',
    title: 'Thách thức dễ gặp',
    palaces: ['tatAch', 'noBoc'],
    content: `Mỗi lá số đều có vùng cần lưu ý:\n\n• **Tật Ách** — Hóa Kỵ tại đây nhắc nhở chú ý sức khỏe tinh thần, giấc ngủ, và mắt. Đây không phải là điều xấu — chỉ là tín hiệu cần quan tâm sớm.\n\n• **Nô Bộc** — Kình Dương cảnh báo cần chọn lọc bạn bè, đồng nghiệp. Không phải ai cũng đáng tin.\n\nNhận biết sớm giúp bạn chủ động phòng tránh thay vì bị động đối mặt.`
  },
  {
    id: 'current',
    title: 'Năm 2026 — Điều đáng chú ý',
    palaces: ['noBoc', 'huynh', 'phuThe'],
    content: `Năm Bính Ngọ 2026, lưu niên đi qua cung Nô Bộc:\n\n• Mối quan hệ bạn bè và đồng nghiệp có sự thay đổi. Có thể gặp quý nhân nhưng cũng cần đề phòng tiểu nhân.\n\n• Cung Huynh Đệ cần được quan tâm — anh chị em có thể cần bạn.\n\n• Tin vui: Cung Phu Thê có chuyển biến tích cực — đời sống tình cảm có thêm sắc màu.\n\nĐây là năm để chọn lọc quan hệ, giữ gìn những gì quý giá.`
  },
  {
    id: 'observe',
    title: 'Điều nên quan sát thêm',
    palaces: ['phucDuc', 'phuMau', 'tuTuc'],
    content: `Ngoài những gì đã nói, đây là các vùng đáng để bạn tìm hiểu sâu hơn:\n\n• **Phúc Đức** — Nền tảng tâm linh tốt, là nguồn năng lượng giúp bạn vượt qua khó khăn\n\n• **Phụ Mẫu** — Gia đình gốc là chỗ dựa quan trọng, nên giữ kết nối\n\n• **Tử Tức** — Chủ đề con cái, sáng tạo, di sản — có tiềm năng tốt\n\nLá số không phải bản án — nó là bản đồ xu hướng. Hiểu nó giúp bạn đưa ra quyết định sáng suốt hơn.`
  }
];

// Traditional Tử Vi chart grid positions (4x4 grid with center empty)
// Layout follows the traditional pattern:
//   [6]  [7]  [8]  [9]
//   [5]            [10]
//   [4]            [11]
//   [3]  [2]  [1]  [0]
export const GRID_POSITIONS = [
  { row: 3, col: 3 }, // 0 - Tý (bottom-right)
  { row: 3, col: 2 }, // 1 - Sửu
  { row: 3, col: 1 }, // 2 - Dần
  { row: 3, col: 0 }, // 3 - Mão
  { row: 2, col: 0 }, // 4 - Thìn
  { row: 1, col: 0 }, // 5 - Tỵ
  { row: 0, col: 0 }, // 6 - Ngọ (top-left)
  { row: 0, col: 1 }, // 7 - Mùi
  { row: 0, col: 2 }, // 8 - Thân
  { row: 0, col: 3 }, // 9 - Dậu (top-right)
  { row: 1, col: 3 }, // 10 - Tuất
  { row: 2, col: 3 }, // 11 - Hợi
];

// Chi labels for positions
export const CHI_LABELS = [
  'Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ',
  'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'
];
