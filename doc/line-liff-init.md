---
title: Line Liff開發研究 －哲煜前端

---

# Line Liff開發研究 －哲煜前端
> 以next試做的liff專案

## 第一步：建立channel（基礎環境建立）

1. 以商務帳號登入https://account.line.biz/login?redirectUri=https%3A%2F%2Fdevelopers.line.biz%2Fconsole%2F
帳密為哲煜前端帳號（可以再和同事詢問帳密）

2. 新增line login channel




> 為什麼是 line login?
> LIFF = 在 LINE 環境內執行的 Web App，需要識別「是哪個 LINE 用戶在看」
→ 這是身份認證的問題 → 所以掛在負責身份認證的 LINE Login Channel 下

建立line login channel初始設定：
填入channel name、選擇國家(Taiwan) 、email（系統會自動帶入登入時的帳號）、App types 選擇web app，其他欄位可暫時留空
> LINE 會依照你選擇的國家套用對應的個資保護法規，這個選項一旦建立後無法修改。
>App types 差別在使用的 SDK	web app 使用的為 @line/liff（JavaScript）

3. 加入line app
進入剛建立的 Channel → 上方 tab 點 LIFF → 點「Add」

> 網址也可先部署，填入正式網址

4. 設定環境參數
此時回到liff 就會有LIFF ID使用它來設定環境參數


5. 將模式從develop 改為published，並將網址傳到line測試是否可開啟，若可開啟表示建立成功
網址格式為：https://liff.line.me/ + 你的LIFF ID



---
## 第二步： 安裝 LIFF SDK 與建立核心架構
1. 安裝sdk ` pnpm add @line/liff`
2. 建立三個基礎檔案

2-1. `src/lib/liff.ts`
> 用途：@line/liff 在模組載入時會嘗試存取 window，在 Next.js SSR 執行時 window 不存在就會崩潰。用動態 import() 包起來，確保只有在瀏覽器執行時才真正載入 SDK。
```
import { Liff } from "@line/liff";


let liff: Liff | null = null;

export async function getLiff(): Promise<Liff> {
  if (liff) return liff;
  const { default: liffModule } = await import("@line/liff");
  liff = liffModule;
  return liff;
}

```


2-2. `src/components/LiffProvider.tsx` 
> 用途：建立一個 React Context，讓整個 App 都能取得 LIFF 的狀態與功能。

> ---

### 第一部分：型別定義

#### 程式碼

```typescript
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
```

#### 說明

`State` 是整個 LIFF 的狀態快照，記錄當下 LIFF 實例、登入狀態、環境資訊與錯誤。

`Action` 是會觸發狀態變化的三種事件：

| Action | 觸發時機 |
|--------|---------|
| `INIT_SUCCESS` | LIFF 初始化成功 |
| `INIT_ERROR` | 初始化失敗（含 LIFF ID 未設定） |
| `LOGOUT` | 用戶登出 |

`reducer` 函式定義每種 Action 發生時，State 要怎麼變。採用 `useReducer` 而非多個 `useState`，確保所有狀態在同一次更新中一起變更，避免中間狀態不一致（例如 `isLoggedIn: true` 但 `profile` 還是 `null`）。

---

### 第二部分：初始化

#### 程式碼

```typescript
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
```

#### 說明

App 載入後執行一次，流程如下：

1. 用 `initCalled` ref 防止 React Strict Mode 的雙重執行
2. 動態載入 `@line/liff`（避免 SSR 時 `window is not defined` 崩潰）
3. 呼叫 `liff.init({ liffId })` 完成 LIFF 初始化
4. 判斷用戶是否已登入（`isLoggedIn`）、是否在 LINE app 內（`isInClient`）
5. 若已登入則取得 profile
6. 將結果用單一 `dispatch(INIT_SUCCESS)` 一次更新所有狀態

