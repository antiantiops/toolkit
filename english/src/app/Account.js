'use client';
import { useEffect, useState } from 'react';
import { useLanguage } from './LanguageContext';

export default function Account() {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/me', { cache: 'no-store', signal: controller.signal }).then(res => res.ok ? res.json() : null).then(data => setUser(data?.user || null)).catch(() => {});
    return () => controller.abort();
  }, []);
  return user ? <p className="mb-3 break-all text-right text-xs text-slate-400">{t('Đăng nhập: ')}{user.email}</p> : null;
}
