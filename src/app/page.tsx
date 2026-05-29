"use client";

import { useLiff } from "@/hooks/useLiff";
import Image from "next/image";

export default function Home() {
  const { isReady, isLoggedIn, isInClient, profile, error, login, logout } = useLiff();

  if (!isReady) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-gray-500">載入中...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6">
        <p className="text-red-500 text-sm">初始化失敗：{error.message}</p>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-600">請登入以繼續</p>
        <button
          onClick={login}
          className="bg-[#06C755] text-white px-6 py-3 rounded-full font-medium"
        >
          用 LINE 登入
        </button>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
      {profile?.pictureUrl && (
        <Image
          src={profile.pictureUrl}
          alt="avatar"
          width={80}
          height={80}
          className="rounded-full"
        />
      )}
      <p className="text-xl font-semibold">{profile?.displayName}</p>
      <p className="text-xs text-gray-400">{profile?.userId}</p>
      <p className="text-xs text-gray-400">
        {isInClient ? "LINE app 內開啟" : "外部瀏覽器開啟"}
      </p>
      <button
        onClick={logout}
        className="mt-4 border border-gray-300 text-gray-600 px-6 py-2 rounded-full text-sm"
      >
        登出
      </button>
    </main>
  );
}
