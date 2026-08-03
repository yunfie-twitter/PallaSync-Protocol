---
layout: home

hero:
  name: "PallaSync Protocol"
  text: "Accountless, encrypted device synchronization"
  tagline: "アカウント登録なしで、複数端末間のデータを安全に同期するためのプロトコル"
  actions:
    - theme: brand
      text: "仕様書を読む"
      link: "/PALLASYNC-PROTOCOL"
    - theme: alt
      text: "GitHub"
      link: "https://github.com/yunfie-twitter/PallaSync-Protocol"

features:
  - title: "アカウントレス"
    details: "ユーザー登録やパスワードを必要とせず、同期チェーンと端末鍵によって端末を関連付けます。"
  - title: "エンドツーエンド暗号化"
    details: "同期データはクライアント側で暗号化され、Syncサーバーやリレーサーバーは平文を取得できません。"
  - title: "サーバー同期"
    details: "端末が同時にオンラインでない場合でも、暗号化済みの差分イベントをサーバー経由で同期できます。"
  - title: "P2P同期"
    details: "WebRTC、ICE、STUN、TURNを利用し、利用可能な場合は端末間で直接データを転送します。"
  - title: "端末ごとの署名"
    details: "各端末が固有の署名鍵を持ち、イベントの送信元、完全性、順序を検証します。"
  - title: "競合と削除の伝播"
    details: "Vector Clock、Lamport Clock、CRDT、Tombstoneを使用し、並行変更や削除済みデータの復活を防ぎます。"
---

## PallaSyncとは

PallaSync Protocolは、Palleria向けに設計されたアカウントレス同期プロトコルです。

最初の端末が同期チェーンを作成し、QRコードまたは同期コードを使用して別の端末を追加します。各端末は固有の暗号鍵を持ち、同期データを暗号化、署名してから送信します。

サーバーは暗号化されたイベントの保管と配送、端末追加の仲介、P2P接続のシグナリングを担当します。同期データの内容を復号することはできません。

## プロトコルの基本構成

1. 最初の端末が同期チェーンを作成します。
2. 端末ごとの署名鍵と鍵配送用の公開鍵を生成します。
3. QRコードを使用して新しい端末を同期チェーンへ追加します。
4. データ変更を暗号化された不変イベントとして記録します。
5. サーバーまたはP2P接続を通じて差分イベントを交換します。
6. 各端末が署名、イベント列、暗号文、因果関係を検証します。
7. 端末失効時には暗号鍵の世代を更新します。

## セキュリティ

PallaSync 2.0では、次の暗号技術を使用します。

- Ed25519
- X25519
- HKDF-SHA-256
- ChaCha20-Poly1305
- HPKE
- TLS 1.3
- JSON Canonicalization Scheme

独自暗号アルゴリズムは使用しません。

## 現在の状態

PallaSync Protocol 2.0は、現在 **Draft Standard** です。

正式なStable Standardとして制定する前に、相互運用試験、Fuzzing、脅威モデルの公開、暗号設計レビュー、外部セキュリティ監査を実施する必要があります。

## ドキュメント

- [PallaSync Protocol 2.0](/PALLASYNC-PROTOCOL)
- [命名移行について](/NAMING-MIGRATION)
- [JSON Schema](https://github.com/OWNER/PallaSync-Protocol/blob/main/pallasync-v2.schema.json)
