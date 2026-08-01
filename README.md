# PallaSync Protocol

PallaSync Protocolは、Palleria向けのアカウントレスなエンドツーエンド暗号化同期プロトコルです。

`PallaSync`は`Palleria`と`Sync`を組み合わせた正式な短縮名です。PlayStation Portableと混同されるため、旧3文字略称は使用しません。

## 仕様

- [PallaSync Protocol 1.0](./docs/PALLASYNC-PROTOCOL.md)
- [PallaSync 1.0 JSON Schema](./pallasync-v1.schema.json)
- [旧Draftからの命名移行](./docs/NAMING-MIGRATION.md)

## 識別子

- 正式名: `PallaSync Protocol`
- 短縮名: `PallaSync`
- Wire identifier: `pallasync/1`
- API base path: `/pallasync/v1/`
- Domain-separation prefix: `PALLASYNC-`
- Version field: `protocol_version`

## 現在の状態

PallaSync 1.0は`Draft Standard`です。

Production Readyへ移行するには、独立実装間の相互運用試験、Fuzzing、脅威モデル公開、暗号設計レビュー、外部セキュリティ監査が必要です。
