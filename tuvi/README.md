# Tử Vi Đẩu Số — Web App

Web app xem lá số Tử Vi Đẩu Số phương Đông, thiết kế hiện đại, dễ đọc.

## Tính năng

- **Lá số 12 cung** (SVG): click cung, hiện tam hợp / xung chiếu
- **Panel chi tiết**: 4 tab (Tổng quan, Sao trong cung, Luận giải, Năm hiện tại)
- **Chọn chủ đề**: Sự nghiệp, Tài lộc, Tình duyên, Gia đạo, Sức khỏe, Quan hệ
- **Chọn năm**: 2024–2028, lớp lưu niên overlay lên lá số gốc
- **Story mode**: 5 bước hướng dẫn đọc lá số cho người mới
- **Dark / Light mode**
- **Responsive**, keyboard navigation
- **Tôn trọng `prefers-reduced-motion`**

## Sử dụng

Mở `index.html` trực tiếp trong trình duyệt. Không cần server, không cần build.

> **Lưu ý**: Dùng ES modules (`type="module"`) nên cần mở qua local server nếu trình duyệt block module import từ `file://`. Cách đơn giản:
> ```bash
> npx serve .
> # hoặc
> python3 -m http.server 8080
> ```

## Cấu trúc

```
tuvi/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js       — Main app, state management
│   ├── chart.js     — SVG chart rendering
│   ├── data.js      — Demo data (12 cung, sao, luận giải)
│   ├── panel.js     — Detail panel, tabs
│   ├── story.js     — Story mode / Guided reading
│   └── utils.js     — Theme, helpers, export
└── README.md
```

## Dữ liệu demo

- Nguyễn Minh Khôi, Nam, 15/03/1990 (Canh Ngọ), giờ Mão
- Mệnh Kim, Cục Kim Tứ Cục
- 12 cung đầy đủ sao + luận giải
- Dữ liệu lưu niên 2024–2028

## Thiết kế

- **Dark theme**: nền đen than, text ngà sáng, accent vàng champagne + xanh ngọc trầm
- **Light theme**: nền kem ngà, text nâu than, accent vàng đồng + xanh cổ vịt
- Font: Inter (sans) + Noto Serif
- Phong cách: tĩnh, sâu, premium, tâm linh vừa đủ
