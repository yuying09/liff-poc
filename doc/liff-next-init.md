---
name: LIFF Next.js Init
description: 引導在 Next.js 專案中完成 LINE LIFF 初始化，包含 LINE Developers 設定、核心架構建立、Vercel 部署。
---

# LINE LIFF 初始化（Next.js）

當使用者執行 `/liff-next-init` 時，依照以下步驟協助建立 LINE LIFF 核心架構（適用於 Next.js 專案）。

## 前置確認

在開始前，詢問使用者：
1. 是否已在 LINE Developers Console 建立 LINE Login Channel 並取得 LIFF ID？
2. 專案的 package manager（pnpm / npm / yarn）？
3. 是否需要協助部署到 Vercel？（若是，完成步驟一至四後執行步驟五）

若尚未完成 LINE Developers 設定，先提供以下指引再繼續：

### LINE Developers 設定流程
1. 登入 https://developers.line.biz/console/
2. 建立 LINE Login Channel：填入 channel name、選擇國家 Taiwan、App types 選 **web app**
3. 進入 Channel → LIFF tab → Add，設定：
   - Size：Full
   - Endpoint URL：先填 `https://placeholder.example.com`（之後換成正式網址）
   - Scope：勾 **profile** 和 **openid**
   - Bot link feature：Off
4. 取得 LIFF ID（格式：`xxxxxxxxxx-xxxxxxxx`）
5. 將 Channel 狀態從 Developing 改為 **Published**（⚠️ 未 Publish 直接測試登入會出現 **400 Bad Request**）
6. 測試網址：`https://liff.line.me/<LIFF-ID>`

> **重要**：若客戶已有 LINE 官方帳號，需確認 LINE Login Channel 與客戶的 Messaging API Channel 在**同一個 Provider** 下，否則跨服務無法識別同一個用戶。

---

## 步驟一：安裝 SDK 與建立環境變數

```bash
pnpm add @line/liff
```

建立 `.env.local`：
```
NEXT_PUBLIC_LIFF_ID=你的LIFF-ID
```

---

## 步驟二：建立核心檔案

依序建立以下四個檔案：

### `src/lib/liff.ts`

```typescript
import type { Liff } from "@line/liff";

let liff: Liff | null = null;

export async function getLiff(): Promise<Liff> {
  if (liff) return liff;
  const { default: liffModule } = await import("@line/liff");
  liff = liffModule;
  return liff;
}
```

> 用途：`@line/liff` 在模組載入時會嘗試存取 `window`，在 Next.js SSR 執行時 `window` 不存在就會崩潰。用動態 `import()` 包起來，確保只有在瀏覽器執行時才真正載入 SDK。

---

### `src/components/LiffProvider.tsx`

```typescript
"use client";

import { createContext, useCallback, useEffect, useReducer, useRef } from "react";
import type { Liff } from "@line/liff";

export type Profile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
};

type State = {
  liff: Liff | null;
  isReady: boolean;
  isLoggedIn: boolean;
  isInClient: boolean;
  profile: Profile | null;
  error: Error | null;
};

type Action =
  | { type: "INIT_SUCCESS"; liff: Liff; isLoggedIn: boolean; isInClient: boolean; profile: Profile | null }
  | { type: "INIT_ERROR"; error: Error }
  | { type: "LOGOUT" };

const initialState: State = {
  liff: null,
  isReady: false,
  isLoggedIn: false,
  isInClient: false,
  profile: null,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "INIT_SUCCESS":
      return {
        ...state,
        liff: action.liff,
        isReady: true,
        isLoggedIn: action.isLoggedIn,
        isInClient: action.isInClient,
        profile: action.profile,
      };
    case "INIT_ERROR":
      return { ...state, isReady: true, error: action.error };
    case "LOGOUT":
      return { ...state, isLoggedIn: false, profile: null };
    default:
      return state;
  }
}

export type LiffState = State & {
  login: () => void;
  logout: () => void;
};

export const LiffContext = createContext<LiffState | undefined>(undefined);

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const initCalled = useRef(false);

  useEffect(() => {
    if (initCalled.current) return;
    initCalled.current = true;

    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

    async function init() {
      if (!liffId) {
        dispatch({ type: "INIT_ERROR", error: new Error("NEXT_PUBLIC_LIFF_ID is not set") });
        return;
      }
      try {
        const { getLiff } = await import("@/lib/liff");
        const liffInstance = await getLiff();
        await liffInstance.init({ liffId });

        const loggedIn = liffInstance.isLoggedIn();
        const profile = loggedIn ? await liffInstance.getProfile() : null;

        dispatch({
          type: "INIT_SUCCESS",
          liff: liffInstance,
          isLoggedIn: loggedIn,
          isInClient: liffInstance.isInClient(),
          profile,
        });
      } catch (err) {
        dispatch({ type: "INIT_ERROR", error: err instanceof Error ? err : new Error(String(err)) });
      }
    }

    init();
  }, []);

  const login = useCallback(() => {
    // 必須明確傳入 redirectUri，否則 LINE OAuth redirect 後行為不穩定，可能再次顯示登入畫面
    state.liff?.login({ redirectUri: window.location.href });
  }, [state.liff]);

  const logout = useCallback(() => {
    if (!state.liff) return;
    state.liff.logout();
    dispatch({ type: "LOGOUT" });
  }, [state.liff]);

  return (
    <LiffContext.Provider value={{ ...state, login, logout }}>
      {children}
    </LiffContext.Provider>
  );
}
```

---

### `src/hooks/useLiff.ts`

