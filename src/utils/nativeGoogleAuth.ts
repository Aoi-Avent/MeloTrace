/**
 * iOSアプリ用のGoogleログイン（OAuth 2.0 + PKCE）。
 *
 * Googleは埋め込みWebViewでのログインを拒否するため、システムのブラウザ画面
 * （SFSafariViewController）で認証し、カスタムURLスキーム
 * `com.googleusercontent.apps.<ID>:/oauth2redirect` でアプリに戻ります。
 * リフレッシュトークンを保存するので、アクセストークン（約1時間）の更新は無操作で行えます。
 *
 * 必要なもの: Google Cloud Console の「iOS」タイプのOAuthクライアントID
 */
import { CapacitorHttp } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Preferences } from '@capacitor/preferences';

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';
const REFRESH_KEY = 'melotrace_google_refresh_token_v1';

export interface NativeToken {
  accessToken: string;
  expiresAt: number;
}

const redirectScheme = (clientId: string) =>
  'com.googleusercontent.apps.' + clientId.replace(/\.apps\.googleusercontent\.com$/, '');
const redirectUri = (clientId: string) => `${redirectScheme(clientId)}:/oauth2redirect`;

function base64Url(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString(byteLength: number): string {
  const a = new Uint8Array(byteLength);
  crypto.getRandomValues(a);
  return base64Url(a);
}

async function sha256Challenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

type AuthResult = { code?: string; error?: Error };

/** ブラウザ画面で認証し、認可コードを受け取る */
async function authorize(clientId: string, scope: string, prompt: string): Promise<{ code: string; verifier: string }> {
  const verifier = randomString(48);
  const state = randomString(16);
  const challenge = await sha256Challenge(verifier);
  const redirect = redirectUri(clientId);
  const scheme = redirectScheme(clientId) + ':';

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: 'code',
    scope,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    access_type: 'offline',
  });
  if (prompt) params.set('prompt', prompt);

  let settle!: (r: AuthResult) => void;
  const result = new Promise<AuthResult>((resolve) => {
    settle = resolve; // 最初の1回だけが有効
  });

  const urlListener = await App.addListener('appUrlOpen', ({ url }) => {
    if (!url.startsWith(scheme)) return;
    const query = new URLSearchParams((url.split('?')[1] || '').split('#')[0]);
    const err = query.get('error');
    if (err) {
      settle({ error: new Error(err === 'access_denied' ? 'ログインがキャンセルされました' : `ログインに失敗しました (${err})`) });
    } else if (query.get('state') !== state) {
      settle({ error: new Error('ログインの検証に失敗しました。もう一度お試しください') });
    } else {
      const code = query.get('code');
      settle(code ? { code } : { error: new Error('認可コードを受け取れませんでした') });
    }
  });
  // 認証画面を「完了」ボタンで閉じた場合。リダイレクトとの前後を考慮して少し待つ
  const finishListener = await Browser.addListener('browserFinished', () => {
    setTimeout(() => settle({ error: new Error('ログインがキャンセルされました') }), 800);
  });

  try {
    await Browser.open({ url: `${AUTH_ENDPOINT}?${params.toString()}` });
    const r = await result;
    if (r.error || !r.code) throw r.error || new Error('ログインに失敗しました');
    return { code: r.code, verifier };
  } finally {
    await urlListener.remove();
    await finishListener.remove();
    try {
      await Browser.close();
    } catch {
      /* すでに閉じている */
    }
  }
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

async function postForm(url: string, data: Record<string, string>) {
  const res = await CapacitorHttp.post({
    url,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    data,
  });
  let body: any = res.data;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      /* JSONではない */
    }
  }
  return { status: res.status, body };
}

async function tokenRequest(data: Record<string, string>): Promise<TokenResponse> {
  const { status, body } = await postForm(TOKEN_ENDPOINT, data);
  if (status !== 200 || !body?.access_token) {
    const e = new Error(body?.error_description || body?.error || `トークンの取得に失敗しました (${status})`);
    (e as any).code = body?.error;
    throw e;
  }
  return body as TokenResponse;
}

const toToken = (t: TokenResponse): NativeToken => ({
  accessToken: t.access_token,
  expiresAt: Date.now() + Math.max(0, t.expires_in - 60) * 1000,
});

async function getRefreshToken(): Promise<string> {
  const { value } = await Preferences.get({ key: REFRESH_KEY });
  return value || '';
}

/**
 * アクセストークンを取得する。
 * prompt が空文字なら「無操作での更新」のみ（ブラウザ画面は開かない）。
 * それ以外（'select_account' など）はブラウザ画面でログインする。
 */
export async function nativeRequestAccessToken(clientId: string, scope: string, prompt: string): Promise<NativeToken> {
  if (!clientId) throw new Error('Googleログインが未設定です（VITE_GOOGLE_IOS_CLIENT_ID）');

  if (!prompt) {
    const refresh = await getRefreshToken();
    if (!refresh) throw new Error('ログインの有効期限が切れました。もう一度ログインしてください');
    try {
      return toToken(
        await tokenRequest({ client_id: clientId, grant_type: 'refresh_token', refresh_token: refresh })
      );
    } catch (e: any) {
      if (e?.code === 'invalid_grant') {
        await Preferences.remove({ key: REFRESH_KEY });
        throw new Error('ログインの有効期限が切れました。もう一度ログインしてください');
      }
      throw e;
    }
  }

  const { code, verifier } = await authorize(clientId, scope, prompt);
  const t = await tokenRequest({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    code_verifier: verifier,
    redirect_uri: redirectUri(clientId),
  });
  if (t.refresh_token) await Preferences.set({ key: REFRESH_KEY, value: t.refresh_token });
  return toToken(t);
}

/** ログアウト: 保存したリフレッシュトークンを削除し、Google側でも無効化する */
export async function nativeRevokeToken(accessToken: string): Promise<void> {
  const refresh = await getRefreshToken();
  await Preferences.remove({ key: REFRESH_KEY });
  try {
    await postForm(REVOKE_ENDPOINT, { token: refresh || accessToken });
  } catch {
    /* 失敗してもローカルの削除は済んでいる */
  }
}
