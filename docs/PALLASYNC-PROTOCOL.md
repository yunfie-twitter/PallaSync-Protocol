---
title: "PallaSync Protocol 1.0"
description: "PallaSync Protocol 1.0の規範仕様書"
layout: doc
outline: deep
lastUpdated: true
editLink: false
prev: false
next: false
---

# PallaSync Protocol 1.0

- Document ID: `PALLASYNC-1`
- Protocol name: `PallaSync Protocol`
- Name origin: `Palleria` + `Sync`
- Protocol identifier: `pallasync/1`
- Version: `1.0.0`
- Status: Draft Standard
- Published: 2026-08-01
- Default media type: `application/vnd.palleria.sync+json`
- File encoding: UTF-8
- Canonical short name: `PallaSync`
- Acronym policy: three-letter protocol abbreviations MUST NOT be used
- Canonical serialization: JSON Canonicalization Scheme
- License: The repository `LICENSE` applies unless this document states otherwise

> [!IMPORTANT]
> This document is the normative specification for Palleria Sync Protocol 1.0.
> README、実装メモ、Issue、コメント、サーバー設定と内容が矛盾する場合は、この文書を優先します。
>
> 暗号方式を独自実装してはいけません。実運用前に、暗号設計、鍵管理、認可、復旧処理について第三者のセキュリティレビューを実施してください。

## 1. 目的

`PallaSync` は `Palleria` と `Sync` を組み合わせた正式な短縮名です。頭字語ではなく、仕様、実装、API、ログ、文書ではこの表記を使用します。

PallaSync Protocol、以下 `PallaSync` は、ユーザーアカウントを作成せず、複数端末間でPalleriaのデータを同期するためのプロトコルです。

PallaSyncは次の性質を提供します。

- アカウント登録を必要としない
- 同期チェーン単位で端末を関連付ける
- QRコードまたは同期コードで端末を追加する
- 同期データをクライアント側でエンドツーエンド暗号化する
- サーバーが同期データの平文を取得できない
- 端末ごとの署名により送信元と完全性を検証する
- サーバー経由の非同期同期を必須とする
- WebRTCを使用したP2P直接同期を任意機能として提供する
- 差分同期、オフラインキュー、競合解決、削除伝播に対応する
- 端末失効と暗号鍵ローテーションに対応する
- サーバーによるイベント改ざん、巻き戻し、分岐を可能な範囲で検出する
- 長期間オフラインだった端末を安全に完全再同期できる

## 2. 適用範囲

PallaSync 1.0は、次の4層を規定します。

1. 同期チェーン、端末、権限、鍵のライフサイクル
2. 暗号化済みイベントの生成、署名、保存、転送、検証
3. HTTPSサーバー同期とWebRTC P2P同期
4. Palleriaデータ種別ごとの競合解決規則

PallaSync 1.0は、次を規定しません。

- Palleria本体のUIデザイン
- Pixiv APIとの通信方式
- 一般的なクラウドストレージ
- 任意ファイルの公開共有
- VPNまたは匿名化ネットワーク
- サーバー側での平文検索、推薦、分析
- パスワード型ユーザーアカウント
- 複数人による共同編集権限モデル
- 失効前に端末へ取得済みの平文を遠隔消去する仕組み

## 3. 規範用語

本文中の大文字の `MUST`、`MUST NOT`、`REQUIRED`、`SHALL`、`SHALL NOT`、`SHOULD`、`SHOULD NOT`、`RECOMMENDED`、`NOT RECOMMENDED`、`MAY`、`OPTIONAL` は、BCP 14の意味で使用します。

日本語では次の意味として扱います。

- `MUST`: 必須。実装しなければ適合しない
- `MUST NOT`: 絶対禁止
- `SHOULD`: 原則必須。逸脱する場合は理由と影響を文書化する
- `SHOULD NOT`: 原則禁止。採用する場合は理由と影響を文書化する
- `MAY`: 任意

## 4. 適合プロファイル

### 4.1 Core Client

Core Clientは次をすべて実装しなければなりません。

