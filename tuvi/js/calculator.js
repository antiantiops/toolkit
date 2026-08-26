// Local chart adapter. Calculation runs in browser via vendored, pinned MIT iztro v2.6.0.
// No birth data leaves this page.
import { USER_INFO, PALACES, YEAR_DATA } from './data.js';

const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const PALACE_IDS = {
  '命宫': 'menh', '兄弟': 'huynh', '夫妻': 'phuThe', '子女': 'tuTuc',
  '财帛': 'taiBach', '疾厄': 'tatAch', '迁移': 'thienDi', '仆役': 'noBoc',
  '官禄': 'quanLoc', '田宅': 'dienTrach', '福德': 'phucDuc', '父母': 'phuMau'
};
const PALACE_NAMES = {
  menh: 'Mệnh', huynh: 'Huynh Đệ', phuThe: 'Phu Thê', tuTuc: 'Tử Tức',
  taiBach: 'Tài Bạch', tatAch: 'Tật Ách', thienDi: 'Thiên Di', noBoc: 'Nô Bộc',
  quanLoc: 'Quan Lộc', dienTrach: 'Điền Trạch', phucDuc: 'Phúc Đức', phuMau: 'Phụ Mẫu'
};
const VN = {
  '甲':'Giáp','乙':'Ất','丙':'Bính','丁':'Đinh','戊':'Mậu','己':'Kỷ','庚':'Canh','辛':'Tân','壬':'Nhâm','癸':'Quý',
  '早子时':'Tý','子时':'Tý','丑时':'Sửu','寅时':'Dần','卯时':'Mão','辰时':'Thìn','巳时':'Tỵ','午时':'Ngọ','未时':'Mùi','申时':'Thân','酉时':'Dậu','戌时':'Tuất','亥时':'Hợi', 
  '子':'Tý','丑':'Sửu','寅':'Dần','卯':'Mão','辰':'Thìn','巳':'Tỵ','午':'Ngọ','未':'Mùi','申':'Thân','酉':'Dậu','戌':'Tuất','亥':'Hợi',
  '父母':'Phụ Mẫu','福德':'Phúc Đức','田宅':'Điền Trạch','官禄':'Quan Lộc','仆役':'Nô Bộc','迁移':'Thiên Di','疾厄':'Tật Ách','财帛':'Tài Bạch','子女':'Tử Tức','夫妻':'Phu Thê','兄弟':'Huynh Đệ','命宫':'Mệnh',
  '紫微':'Tử Vi','天机':'Thiên Cơ','太阳':'Thái Dương','武曲':'Vũ Khúc','天同':'Thiên Đồng','廉贞':'Liêm Trinh','天府':'Thiên Phủ','太阴':'Thái Âm','贪狼':'Tham Lang','巨门':'Cự Môn','天相':'Thiên Tướng','天梁':'Thiên Lương','七杀':'Thất Sát','破军':'Phá Quân',
  '左辅':'Tả Phù','右弼':'Hữu Bật','文昌':'Văn Xương','文曲':'Văn Khúc','天魁':'Thiên Khôi','天钺':'Thiên Việt','禄存':'Lộc Tồn','擎羊':'Kình Dương','陀罗':'Đà La','火星':'Hỏa Tinh','铃星':'Linh Tinh','地空':'Địa Không','地劫':'Địa Kiếp',
  '天马':'Thiên Mã','天刑':'Thiên Hình','天姚':'Thiên Diêu','天哭':'Thiên Khốc','天虚':'Thiên Hư','天喜':'Thiên Hỷ','天福':'Thiên Phúc','天官':'Thiên Quan','天贵':'Thiên Quý','天才':'Thiên Tài','天寿':'Thiên Thọ','天月':'Thiên Nguyệt','天巫':'Thiên Vu','天德':'Thiên Đức','月德':'Nguyệt Đức','天厨':'Thiên Trù','天伤':'Thiên Thương','天使':'Thiên Sứ','年解':'Niên Giải','旬空':'Tuần Không','截路':'Triệt Lộ','空亡':'Không Vong','天寿':'Thiên Thọ',
  '红鸾':'Hồng Loan','天钺':'Thiên Việt','龙池':'Long Trì','凤阁':'Phượng Các','三台':'Tam Thai','八座':'Bát Tọa','恩光':'Ân Quang','天贵':'Thiên Quý','台辅':'Thai Phụ','封诰':'Phong Cáo','解神':'Giải Thần','阴煞':'Âm Sát','孤辰':'Cô Thần','寡宿':'Quả Tú','蜚廉':'Phi Liêm','破碎':'Phá Toái','华盖':'Hoa Cái','咸池':'Hàm Trì','天才':'Thiên Tài','天寿':'Thiên Thọ',
  '岁建':'Thái Tuế','晦气':'Hối Khí','丧门':'Tang Môn','贯索':'Quan Tác','官符':'Quan Phù','小耗':'Tiểu Hao','大耗':'Đại Hao','病符':'Bệnh Phù','伏兵':'Phục Binh','官府':'Quan Phủ','博士':'Bác Sĩ','力士':'Lực Sĩ','青龙':'Thanh Long','小耗':'Tiểu Hao','将军':'Tướng Quân','奏书':'Tấu Thư','飞廉':'Phi Liêm','喜神':'Hỷ Thần','病符':'Bệnh Phù',
  '长生':'Tràng Sinh','沐浴':'Mộc Dục','冠带':'Quan Đới','临官':'Lâm Quan','帝旺':'Đế Vượng','衰':'Suy','病':'Bệnh','死':'Tử','墓':'Mộ','绝':'Tuyệt','胎':'Thai','养':'Dưỡng',
  '禄':'Lộc','权':'Quyền','科':'Khoa','忌':'Kỵ','庙':'Miếu','旺':'Vượng','得':'Đắc','利':'Lợi','平':'Bình','陷':'Hãm','大耗':'Đại Hao','小耗':'Tiểu Hao','岁建':'Thái Tuế','晦气':'Hối Khí','丧门':'Tang Môn','贯索':'Quan Tác','官符':'Quan Phù','指背':'Chỉ Bối','咸池':'Hàm Trì','月煞':'Nguyệt Sát','亡神':'Vong Thần','劫煞':'Kiếp Sát','灾煞':'Tai Sát','天煞':'Thiên Sát','吊客':'Điếu Khách','白虎':'Bạch Hổ','龙德':'Long Đức','岁驿':'Tuế Dịch','息神':'Tức Thần','攀鞍':'Phan An','华盖':'Hoa Cái','将星':'Tướng Tinh','病符':'Bệnh Phù','伏兵':'Phục Binh','官府':'Quan Phủ','博士':'Bác Sĩ','力士':'Lực Sĩ','青龙':'Thanh Long','将军':'Tướng Quân','奏书':'Tấu Thư','飞廉':'Phi Liêm','喜神':'Hỷ Thần','死':'Tử','绝':'Tuyệt','胎':'Thai','养':'Dưỡng','长生':'Tràng Sinh','沐浴':'Mộc Dục','冠带':'Quan Đới','临官':'Lâm Quan','帝旺':'Đế Vượng','衰':'Suy','病':'Bệnh','墓':'Mộ'
};
const MEANINGS = {
  menh:'Bản chất, khí chất và xu hướng sống', huynh:'Anh chị em, bạn bè gần', phuThe:'Hôn nhân, tình duyên, đối tác', tuTuc:'Con cái, sáng tạo, di sản', taiBach:'Tài chính, thu nhập, khả năng quản trị nguồn lực', tatAch:'Sức khỏe và trạng thái thân tâm', thienDi:'Môi trường bên ngoài, di chuyển, cơ hội xã hội', noBoc:'Bạn bè, đồng nghiệp, mạng lưới hỗ trợ', quanLoc:'Sự nghiệp, năng lực nghề nghiệp', dienTrach:'Nhà cửa, không gian sống, tài sản nền tảng', phucDuc:'Đời sống tinh thần, phúc khí gia tộc', phuMau:'Cha mẹ, nền tảng gia đình'
};
function vi(value = '') {
  let text = String(value);
  // Longest phrase first: star names are multi-character, never translate character-by-character.
  for (const [zh, vn] of Object.entries(VN).sort(([a], [b]) => b.length - a.length)) text = text.split(zh).join(vn);
  return text;
}
function starType(star) {
  if (star.type === 'major') return 'chinh';
  if (star.type === 'tough') return 'sat';
  if (star.mutagen === '禄') return 'loc';
  if (star.mutagen === '科') return 'khoa';
  return 'phu';
}
function toStar(star) {
  const mutation = star.mutagen ? `Hóa ${vi(star.mutagen)}` : '';
  return { name: mutation || vi(star.name), type: starType(star), brightness: vi(star.brightness || '') };
}
function allStars(palace) { return [...palace.majorStars, ...palace.minorStars, ...palace.adjectiveStars].map(toStar); }
function lunarText(astrolabe) {
  const d = astrolabe.rawDates.lunarDate;
  const canChi = astrolabe.chineseDate.split(' ').slice(0, 2).map(vi).join(' ');
  return `${String(d.lunarDay).padStart(2,'0')}/${String(d.lunarMonth).padStart(2,'0')}/${d.lunarYear} · ${canChi}`;
}
function genericTopics(name) {
  const text = `Dữ liệu sao trong cung được an theo ngày giờ sinh. Phần luận giải tự động chưa được triển khai; không dùng dữ liệu sao đơn lẻ để kết luận.`;
  return { career:text, wealth:text, love:text, family:text, health:text, social:text };
}

