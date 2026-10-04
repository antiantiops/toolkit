import "./globals.css";

export const metadata = {
  title: "Vocab Learner - Học từ vựng qua ảnh",
  description: "Upload ảnh trang sách, AI trích xuất từ vựng với phát âm và nghĩa tiếng Việt",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body className="bg-slate-950 text-slate-200 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
