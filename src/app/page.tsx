'use client'

import { useState } from 'react'
import { useLiff } from '@/hooks/useLiff'

export default function Home() {
  const { isReady, isLoggedIn, error, login } = useLiff()
  const [phone, setPhone] = useState('')
  const [agreed, setAgreed] = useState(false)

  const isFormValid = phone.length > 0 && agreed

  if (!isReady) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #2C4A7C 0%, #1a2d4f 100%)' }}>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Noto Sans TC, sans-serif' }}>載入中...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #2C4A7C 0%, #1a2d4f 100%)' }}>
        <p className="text-red-400 text-sm">初始化失敗：{error.message}</p>
      </main>
    )
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-[28px]"
      style={{ background: 'linear-gradient(160deg, #2C4A7C 0%, #1a2d4f 100%)' }}
    >
      <div className="w-full max-w-[335px]">

        {/* 標題區 */}
        <div className="text-center">
          <h1
            className="text-[20px] font-medium leading-[28px] text-white"
            style={{ letterSpacing: '0.5px', fontFamily: 'Noto Sans TC, sans-serif' }}
          >
            會員身份驗證
          </h1>
          <div className="mt-[48px] space-y-[24px]">
            <p
              className="text-[14px] font-normal leading-[20px] text-center"
              style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Noto Sans TC, sans-serif' }}
            >
              請輸入您的手機號碼以進行驗證
            </p>
            <p
              className="text-[14px] font-medium leading-[20px] text-white text-center"
              style={{ fontFamily: 'Noto Sans TC, sans-serif' }}
            >
              *若已是會員，請輸入註冊會員登記之手機號碼
            </p>
          </div>
        </div>

        {isLoggedIn ? (
          <>
            {/* 輸入框 */}
            <div className="mt-[48px]">
              <div className="flex items-center gap-[4px] mb-[8px]">
                <span
                  className="text-[14px] font-normal leading-[20px]"
                  style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Noto Sans TC, sans-serif' }}
                >
                  手機號碼
                </span>
                <span className="text-[14px] leading-[20px]" style={{ color: '#e94d4d' }}>*</span>
              </div>
              <div
                className="flex items-center gap-[8px] px-[14px] py-[14px] rounded-[6px]"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="flex-shrink-0">
                  <path
                    d="M14.167 12.833c-.334-.333-1.084-.833-1.584-.833-.333 0-.666.167-1 .5l-.666.667c-1.25-.667-2.5-1.834-3.25-3.167l.666-.667c.334-.333.5-.666.5-1 0-.5-.5-1.25-.833-1.583C7.667 6.417 7.25 6 6.833 6c-.5 0-1 .333-1.416.75L4.75 7.417c-.583.583-.917 1.333-.75 2.083C4.25 10.75 5.25 12.5 6.75 14c1.5 1.5 3.25 2.5 4.5 2.75.75.167 1.5-.167 2.083-.75l.667-.667c.417-.416.75-.916.75-1.416 0-.417-.417-.834-.583-1.084z"
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="請輸入手機號碼"
                  className="flex-1 bg-transparent outline-none text-[14px] font-normal leading-[20px] text-white"
                  style={{ fontFamily: 'Noto Sans TC, sans-serif', caretColor: 'white' }}
                />
              </div>
            </div>

            {/* 條款同意 */}
            <div className="flex items-center gap-[8px] mt-[28px]">
              <button
                onClick={() => setAgreed(!agreed)}
                className="w-[24px] h-[24px] flex items-center justify-center rounded-[3px] border border-white flex-shrink-0 transition-colors"
                style={{ background: agreed ? 'white' : 'transparent' }}
                aria-label="同意條款"
              >
                {agreed && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7L5.5 10L11.5 4" stroke="#2C4A7C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <p
                className="text-[14px] leading-[20px]"
                style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'Noto Sans TC, sans-serif' }}
              >
                我已閱讀並同意{' '}
                <span className="underline cursor-pointer text-white">會員條款</span>
                {' '}和{' '}
                <span className="underline cursor-pointer text-white">隱私權政策</span>
              </p>
            </div>

            {/* 取得驗證碼按鈕 */}
            <button
              disabled={!isFormValid}
              className="w-full mt-[28px] py-[14px] px-[24px] rounded-[8px] text-[16px] font-medium leading-[24px] transition-all"
              style={{
                background: isFormValid ? '#ffffff' : '#dce0e5',
                color: isFormValid ? '#2C4A7C' : '#6a7581',
                fontFamily: 'Noto Sans TC, sans-serif',
              }}
            >
              取得驗證碼
            </button>
          </>
        ) : (
          /* 未登入：LINE 登入按鈕 */
          <button
            onClick={login}
            className="w-full mt-[48px] py-[14px] px-[24px] rounded-[8px] text-[16px] font-medium leading-[24px] flex items-center justify-center gap-[10px] transition-opacity hover:opacity-90"
            style={{ background: '#06C755', color: '#ffffff', fontFamily: 'Noto Sans TC, sans-serif' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
            使用 LINE 登入
          </button>
        )}

      </div>
    </main>
  )
}