- 同期チェーン作成
- 端末鍵生成
- 端末証明書検証
- 端末招待と参加
- データイベント暗号化、署名、検証
- HTTPSサーバー同期
- ベクトル同期
- Tombstone
- 競合解決
- スナップショットからの完全再同期
- 端末失効の反映
- 鍵エポック更新
- リプレイ防止
- 制御ログと端末イベント列の分岐検出

### 4.2 Core Server

Core Serverは次をすべて実装しなければなりません。

- 同期チェーンの登録
- 端末証明書と失効状態の検証
- 制御ログのCompare-And-Swap
- 暗号化済みイベントの保存と差分配信
- 端末イベント列の連続性検証
- 招待、参加要求、鍵パッケージの一時保存
- 同期カーソルとベクトルによる取得
- スナップショット保存
- 圧縮境界より古いクライアントの拒否
- レート制限、容量制限、リプレイ防止
- 失効端末からのすべての要求拒否

### 4.3 P2P Client

P2P ClientはCore Clientの全要件に加え、次を実装しなければなりません。

- ICE
- STUN
- TURNフォールバック
- WebRTC Data Channel
- 署名付きP2Pハンドシェイク
- 同期ベクトル交換
- 不足イベント範囲の転送
- P2P失敗時のサーバー同期フォールバック

## 5. セキュリティモデル

### 5.1 信頼するもの

PallaSyncは次を信頼します。

- 正常な端末上の暗号ライブラリ
- 正常な端末上の安全な乱数生成器
- 端末OSの安全な鍵保管機能
- ユーザーが承認した有効端末
- ユーザーが安全に保管したリカバリーコード

### 5.2 信頼しないもの

PallaSyncは次を完全には信頼しません。

- Syncサーバー
- TURNサーバー
- シグナリングサーバー
- 公衆ネットワーク
- LAN内の他端末
- DNS応答
- プロキシ、CDN、ロードバランサー
- クライアント端末の壁時計
- 招待QRコードを観測できる第三者

### 5.3 サーバーに許容される能力

悪意あるサーバーは次を実行できる可能性があります。

- 通信を拒否する
- イベントを遅延または欠落させる
- 古い状態を返す
- 異なる端末へ異なる履歴を返す
- IPアドレス、時刻、通信量、暗号文サイズを観測する

PallaSyncは機密性とイベント完全性を端末側で保護しますが、可用性を保証しません。

### 5.4 保護対象外

有効な端末が侵害された場合、その端末が取得可能な同期データは保護できません。

端末失効は、失効後の新しい鍵エポックと新しいイベントへのアクセスを停止するものです。失効前に取得、復号、保存されたデータを消去するものではありません。

## 6. 用語

### 6.1 Sync Chain

同じ同期データと暗号鍵を共有する端末グループです。ユーザーアカウントの代わりとなる単位です。

### 6.2 Root Authority

同期チェーンの最上位権限です。Root Authorityはルート署名鍵によって表現されます。

### 6.3 Device

同期チェーンへ参加するクライアント実体です。各Deviceは固有の署名鍵とHPKE受信鍵を持ちます。

### 6.4 Device Certificate

Deviceの公開鍵、権限、同期チェーンへの所属を証明する署名付きオブジェクトです。

### 6.5 Control Log

端末追加、端末失効、鍵ローテーション、ポリシー変更などを記録する単一の署名付きハッシュチェーンです。

### 6.6 Data Event

Palleriaデータの変更を表す、暗号化、署名された不変イベントです。

### 6.7 Device Sequence

各DeviceがData Eventへ割り当てる単調増加カウンターです。

### 6.8 Chain Vector

Device IDごとに、検証済みの最大連続Device Sequenceを保持するベクトルです。

### 6.9 Key Epoch

同期データ暗号鍵の世代番号です。

### 6.10 Tombstone

削除済みデータが別端末から復活することを防ぐ削除状態です。

### 6.11 Snapshot

特定のChain Vector時点における完全な論理状態を暗号化して格納したものです。

### 6.12 Compaction Floor

それより古い状態を持つ端末が差分アップロードを許可されず、Snapshotから完全再同期しなければならない境界です。

## 7. エンコーディング

### 7.1 JSON

PallaSync 1.0の制御メッセージ、イベントエンベロープ、API要求、API応答はJSONを使用しなければなりません。

実装は次を満たさなければなりません。

