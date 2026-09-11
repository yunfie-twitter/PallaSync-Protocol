---

title: "PallaSync Protocol 2.0"
description: "PallaSync Protocol 2.0の規範仕様書（実装ベース生成）"
layout: doc
outline: deep
lastUpdated: true
editLink: false
prev: false
next: false
---

# PallaSync Protocol 2.0

* Document ID: `PALLASYNC-2`
* Protocol name: `PallaSync Protocol`
* Name origin: `Palleria` + `Sync`
* Protocol identifier: `pallasync/2`
* Version: `2.0.0`
* Status: Draft Standard
* Published: 2026-08-05
* Default media type: `application/vnd.palleria.sync.v2+json`
* File encoding: UTF-8
* Canonical short name: `PallaSync`
* Acronym policy: 三文字頭字語は使用禁止
* Canonical serialization: JSON Canonicalization Scheme (JCS, RFC 8785)
* License: リポジトリの `LICENSE` を参照

> \\\\\\\[!IMPORTANT]
> 本文書はPallaSync Protocol 2.0の規範仕様書です。  
> README、実装メモ、Issue、コメント、サーバー設定と内容が矛盾する場合は、この文書を優先します。
>
> 暗号方式を独自実装してはいけません。実運用前に、暗号設計、鍵管理、認可、復旧処理について第三者のセキュリティレビューを実施してください。

\---

## 1\. 概要と設計原則

PallaSync 2.0は、Brave Sync v2にインスパイアされた、**ユーザーアカウント不要のエンドツーエンド暗号化同期プロトコル**です。

v1.0からの主な変更点：

* WebRTC P2P同期の廃止（HTTPSサーバー同期のみ）
* ハードウェアベースの公開鍵PKIモデルの廃止
* BIP39シードフレーズ + HKDF-SHA256による完全決定論的鍵導出
* 「Dumb Server」モデルの採用（サーバーは暗号文のみを保持・転送）
* サーバー側での署名検証の廃止（ゼロ知識サーバー）

### 1.1 設計上の不変条件

* サーバーはどのデータの平文も知ることができない
* すべての同期レコードはクライアント側で暗号化・署名される
* 鍵はシードフレーズから完全に決定論的に導出される
* サーバーはシードフレーズを保持しない
* チェーンへの参加にユーザー登録は不要

\---

## 2\. 識別子と命名

|項目|値|
|-|-|
|Protocol identifier|`pallasync/2`|
|API base path|`/pallasync/v2/`|
|`protocol\\\\\\\_version` field|`"2.0"`|
|Domain-separation prefix|`PALLASYNC-`|
|Media type|`application/vnd.palleria.sync.v2+json`|

\---

## 3\. 暗号プリミティブ

実装ソース: `pallasync-core/src/crypto.rs`

|用途|アルゴリズム|
|-|-|
|シードフレーズ生成|BIP39 / 256ビットエントロピー / 英語単語リスト / 24単語|
|鍵導出|BIP39 → 64バイトシード → HKDF-SHA256|
|データ暗号化|ChaCha20-Poly1305 (IETF, 96ビットノンス)|
|ノンス導出|SHA-256(domain\_sep \|\| id) の先頭12バイト|
|電子署名|Ed25519 (ed25519-dalek)|
|署名対象シリアライズ|JSON Canonicalization Scheme (JCS, RFC 8785)|
|ハッシュ|SHA-256|
|Base64エンコーディング|Base64URL (パディングなし, RFC 4648 §5)|

### 3.1 シードフレーズ生成

```
entropy = OsRng.fill\\\\\\\_bytes(32バイト)  // 256ビット
mnemonic = BIP39.from\\\\\\\_entropy(entropy, Language::English)
// → 24単語のシードフレーズ
```

### 3.2 鍵導出 (HKDF-SHA256)

