# Palleria Sync Protocol 1.0

- Document ID: `PSP-1`
- Protocol name: `Palleria Sync Protocol`
- Protocol identifier: `psp/1`
- Version: `1.0.0`
- Status: Draft Standard
- Published: 2026-08-01
- Default media type: `application/vnd.palleria.sync+json`
- File encoding: UTF-8
- Canonical serialization: JSON Canonicalization Scheme
- License: The repository `LICENSE` applies unless this document states otherwise

> [!IMPORTANT]
> This document is the normative specification for Palleria Sync Protocol 1.0.
> README、実装メモ、Issue、コメント、サーバー設定と内容が矛盾する場合は、この文書を優先します。
>
> 暗号方式を独自実装してはいけません。実運用前に、暗号設計、鍵管理、認可、復旧処理について第三者のセキュリティレビューを実施してください。

## 1. 目的

Palleria Sync Protocol、以下 `PSP` は、ユーザーアカウントを作成せず、複数端末間でPalleriaのデータを同期するためのプロトコルです。

PSPは次の性質を提供します。

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

PSP 1.0は、次の4層を規定します。

1. 同期チェーン、端末、権限、鍵のライフサイクル
2. 暗号化済みイベントの生成、署名、保存、転送、検証
3. HTTPSサーバー同期とWebRTC P2P同期
4. Palleriaデータ種別ごとの競合解決規則

PSP 1.0は、次を規定しません。

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

PSPは次を信頼します。

- 正常な端末上の暗号ライブラリ
- 正常な端末上の安全な乱数生成器
- 端末OSの安全な鍵保管機能
- ユーザーが承認した有効端末
- ユーザーが安全に保管したリカバリーコード

### 5.2 信頼しないもの

PSPは次を完全には信頼しません。

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

PSPは機密性とイベント完全性を端末側で保護しますが、可用性を保証しません。

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

PSP 1.0の制御メッセージ、イベントエンベロープ、API要求、API応答はJSONを使用しなければなりません。

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

PSP 1.0の必須暗号スイートは `PSP1-25519-CHACHA-SHA256` です。

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

PSP 1.0では暗号スイートの動的ダウングレード交渉を禁止します。

別暗号スイートは、将来の新しいPSPメジャー版または明示的な拡張仕様で追加しなければなりません。

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
        ASCII("PSP-CHAIN-ID-v1\0") ||
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
        ASCII("PSP-DEVICE-ID-v1\0") ||
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

PSP 1.0は次の3権限を定義します。

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
  "psp_version": "1.0",
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
    ASCII("PSP-DEVICE-CERT-v1\0") ||
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
  "psp_version": "1.0",
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
    ASCII("PSP-CONTROL-SIGN-v1\0") ||
    JCS(control_event_without_signature_and_control_hash)
```

Control Hashは次のとおりです。

```text
control_hash_raw =
    SHA-256(
        ASCII("PSP-CONTROL-HASH-v1\0") ||
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
        info = ASCII("PSP-RECOVERY-WRAP-v1\0"),
        L = 32
    )