- 文字コードはUTF-8
- Byte Order Markを付けない
- オブジェクト内の重複キーを拒否する
- `NaN`、`Infinity`、負のゼロを使用しない
- 整数は `0` から `9007199254740991` の範囲
- バイナリ値はBase64urlで表現する
- Base64urlのパディング `=` を付けない
- 署名対象JSONはJCSで正規化する
- 未知の非クリティカルフィールドは保持できなくても無視してよい
- `critical` 配列に列挙された未知拡張を受信した場合は拒否する

### 7.2 日時

日時はUnix Epochからのミリ秒をJSON整数で表現します。

日時は表示、招待期限、要求期限に使用できますが、Data Eventの因果順序や競合の絶対的な判定には使用してはいけません。

### 7.3 識別子

- Chain IDは43文字のBase64url文字列
- Device IDは43文字のBase64url文字列
- 公開鍵はBase64url文字列
- Eventの論理識別子は `Device ID + Device Sequence`
- Entity ID、Request ID、Invite ID、Snapshot IDにはUUIDv7を使用する
- UUIDは小文字の標準ハイフン形式で表現する

### 7.4 ドメイン分離

ハッシュ、署名、鍵導出では、この仕様で定義するASCIIプレフィックスを必ず使用します。

末尾の `\0` は1バイトのNULL、`0x00` を意味します。

## 8. 暗号スイート

PallaSync 1.0の必須暗号スイートは `PallaSync1-25519-CHACHA-SHA256` です。

実装は次を使用しなければなりません。

- 署名: Ed25519
- 鍵合意およびHPKE KEM: X25519
- ハッシュ: SHA-256
- KDF: HKDF-SHA-256
- データAEAD: ChaCha20-Poly1305
- 鍵配送: HPKE Base Mode
- HPKE KEM: DHKEM(X25519, HKDF-SHA256)
- HPKE KDF: HKDF-SHA256
- HPKE AEAD: ChaCha20Poly1305
- 通信層: TLS 1.3

PallaSync 1.0では暗号スイートの動的ダウングレード交渉を禁止します。

別暗号スイートは、将来の新しいPallaSyncメジャー版または明示的な拡張仕様で追加しなければなりません。

### 8.1 乱数

次の値は暗号学的に安全な乱数生成器で生成しなければなりません。

- ルート署名鍵シード
- 端末署名鍵シード
- 端末X25519秘密鍵
- Key Epoch鍵
- リカバリーシークレット
- 招待シークレット
- 要求nonce
- リカバリーパッケージnonce

時刻、UUID、疑似乱数の単純な組み合わせを秘密値の生成へ使用してはいけません。

## 9. Chain IDとDevice ID

### 9.1 Chain ID

Chain IDはルート署名公開鍵から計算します。

```text
chain_id_raw =
    SHA-256(
        ASCII("PALLASYNC-CHAIN-ID-v1\0") ||
        root_sign_public_key
    )

chain_id = BASE64URL_NOPAD(chain_id_raw)
```

`root_sign_public_key` は32バイトのEd25519公開鍵です。

Chain IDを受信した実装は、対応するルート公開鍵から同じ値を再計算し、一致しない場合は拒否しなければなりません。

### 9.2 Device ID

Device IDは端末公開鍵から計算します。

```text
device_id_raw =
    SHA-256(
        ASCII("PALLASYNC-DEVICE-ID-v1\0") ||
        device_sign_public_key ||
        device_hpke_public_key
    )

device_id = BASE64URL_NOPAD(device_id_raw)
```

両方の公開鍵はそれぞれ32バイトです。

Device IDを任意文字列としてサーバー側で発行してはいけません。

## 10. 鍵の種類

各同期チェーンは次の鍵を持ちます。

### 10.1 Root Signing Key

- アルゴリズム: Ed25519
- 用途: Root Authority操作
- 通常のデータ同期には使用しない
- 秘密鍵はOSの安全な鍵保管領域へ保存する
- リカバリーパッケージ以外のサーバー保存を禁止する
- ログ出力、解析イベント、クラッシュレポートへの出力を禁止する

### 10.2 Device Signing Key

- アルゴリズム: Ed25519
- 用途: API要求、Data Event、P2Pハンドシェイク、許可されたControl Eventへの署名
- Deviceごとに固有
- 端末外へ平文で送信しない

