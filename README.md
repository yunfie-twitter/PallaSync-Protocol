# PallaSync Protocol

PallaSync Protocolは、Palleria向けのアカウントレスなエンドツーエンド暗号化同期プロトコルです。最新仕様は **PallaSync Protocol 3.0（Draft Standard）** です。

`PallaSync`は`Palleria`と`Sync`を組み合わせた正式な短縮名です。旧3文字略称は使用しません。

24単語のBIP39ニーモニックと任意のパスフレーズをroot authorityの入力とし、端末ごとに生成した署名鍵・鍵交換鍵、ランダムなエポック秘密を使用します。暗号化された不変イベントをリレー経由で同期し、クライアントが署名・認可履歴・ログ連鎖を検証して状態へ適用します。

## 仕様

- [PallaSync Protocol 3.0](./docs/v3.0.md)
- [リレー運用者のプライバシー開示要件](./docs/privacy.md)
- [RelayPrivacyDisclosure JSON Schema](./docs/privacy.schema.json)
- [公開ドキュメントサイト](https://yunfie-twitter.github.io/PallaSync-Protocol/)
- [旧Draftからの命名移行](./docs/NAMING-MIGRATION.md)

リレーは運用者固有の`privacy.md`と署名付き`privacy.json`を公開し、クライアントは検証・表示・明示的同意を必須とします。本リポジトリのprivacy.mdは開示要件であり、特定リレーの実際の設定値やポリシーではありません。

Shamir Recoveryの実装はすべての準拠クライアントで必須です。新規チェーンのセットは`not_provisioned`で始まり、作成・配布・復旧は明示的なユーザー操作を必要とします。shareや復旧用秘密をリレーへ送信しません。

検索・既読・閲覧履歴は既定で自動削除しません。件数の安全上限はeager projectionを制限し、実際のdisk/quotaと明示的なユーザー設定により書き込みが停止する場合があります。

## 3.0の識別子

- 正式名: `PallaSync Protocol 3.0`
- Wire identifier: `pallasync/3`
- API base path: `/pallasync/v3/`
- Media type: `application/vnd.palleria.sync.v3+json`
- Error media type: `application/problem+json`（RFC 9457）
- Domain-separation prefix: `PALLASYNC-`

各Wire modelの版フィールド、鍵導出、署名対象と暗号パラメータは3.0仕様書を正とします。

## 過去の仕様と移行

- [PallaSync Protocol 2.1](./docs/v2.1.md)
- [PallaSync Protocol 2.0](./docs/v2.md)
- [PallaSync Protocol 1.0](./docs/v1.md)
- [PallaSync 2.0 JSON Schema](./pallasync-v2.schema.json)
- [v2 Key Derivationメモ](./docs/KEY-DERIVATION.md)

2.1との完全な後方互換性はありません。3.0仕様書§9に従い、同じニーモニックから別の`chain_id`を持つ新しい3.0チェーンを作成し、旧データを変換して再署名します。v2用のスキーマ・鍵導出メモを3.0へ適用しないでください。

## ドキュメントのビルド

```sh
npm ci
npm run docs:dev
```

公開用ビルドは`npm run docs:build`、確認は`npm run docs:preview`です。ビルドはdocs/privacy.schema.jsonを公開出力へコピーするため、正本を複製して管理する必要はありません。

## 現在の状態

3.0は`Draft Standard`です。Stable Standardへ移行するには、独立実装間の相互運用試験、Fuzzing、脅威モデル公開、暗号設計レビュー、外部セキュリティ監査が必要です。