```
seed = BIP39.to\\\\\\\_seed(mnemonic, passphrase="")  // 64バイト
hk = HKDF-SHA256(IKM=seed, salt=b"PallaSync-V2-Salt")

chain\\\\\\\_id\\\\\\\_bytes    = hk.expand(info=b"chain\\\\\\\_id",        32バイト)
encryption\\\\\\\_key    = hk.expand(info=b"encryption\\\\\\\_key",  32バイト)
signing\\\\\\\_key\\\\\\\_bytes = hk.expand(info=b"signing\\\\\\\_key",     32バイト)

chain\\\\\\\_id   = Base64URL(chain\\\\\\\_id\\\\\\\_bytes)     // 43文字
enc\\\\\\\_key    = Base64URL(encryption\\\\\\\_key)     // 43文字 (ChaCha20用)
sign\\\\\\\_key   = SigningKey::from\\\\\\\_bytes(signing\\\\\\\_key\\\\\\\_bytes)  // Ed25519秘密鍵
pub\\\\\\\_key    = sign\\\\\\\_key.verifying\\\\\\\_key()      // Ed25519公開鍵
```

### 3.3 ノンス導出

同期レコード用:

```
nonce\\\\\\\[12] = SHA-256(b"PALLASYNC-NONCE-v2\\\\\\\\0" || record\\\\\\\_id.as\\\\\\\_bytes())\\\\\\\[0..12]
```

デバイスレコード用:

```
nonce\\\\\\\[12] = SHA-256(b"PALLASYNC-NONCE-v2\\\\\\\\0" || device\\\\\\\_id.as\\\\\\\_bytes())\\\\\\\[0..12]
```

### 3.4 暗号化 (ChaCha20-Poly1305)

同期レコードペイロード:

```
ciphertext = ChaCha20Poly1305(
    key   = encryption\\\\\\\_key\\\\\\\[0..32],
    nonce = derive\\\\\\\_record\\\\\\\_nonce(record\\\\\\\_id),
    msg   = payload\\\\\\\_json.as\\\\\\\_bytes(),
    aad   = b"PALLASYNC-AAD-v2"
)
```

デバイス名:

```
ciphertext = ChaCha20Poly1305(
    key   = encryption\\\\\\\_key\\\\\\\[0..32],
    nonce = derive\\\\\\\_record\\\\\\\_nonce(device\\\\\\\_id),
    msg   = device\\\\\\\_name.as\\\\\\\_bytes(),
    aad   = b"PALLASYNC-DEVICE-AAD-v2"
)
```

### 3.5 署名

```
// signatureフィールドをJSONオブジェクトから除外してJCSシリアライズ
record\\\\\\\_without\\\\\\\_sig = {全フィールド} - {signature}
record\\\\\\\_jcs = JCS.serialize(record\\\\\\\_without\\\\\\\_sig)
hash = SHA-256(record\\\\\\\_jcs)
signature = Ed25519.sign(signing\\\\\\\_key, hash)
record.signature = Base64URL(signature)
```

\---

## 4\. データモデル

### 4.1 同期レコード (SyncRecord)

実装ソース: `pallasync-core/src/models.rs`, `ffi\\\\\\\_jni.rs`

```json
{
  "protocol\\\\\\\_version": "2.0",
  "chain\\\\\\\_id": "<Base64URL, 43文字>",
  "record\\\\\\\_id": "<UUIDv7文字列>",
  "collection\\\\\\\_name": "<コレクション識別子>",
  "action": "upsert",
  "encrypted\\\\\\\_payload": "<Base64URL, ChaCha20-Poly1305暗号文>",
  "device\\\\\\\_id": "<UUIDv7文字列>",
  "created\\\\\\\_at\\\\\\\_ms": 1722837600000,
  "signature": "<Base64URL, Ed25519署名>"
}
```

|フィールド|型|説明|
|-|-|-|
|`protocol\\\\\\\_version`|String|常に `"2.0"`|
|`chain\\\\\\\_id`|String|HKDF導出の43文字Base64URL文字列|
|`record\\\\\\\_id`|String|クライアントが生成するUUIDv7|
|`collection\\\\\\\_name`|String|データ種別識別子|
|`action`|String|`"upsert"` または `"delete"`|
|`encrypted\\\\\\\_payload`|String|`DataPayload`のJSONをChaCha20-Poly1305暗号化したBase64URL|
|`device\\\\\\\_id`|String|端末固有のUUIDv7|
|`created\\\\\\\_at\\\\\\\_ms`|Integer|Unix時刻ミリ秒|
|`signature`|String|Ed25519署名のBase64URL|

`record\\\\\\\_id` はUUIDv7形式（タイムスタンプ内蔵）を使用します。これにより `created\\\\\\\_at\\\\\\\_ms` によるソート順と `record\\\\\\\_id` でのPKが一致します。