### 10.3 Device HPKE Key

- アルゴリズム: X25519
- 用途: Key Epoch鍵などをDeviceへ配送するHPKE受信鍵
- Deviceごとに固有
- Device Signing Keyと同じ秘密値を再利用してはいけない

### 10.4 Epoch Key

- 長さ: 32バイト
- 用途: Data EventとSnapshotの暗号化
- Key Epochごとに新規生成
- HKDFの入力鍵素材として使用する
- 端末失効時に必ずローテーションする

### 10.5 Recovery Secret

- 長さ: 32バイト
- 用途: リカバリーパッケージの暗号化鍵導出
- ユーザーへ表示する同期コードの実体
- サーバーへ平文送信してはいけない
- 第三者へ渡した場合、同期チェーンを完全に乗っ取られる可能性がある

## 11. 権限

PallaSync 1.0は次の3権限を定義します。

### 11.1 Root

ルート署名鍵を所有する主体です。

Rootのみが次を実行できます。

- Admin Device Certificateの発行
- Admin Deviceの失効
- Root Policyの変更
- Syncサーバーの移行
- 同期チェーンの完全削除

### 11.2 Admin

RootによりAdmin権限を付与されたDeviceです。

Adminは次を実行できます。

- Member Device Certificateの発行
- Member Deviceの失効
- 招待作成
- Key Epochローテーション
- Snapshot公開
- Compaction Floor更新
- 通常ポリシーの更新

Adminは他のAdminを発行または失効してはいけません。

### 11.3 Member

Memberは次を実行できます。

- Data Eventの作成
- Data Eventの取得
- P2P同期
- 自分の端末表示名など、許可されたメタデータの更新
- Snapshotの提案

Memberは端末追加、端末失効、鍵ローテーション、Compaction Floor更新を実行してはいけません。

## 12. Device Certificate

Device Certificateは次の形式です。

```json
{
  "protocol_version": "1.0",
  "certificate_id": "0198f6d2-6c40-7a11-8a22-334455667788",
  "chain_id": "BASE64URL_CHAIN_ID",
  "device_id": "BASE64URL_DEVICE_ID",
  "device_sign_public_key": "BASE64URL_32_BYTES",
  "device_hpke_public_key": "BASE64URL_32_BYTES",
  "role": "member",
  "capabilities": [
    "core-client",
    "p2p-client"
  ],
  "issued_at_ms": 1785581400000,
  "not_before_ms": 1785581400000,
  "not_after_ms": null,
  "issuer": {
    "type": "device",
    "device_id": "BASE64URL_ADMIN_DEVICE_ID"
  },
  "critical": [],
  "signature": "BASE64URL_ED25519_SIGNATURE"
}
```

署名対象は `signature` を除外したJCS正規化JSONです。

```text
certificate_signature_input =
    ASCII("PALLASYNC-DEVICE-CERT-v1\0") ||
    JCS(certificate_without_signature)
```

検証規則は次のとおりです。

1. Chain IDをルート公開鍵から再計算する
2. Device IDを端末公開鍵から再計算する
3. 発行者の署名を検証する
4. 発行者の権限を確認する
5. `not_before_ms` と `not_after_ms` を確認する
6. 対応する失効イベントが存在しないことを確認する
7. 未対応のクリティカル拡張がないことを確認する

Root発行の場合、`issuer.type` は `root` とし、`device_id` を含めません。

Adminが発行できるCertificateの `role` は `member` に限定されます。

## 13. 同期チェーン作成

同期チェーン作成時、最初の端末は次の順序で処理しなければなりません。

1. Ed25519ルート署名鍵を生成する
2. Chain IDを計算する
3. Device Signing Keyを生成する
4. Device HPKE Keyを生成する
5. Device IDを計算する
6. 32バイトのEpoch 1 Keyを生成する
7. 32バイトのRecovery Secretを生成する
8. Rootで最初のAdmin Device Certificateを署名する
9. Genesis Control Eventを作成する
10. リカバリーパッケージを作成する
11. SyncサーバーへChain作成要求を送信する
12. サーバー応答を検証してからローカル状態を有効化する

部分的に失敗した場合、未完成Chainを利用可能として表示してはいけません。

