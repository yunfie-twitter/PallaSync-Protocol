---
title: "命名移行"
description: "旧Draftの略称からPallaSyncへの移行について"
layout: doc
outline: deep
lastUpdated: true
editLink: false
prev: false
next: false
---

# 命名移行

旧Draftで使用していた `PSP` という略称は、PlayStation Portableとの混同を避けるため廃止しました。

## 置換表

| 旧表記 | 新表記 |
|---|---|
| `Palleria Sync Protocol` / `PSP` | `PallaSync Protocol` / `PallaSync` |
| `PSP-1` | `PALLASYNC-1` |
| `psp/1` | `pallasync/1` |
| `/psp/v1/` | `/pallasync/v1/` |
| `PSP-...` | `PALLASYNC-...` |
| `psp_version` | `protocol_version` |
| `psp-v1.schema.json` | `pallasync-v1.schema.json` |

## 互換性

旧Draftは未制定仕様として扱い、Wire互換性は提供しません。

ドメイン分離文字列、Chain ID、Device ID、暗号Test Vectorが変更されるため、旧Draftで生成した同期チェーンを新仕様として再利用してはいけません。

新しい鍵と新しい同期チェーンを作成してください。