### 4.2 デバイスレコード (DeviceRecord)

```json
{
  "protocol\\\\\\\_version": "2.0",
  "chain\\\\\\\_id": "<Base64URL>",
  "device\\\\\\\_id": "<UUIDv7>",
  "encrypted\\\\\\\_device\\\\\\\_name": "<Base64URL, ChaCha20-Poly1305暗号文>",
  "device\\\\\\\_public\\\\\\\_key": "<Base64URL, Ed25519公開鍵, 32バイト>",
  "created\\\\\\\_at\\\\\\\_ms": 1722837600000,
  "signature": "<Base64URL, Ed25519署名>"
}
```

|フィールド|型|説明|
|-|-|-|
|`protocol\\\\\\\_version`|String|常に `"2.0"`|
|`chain\\\\\\\_id`|String|所属チェーンのchain\_id|
|`device\\\\\\\_id`|String|端末固有のUUIDv7 (永続)|
|`encrypted\\\\\\\_device\\\\\\\_name`|String|端末名をChaCha20-Poly1305で暗号化したBase64URL|
|`device\\\\\\\_public\\\\\\\_key`|String|Ed25519公開鍵のBase64URL (32バイト)|
|`created\\\\\\\_at\\\\\\\_ms`|Integer|端末参加時刻 (Unix ms)|
|`signature`|String|Ed25519署名のBase64URL|

> \\\\\\\[!NOTE]
> デバイスレコードはサーバーに対してUPSERTで送信されます。同じ `device\\\\\\\_id` での再送信は端末名・公開鍵・署名を更新します（自己修復機能に利用）。

### 4.3 データペイロード (DataPayload)

`encrypted\\\\\\\_payload` を復号した結果のJSON構造。実装ソース: `PallaSyncModels.kt`

```json
{
  "schema": "<スキーマ識別子>",
  "entity\\\\\\\_id": "<エンティティID>",
  "operation": "upsert",
  "context": {},
  "lamport": 42,
  "created\\\\\\\_at\\\\\\\_ms": 1722837600000,
  "body": "<スキーマ固有のJSONElement>"
}
```

|フィールド|型|説明|
|-|-|-|
|`schema`|String|データ種別識別子|
|`entity\\\\\\\_id`|String|対象エンティティの識別子|
|`operation`|String|`"upsert"` または `"delete"`|
|`context`|Object|ランポートクロックのコンテキスト（現在は空マップ）|
|`lamport`|Integer|ランポート論理時計（チェーン単位で単調増加）|
|`created\\\\\\\_at\\\\\\\_ms`|Integer|レコード生成時刻 (Unix ms)|
|`body`|JsonElement|スキーマ固有のペイロード|

\---

## 5\. スキーマ定義 (Collections)

実装ソース: `SettingsStoreRoom.kt`, `PallaSyncEventApplier.kt`

### 5.1 スキーマ識別子一覧

|`schema` / `collection\\\\\\\_name`|用途|
|-|-|
|`pallasync.device/1`|デバイス削除通知|
|`palleria.chain`|チェーン削除通知|
|`palleria.favorite\\\\\\\_tag/1`|お気に入りタグ一覧|
|`palleria.search\\\\\\\_history/1`|検索履歴|
|`palleria.mute\\\\\\\_settings/1`|ミュート設定|
|`palleria.view\\\\\\\_history/1`|閲覧履歴|

### 5.2 `palleria.favorite\\\\\\\_tag/1`

`entity\\\\\\\_id`: `"user\\\\\\\_favorite\\\\\\\_tags"`

```json
{ "body": \\\\\\\["tag1", "tag2", "tag3"] }
```

**競合解決**: 受信リストとローカルリストを `distinct()` でマージ。

### 5.3 `palleria.search\\\\\\\_history/1`

`entity\\\\\\\_id`: `"user\\\\\\\_search\\\\\\\_history"`

```json
{ "body": \\\\\\\["query1", "query2"] }
```

**競合解決**: 受信リストとローカルリストを `distinct()` でマージ後、`MAX\\\\\\\_SEARCH\\\\\\\_HISTORY` 件に切り詰め。

### 5.4 `palleria.mute\\\\\\\_settings/1`

`entity\\\\\\\_id`: `"user\\\\\\\_mute\\\\\\\_settings"`