### 13.1 Genesis Control Event

Control Sequence 0はGenesisでなければなりません。

```json
{
  "protocol_version": "1.0",
  "chain_id": "BASE64URL_CHAIN_ID",
  "control_seq": 0,
  "prev_control_hash": null,
  "action": "chain.genesis",
  "body": {
    "root_sign_public_key": "BASE64URL_32_BYTES",
    "initial_admin_certificate": {},
    "initial_key_epoch": 1,
    "policy": {
      "max_devices": 32,
      "p2p_enabled": true
    }
  },
  "signer": {
    "type": "root"
  },
  "signature": "BASE64URL_ED25519_SIGNATURE",
  "control_hash": "BASE64URL_SHA256"
}
```

署名入力は次のとおりです。

```text
control_signature_input =
    ASCII("PALLASYNC-CONTROL-SIGN-v1\0") ||
    JCS(control_event_without_signature_and_control_hash)
```

Control Hashは次のとおりです。

```text
control_hash_raw =
    SHA-256(
        ASCII("PALLASYNC-CONTROL-HASH-v1\0") ||
        JCS(control_event_without_control_hash)
    )
```

## 14. リカバリーパッケージ

Recovery Secretから暗号鍵を導出します。

```text
recovery_wrap_key =
    HKDF-SHA-256(
        IKM = recovery_secret,
        salt = chain_id_raw,
        info = ASCII("PALLASYNC-RECOVERY-WRAP-v1\0"),
        L = 32
    )
```

リカバリーパッケージ平文は次を含みます。

```json
{
  "protocol_version": "1.0",
  "chain_id": "BASE64URL_CHAIN_ID",
  "server_origin": "https://sync.example.invalid",
  "root_sign_private_seed": "BASE64URL_32_BYTES",
  "root_sign_public_key": "BASE64URL_32_BYTES",
  "current_key_epoch": 1,
  "current_epoch_key": "BASE64URL_32_BYTES",
  "control_seq": 0,
  "control_hash": "BASE64URL_SHA256",
  "created_at_ms": 1785581400000
}
```

暗号化にはChaCha20-Poly1305を使用します。

- nonceは12バイトの安全な乱数
- AADは `ASCII("PALLASYNC-RECOVERY-PACKAGE-v1\0") || chain_id_raw`
- サーバーへ保存するのはnonceと暗号文のみ
- サーバーへRecovery Secretを送信してはいけない

Recovery Secretは最低でもBase64url形式でエクスポートできなければなりません。

単語列、QRコード、別表記を提供する実装は、元の32バイトへ完全に復元できなければなりません。

### 14.1 復旧後の必須処理

Recovery Secretを使用して新端末を復旧した場合、新端末は次を実行するまでData Eventを送信してはいけません。

1. 制御ログの最新状態を取得する
2. Root操作として新しいAdmin Certificateを発行する
3. 紛失端末を必要に応じて失効する
4. 新しいKey Epochを生成する
5. 有効端末向けKey Packageを作成する
6. 新しいSnapshotを公開する

## 15. 招待と端末参加

### 15.1 招待作成

Adminは次を生成します。

- Invite ID: UUIDv7
- Invite Secret: 32バイト乱数
- Inviter Ephemeral X25519 Key Pair
- 有効期限
- 最大使用回数1

招待の標準有効期限は10分です。30分を超えてはいけません。

QRコードは次を含みます。

```json
{
  "protocol_version": "1.0",
  "server_origin": "https://sync.example.invalid",
  "chain_id": "BASE64URL_CHAIN_ID",
  "root_sign_public_key": "BASE64URL_32_BYTES",
  "invite_id": "0198f6d2-6c40-7a11-8a22-334455667788",
  "invite_secret": "BASE64URL_32_BYTES",
  "inviter_device_id": "BASE64URL_DEVICE_ID",
  "inviter_ephemeral_public_key": "BASE64URL_32_BYTES",
  "expires_at_ms": 1785582000000
}
```

サーバーへ保存するInvite Secretは、次のハッシュだけでなければなりません。

```text
invite_secret_hash =
    SHA-256(
        ASCII("PALLASYNC-INVITE-SECRET-v1\0") ||
        invite_secret
    )
```

### 15.2 参加要求