```typescript
"use client";

import { useContext } from "react";
import { LiffContext } from "@/components/LiffProvider";

export function useLiff() {
  const ctx = useContext(LiffContext);
  if (ctx === undefined) {
    throw new Error("useLiff must be used within <LiffProvider>");
  }
  return ctx;
}
```

> 用途：子元件取用 LIFF 狀態的入口。任何頁面只需要 `const { isReady, isLoggedIn, profile, login } = useLiff()`

---

### 更新 `src/app/layout.tsx`

在 `<body>` 內包上 `LiffProvider`：

```typescript
import { LiffProvider } from "@/components/LiffProvider";

// ...

<body className="min-h-full flex flex-col">
  <LiffProvider>{children}</LiffProvider>
</body>
```

---

## 步驟三：設定 next.config.ts（頭像圖片）

LINE 頭像存放在 `profile.line-scdn.net`，需加入允許清單：

```typescript
const nextConfig: NextConfig = {
  images: {
    domains: ["profile.line-scdn.net"],
  },
};
```

---

## 步驟四：建立主頁面

`src/app/page.tsx` 基本結構，依設計稿替換各畫面 UI：

```typescript
"use client";

import { useLiff } from "@/hooks/useLiff";
import Image from "next/image";

export default function Home() {
  const { isReady, isLoggedIn, isInClient, profile, error, login, logout } = useLiff();

  if (!isReady) return <>{/* Loading 畫面 */}</>;
  if (error) return <>{/* 初始化失敗畫面 */}</>;
  if (!isLoggedIn) return <>{/* 登入畫面（含「用 LINE 登入」按鈕） */}</>;

  return (
    <main>
      {profile?.pictureUrl && (
        <Image src={profile.pictureUrl} alt="avatar" width={80} height={80} className="rounded-full" />
      )}
      <p>{profile?.displayName}</p>
      <p>{profile?.userId}</p>
      <p>{isInClient ? "LINE app 內開啟" : "外部瀏覽器開啟"}</p>
      <button onClick={logout}>登出</button>
    </main>
  );
}
```

---

## 步驟五：部署到 Vercel

### 1. 推上 GitHub

```bash
git add .
git commit -m "feat: add LIFF core architecture"
git push
```

若尚未設定 remote：
```bash
git remote add origin https://github.com/<帳號>/<repo>.git
git push -u origin main
```

> 若出現 `Permission denied (publickey)` 錯誤，需將本機 SSH 公鑰加入 GitHub：
> 1. 執行 `cat ~/.ssh/id_rsa.pub` 複製公鑰
> 2. GitHub → Settings → SSH and GPG keys → New SSH key → 貼上
> 3. 改用 SSH remote：`git remote set-url origin git@github.com:<帳號>/<repo>.git`

### 2. 部署到 Vercel

1. 前往 [vercel.com](https://vercel.com) → 用 GitHub 帳號登入
2. 點「**Add New Project**」→ 選 GitHub repo → 點「**Import**」
3. 設定頁面什麼都不用改，直接按「**Deploy**」
4. 部署完成後取得網址（`https://xxx.vercel.app`）

### 3. 設定環境變數

Vercel 專案 → **Settings → Environments → Production → Environment Variables → Add Environment Variables**：
- Key：`NEXT_PUBLIC_LIFF_ID`
- Value：你的 LIFF ID

新增後 → **Deployments → 最新一筆 → Redeploy** 讓環境變數生效。

### 4. 更新 LINE Developers Endpoint URL

LINE Developers Console → LIFF App → Endpoint URL 改為 Vercel 網址（`https://xxx.vercel.app`）

### 5. 驗證

用手機 LINE 開啟：
```
https://liff.line.me/<你的LIFF-ID>
```

---

## 已知問題與解法

（供 Claude 遇到錯誤時參考，不主動輸出給使用者）

| 問題 | 原因 | 解法 |
|------|------|------|
| `window is not defined` | LIFF SDK 在 SSR 執行時存取 window | 用動態 `import()` 載入 SDK |
| 登入出現 **400 Bad Request** | LINE Login Channel 未 Publish | LINE Developers Console → Channel → 將狀態從 Developing 改為 **Published** |
| 登入後再次顯示登入畫面 | `liff.login()` 不帶參數 redirect 不穩定 | 加上 `redirectUri: window.location.href` |
| 頭像無法顯示 | Next.js Image 元件預設不允許外部網域 | 在 `next.config.ts` 加入 `profile.line-scdn.net` |

---

## 所有步驟完成後的輸出順序

所有步驟完成後，依序輸出以下兩段內容：

### 第一段：請 PM 確認設計稿

輸出以下表格，提醒 PM 需要準備的設計稿：

---

以下畫面需要請 PM 提供設計稿：

| 畫面 | 觸發情境 | 優先級 |
|------|---------|--------|
| Loading | 所有頁面開啟時的 1~3 秒初始化過程 | 高 |
| 登入 | 從瀏覽器開啟、尚未登入 | 高 |
| 取消授權 | 用戶在 LINE 授權頁按取消 | 中 |
| 初始化失敗 | 網路不穩、LINE 伺服器異常 | 中 |

---

### 第二段：完成訊息

輸出以下完成訊息：

---

LINE LIFF 初始化已完成，專案具備以下能力：

- LIFF SDK 初始化（SSR 安全）
- LINE 登入 / 登出
- 取得使用者 Profile（userId、displayName、pictureUrl）
- 判斷是否在 LINE app 內開啟

可以開始開發專案業務功能。