```json
{
  "body": {
    "mutedTags": \\\\\\\["tag1"],
    "mutedUsers": \\\\\\\["12345678"],
    "mutedIllusts": \\\\\\\["87654321"]
  }
}
```

> \\\\\\\[!NOTE]
> `mutedUsers` / `mutedIllusts` の値は数値IDを\\\\\\\*\\\\\\\*文字列化\\\\\\\*\\\\\\\*して格納します。

**競合解決**: 各フィールドで `distinct()` マージ。

### 5.5 `palleria.view\\\\\\\_history/1`

`entity\\\\\\\_id`: `"user\\\\\\\_view\\\\\\\_history"`

```json
{
  "body": {
    "seenFeedIllusts": \\\\\\\["123456", "789012"],
    "viewedIllusts": \\\\\\\[
      {
        "id": "123456",
        "title": "作品タイトル",
        "artistName": "作者名",
        "imageUrl": "https://...",
        "pageCount": "1",
        "type": "illust"
      }
    ]
  }
}
```

> \\\\\\\[!IMPORTANT]
> `seenFeedIllusts`、`viewedIllusts\\\\\\\[].id`、`viewedIllusts\\\\\\\[].pageCount` はすべて\\\\\\\*\\\\\\\*文字列型\\\\\\\*\\\\\\\*で格納します（数値型ではありません）。  
> アップロード時は直近 \\\\\\\*\\\\\\\*50件\\\\\\\*\\\\\\\* に切り詰めます（ペイロードサイズ制限）。

**競合解決**: `seenFeedIllusts` は `distinct()` マージ。`viewedIllusts` は `id` で `distinctBy` 後 `MAX\\\\\\\_VIEW\\\\\\\_HISTORY` 件に切り詰め。

### 5.6 `pallasync.device/1`

`entity\\\\\\\_id`: 削除対象の `device\\\\\\\_id`

```json
{ "operation": "delete", "body": {} }
```

受信側: ローカルDBから対象デバイスを削除する。

### 5.7 `palleria.chain`

`entity\\\\\\\_id`: 削除対象の `chain\\\\\\\_id`

```json
{ "operation": "delete", "body": {} }
```

受信側: `deleteChain(callApi = false)` を実行してローカルのチェーンデータをすべて削除し、バックグラウンド同期を停止する。

\---

## 6\. サーバーAPI

実装ソース: `PallaSync/src/api/sync.rs`, `main.rs`

サーバーは **Dumb Server** として動作します。サーバーは暗号文のみを保存・転送し、署名検証・権限管理・認可制御を一切行いません。

### 6.1 エンドポイント一覧

|メソッド|パス|用途|
|-|-|-|
|`POST`|`/pallasync/v2/chains/:chain\\\\\\\_id/records`|同期レコードの送信|
|`GET`|`/pallasync/v2/chains/:chain\\\\\\\_id/records`|同期レコードの取得|
|`POST`|`/pallasync/v2/chains/:chain\\\\\\\_id/devices`|デバイスレコードの登録・更新|
|`GET`|`/pallasync/v2/chains/:chain\\\\\\\_id/devices`|デバイス一覧の取得|
|`DELETE`|`/pallasync/v2/chains/:chain\\\\\\\_id`|チェーンの削除|

### 6.2 `POST /pallasync/v2/chains/:chain\\\\\\\_id/records`

同期レコードをサーバーに送信します。複数のレコードをJSON配列でまとめて送信できます。

**リクエストボディ**: `SyncRecord` の配列 (JSON Array)

**レスポンス**:

* `200 OK`: 受理
* `400 Bad Request`: 必須フィールド欠如
* `410 Gone`: チェーンが削除済み

**サーバー処理**: `INSERT OR IGNORE` (主キー `(chain\\\\\\\_id, record\\\\\\\_id)` 重複は無視)

> \\\\\\\[!IMPORTANT]
> サーバーは署名を検証しません。クライアントが受信時に検証する責務を持ちます（現行実装では省略中）。

### 6.3 `GET /pallasync/v2/chains/:chain\\\\\\\_id/records`

**クエリパラメータ**:

* `since\\\\\\\_ms` (Integer, optional, default=0): このUnixミリ秒よりも `created\\\\\\\_at\\\\\\\_ms` が大きいレコードのみ返す

