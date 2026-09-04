import React, { useState, useRef, useEffect } from 'react';
import { 
  LogIn, 
  Eye, 
  EyeOff, 
  User, 
  Lock, 
  AlertCircle
} from 'lucide-react';
import { User as UserType } from '../types';
import { fsLoadLogo } from '../utils/firestoreSync';

// Biểu tượng Logo Thống Kê chuẩn Vector SVG (đồng bộ với Header)
const DefaultStatLogo = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <circle cx="24" cy="24" r="22" fill="#b91c1c" stroke="#fbbf24" strokeWidth="2.5" />
    <circle cx="24" cy="24" r="18.5" fill="#dc2626" />
    {/* Biểu tượng cột thống kê vàng kim */}
    <rect x="13" y="25" width="4" height="10" rx="1" fill="#fef08a" />
    <rect x="19" y="19" width="4" height="16" rx="1" fill="#fde047" />
    <rect x="25" y="14" width="4" height="21" rx="1" fill="#facc15" />
    <rect x="31" y="21" width="4" height="14" rx="1" fill="#eab308" />
    {/* Đường xu hướng tăng trưởng */}
    <path d="M12 23L19 16L27 12L35 18" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    {/* Ngôi sao vàng 5 cánh ở đỉnh */}
    <path d="M24 6L25.3 9.2L28.8 9.5L26.1 11.7L26.9 15.1L24 13.3L21.1 15.1L21.9 11.7L19.2 9.5L22.7 9.2L24 6Z" fill="#fde047" />
  </svg>
);

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: UserType) => void;
  users: UserType[];
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  users,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  // Logo lấy từ tiêu đề (localStorage hoặc Cloud Firestore)
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem('app_custom_logo') || null;
    } catch {
      return null;
    }
  });
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => usernameRef.current?.focus(), 100);
      setError('');
      setUsername('');
      setPassword('');

      // Cập nhật logo mới nhất từ localStorage
      try {
        const local = localStorage.getItem('app_custom_logo');
        if (local) {
          setLogoUrl(local);
          setImgError(false);
        }
      } catch {}

      // Kiểm tra thêm từ Firestore
      fsLoadLogo().then(cloudLogo => {
        if (cloudLogo) {
          setLogoUrl(cloudLogo);
          setImgError(false);
        }
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
      return;
    }

    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const normalizeStr = (s: string) => 
      s.normalize('NFC').trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
    
    const normInput = normalizeStr(username);
    
    const matchedUser = users.find(u => {
      const normUser = normalizeStr(u.username || u.fullName || '');
      const normFull = normalizeStr(u.fullName || '');
      return normUser === normInput || normFull === normInput;
    });
    
    if (matchedUser && matchedUser.password === password.trim()) {
      onLogin(matchedUser);
      onClose();
    } else {
      setError('Tên đăng nhập hoặc mật khẩu không chính xác');
    }
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-[#74A07E] px-6 py-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#5C8665] via-[#74A07E] to-[#86B18F] opacity-95" />
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/15 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-emerald-950/20 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
          
          <div className="relative flex flex-col items-center text-center">
            {/* Logo hiển thị thoáng, bỏ viền ôm theo yêu cầu người dùng */}
            <div className="w-16 h-16 mx-auto mb-2.5 flex items-center justify-center">
              {logoUrl && !imgError ? (
                <img 
                  src={logoUrl} 
                  alt="Logo Cơ Quan" 
                  onError={() => setImgError(true)}
                  className="max-w-full max-h-full object-contain drop-shadow-md" 
                />
              ) : (
                <div className="w-14 h-14 flex items-center justify-center drop-shadow-md">
                  <DefaultStatLogo />
                </div>
              )}
            </div>
            <h2 className="text-lg font-black text-white tracking-wide uppercase drop-shadow-md">
              THỐNG KÊ TỈNH HƯNG YÊN
            </h2>
            <p className="text-xs text-white/90 mt-1 font-semibold tracking-wider uppercase">
              Hệ thống đánh giá KPI & Đăng nhập
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-xl text-rose-700 dark:text-rose-300 text-sm animate-in slide-in-from-top-2 duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Tên đăng nhập
            </label>
            <div className="relative">
              <input
                ref={usernameRef}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập hoặc họ tên"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#74A07E] focus:border-transparent transition-all"
                autoComplete="username"
                disabled={isLoading}
              />
              <User className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Mật khẩu
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="w-full pl-10 pr-12 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#74A07E] focus:border-transparent transition-all"
                autoComplete="current-password"
                disabled={isLoading}
              />
              <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#74A07E] transition-colors p-1"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-[#74A07E] to-[#5D8767] hover:from-[#65916F] hover:to-[#507659] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#74A07E]/30 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
{isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Đang đăng nhập...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Đăng Nhập
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-4">
            Sử dụng tài khoản nhân sự đã được nhập trong hệ thống
          </p>
        </form>

        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-[#74A07E] transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};