新端末は次を生成します。

- Device Signing Key
- Device HPKE Key
- Device ID
- Join Ephemeral X25519 Key Pair
- Join Request ID

参加要求は新端末のDevice Signing Keyで署名します。

既存Adminは、参加要求に含まれる公開鍵と署名を検証しなければなりません。

### 15.3 Pairing Key

両端末は次を計算します。

```text
ephemeral_shared_secret =
    X25519(
        local_ephemeral_private_key,
        remote_ephemeral_public_key
    )

pairing_key =
    HKDF-SHA-256(
        IKM = ephemeral_shared_secret,
        salt = invite_secret,
        info = ASCII("PALLASYNC-PAIRING-KEY-v1\0") ||
               chain_id_raw ||
               invite_id_bytes,
        L = 32
    )
```

### 15.4 Pairing Transcript

```text
pairing_transcript =
    JCS({
      "chain_id": ...,
      "invite_id": ...,
      "inviter_device_id": ...,
      "inviter_ephemeral_public_key": ...,
      "joiner_device_id": ...,
      "joiner_sign_public_key": ...,
      "joiner_hpke_public_key": ...,
      "joiner_ephemeral_public_key": ...
    })
```

### 15.5 Short Authentication String

```text
sas_raw =
    HMAC-SHA-256(
        key = pairing_key,
        data = ASCII("PALLASYNC-SAS-v1\0") || pairing_transcript
    )

sas_number = UINT32_BE(sas_raw[0:4]) mod 1000000
```

SASは6桁、先頭ゼロ付きで表示します。

既存端末と新端末の両方に同じSASを表示し、ユーザーが一致を確認しなければなりません。

SAS不一致時は参加処理を直ちに中止し、Inviteを失効させなければなりません。

### 15.6 承認

Adminは次を実行します。

1. SAS確認済み状態を記録する
2. Member Device Certificateを発行する
3. 現在のEpoch KeyをHPKEで新端末へ暗号化する
4. CertificateとKey Packageを署名する
5. サーバーへ承認を送信する
6. Inviteを消費済みにする

新端末はCertificate、Root公開鍵、Chain ID、HPKE Key Packageを検証してから同期を開始します。

## 16. HPKE Key Package

Key Package平文は次の形式です。

```json
{
  "protocol_version": "1.0",
  "chain_id": "BASE64URL_CHAIN_ID",
  "recipient_device_id": "BASE64URL_DEVICE_ID",
  "key_epoch": 1,
  "epoch_key": "BASE64URL_32_BYTES",
  "control_seq": 12,
  "control_hash": "BASE64URL_SHA256",
  "issued_at_ms": 1785581400000
}
```

HPKE `info` は次です。

```text
ASCII("PALLASYNC-KEY-PACKAGE-v1\0") ||
chain_id_raw ||
recipient_device_id_raw ||
UINT32_BE(key_epoch)
```

HPKE AADはKey Packageの外部メタデータをJCS正規化したものです。

Key Package全体は発行AdminのDevice Signing Keyで署名しなければなりません。

新端末は次を検証します。

- 発行者が有効なAdminである
- 受信者Device IDが自分である
- Chain IDが一致する
- Key Epochが制御ログと一致する
- Control Hashが既知の制御ログと一致する
- HPKE復号が成功する
- Epoch Keyが32バイトである

## 17. Control Log

Control Logは同期チェーンごとに1本だけ存在する、連続したハッシュチェーンです。

各Control Eventは次を満たさなければなりません。

- `control_seq` は0から始まる
- 直前の値より1だけ増加する
- `prev_control_hash` が直前EventのControl Hashと一致する
- 許可された署名者が署名する
- 署名とControl Hashが正しい
- 同じ `control_seq` に異なるControl Hashが存在しない

サーバーはControl Event追加時に、現在のControl Headに対するCompare-And-Swapを行わなければなりません。

クライアントが同じControl Sequenceで異なるControl Hashを観測した場合、`SERVER_FORK_DETECTED` として同期を停止しなければなりません。

### 17.1 Control Action

PallaSync 1.0は次のActionを定義します。

- `chain.genesis`
- `device.add`
- `device.revoke`
- `device.metadata`
- `epoch.rotate`
- `snapshot.publish`
- `compaction.advance`
- `policy.update`
- `server.migrate`
- `chain.delete`