**レスポンスボディ**: `SyncRecord` の配列 (JSON Array), `created\\\\\\\_at\\\\\\\_ms ASC` でソート済み

**レスポンス**: `200 OK` / `410 Gone`

### 6.4 `POST /pallasync/v2/chains/:chain\\\\\\\_id/devices`

**リクエストボディ**: 単一の `DeviceRecord` (JSON Object)

**サーバー処理**: `INSERT ... ON CONFLICT(chain\\\\\\\_id, device\\\\\\\_id) DO UPDATE`（UPSERT）。同じ `device\\\\\\\_id` の再送信は `encrypted\\\\\\\_device\\\\\\\_name`、`device\\\\\\\_public\\\\\\\_key`、`signature` を更新します。

**レスポンス**: `200 OK` / `400 Bad Request` / `410 Gone`

### 6.5 `GET /pallasync/v2/chains/:chain\\\\\\\_id/devices`

**レスポンスボディ**: `DeviceRecord` の配列 (JSON Array)

**レスポンス**: `200 OK` / `410 Gone`

### 6.6 `DELETE /pallasync/v2/chains/:chain\\\\\\\_id`

**サーバー処理**:

1. `deleted\\\\\\\_chains` テーブルに `chain\\\\\\\_id` を記録 (`INSERT OR IGNORE`)
2. `sync\\\\\\\_records` から当該 `chain\\\\\\\_id` の全レコードを削除
3. `device\\\\\\\_records` から当該 `chain\\\\\\\_id` の全レコードを削除

以降、このチェーンへの `GET/POST` リクエストは `410 Gone` を返します。

**レスポンス**: `200 OK`

\---

## 7\. サーバーデータベーススキーマ

実装ソース: `PallaSync/src/db/schema.sql`

```sql
CREATE TABLE IF NOT EXISTS sync\\\\\\\_records (
    chain\\\\\\\_id          TEXT    NOT NULL,
    record\\\\\\\_id         TEXT    NOT NULL,
    collection\\\\\\\_name   TEXT    NOT NULL,
    action            TEXT    NOT NULL,
    encrypted\\\\\\\_payload TEXT    NOT NULL,
    device\\\\\\\_id         TEXT    NOT NULL,
    created\\\\\\\_at\\\\\\\_ms     INTEGER NOT NULL,
    signature         TEXT    NOT NULL,
    PRIMARY KEY (chain\\\\\\\_id, record\\\\\\\_id)
);

CREATE TABLE IF NOT EXISTS device\\\\\\\_records (
    chain\\\\\\\_id              TEXT    NOT NULL,
    device\\\\\\\_id             TEXT    NOT NULL,
    encrypted\\\\\\\_device\\\\\\\_name TEXT    NOT NULL,
    device\\\\\\\_public\\\\\\\_key     TEXT    NOT NULL,
    created\\\\\\\_at\\\\\\\_ms         INTEGER NOT NULL,
    signature             TEXT    NOT NULL,
    PRIMARY KEY (chain\\\\\\\_id, device\\\\\\\_id)
);

CREATE TABLE IF NOT EXISTS deleted\\\\\\\_chains (
    chain\\\\\\\_id      TEXT    PRIMARY KEY,
    deleted\\\\\\\_at\\\\\\\_ms INTEGER NOT NULL
);
```

\---

## 8\. クライアントの動作

実装ソース: `PalleriaSyncManager.kt`

### 8.1 同期チェーン作成 (Genesis)

```
seedPhrase = generateSeedPhrase()   // BIP39 24単語
saveSeedPhrase(seedPhrase)          // ローカル保存
joinChain(seedPhrase)               // 自身を参加者として登録
```

### 8.2 同期チェーン参加 (Join)

```
1. PallaSyncCore.deriveKeys(seedPhrase)
   → chain\\\\\\\_id, encryption\\\\\\\_key, signing\\\\\\\_key, public\\\\\\\_key

2. keystore.saveEpochKey(encryption\\\\\\\_key)
   keystore.saveDevicePrivateKey(signing\\\\\\\_key)
   keystore.saveDeviceSignPublicKey(public\\\\\\\_key)
   keystore.saveDeviceId(deviceId)  // 既存がなければUUIDv7新規生成

3. PallaSyncCore.createDeviceRecord(
       chain\\\\\\\_id, device\\\\\\\_id, Build.MODEL,
       encryption\\\\\\\_key, signing\\\\\\\_key)
   → DeviceRecord JSON

4. POST /pallasync/v2/chains/:chain\\\\\\\_id/devices (デバイス登録)

5. ローカルDB: chain\\\\\\\_stateにchain\\\\\\\_idとlamport=0を記録

6. fetchDevices() + startBackgroundSync()
```

