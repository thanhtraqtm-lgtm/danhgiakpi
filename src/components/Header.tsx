import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, X, RotateCcw, Check, Image as ImageIcon, Sparkles, AlertCircle } from 'lucide-react';
import { fsLoadLogo, fsSaveLogo } from '../utils/firestoreSync';

interface HeaderProps {
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  onExportData?: () => void;
  selectedDepartment?: string;
  setSelectedDepartment?: (dept: string) => void;
  departments?: string[];
  globalRole?: string;
  setGlobalRole?: (role: string) => void;
  users?: any[];
  currentUser?: any;
  setCurrentUser?: (user: any) => void;
  onOpenLoginModal?: () => void;
  onOpenChangePassword?: () => void;
  onLogout?: () => void;
}

// Biểu tượng Logo Thống Kê chuẩn Vector SVG chất lượng cao (không bao giờ bị vỡ hình)
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

export const Header: React.FC<HeaderProps> = () => {
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem('app_custom_logo') || null;
    } catch {
      return null;
    }
  });

  const [showLogoModal, setShowLogoModal] = useState<boolean>(false);
  const [inputUrl, setInputUrl] = useState<string>('');
  const [imgError, setImgError] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync logo across browser tabs / events
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'app_custom_logo') {
        setLogoUrl(e.newValue);
        setImgError(false);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Load logo from Firestore (cloud) on mount — keeps logo across logins/devices.
  // Cloud wins if present and differs from localStorage; else seed cloud from local.
  useEffect(() => {
    let active = true;
    (async () => {
      const cloudLogo = await fsLoadLogo();
      if (!active) return;
      let localLogo: string | null = null;
      try { localLogo = localStorage.getItem('app_custom_logo'); } catch { localLogo = null; }
      if (cloudLogo) {
        if (cloudLogo !== localLogo) {
          setLogoUrl(cloudLogo);
          setImgError(false);
          try { localStorage.setItem('app_custom_logo', cloudLogo); } catch {}
        }
      } else if (localLogo) {
        fsSaveLogo(localLogo);
      }
    })();
    return () => { active = false; };
  }, []);

  const saveLogo = (urlData: string, message: string = 'Đã cập nhật Logo thành công!') => {
    setLogoUrl(urlData);
    setImgError(false);
    try {
      localStorage.setItem('app_custom_logo', urlData);
    } catch {
      // Silently ignore localStorage write errors
    }
    fsSaveLogo(urlData); // mirror to Firestore (cloud)
    setStatusMessage({ type: 'success', text: message });
    setTimeout(() => {
      setShowLogoModal(false);
      setStatusMessage(null);
    }, 900);
  };

  // Resize image via Canvas to make it super fast, sharp, and lightweight (< 30KB)
  const processImageFile = (file: File) => {
    setStatusMessage(null);

    // Check by mime type or file extension
    const isImageExt = /\.(png|jpe?g|svg|webp|ico|gif|bmp|avif)$/i.test(file.name);
    const isImageMime = file.type.startsWith('image/') || file.type.includes('svg');

    if (!isImageExt && !isImageMime) {
      setStatusMessage({ 
        type: 'error', 
        text: 'Vui lòng chọn đúng file hình ảnh (.PNG, .JPG, .JPEG, .SVG, .WEBP)!' 
      });
      return;
    }

    // If SVG or small file, read as DataURL directly
    if (file.name.toLowerCase().endsWith('.svg') || file.type.includes('svg')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const res = e.target?.result as string;
        if (res) saveLogo(res, `Đã chèn Logo SVG "${file.name}" thành công!`);
      };
      reader.onerror = () => {
        setStatusMessage({ type: 'error', text: 'Không thể đọc file hình ảnh đã chọn.' });
      };
      reader.readAsDataURL(file);
      return;
    }

    // For standard images, load and resize to optimal square / max 300px
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (!rawDataUrl) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 320;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedDataUrl = canvas.toDataURL('image/png', 0.95);
          saveLogo(optimizedDataUrl, `Đã cập nhật Logo "${file.name}" thành công!`);
        } else {
          saveLogo(rawDataUrl, `Đã cập nhật Logo "${file.name}" thành công!`);
        }
      };
      img.onerror = () => {
        saveLogo(rawDataUrl, `Đã cập nhật Logo "${file.name}" thành công!`);
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      setStatusMessage({ type: 'error', text: 'Lỗi đọc dữ liệu file ảnh.' });
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processImageFile(files[0]);
    }
    // Reset file input value so user can select the same file again if wanted
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleSaveUrl = () => {
    if (!inputUrl.trim()) return;
    saveLogo(inputUrl.trim(), 'Đã áp dụng đường dẫn ảnh Logo thành công!');
    setInputUrl('');
  };

  const handleResetLogo = () => {
    setLogoUrl(null);
    setImgError(false);
    try {
      localStorage.removeItem('app_custom_logo');
    } catch {
      // Silently ignore localStorage remove errors
    }
    fsSaveLogo(''); // clear cloud logo (empty string = default)
    setStatusMessage({ type: 'success', text: 'Đã khôi phục về Logo mặc định của ngành Thống Kê!' });
    setTimeout(() => {
      setShowLogoModal(false);
      setStatusMessage(null);
    }, 700);
  };

  return (
    <>
      <header className="h-14 bg-[#f59e0b] text-white fixed top-0 right-0 left-72 z-30 px-4 flex items-center justify-between border-b border-[#d97706] shadow-sm font-sans">
        <div className="w-24"></div>

        {/* Center Title & Interactive Logo */}
        <div className="flex items-center gap-3 select-none">
          <div 
            onClick={() => {
              setStatusMessage(null);
              setShowLogoModal(true);
            }}
            className="group relative cursor-pointer"
            title="Bấm vào để chọn hoặc đổi Logo cơ quan"
          >
            <div className="h-9 w-9 flex items-center justify-center transition-transform group-hover:scale-105">
              {logoUrl && !imgError ? (
                <img 
                  src={logoUrl} 
                  alt="Logo Thống Kê" 
                  onError={() => setImgError(true)}
                  className="w-full h-full object-contain drop-shadow-xs" 
                />
              ) : (
                <div className="w-full h-full rounded-full overflow-hidden">
                  <DefaultStatLogo />
                </div>
              )}
            </div>
            {/* Camera badge on hover */}
            <div className="absolute -bottom-1 -right-1 bg-slate-900/90 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-xs">
              <Camera className="w-2.5 h-2.5" />
            </div>
          </div>

          <h1 className="text-base sm:text-lg font-bold text-white tracking-wide uppercase drop-shadow-xs">
            THỐNG KÊ TỈNH HƯNG YÊN
          </h1>
        </div>

        {/* Right spacing to balance header */}
        <div className="w-24"></div>
      </header>

      {/* MODAL ĐỔI / CHÈN LOGO */}
      {showLogoModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setShowLogoModal(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Cài Đặt & Chèn Logo Cơ Quan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notification alert banner */}
            {statusMessage && (
              <div className={`mt-3 p-2.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in ${
                statusMessage.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' 
                  : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
              }`}>
                {statusMessage.type === 'success' ? (
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span className="font-medium">{statusMessage.text}</span>
              </div>
            )}

            {/* Drag & Drop / Preview Box */}
            <div 
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`py-4 px-4 flex flex-col items-center justify-center gap-2 rounded-xl my-3 border-2 border-dashed cursor-pointer transition-all ${
                isDragging 
                  ? 'border-red-500 bg-red-50 dark:bg-red-950/30 scale-[1.01]' 
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-red-400'
              }`}
            >
              <div className="h-16 w-16 rounded-full bg-white p-1 shadow-md ring-2 ring-red-500/30 flex items-center justify-center overflow-hidden">
                {logoUrl && !imgError ? (
                  <img src={logoUrl} alt="Preview" className="w-full h-full object-contain" />
                ) : (
                  <DefaultStatLogo />
                )}
              </div>
              <div className="text-center">
                <span className="text-xs text-slate-700 dark:text-slate-200 font-semibold block">
                  {logoUrl ? 'Bấm vào đây hoặc kéo thả ảnh mới để thay thế' : 'Kéo thả file ảnh hoặc bấm để chọn ảnh'}
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  Hỗ trợ PNG, JPG, JPEG, SVG, WebP (Tự động tối ưu dung lượng)
                </span>
              </div>
            </div>

            {/* Hidden native input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileInputChange} 
              accept="image/*,.png,.jpg,.jpeg,.svg,.webp,.ico,.gif,.bmp" 
              className="hidden" 
            />

            {/* Methods to upload */}
            <div className="space-y-3">
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Chọn file ảnh từ máy tính</span>
                </button>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                <span className="shrink mx-2 text-[11px] text-slate-400 font-medium uppercase">Hoặc dán Link URL</span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
              </div>

              <div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveUrl}
                    disabled={!inputUrl.trim()}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetLogo}
                className="text-xs text-slate-500 hover:text-red-600 font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi phục Logo mặc định</span>
              </button>

              <button
                type="button"
                onClick={() => setShowLogoModal(false)}
                className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