> **為什麼用動態 import？**
> `@line/liff` 在模組載入時會嘗試存取 `window`，在 Next.js SSR 執行期間 `window` 不存在會直接崩潰。用 `await import(...)` 包起來，確保只有瀏覽器端才真正載入 SDK。

---

### 第三部分：對外提供的介面

#### 程式碼
> 特別注意： liff.login() 不帶參數時，LINE OAuth 授權完成後 redirect 行為不穩定，有時會再次顯示登入畫面。
> 需明確指示liff.login({ redirectUri: window.location.href })
```typescript
export type LiffState = State & {
  login: () => void;
  logout: () => void;
};

export const LiffContext = createContext<LiffState | undefined>(undefined);

  const login = useCallback(() => {
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
```

#### 說明

透過 `LiffContext.Provider` 提供給所有子元件的資料：

| 屬性 / 方法 | 型別 | 說明 |
|------------|------|------|
| `liff` | `Liff \| null` | LIFF 實例，可直接呼叫所有 LIFF API |
| `isReady` | `boolean` | 初始化是否完成（可開始使用 LIFF） |
| `isLoggedIn` | `boolean` | 用戶是否已登入 |
| `isInClient` | `boolean` | 是否在 LINE app 內開啟 |
| `profile` | `Profile \| null` | 用戶資料（displayName、pictureUrl、userId） |
| `error` | `Error \| null` | 初始化錯誤訊息 |
| `login()` | `() => void` | 觸發 LINE OAuth 授權（外部瀏覽器會跳轉授權頁） |
| `logout()` | `() => void` | 登出並清除 profile |

這個 Provider 包在 `layout.tsx` 最外層，之後任何頁面透過 `useLiff()` hook 即可取得上述所有資料，不需要每個頁面自己初始化 LIFF。

```typescript
// 任意子元件內
const { isReady, isLoggedIn, profile, login } = useLiff();
```

2-3. `src/hooks/useLiff.ts`
> 用途：這個 hook 是子元件取用 LIFF 狀態的入口。有了它，任何頁面只需要：const { isReady, isLoggedIn, profile, login } = useLiff();

```
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

3. 更新`src/app/layout.tsx`
包裝剛剛建立的LiffProvider
```
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">  <LiffProvider>{children}</LiffProvider></body>
    </html>
  );
}
```

4. 建立主頁面 UI，並實作在 LINE app 內 → 自動顯示用戶資料，在瀏覽器開啟 → 顯示「用 LINE 登入」按鈕
> 注意：liff專案需向ｐｍ說需多設計四個畫面

 | 畫面 | 觸發情境 | 優先級 |
|------|---------|--------|
| Loading | 所有頁面開啟時的 1~3 秒初始化過程 | 高 |
| 登入 | 從瀏覽器開啟、尚未登入 | 高 |
| 取消授權 | 用戶在 LINE 授權頁按取消 | 中 |
| 初始化失敗 | 網路不穩、LINE 伺服器異常 | 中 | 

更新 `src/app/page.tsx`

```
"use client";

import { useLiff } from "@/hooks/useLiff";
import Image from "next/image";

export default function Home() {
  const { isReady, isLoggedIn, isInClient, profile, error, login, logout } = useLiff();

  if (!isReady) {
    return (
      loading畫面
    );
  }

  if (error) {
    return (
      初始化失敗畫面
    );
  }

!isLoggedIn觸發情境：從瀏覽器開啟，未登入 → 顯示這個畫面 ✅
從 LINE app 開啟，但 token 過期或異常導致未登入 → 也會顯示這個畫面
  
  if (!isLoggedIn) {
    return (
    登入以繼續畫面
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

```
> 注意：需在next.config.ts 設定 才可成功顯示頭像圖片
```
const nextConfig: NextConfig = {
images: {
    domains: ["profile.line-scdn.net"],
  },
};
```

圖文版網址：
https://hackmd.io/@jadesnote/By6gZ9SeMe