### 8.3 バックグラウンド同期ループ

5秒間隔で以下を繰り返します:

```
while active:
    processOutbox()        // キューに溜まったレコードを送信
    fetchRecords(sinceMs)  // 新着レコードを取得・処理
    fetchDevices()         // デバイス一覧を更新
```

`fetchRecords()` または `fetchDevices()` が `410 Gone` / `404 Not Found` を返した場合、チェーンが削除されたと判断し、`deleteChain(callApi = false)` を実行してローカルデータを自動削除します。

### 8.4 アウトボックス処理 (processOutbox)

```
events = db.getQueuedEvents()
for each (chain\\\\\\\_id, events\\\\\\\_group):
    body = "\\\\\\\[" + events\\\\\\\_group.joinToString(",") { it.eventJson } + "]"
    success = POST /pallasync/v2/chains/:chain\\\\\\\_id/records
    if success:
        events.forEach { mark as "accepted" }
```

### 8.5 同期レコードの作成とキュー登録 (enqueueDataEvent)

```
lamport = chain\\\\\\\_state.lamport + 1
db.updateChainState(lamport)

payload = DataPayload(schema, entity\\\\\\\_id, operation, {}, lamport, now, body)
payloadJson = JSON.encode(payload)

nonce = derive\\\\\\\_record\\\\\\\_nonce(record\\\\\\\_id)
encrypted = ChaCha20Poly1305.encrypt(
    key=encryption\\\\\\\_key, nonce=nonce,
    msg=payloadJson, aad=b"PALLASYNC-AAD-v2")

record = SyncRecord(...)
record\\\\\\\_jcs = JCS(record - {signature})
hash = SHA-256(record\\\\\\\_jcs)
record.signature = Base64URL(Ed25519.sign(signing\\\\\\\_key, hash))

db.insertOutboxEvent(record)
```

### 8.6 受信レコードの処理 (processIncomingSyncRecord)

```
1. SyncRecord を JSON パース
2. nonce = derive\\\\\\\_record\\\\\\\_nonce(record.record\\\\\\\_id)
   plaintext = ChaCha20Poly1305.decrypt(
       key=encryption\\\\\\\_key, nonce=nonce,
       ciphertext=Base64URL.decode(record.encrypted\\\\\\\_payload),
       aad=b"PALLASYNC-AAD-v2")
3. plaintext を DataPayload として JSON パース
4. PallaSyncEventApplier.applyEvent(payload) でスキーマに応じて処理
```

### 8.7 デバイス一覧の取得と自己修復 (fetchDevices)

```
1. GET /pallasync/v2/chains/:chain\\\\\\\_id/devices

2. 各デバイスのencrypted\\\\\\\_device\\\\\\\_nameを復号:
   nonce = derive\\\\\\\_record\\\\\\\_nonce(device\\\\\\\_id)
   name = ChaCha20Poly1305.decrypt(
       key=encryption\\\\\\\_key, nonce=nonce,
       ciphertext=Base64URL.decode(encrypted\\\\\\\_device\\\\\\\_name),
       aad=b"PALLASYNC-DEVICE-AAD-v2")

   復号失敗かつ自分のデバイスの場合: needSelfHeal = true
   (activeDevicesへの追加は成否に関わらず必ず行う)

3. 自己修復: (!activeDevices.contains(myDeviceId) || needSelfHeal) の場合
   → POST /pallasync/v2/chains/:chain\\\\\\\_id/devices でデバイスレコードを再送信

4. サーバーの一覧に存在しないローカルデバイスをDBから削除
```

> \\\\\\\[!IMPORTANT]
> 自己修復の際、`activeDevices` から自分のIDを削除してはいけません。削除するとステップ4で自分のデバイスがローカルDBから消えてしまいます。自己修復の必要性は `needSelfHeal` フラグで別管理します。

### 8.8 チェーンの削除 (deleteChain)

