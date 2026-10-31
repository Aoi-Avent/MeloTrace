#!/usr/bin/env python3
"""cap add / cap sync のあとに ios/ プロジェクトへ必要な設定を入れる（何度実行しても安全）。

  1. Info.plist  : バックグラウンド音声 (UIBackgroundModes=audio)
  2. Info.plist  : Googleログインのリダイレクト用URLスキーム (VITE_GOOGLE_IOS_CLIENT_ID から生成)
  3. AppDelegate : オーディオセッションを「再生」カテゴリにする
"""
import os
import plistlib
import re
import sys

ROOT = os.environ.get('MELOTRACE_ROOT') or os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PLIST = os.path.join(ROOT, 'ios/App/App/Info.plist')
APPDELEGATE = os.path.join(ROOT, 'ios/App/App/AppDelegate.swift')


def read_client_id():
    v = os.environ.get('VITE_GOOGLE_IOS_CLIENT_ID', '').strip()
    if v:
        return v
    for name in ('.env.local', '.env'):
        p = os.path.join(ROOT, name)
        if not os.path.exists(p):
            continue
        with open(p, encoding='utf-8') as f:
            for line in f:
                m = re.match(r'\s*VITE_GOOGLE_IOS_CLIENT_ID\s*=\s*["\']?([^"\'#\s]*)', line)
                if m and m.group(1):
                    return m.group(1)
    return ''


def patch_plist():
    if not os.path.exists(PLIST):
        print(f'[skip] {PLIST} が見つかりません（先に npx cap add ios を実行してください）')
        return
    with open(PLIST, 'rb') as f:
        d = plistlib.load(f)

    modes = d.setdefault('UIBackgroundModes', [])
    if 'audio' not in modes:
        modes.append('audio')
        print('[ok] UIBackgroundModes に audio を追加')

    client_id = read_client_id()
    if client_id:
        suffix = '.apps.googleusercontent.com'
        base = client_id[: -len(suffix)] if client_id.endswith(suffix) else client_id
        scheme = 'com.googleusercontent.apps.' + base
        types = d.setdefault('CFBundleURLTypes', [])
        if not any(scheme in t.get('CFBundleURLSchemes', []) for t in types):
            types.append({
                'CFBundleURLName': 'google-oauth',
                'CFBundleTypeRole': 'Editor',
                'CFBundleURLSchemes': [scheme],
            })
            print(f'[ok] URLスキーム {scheme} を追加')
    else:
        print('[warn] VITE_GOOGLE_IOS_CLIENT_ID が未設定のため、Googleログイン用URLスキームは追加していません')

    with open(PLIST, 'wb') as f:
        plistlib.dump(d, f)


SNIPPET = (
    '{i}// バックグラウンド再生用: オーディオセッションを「再生」カテゴリにする\n'
    '{i}do {{\n'
    '{i}    try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)\n'
    '{i}    try AVAudioSession.sharedInstance().setActive(true)\n'
    '{i}}} catch {{\n'
    '{i}    print("AVAudioSession setup failed: \\(error)")\n'
    '{i}}}\n'
)

MANUAL = (
    '[warn] AppDelegate.swift を自動で書き換えられませんでした。手動で追加してください:\n'
    '       ファイル先頭に  import AVFoundation\n'
    '       didFinishLaunchingWithOptions 内の return true の前に\n'
    '         try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)\n'
    '         try? AVAudioSession.sharedInstance().setActive(true)'
)


def patch_app_delegate():
    if not os.path.exists(APPDELEGATE):
        print(f'[skip] {APPDELEGATE} が見つかりません')
        return
    with open(APPDELEGATE, encoding='utf-8') as f:
        s = f.read()
    if 'AVAudioSession' in s:
        return
    m = re.search(r'didFinishLaunchingWithOptions[^{]*\{', s)
    idx = s.find('return true', m.end()) if m else -1
    if idx == -1:
        print(MANUAL)
        return
    line_start = s.rfind('\n', 0, idx) + 1
    indent = re.match(r'[ \t]*', s[line_start:]).group(0)
    s = s[:line_start] + SNIPPET.format(i=indent) + s[line_start:]
    if 'import AVFoundation' not in s:
        im = re.search(r'^import .*$', s, re.M)
        if im:
            s = s[: im.end()] + '\nimport AVFoundation' + s[im.end():]
        else:
            s = 'import AVFoundation\n' + s
    with open(APPDELEGATE, 'w', encoding='utf-8') as f:
        f.write(s)
    print('[ok] AppDelegate.swift にオーディオセッション設定を追加')


if __name__ == '__main__':
    patch_plist()
    patch_app_delegate()
    sys.exit(0)