```

リカバリーパッケージ平文は次を含みます。

```json
{
  "psp_version": "1.0",
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
- AADは `ASCII("PSP-RECOVERY-PACKAGE-v1\0") || chain_id_raw`
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
  "psp_version": "1.0",
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
        ASCII("PSP-INVITE-SECRET-v1\0") ||
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
        info = ASCII("PSP-PAIRING-KEY-v1\0") ||
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
        data = ASCII("PSP-SAS-v1\0") || pairing_transcript
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
  "psp_version": "1.0",
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
ASCII("PSP-KEY-PACKAGE-v1\0") ||
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

PSP 1.0は次のActionを定義します。

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
  "psp_version": "1.0",
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
  "psp_version": "1.0",
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
        info = ASCII("PSP-DATA-KEY-v1\0") ||
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
            ASCII("PSP-DATA-NONCE-v1\0") ||
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
    ASCII("PSP-EVENT-SIGN-v1\0") ||
    JCS(event_without_signature_and_event_hash)
```

### 19.7 Event Hash

```text
event_hash_raw =
    SHA-256(
        ASCII("PSP-EVENT-HASH-v1\0") ||
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

PSP 1.0は次を定義します。

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

同一Eventの再送は同じ暗号文、署名、Event Hashを使用しなければなりません。再送時に再暗号化してはいけません。

## 25. サーバー同期

サーバー同期はPSP 1.0 Core Clientの必須機能です。

すべてのAPIはHTTPSを使用しなければなりません。

- TLS 1.3を使用する
- サーバー証明書とサービスIDを検証する
- 平文HTTPへのフォールバックを禁止する
- 変更系要求でTLS 0-RTTを使用してはいけない
- リダイレクト先が別Originの場合、自動追従してはいけない
- Server Origin変更はRoot署名付き `server.migrate` でのみ許可する

## 26. 署名付きAPI Request Envelope

認証が必要なAPI要求は次の形式です。

```json
{
  "psp_version": "1.0",
  "message_type": "sync.pull",
  "request_id": "0198f6d2-6c40-7a11-8a22-334455667788",
  "chain_id": "BASE64URL_CHAIN_ID",
  "device_id": "BASE64URL_DEVICE_ID",
  "issued_at_ms": 1785581400000,
  "expires_at_ms": 1785581700000,
  "nonce": "BASE64URL_16_BYTES",
  "critical": [],
  "body": {},
  "signature": "BASE64URL_ED25519_SIGNATURE"
}
```

署名入力:

```text
request_signature_input =
    ASCII("PSP-REQUEST-v1\0") ||
    JCS(request_without_signature)
```

サーバーは次を検証します。

- 署名
- 有効Device Certificate
- 失効状態
- Message Typeに必要な権限
- Request ID形式
- 16バイトnonce
- `expires_at_ms >= issued_at_ms`
- 有効期間が5分以下
- サーバー時刻が有効期間内
- 同じDevice IDとnonceを過去10分に処理していない
- Chain IDがDevice Certificateと一致
- 未対応クリティカル拡張がない

同じRequest IDを再送した場合、サーバーは冪等なMessage Typeについて同じ論理結果を返さなければなりません。

## 27. API Response Envelope

```json
{
  "psp_version": "1.0",
  "request_id": "0198f6d2-6c40-7a11-8a22-334455667788",
  "server_time_ms": 1785581400100,
  "body": {}
}
```

エラー時:

```json
{
  "psp_version": "1.0",
  "request_id": "0198f6d2-6c40-7a11-8a22-334455667788",
  "server_time_ms": 1785581400100,
  "error": {
    "code": "DEVICE_REVOKED",
    "message": "The device has been revoked.",
    "retryable": false,
    "retry_after_ms": null,
    "details": {}
  }
}
```

`message` は診断用であり、処理分岐には `code` を使用しなければなりません。

## 28. API Endpoint

すべてのEndpointは `POST` を使用します。これにより署名対象をJSON Request Envelopeへ統一します。

### 28.1 Capabilities

```text
POST /psp/v1/capabilities
```

認証不要です。

応答は次を含みます。

- 対応PSPバージョン
- 最大Device数
- Event最大サイズ
- Batch最大サイズ
- Snapshot最大サイズ
- Retention Policy
- P2P対応
- STUN設定
- TURN短期認証情報の取得方法
- サーバー実装識別子

### 28.2 Chain Create

```text
POST /psp/v1/chain/create
```

Body:

- Root公開鍵
- Genesis Control Event
- Initial Admin Certificate
- Recovery Package暗号文
- Server Policy要求値

サーバーはChain IDを再計算し、Genesis署名を検証しなければなりません。

### 28.3 Invite Create

```text
POST /psp/v1/invite/create
```

Adminのみ。

### 28.4 Join Request

```text
POST /psp/v1/join/request
```

Invite Secretによる一時認証を使用します。

### 28.5 Join Poll

```text
POST /psp/v1/join/poll
```

新端末が承認結果、Device Certificate、Key Packageを取得します。

### 28.6 Join Approve

```text
POST /psp/v1/join/approve
```

Adminのみ。

### 28.7 Control Pull

```text
POST /psp/v1/control/pull
```

指定Control Sequenceより後のControl Eventを取得します。

### 28.8 Control Push

```text
POST /psp/v1/control/push
```

Bodyは `expected_control_seq`、`expected_control_hash`、新Control Eventを含みます。

現在Headと一致しない場合は `CONTROL_CONFLICT` を返します。

### 28.9 Sync Push

```text
POST /psp/v1/sync/push
```

Body:

```json
{
  "base_chain_vector": {},
  "events": []
}
```

サーバーは各DeviceのEvent列について、SequenceとPrev Event Hashの連続性を検証します。

サーバーは暗号文を復号してはいけません。

### 28.10 Sync Pull

```text
POST /psp/v1/sync/pull
```

Body:

```json
{
  "after_server_seq": 1000,
  "limit": 500,
  "known_chain_vector": {}
}
```

応答:

```json
{
  "events": [],
  "next_server_seq": 1000,
  "has_more": false,
  "server_chain_vector": {},
  "compaction_floor": {},
  "latest_snapshot_id": null
}
```

`server_seq` は配送効率のためのサーバーローカル順序です。競合解決や因果関係に使用してはいけません。

### 28.11 Sync Ack

```text
POST /psp/v1/sync/ack
```

クライアントが完全検証済みChain Vectorを通知します。

復号前、適用前、永続化前にAckしてはいけません。

### 28.12 Snapshot Push

```text
POST /psp/v1/snapshot/push
```

AdminのみがAuthoritative Snapshotを公開できます。

### 28.13 Snapshot Latest

```text
POST /psp/v1/snapshot/latest
```

### 28.14 Key Package Get

```text
POST /psp/v1/key-package/get
```

受信Device本人だけが自分向けPackageを取得できます。

### 28.15 Peer Signal Send

```text
POST /psp/v1/peer/signal/send
```

### 28.16 Peer Signal Poll

```text
POST /psp/v1/peer/signal/poll
```

### 28.17 Chain Delete

```text
POST /psp/v1/chain/delete
```

Root署名が必要です。

## 29. Sync Pushの受理規則

サーバーはEventごとに次を検証しなければなりません。

1. Chainが存在する
2. Device Certificateが有効
3. Deviceが失効していない
4. Key Epochが現在値
5. Event署名が正しい
6. Event Hashが正しい
7. Device Sequenceが期待値
8. Prev Event Hashが期待値
9. Eventサイズが上限以下
10. ClientのBase Chain VectorがCompaction Floor以上
11. 同一Eventが既存の場合は内容が完全一致
12. 同一Device Sequenceで異なるEvent Hashの場合は分岐として拒否

同一Eventの再送は成功として扱います。

同一Device Sequenceで異なる内容を受信した場合は `DEVICE_EVENT_FORK` を返し、そのDeviceからの新規Eventを停止しなければなりません。

## 30. P2P Transport Profile

P2Pは任意機能ですが、実装する場合はこの節に適合しなければなりません。

### 30.1 Transport

- ICEを使用する
- STUNを使用する
- 直接接続失敗時にTURNを使用できる
- WebRTC Data Channelを使用する
- Data Channelはorderedかつreliable
- Data Channel labelは `palleria-sync-v1`
- Data Channel protocolは `psp/1`
- 1 WebRTC Messageは1 JSON Message
- 文字コードはUTF-8
- Data Event自体のE2EEと署名を維持する

ICEがホスト候補またはServer Reflexive候補を選択した場合は直接P2Pです。

Relay候補を選択した場合はTURN経由です。

P2Pが確立できない場合は、Core Server同期へフォールバックしなければなりません。

### 30.2 シグナリング

Offer、Answer、ICE CandidateはPSP Request Envelopeと同等のDevice署名で保護しなければなりません。

シグナリングメッセージの標準TTLは60秒です。

失効Deviceからのシグナリングを中継してはいけません。

### 30.3 P2P Hello

接続確立後、両端末は最初に次を送信します。

```json
{
  "psp_version": "1.0",
  "message_type": "p2p.hello",
  "chain_id": "BASE64URL_CHAIN_ID",
  "device_id": "BASE64URL_DEVICE_ID",
  "peer_device_id": "BASE64URL_REMOTE_DEVICE_ID",
  "session_nonce": "BASE64URL_32_BYTES",
  "control_seq": 12,
  "control_hash": "BASE64URL_SHA256",
  "chain_vector": {},
  "supported_features": [
    "event-range-v1"
  ],
  "signature": "BASE64URL_ED25519_SIGNATURE"
}
```

署名入力:

```text
ASCII("PSP-P2P-HELLO-v1\0") ||
JCS(hello_without_signature)
```

受信者は次を検証します。

- Peer Device IDが期待値
- Device Certificate
- Device失効状態
- Control Head
- 署名
- Chain ID
- PSP Version
- Session Nonce再利用がない
- 自分自身への接続ではない

Control Hashが異なる場合は、Data Event交換前にControl Logを同期します。

同一Control Sequenceで異なるHashの場合は `SERVER_FORK_DETECTED` として切断します。

### 30.4 P2P Message Type

- `p2p.hello`
- `p2p.vector`
- `p2p.request-range`
- `p2p.events`
- `p2p.ack`
- `p2p.ping`
- `p2p.pong`
- `p2p.error`
- `p2p.close`

### 30.5 Event Range

不足EventはDevice単位の範囲で要求します。

```json
{
  "message_type": "p2p.request-range",
  "ranges": [
    {
      "device_id": "BASE64URL_DEVICE_ID",
      "from_seq": 100,
      "to_seq": 150
    }
  ]
}
```

送信側は範囲外Eventを含めてはいけません。

受信側はSequence、Prev Event Hash、署名を検証し、ギャップがあるEventを適用してはいけません。

## 31. 同期アルゴリズム

Core Clientは同期時に次の順序を使用します。

1. Control Logを同期する
2. Device Certificateと失効状態を更新する
3. 必要なKey Packageを取得する
4. Key Epochを更新する
5. ローカルOutbox EventをサーバーへPushする
6. サーバーからData EventをPullする
7. Event列、署名、ハッシュ、暗号文を検証する
8. Payloadを復号する
9. Schema規則で状態へ適用する
10. Chain Vectorを更新する
11. 永続化完了後にAckする
12. P2P接続可能な場合、PeerとVectorを交換する
13. P2Pで取得したEventも必要に応じてサーバーへPushする

Control Log同期より先に未知Key EpochのData Eventを適用してはいけません。

## 32. 重複排除

Eventの一意性は次の組で判定します。

```text
(chain_id, device_id, device_seq)
```

同じ組で同じEvent Hashの場合は重複です。

同じ組で異なるEvent Hashの場合は分岐です。

Entity IDだけでEventを重複排除してはいけません。

## 33. Palleria Data Profile 1

この節はPalleriaで使用するSchemaと競合解決を規定します。

### 33.1 `palleria.setting/1`

設定はキーごとのLWW Registerです。

Body:

```json
{
  "key": "theme",
  "value": "dark"
}
```

- Entity IDは設定キーから決定的に生成してよい
- 異なる設定キーは別Entity
- 因果的に新しいEventを優先
- 並行時は `(lamport, device_id_raw, device_seq)` が大きいEventを優先
- Secret、Token、Cookie、認証情報は同期対象にしてはいけない

### 33.2 `palleria.bookmark/1`

BookmarkはAdd-Wins Observed-Remove Setです。

Body例:

```json
{
  "work_id": "12345678",
  "state": "added",
  "metadata": {
    "added_at_ms": 1785581400000
  }
}
```

- AddはEvent DotをAdd Tagとして保持
- DeleteはContextで観測済みのAdd Tagだけを削除
- AddとDeleteが並行した場合、Addを保持
- 同じWork IDのMetadata競合はLWW
- サーバーはWork IDを平文で保持してはいけない

### 33.3 `palleria.follow/1`

FollowはBookmarkと同じAdd-Wins Observed-Remove Setです。

### 33.4 `palleria.mute/1`

Muteは安全側を優先するため、Remove-Wins Observed-Remove Setです。

AddとDeleteが並行した場合、Mute状態を保持します。

### 33.5 `palleria.history/1`

作品ごとの履歴はMapです。

Body例:

```json
{
  "work_id": "12345678",
  "viewed_at_ms": 1785581400000,
  "progress": 0.75,
  "source": "viewer"
}
```

- 異なるWork IDは統合
- `viewed_at_ms` は最大値
- `progress` は同一閲覧セッションと判断できる場合は最大値
- 並行かつ判断不能な場合はLWW
- 履歴削除はTombstone
- 「履歴をすべて削除」は世代番号を増加させる専用Entityで表現する

### 33.6 `palleria.search-history/1`

検索履歴は不変Entryの集合として扱います。

- 各検索Entryは固有Entity ID
- 同一文字列でも別時刻なら別Entryとしてよい
- 表示時にクライアントが重複をまとめてよい
- 全削除は `palleria.search-history-generation/1` の世代更新で表現する
- 古い世代のEntryは表示しない

### 33.7 `palleria.collection/1`

Collection MetadataはLWW Mapです。

Collection ItemsはAdd-Wins Observed-Remove Setです。

配列全体を単一LWW値として上書きしてはいけません。

### 33.8 `palleria.download-manifest/1`

サーバー同期するのはDownload Metadataだけです。

- ファイル本体
- 画像
- 動画
- サムネイル
- キャッシュ

これらを通常のSync Server Eventへ含めてはいけません。

ファイル本体の転送はP2P専用の将来拡張で定義します。

### 33.9 `palleria.device-preference/1`

端末固有設定は原則同期対象外です。

同期する場合、Bodyに対象Device IDを含め、他Deviceは適用してはいけません。

## 34. Tombstone

削除はData Eventの `operation: "delete"` で表現します。

Tombstoneは次を含まなければなりません。

- Entity ID
- Schema
- Context
- Lamport
- Event Dot
- 必要なCRDT Remove情報

Tombstoneを時間だけで削除してはいけません。

Tombstoneは次の条件をすべて満たした後にのみSnapshotから除去できます。

1. Tombstoneを含むAuthoritative Snapshotが存在する
2. Compaction FloorがTombstone Eventを超えている
3. 古い状態のClientがPush前に完全再同期を要求される
4. CRDTのRemove Tagが安全に圧縮できる
5. サーバー保持猶予期間が終了した

## 35. Snapshot

Snapshotは完全な論理状態と同期境界を表します。

Snapshot Metadata:

```json
{
  "psp_version": "1.0",
  "snapshot_id": "0198f6d2-6c40-7a11-8a22-334455667788",
  "chain_id": "BASE64URL_CHAIN_ID",
  "creator_device_id": "BASE64URL_ADMIN_DEVICE_ID",
  "key_epoch": 2,
  "control_seq": 20,
  "control_hash": "BASE64URL_SHA256",
  "covers_vector": {},
  "created_at_ms": 1785581400000,
  "ciphertext": "BASE64URL_CIPHERTEXT",
  "signature": "BASE64URL_SIGNATURE",
  "snapshot_hash": "BASE64URL_SHA256"
}
```

Snapshot平文は次を含みます。

- すべての同期対象Entityの論理状態
- Entity Version Vector
- CRDT内部状態
- 必要なTombstone
- Chain Vector
- Schema Version
- Key Epoch
- Control Head

Snapshot暗号化鍵はEvent Keyと分離して導出します。

```text
snapshot_key =
    HKDF-SHA-256(
        IKM = epoch_key,
        salt = chain_id_raw,
        info = ASCII("PSP-SNAPSHOT-KEY-v1\0") ||
               snapshot_id_uuid_bytes,
        L = 32
    )
```

Snapshot nonceは12バイトの安全な乱数を使用し、Metadataへ含めます。

Authoritative SnapshotはAdminまたはRootだけが公開できます。

## 36. Compaction

サーバーは無期限に全Eventを保持する必要はありません。

Compactionは次の手順で実行します。

1. AdminがAuthoritative Snapshotを公開する
2. Snapshotの `covers_vector` を検証する
3. `snapshot.publish` Control Eventを追加する
4. Adminが `compaction.advance` Control Eventを追加する
5. Compaction Floorを更新する
6. 最低30日の猶予期間を置く
7. Floor以下のEventを削除できる

Compaction Floorより古いBase Chain Vectorを持つClientからのPushは、`FULL_RESYNC_REQUIRED` で拒否しなければなりません。

クライアントはSnapshot適用前に未送信ローカルEventを隔離しなければなりません。

完全再同期後、隔離Eventは新しいContextと新しいDevice Sequenceで再生成しなければなりません。古い署名済みEventをそのまま再送してはいけません。

## 37. Device失効

Device失効はControl Eventで行います。

```json
{
  "action": "device.revoke",
  "body": {
    "device_id": "BASE64URL_DEVICE_ID",
    "reason": "lost",
    "revoked_at_ms": 1785581400000
  }
}
```

失効後、サーバーとPeerは対象Deviceについて次を拒否しなければなりません。

- API要求
- Data Event Push
- Sync Pull
- Key Package取得
- 招待作成
- Join承認
- P2Pシグナリング
- P2Pハンドシェイク

Device失効Control EventとKey Epochローテーションは、同じ管理操作として連続して実行しなければなりません。

失効だけ行い、Key Epochを維持してはいけません。

## 38. ローカル鍵保管

Clientは秘密鍵とEpoch KeyをOSの安全な鍵保管機能で保護しなければなりません。

最低要件:

- アプリの通常ファイル領域へ平文保存しない
- バックアップ対象へ無条件に含めない
- ログへ出力しない
- クリップボードへ自動コピーしない
- クラッシュダンプへ含めない
- Root化、デバッグ、エミュレーター環境では警告できる
- 端末ロック解除や生体認証による追加保護を提供してよい

Android実装はAndroid Keystoreを使用することを推奨します。

Windows実装はDPAPI、CNG、またはOS保護された資格情報保管を使用することを推奨します。

## 39. エラーコード

Core実装は最低でも次を認識しなければなりません。

- `INVALID_REQUEST`
- `UNSUPPORTED_VERSION`
- `UNSUPPORTED_CRITICAL_EXTENSION`
- `CHAIN_NOT_FOUND`
- `CHAIN_DELETED`
- `CHAIN_ID_MISMATCH`
- `DEVICE_NOT_FOUND`
- `DEVICE_REVOKED`
- `DEVICE_CERT_INVALID`
- `DEVICE_CERT_EXPIRED`
- `PERMISSION_DENIED`
- `SIGNATURE_INVALID`
- `REPLAY_DETECTED`
- `REQUEST_EXPIRED`
- `INVITE_NOT_FOUND`
- `INVITE_EXPIRED`
- `INVITE_ALREADY_USED`
- `PAIRING_FAILED`
- `JOIN_NOT_APPROVED`
- `CONTROL_CONFLICT`
- `CONTROL_LOG_INVALID`
- `SERVER_FORK_DETECTED`
- `KEY_EPOCH_UNKNOWN`
- `KEY_EPOCH_STALE`
- `KEY_PACKAGE_INVALID`
- `EVENT_INVALID`
- `EVENT_TOO_LARGE`
- `DEVICE_SEQUENCE_GAP`
- `DEVICE_SEQUENCE_REUSED`
- `DEVICE_EVENT_FORK`
- `EVENT_DECRYPTION_FAILED`
- `SCHEMA_UNSUPPORTED`
- `CAUSAL_CONTEXT_INVALID`
- `UNRESOLVED_CONFLICT`
- `FULL_RESYNC_REQUIRED`
- `SNAPSHOT_NOT_FOUND`
- `SNAPSHOT_INVALID`
- `RATE_LIMITED`
- `QUOTA_EXCEEDED`
- `P2P_NEGOTIATION_FAILED`
- `TEMPORARY_UNAVAILABLE`
- `INTERNAL_ERROR`

復号失敗Eventを無視してChain Vectorだけ進めてはいけません。

署名不正、Event Fork、Control Forkを自動修復してはいけません。

## 40. 最低制限値

Core Serverは少なくとも次を許容しなければなりません。

- 1 ChainあたりDevice数: 32
- 1 EventのJSON全体: 256 KiB
- 1 PushあたりEvent数: 500
- 1 Pushあたり総サイズ: 4 MiB
- 1 PullあたりEvent数: 1000
- 1 Snapshot: 64 MiB
- 1 Request: 8 MiB
- Invite有効期限: 最大30分
- Request有効期間: 最大5分
- Replay nonce保持: 最低10分
- P2P Signaling Message: 64 KiB
- Signaling TTL: 60秒

サーバーはより大きい上限を提供してよい。

サーバーがこれより小さい上限を使用する場合、PSP 1.0 Core Server適合を名乗ってはいけません。

## 41. レート制限

サーバーはChain、Device、IPアドレス、Endpointごとにレート制限を実装しなければなりません。

レート制限応答は `RATE_LIMITED` と `retry_after_ms` を返さなければなりません。

IPアドレスだけを恒久的な識別子として使用してはいけません。

招待、Join、Recovery、Signalingは通常Syncより厳しい制限を設定しなければなりません。

## 42. 再試行

Clientは再試行可能エラーに指数バックオフとジッターを使用しなければなりません。

推奨値:

- 初回: 1秒
- 最大: 5分
- 乗数: 2
- ジッター: 0.5倍から1.5倍
- `retry_after_ms` がある場合はそれを下回らない

署名不正、権限拒否、Device失効、Fork検出は自動再試行してはいけません。

## 43. バージョン交渉

`psp_version` は `major.minor` 形式です。

PSP 1.0の値は `1.0` です。

- Major差異は互換性なし
- Minor差異は後方互換拡張
- Clientは未知のMajorを拒否する
- 未知の非クリティカルフィールドを無視してよい
- 未知のクリティカル拡張を拒否する
- セキュリティ上弱いVersionへの自動ダウングレードを禁止する
- P2P HelloのVersion選択結果は署名対象に含める

## 44. Server Origin

Server Originはスキーム、ホスト、ポートから成ります。

例:

```text
https://sync.example.invalid
```

- スキームは `https`
- パスを含めない
- ユーザー情報を含めない
- フラグメントを含めない
- 国際化ドメインはASCII表現へ正規化する
- Clientは証明書のサービスIDを検証する
- 別Originへの移行はRoot署名付きControl Eventが必要

## 45. プライバシー

サーバーは平文データを取得できませんが、次のメタデータを観測できます。

- IPアドレス
- 接続時刻
- Server Origin
- Chain ID
- Device ID
- Device数
- Event数
- 暗号文サイズ
- Key Epoch
- 同期頻度
- P2P相手
- TURN利用有無
- 通信量

実装は次を行うべきです。

- ログ保持期間を最小化する
- Invite Secret、Recovery Secret、秘密鍵、Epoch Keyをログへ出力しない
- 暗号文本文をアプリケーションログへ出力しない
- P2P Signalingを短時間で削除する
- TURN資格情報を短期化する
- Device表示名を必要以上にサーバーへ公開しない
- AnalyticsとSync識別子を結合しない

PSP 1.0はトラフィック解析耐性や匿名性を保証しません。

## 46. サーバー分岐と巻き戻し

Clientは最後に検証した次を永続化しなければなりません。

- Control Sequence
- Control Hash
- Deviceごとの最大SequenceとEvent Hash
- Chain Vector
- Key Epoch
- 最新Snapshot IDとHash
- Compaction Floor

サーバーがより古いControl Headを返した場合、Clientは巻き戻しとして警告しなければなりません。

同じControl Sequenceで異なるHashを返した場合は同期を停止します。

同じDevice Sequenceで異なるEvent Hashを返した場合も同期を停止します。

P2P ClientはPeerとControl Headを交換することで、サーバーが端末ごとに異なる履歴を返すForkを検出できます。

## 47. ログと監査

Core Serverは次の管理イベントを監査記録しなければなりません。

- Chain作成
- Invite作成と消費
- Join要求と承認
- Device追加
- Device失効
- Key Epochローテーション
- Control Conflict
- Device Event Fork
- Snapshot公開
- Compaction
- Chain削除
- Rate Limit発動

監査ログへ秘密値または暗号文本文を保存してはいけません。

監査ログは改ざん検出可能な形式で保存することを推奨します。

## 48. Chain削除

Chain削除はRoot署名付き `chain.delete` Control Eventを必要とします。

削除要求受理後、サーバーは次を実行します。

1. Chainを削除中状態へする
2. 新規Push、Join、Inviteを拒否する
3. 最低24時間の猶予期間を設けてよい
4. Event、Snapshot、Key Package、Recovery Package、Signalingを削除する
5. バックアップ上の削除期限をポリシーで明示する
6. Chain IDの再利用を禁止する

削除済みChainへ同じChain IDで新規作成してはいけません。

## 49. 実装禁止事項

PSP 1.0適合実装は次を行ってはいけません。

- 独自暗号アルゴリズムを作る
- 同じ秘密値をEd25519とX25519へ流用する
- 平文同期データをサーバーへ送る
- Recovery Secretをサーバーへ送る
- Epoch KeyをURL、ログ、通知へ含める
- Device Sequenceを巻き戻す
- 同じEventを再暗号化して再送する
- 復号失敗を無視してVectorを進める
- 失効Deviceへ新Epoch Keyを配る
- Compaction Floorより古いClientから差分を受理する
- 壁時計だけで競合を解決する
- Server Sequenceを因果順序として扱う
- TLS検証を無効化する
- HTTPへフォールバックする
- 未署名のP2P Helloを受理する
- SAS確認なしにQR参加を完了する
- Device IDやChain IDをサーバー任意発行値として信用する

## 50. Conformance Test

Core ClientとCore Serverは次のテストを通過しなければなりません。

### 50.1 Encoding

- 重複JSONキーを拒否
- 不正UTF-8を拒否
- Base64urlパディング有無の規則
- JCS正規化一致
- 未知Critical拡張拒否

### 50.2 Cryptography

- Ed25519署名検証
- X25519共有秘密一致
- HKDF導出一致
- ChaCha20-Poly1305暗号文一致
- HPKE Key Package相互運用
- 改ざんAAD拒否
- 改ざんCiphertext拒否
- 改ざんSignature拒否

### 50.3 Identity

- Root公開鍵からChain ID再計算
- Device公開鍵からDevice ID再計算
- 異なる鍵でID不一致
- 不正Certificate拒否

### 50.4 Event Chain

- 正常連続Sequence
- Sequence Gap
- Sequence再利用
- Prev Hash不一致
- 同一Sequence Fork
- 重複Event冪等性

### 50.5 Control Log

- 正常CAS
- Control Conflict
- 同一Sequence Fork
- 権限違反
- 失効Admin拒否

### 50.6 Sync

- 2端末相互同期
- 3端末並行同期
- オフラインEvent再送
- Push後切断と冪等再送
- Pullページング
- P2P取得Eventのサーバー再配信
- Compaction後の完全再同期

### 50.7 Conflict

- LWW決定性
- Bookmark Add-Wins
- Mute Remove-Wins
- Collection OR-Set
- History統合
- Tombstoneによる復活防止

### 50.8 Revocation

- 失効DeviceのAPI拒否
- 失効DeviceのP2P拒否
- Key Epochローテーション
- 失効Device向けKey Package欠如
- 古いEpoch Event拒否

### 50.9 Recovery

- Recovery Package復号
- 不正Recovery Secret拒否
- 復旧後Admin発行
- 復旧直後のKey Epochローテーション
- Snapshot再公開

## 51. PSP 1.0 Test Vector

このTest Vectorでは、JSONに浮動小数点数を含めません。

### 51.1 Input

```text
root_private_seed:
AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8

root_public_key:
A6EHv_POEL4dcN0Y50vAmWfk1jCbpQ1fHdyGZBJVMbg

device_sign_private_seed:
ICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj8

device_sign_public_key:
Kay64UG8yvCyLhqU000LxzYeUm0L_hLIl5S8kyKWbdc

device_hpke_public_key:
eaYx7t4b-cmPEgMs3q3Q56B5OY_HhriMyEbsia-FpRo

epoch_key:
YGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn8

device_seq:
1
```

### 51.2 Derived ID

```text
chain_id:
3VYYFnm1SFdILm-I3SN7tHwfVj7UBRxLF2x4BYEG7VE

device_id:
EaEpW2PY-OhTIRPybSwCmyOZmESJWW9K1vWPb76nHgA
```

### 51.3 Derived Event Material

```text
event_key:
8-chamq23LyeNthHUyVmAQUFYgdDQRmngy2HPXKL-dk

event_nonce:
VAUd8SXlJr5ZGUiB
```

### 51.4 Canonical AAD

```json
{"chain_id":"3VYYFnm1SFdILm-I3SN7tHwfVj7UBRxLF2x4BYEG7VE","device_id":"EaEpW2PY-OhTIRPybSwCmyOZmESJWW9K1vWPb76nHgA","device_seq":1,"event_type":"data","key_epoch":1,"prev_event_hash":null,"psp_version":"1.0"}
```

### 51.5 Canonical Payload

```json
{"body":{"key":"theme","value":"dark"},"context":{},"created_at_ms":1785581400000,"entity_id":"0198f6d2-6c40-7a11-8a22-334455667788","lamport":1,"operation":"upsert","schema":"palleria.setting/1"}
```

### 51.6 Ciphertext

```text
ZL2mNxZip2hZDsRuL_kDguk2KK3vZ6YcSHyieT0BQ7iHc1BXnlcdCG3-zTJWmuHvr5ThlZIRaDjq2b1qv4BtzvcUAcbNK6K-8JCWSE_tSx-4bcx_jy-jZ7RKLyl7x8EoEGEYTaEnR9sTu4GpQmbhTrBB2_fynyvjIBqnCdGk2yduaySBDPjWul30lwdxw-Gxd-L-7REwqRBFNNoqeCcORvSM7Sk7DbxMHoZpRzwXGvu-MzkkY6AEwWC18nDHME0BpinD1NtfercZmQpzd3t19D_fUg8
```

### 51.7 Signature

```text
Ab6li2b05XzXXt62kUQrl3odA2zxk2xQlViWqgNQQd4dqF4KU6cY4a5zZsXQJWpk7D0vLCnc3b1uWHNRxsmECg
```

### 51.8 Event Hash

```text
Zk9ASqUOJA6r6KlLkH-2nuHqZd5d-CmOfrsUUqGJQ7o
```

## 52. 変更管理

PSPの変更は次の形式で管理します。

- `MAJOR`: 後方互換性を壊す変更
- `MINOR`: 後方互換の機能追加
- `PATCH`: 誤記修正、明確化、セキュリティ上意味を変えない編集

暗号方式、署名入力、ID計算、イベント順序、競合解決を変更する場合は、原則としてMAJORを増加しなければなりません。

仕様変更は次を伴わなければなりません。

- 変更理由
- セキュリティ影響
- 互換性影響
- 移行手順
- Test Vector更新
- ClientとServerの最低対応Version
- 廃止予定

## 53. 実装フェーズ

### Phase 1: Core Server Sync

- Chain作成
- RootとDevice Certificate
- InviteとJoin
- Control Log
- Key Package
- Data Event
- Push、Pull、Ack
- Settings、Bookmark、History
- Tombstone
- Device失効
- Key Epochローテーション

### Phase 2: Snapshot and Compaction

- Authoritative Snapshot
- Compaction Floor
- Full Resync
- Tombstone圧縮
- Recovery Flow

### Phase 3: P2P

- Signaling
- ICE、STUN、TURN
- WebRTC Data Channel
- Signed Hello
- Vector Sync
- P2Pフォールバック

### Phase 4: Hardening

- Fork検出UI
- 監査ログ
- Abuse対策
- Interoperability Suite
- Fuzzing
- 第三者セキュリティ監査

## 54. Normative References

- BCP 14
- RFC 2119, Key words for use in RFCs to Indicate Requirement Levels
- RFC 8174, Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words
- RFC 4648, The Base16, Base32, and Base64 Data Encodings
- RFC 5869, HMAC-based Extract-and-Expand Key Derivation Function
- RFC 7748, Elliptic Curves for Security
- RFC 8032, Edwards-Curve Digital Signature Algorithm
- RFC 8439, ChaCha20 and Poly1305 for IETF Protocols
- RFC 8445, Interactive Connectivity Establishment
- RFC 8489, Session Traversal Utilities for NAT
- RFC 8656, Traversal Using Relays around NAT
- RFC 8785, JSON Canonicalization Scheme
- RFC 8831, WebRTC Data Channels
- RFC 8832, WebRTC Data Channel Establishment Protocol
- RFC 9180, Hybrid Public Key Encryption
- RFC 9525, Service Identity in TLS
- RFC 9562, Universally Unique IDentifiers
- RFC 9846, The Transport Layer Security Protocol Version 1.3

## 55. Security Review Gate

PSP 1.0をProduction Readyとして宣言する前に、最低でも次を完了しなければなりません。

- 2つ以上の独立実装による相互運用試験
- 全Test Vectorの自動試験
- Parser Fuzzing
- Event Chain Fuzzing
- Control Log Fork試験
- Replay試験
- Device失効試験
- Recovery試験
- P2P MITM試験
- 暗号専門家による設計レビュー
- AndroidとWindowsの鍵保管レビュー
- サーバー侵害を仮定した侵入試験
- 外部監査指摘の修正
- 脅威モデルの公開
- セキュリティ連絡先と脆弱性開示方針の公開

このGateを完了するまでは、Statusを `Draft Standard` から `Stable Standard` へ変更してはいけません。