```
// callApi=true の場合（ホストが削除する場合）:
1. enqueueDataEvent(schema="palleria.chain", operation="delete", body={})
2. processOutbox()      // 即座に他端末へ通知
3. DELETE /pallasync/v2/chains/:chain\\\\\\\_id

// すべての場合:
4. backgroundSyncJob.cancel()
5. db.clearOutboxEvents()
6. db.clearChainStates()
7. db.clearDevices()
8. keystore.clearAllKeys()
```

\---

## 9\. ランポート論理時計

`DataPayload.lamport` はクライアントがローカルの `chain\\\\\\\_state.lamport` に1加算した値を使用します。

> \\\\\\\[!NOTE]
> v2.0現在、競合解決は「受信データとローカルデータの `distinct()` マージ」の単純な実装です。ランポート時計は `DataPayload` に記録されていますが、v2.0では衝突判定には使用されていません（PoC実装）。将来のバージョンで完全なLWW (Last-Write-Wins) / CRDT競合解決に拡張予定です。

\---

## 10\. チェーン削除の伝播

チェーン削除時の全端末への伝播は以下の**二重機構**で実現されます。

1. **同期レコード経由**: 削除端末が `palleria.chain` スキーマの `delete` レコードをアウトボックスに積み即座にプッシュ。他端末はバックグラウンドポーリング時にこのレコードを受信し `deleteChain(callApi = false)` を自動実行。
2. **HTTP 410 経由**: サーバー上でチェーン削除後、以後の `GET /records` / `GET /devices` が `410 Gone` を返す。クライアントはこのステータスを受け取った時点でも `deleteChain(callApi = false)` を自動実行。

\---

## 11\. セキュリティ上の注意事項

### 11.1 ノンスの再利用

同一の `record\\\\\\\_id`（または `device\\\\\\\_id`）に対してノンスは決定論的に固定です。**同じ `record\\\\\\\_id` で異なるコンテンツを暗号化してはいけません**。サーバーは `INSERT OR IGNORE` でレコードを保存するため、同じ `record\\\\\\\_id` の上書きは無視されます。クライアントは必ずレコードごとに新しいUUIDv7を生成してください。

### 11.2 署名検証

現行実装ではサーバー側・クライアント受信側ともに署名検証を実施していません（PoC）。本番環境では受信レコードの署名をデバイス公開鍵で検証する必要があります。

### 11.3 シードフレーズ管理

シードフレーズは同期チェーンへの完全なアクセス権を持ちます。第三者と共有してはいけません。

### 11.4 鍵ローテーション

v2.0には鍵ローテーション機能がありません。シードフレーズが漏洩した場合は新しいチェーンを作成してすべての端末を再参加させてください。

### 11.5 前方秘匿性 (PFS)

v2.0はエポック鍵（シードフレーズから固定導出）のみを使用するため完全な前方秘匿性はありません。鍵が漏洩した場合、過去のすべての同期レコードが復号可能になります。

\---

## 12\. 実装リファレンス

|コンポーネント|言語|場所|
|-|-|-|
|Dumb Server|Rust (Axum + SQLite)|`PallaSync/`|
|Cryptographic Core (Android JNI)|Rust|`Palleria/rust/pallasync-core/`|
|Android Client|Kotlin|`Palleria/app/.../pallasync/`|

|ファイル|役割|
|-|-|
|`pallasync-core/src/crypto.rs`|暗号プリミティブ実装|
|`pallasync-core/src/models.rs`|`SyncRecord`, `DeviceRecord` 構造体|
|`pallasync-core/src/ffi\\\\\\\_jni.rs`|Android JNIバインディング|
|`PallaSync/src/api/sync.rs`|サーバーAPIハンドラ|
|`PallaSync/src/db/schema.sql`|サーバーDBスキーマ|
|`PalleriaSyncManager.kt`|Androidバックグラウンド同期マネージャ|
|`PallaSyncEventApplier.kt`|受信イベントのスキーマ別適用ロジック|
|`PallaSyncModels.kt`|Kotlinデータモデル|
|`PallaSyncKeystore.kt`|鍵の永続化 (EncryptedSharedPreferences)|

\---

## 13\. 変更履歴

|バージョン|日付|変更内容|
|-|-|-|
|2.0.0|2026-08-05|初版。v1.0からの完全な書き直し。BIP39鍵導出、Dumb Serverモデル、ChaCha20-Poly1305 + Ed25519採用、WebRTC廃止。|



