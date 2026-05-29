"use client";

import { useState } from "react";
import { useLiff } from "@/hooks/useLiff";
import Image from "next/image";

type TravelerType = "domestic" | "foreign";

export default function Home() {
  const { isReady, isLoggedIn, isInClient, profile, error, login, logout } = useLiff();
  const [travelerType, setTravelerType] = useState<TravelerType>("domestic");
  const [inputValue, setInputValue] = useState("");

  if (!isReady) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#1a2d4f]">
        <p className="text-white/60 text-sm">載入中...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#1a2d4f]">
        <p className="text-red-400 text-sm">初始化失敗：{error.message}</p>
      </main>
    );
  }

  // LINE app 內且未登入 → 自動觸發登入
  if (isInClient && !isLoggedIn) {
    login();
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#1a2d4f]">
        <p className="text-white/60 text-sm">登入中...</p>
      </main>
    );
  }

  // 已登入 → 會員資料頁
  if (isLoggedIn) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#1a2d4f] p-6">
        {profile?.pictureUrl && (
          <Image
            src={profile.pictureUrl}
            alt="avatar"
            width={80}
            height={80}
            className="rounded-full"
          />
        )}
        <p className="text-white text-xl font-semibold">{profile?.displayName}</p>
        <p className="text-white/40 text-xs">{profile?.userId}</p>
        <p className="text-white/40 text-xs">
          {isInClient ? "LINE app 內開啟" : "外部瀏覽器開啟"}
        </p>
        <button
          onClick={logout}
          className="mt-4 border border-white/30 text-white/60 px-6 py-2 rounded-full text-sm"
        >
          登出
        </button>
      </main>
    );
  }

  // 瀏覽器未登入 → 登入/註冊頁
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#1a2d4f] px-7">
      <div className="w-full max-w-[335px] flex flex-col gap-6">

        <h1 className="text-white text-xl font-medium text-center">會員登入 / 註冊</h1>

        {/* Radio：旅客類型 */}
        <div className="flex gap-6">
          {[
            { value: "domestic", label: "本國旅客" },
            { value: "foreign", label: "外國旅客" },
          ].map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="travelerType"
                value={value}
                checked={travelerType === value}
                onChange={() => {
                  setTravelerType(value as TravelerType);
                  setInputValue("");
                }}
                className="accent-[#06C755] w-4 h-4"
              />
              <span className="text-white/80 text-sm">{label}</span>
            </label>
          ))}
        </div>

        {/* Input：依旅客類型切換 */}
        <input
          type={travelerType === "domestic" ? "tel" : "email"}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={travelerType === "domestic" ? "請輸入手機號碼" : "請輸入 Email"}
          className="w-full bg-white/15 text-white placeholder-white/40 text-sm px-4 py-3 rounded-md outline-none"
        />

        {/* LINE 登入按鈕 */}
        <button
          onClick={login}
          className="w-full py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2 bg-[#06C755]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
          </svg>
          使用 LINE 登入
        </button>

      </div>
    </main>
  );
}
