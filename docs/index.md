---
layout: home

hero:
  name: "PallaSync Protocol"
  text: "Accountless, encrypted device synchronization"
  tagline: "アカウント登録なしで、複数端末間のデータを安全に同期するためのプロトコル"
  actions:
    - theme: brand
      text: "3.0仕様書を読む"
      link: "/v3.0"
    - theme: alt
      text: "プライバシー開示要件"
      link: "/privacy"
    - theme: alt
      text: "GitHub"
      link: "https://github.com/yunfie-twitter/PallaSync-Protocol"

features:
  - title: "アカウントレス"
    details: "ユーザーアカウントを作らず、24単語のニーモニックと任意のパスフレーズ、承認された端末鍵で同期チェーンを管理します。"
  - title: "エンドツーエンド暗号化"
    details: "同期データはクライアント側で暗号化され、Syncサーバーやリレーサーバーは平文を取得できません。"
  - title: "サーバー同期"
    details: "端末が同時にオンラインでない場合でも、暗号化済みの差分イベントをサーバー経由で同期できます。"
  - title: "端末ベースのShamir復旧"
    details: "準拠クライアントはShamir復旧を実装します。セットの作成・配布・復旧は明示的な操作を必要とし、復旧用shareをリレーへ送信しません。"
  - title: "端末ごとの署名"
    details: "各端末が固有の署名鍵を持ち、イベントの送信元、完全性、順序を検証します。"
  - title: "競合と削除の伝播"
    details: "Lamportと操作種別・端末・レコード識別子の比較順序、tombstone、scoped clearによって同じ検証済みログから収束します。"
---

## PallaSyncとは

PallaSync Protocolは、Palleria向けに設計されたアカウントレス同期プロトコルです。

最新仕様は **PallaSync Protocol 3.0（Draft Standard）** です。最初の端末が同期チェーンを作成し、QR offer、SAS確認、登録承認を経て別の端末を追加します。各端末はランダムに生成した署名鍵・鍵交換鍵を持ち、同期データを暗号化、署名してから送信します。

リレーは暗号化されたイベントの保管と配送、端末追加・エポック鍵配布の仲介を担当します。アプリケーションデータの同期はリレー経由で行います。リレーは同期データの内容を復号できませんが、接続情報や通信時刻・サイズ等のメタデータを観測できます。

## プロトコルの基本構成

1. 最初の端末が同期チェーンを作成します。
2. 端末ごとの署名鍵と鍵配送用の公開鍵を生成します。
3. QR offer、ライブSAS確認と登録承認で新しい端末を追加します。
4. データ変更を暗号化された不変イベントとして記録します。
5. リレーを通じて差分イベントを交換します。
6. 各端末が署名、ログの連鎖、暗号文、認可履歴を検証して状態へ適用します。
7. 端末失効時には認可を更新し、新しいランダムなエポック秘密を認可済み端末へ配布します。

## セキュリティ

PallaSync 3.0では、次の暗号技術を使用します。正確なパラメータと文脈文字列は[仕様書の§4](/v3.0#_4-cryptographic-algorithms-context-strings)に定義されています。

- Ed25519
- X25519
- HKDF-SHA-256
- XChaCha20-Poly1305（レコード・recovery envelope）
- HPKE（端末向けepoch envelope、ChaCha20-Poly1305）
- TLS 1.2以上（TLS 1.3を推奨）
- JSON Canonicalization Scheme

独自暗号アルゴリズムは使用しません。

## 現在の状態

PallaSync Protocol 3.0は、現在 **Draft Standard** です。

正式なStable Standardとして制定する前に、相互運用試験、Fuzzing、脅威モデルの公開、暗号設計レビュー、外部セキュリティ監査を実施する必要があります。

2.1との完全な後方互換性はありません。[移行手順](/v3.0#_9-backward-compatibility-and-migration)に従い、同じニーモニックから別の`chain_id`を持つ新しい3.0チェーンを作成します。

検索・既読・閲覧履歴は、既定で自動削除しません。件数の安全上限、ローカル表示範囲と実際の保存容量・quotaは、[保持仕様](/v3.0#_16-retention-snapshots-and-compaction)に従って区別します。

リレー利用前には、運用者が公開した`privacy.md`と署名付き`privacy.json`を検証・表示し、クライアントで明示的な同意を得ます。このサイトの[プライバシー開示要件](/privacy)は運用者向けの規定であり、特定リレーの実際のポリシーではありません。

## ドキュメント

- [PallaSync Protocol 3.0](/v3.0)
- [リレー運用者のプライバシー開示要件](/privacy)
- [RelayPrivacyDisclosure JSON Schema](./privacy.schema.json)
- [過去の仕様：PallaSync Protocol 2.1](/v2.1)
- [命名移行について](/NAMING-MIGRATION)
- [過去の仕様：PallaSync 2.0 JSON Schema](https://github.com/yunfie-twitter/PallaSync-Protocol/blob/main/pallasync-v2.schema.json)