export function calculateChart(input) {
  if (!window.iztro?.astro) throw new Error('Không tải được bộ tính lá số cục bộ.');
  const gender = input.gender === 'Nam' ? '男' : '女';
  // iztro uses Gregorian calendar when true; lunar input does not infer leap month, so require solar for verified calculations.
  if (input.calendar !== 'solar') throw new Error('Âm lịch cần thêm lựa chọn tháng nhuận. Hãy dùng Dương lịch để lập lá số đã kiểm chứng.');
  const date = `${input.year}-${String(input.month).padStart(2,'0')}-${String(input.day).padStart(2,'0')}`;
  const chart = window.iztro.astro.bySolar(date, input.hour, gender, true, 'zh-CN');
  const yearPillar = chart.chineseDate.split(' ')[0];
  const palaceData = chart.palaces.map(p => {
    const id = PALACE_IDS[p.name];
    return {
      id, name: PALACE_NAMES[id], meaning: MEANINGS[id], position: CHI.indexOf(vi(p.earthlyBranch)),
      stars: allStars(p),
      overview: `Cung ${PALACE_NAMES[id]} an tại ${vi(p.earthlyBranch)}. Sao tọa thủ: ${allStars(p).map(s => s.name).join(', ') || 'không có chính/phụ tinh hiển thị'}.`,
      advice: 'Đọc theo tổng thể tam hợp, xung chiếu và hoàn cảnh thực tế; không dùng một cung đơn lẻ để kết luận.',
      topics: genericTopics(PALACE_NAMES[id]),
      isBody: p.isBodyPalace
    };
  }).filter(p => p.id);
  PALACES.splice(0, PALACES.length, ...palaceData);
  // Old transit/story copy was demo data. Hide it until transit rules have their own golden tests.
  Object.keys(YEAR_DATA).forEach(key => delete YEAR_DATA[key]);
  Object.assign(USER_INFO, {
    name: input.name, gender: input.gender,
    birthDate: `${String(input.day).padStart(2,'0')}/${String(input.month).padStart(2,'0')}/${input.year}`,
    lunarYear: lunarText(chart), birthHour: `Giờ ${vi(chart.time)} (${chart.timeRange})`,
    menh: `Mệnh an ${vi(chart.earthlyBranchOfSoulPalace)}`,
    cuc: vi(chart.fiveElementsClass), chuMenh: `Thân an ${vi(chart.earthlyBranchOfBodyPalace)}`, chuThan: 'Chưa hiển thị',
    amDuong: input.gender === 'Nam' ? 'Dương Nam' : 'Âm Nữ',
    summary: `Lá số được tính cục bộ theo lịch Việt Nam UTC+7. Năm sinh ${vi(yearPillar)}; Mệnh an tại ${vi(chart.earthlyBranchOfSoulPalace)}${chart.earthlyBranchOfBodyPalace === chart.earthlyBranchOfSoulPalace ? ', Thân cư Mệnh' : `, Thân an tại ${vi(chart.earthlyBranchOfBodyPalace)}`}.`
  });
  return chart;
}
