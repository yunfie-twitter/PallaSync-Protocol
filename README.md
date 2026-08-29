# PallaSync Protocol

PallaSync Protocolは、Palleria向けのアカウントレスなエンドツーエンド暗号化同期プロトコルです。

`PallaSync`は`Palleria`と`Sync`を組み合わせた正式な短縮名です。PlayStation Portableと混同されるため、旧3文字略称は使用しません。

PallaSync v2では、Brave Syncライクな「Sync Chain（同期チェーン）」方式を採用しています。
P2Pのシグナリングを廃止し、24単語のシードフレーズを用いて暗号鍵を導出、サーバー（Dumb Server）を介して暗号化された同期レコード（Sync Records）を安全にやり取りします。

## 仕様

- [PallaSync Protocol 2.0](./docs/PALLASYNC-PROTOCOL.md)
- [PallaSync 2.0 JSON Schema](./pallasync-v2.schema.json)
- [BIP39 Key Derivation](./docs/KEY-DERIVATION.md)
- [旧Draftからの命名移行](./docs/NAMING-MIGRATION.md)

## 識別子

- 正式名: `PallaSync Protocol`
- 短縮名: `PallaSync`
- Wire identifier: `pallasync/2`
- API base path: `/pallasync/v2/`
- Domain-separation prefix: `PALLASYNC-`
- Version field: `protocol_version`

## 現在の状態

PallaSync 2.0は`Draft Standard`です。

Production Readyへ移行するには、独立実装間の相互運用試験、Fuzzing、脅威モデル公開、暗号設計レビュー、外部セキュリティ監査が必要です。