### 17.2 認可

- `chain.genesis`: Rootのみ
- `device.add` Member: AdminまたはRoot
- `device.add` Admin: Rootのみ
- `device.revoke` Member: AdminまたはRoot
- `device.revoke` Admin: Rootのみ
- `epoch.rotate`: AdminまたはRoot
- `snapshot.publish`: AdminまたはRoot
- `compaction.advance`: AdminまたはRoot
- `policy.update`: AdminまたはRoot
- `server.migrate`: Rootのみ
- `chain.delete`: Rootのみ

## 18. Key Epoch

Key Epochは1から始まる単調増加整数です。

次の場合、AdminまたはRootは新しいKey Epochを作成しなければなりません。

- Deviceを失効した
- Recovery Secretを使用して復旧した
- Epoch Key漏えいが疑われる
- 管理者が手動ローテーションを要求した
- 暗号ポリシーが要求する期間を超えた

ローテーション手順は次のとおりです。

1. 新しい32バイトEpoch Keyを生成する
2. Key Epochを1増加する
3. すべての有効Device向けHPKE Key Packageを作成する
4. `epoch.rotate` Control Eventを追加する
5. サーバーは以後、古いKey Epochによる新規Data Eventを拒否する
6. Adminは新しいEpochでSnapshotを公開する
7. クライアントは必要な旧イベントを処理した後、不要な旧Epoch Keyを安全に削除する

失効Device向けKey Packageを作成してはいけません。

## 19. Data Event

Data Eventは不変です。作成後に内容を書き換えてはいけません。

```json
{
  "protocol_version": "1.0",
  "chain_id": "BASE64URL_CHAIN_ID",
  "device_id": "BASE64URL_DEVICE_ID",
  "device_seq": 1,
  "prev_event_hash": null,
  "key_epoch": 1,
  "event_type": "data",
  "ciphertext": "BASE64URL_CIPHERTEXT_AND_TAG",
  "signature": "BASE64URL_ED25519_SIGNATURE",
  "event_hash": "BASE64URL_SHA256"
}
```

### 19.1 Device Sequence

- 最初のData Eventは1
- 以降は1ずつ増加
- 同一Device IDで再利用してはいけない
- カウンターはEvent作成と同じ永続トランザクションで確定する
- Device Sequence状態を失った場合、そのDevice IDを再利用してはいけない
- 状態喪失時は新しいDevice鍵とDevice IDを作成し、再参加する

### 19.2 Event Header

暗号化AADとなるHeaderは次のフィールドです。

```json
{
  "protocol_version": "1.0",
  "chain_id": "BASE64URL_CHAIN_ID",
  "device_id": "BASE64URL_DEVICE_ID",
  "device_seq": 1,
  "prev_event_hash": null,
  "key_epoch": 1,
  "event_type": "data"
}
```

### 19.3 Event Key

```text
event_key =
    HKDF-SHA-256(
        IKM = epoch_key,
        salt = chain_id_raw,
        info = ASCII("PALLASYNC-DATA-KEY-v1\0") ||
               device_id_raw ||
               UINT64_BE(device_seq),
        L = 32
    )
```

### 19.4 Event Nonce

```text
event_nonce =
    FIRST_12_BYTES(
        SHA-256(
            ASCII("PALLASYNC-DATA-NONCE-v1\0") ||
            device_id_raw ||
            UINT64_BE(device_seq)
        )
    )
```

Event KeyはDevice IDとDevice Sequenceごとに一意に導出されます。

### 19.5 暗号化

```text
ciphertext =
    CHACHA20-POLY1305-ENCRYPT(
        key = event_key,
        nonce = event_nonce,
        plaintext = JCS(data_payload),
        aad = JCS(event_header)
    )
```

### 19.6 署名

```text
event_signature_input =
    ASCII("PALLASYNC-EVENT-SIGN-v1\0") ||
    JCS(event_without_signature_and_event_hash)
```

### 19.7 Event Hash

```text
event_hash_raw =
    SHA-256(
        ASCII("PALLASYNC-EVENT-HASH-v1\0") ||
        JCS(event_without_event_hash)
    )
```

受信者は次の順で検証しなければなりません。

1. JSONと型
2. Chain ID
3. Device Certificate
4. Device失効状態
5. Device Sequence
6. `prev_event_hash`
7. Key Epoch
8. Ed25519署名
9. Event Hash
10. AEAD復号
11. Payload Schema
12. 因果コンテキスト
13. アプリケーション競合解決

検証失敗Eventを適用してはいけません。

## 20. Data Payload

復号後Payloadは次の形式です。

```json
{
  "schema": "palleria.setting/1",
  "entity_id": "0198f6d2-6c40-7a11-8a22-334455667788",
  "operation": "upsert",
  "context": {
    "BASE64URL_DEVICE_ID": 42
  },
  "lamport": 100,
  "created_at_ms": 1785581400000,
  "body": {
    "key": "theme",
    "value": "dark"
  }
}
```

### 20.1 operation

PallaSync 1.0は次を定義します。

- `upsert`
- `delete`

Schema拡張が別Operationを必要とする場合、新しいSchemaメジャー版で定義しなければなりません。

### 20.2 Dot

Data Event自身のDotは次です。

```text
(device_id, device_seq)
```

PayloadへDotを重複格納してはいけません。

### 20.3 Context

`context` は、その変更を生成した時点でDeviceがそのEntityについて認識していたVersion Vectorです。

- キーはDevice ID
- 値はそのDeviceの最大認識Device Sequence
- 値0は省略する
- 自分自身の値も必要な場合は含める
- Contextは暗号化対象
- ContextのDevice SequenceがChain Vectorを超える場合はEventを保留または拒否する

Event適用後のEntity Version Vectorは、ContextとEvent Dotの要素ごとの最大値です。

### 20.4 Lamport Clock

各Deviceは同期チェーンごとのLamport Clockを保持します。

ローカルEvent作成時:

```text
lamport = max(local_lamport, maximum_received_lamport) + 1
```

受信時:

```text
local_lamport = max(local_lamport, received_lamport)
```

Lamport値は因果順序の補助と、並行変更の決定的タイブレークに使用します。

壁時計だけで競合を解決してはいけません。

### 20.5 created_at_ms

`created_at_ms` は表示とアプリケーション意味論に使用できます。

競合の最終タイブレークには使用してはいけません。

## 21. 因果関係

2つのEvent AとBについて、Entity Version Vectorを比較します。

- AがBの全要素以上で、少なくとも1要素が大きい場合、AはBを支配する
- BがAを支配する場合、Bを優先する
- どちらも支配しない場合、並行変更
- 同一Vectorの場合、重複または同一状態

並行変更はSchemaが定義するCRDTまたは競合解決規則で統合します。

Schemaが規則を定義していない場合、クライアントは自動的に片方を破棄してはいけません。`UNRESOLVED_CONFLICT` として両方を保持しなければなりません。

## 22. 決定的順序

LWW型Schemaで並行変更を順序付ける場合、次のタプルを辞書順で比較します。

```text
(lamport, device_id_raw, device_seq)
```

より大きいタプルを優先します。

壁時計、サーバー到着順、ローカルDB挿入順をタイブレークに使用してはいけません。

## 23. Chain Vector

Chain Vectorは次の形式です。

```json
{
  "BASE64URL_DEVICE_A": 120,
  "BASE64URL_DEVICE_B": 98
}
```

各値は、そのDeviceについて署名、ハッシュチェーン、復号、Schema検証まで完了した最大連続Device Sequenceです。

Sequence 100を保持していても99が未取得の場合、Chain Vectorを100へ進めてはいけません。

失効DeviceのVector要素を直ちに削除してはいけません。SnapshotとCompaction Floorに含まれるまで保持します。

## 24. ローカルイベントキュー

Core ClientはData Eventを次の状態で管理しなければなりません。

- `created`
- `queued`
- `uploading`
- `accepted`
- `rejected`
- `conflict`
- `quarantined`

Data EventはローカルDB変更と同一トランザクション、または同等の原子性を持つOutbox Patternで作成しなければなりません。

ネットワーク送信に成功してからEventを生成する設計は禁止します。

同一Eventの再送は同じ暗号文、署名、Event Hashを使用しなければなりません。再送時
