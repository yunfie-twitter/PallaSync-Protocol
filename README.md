# Palleria Sync

Palleria Syncは、ユーザーアカウントを作成せずに複数端末間でデータを同期するための同期システムです。

最初の端末で同期チェーンを作成し、QRコードまたは同期コードを使って別の端末を参加させます。同期データはクライアント側で暗号化され、Syncサーバーはデータの内容を読み取らず、暗号化された変更データの保存と配送のみを行います。

P2P接続が可能な場合は端末間で直接同期し、直接接続できない場合はSyncサーバーまたはリレー接続へフォールバックします。

## 設計目標

- アカウント登録を必要としない
- QRコードまたは同期コードで端末を追加できる
- 同期データをエンドツーエンド暗号化する
- Syncサーバーが同期内容を読み取れない
- LANおよびインターネット経由のP2P同期に対応する
- P2P接続失敗時にサーバー同期へフォールバックする
- 差分同期により通信量を削減する
- 複数端末による同時変更を安全に処理する
- 端末の追加、削除、失効を管理できる
- 同じ変更を複数回受信してもデータが壊れない

## 全体構成

Palleria Syncは、次の3要素で構成されます。

### 端末

各端末は、同期データの暗号化、復号、署名、競合解決を行います。

- 端末A
- 端末B
- その他の参加端末

### P2P同期

端末同士が直接接続できる場合は、Syncサーバーを経由せずに差分データを交換します。

- 同一LAN内での直接同期
- インターネット経由の直接同期
- 大容量データの端末間転送

### Palleria Sync Server

直接接続できない場合や、同期先の端末がオフラインの場合に使用します。

- 暗号化済み変更データの保存
- 同期カーソルの管理
- 端末公開鍵の管理
- P2P接続のシグナリング
- P2P接続失敗時のフォールバック
- オフライン端末向けの差分保管

### 接続関係

- 端末Aと端末Bが直接接続できる場合は、P2Pで同期します。
- 直接接続できない場合は、リレーまたはSyncサーバーを使用します。
- 片方の端末がオフラインの場合は、Syncサーバーへ暗号化済みの変更を保存します。
- オフラインだった端末は、再接続時にSyncサーバーから未取得の変更を受信します。

## 同期チェーン

同期対象となる端末のグループを「同期チェーン」と呼びます。

同期チェーンはユーザーアカウントの代わりとなる論理的な単位です。各同期チェーンには固有の識別子と暗号鍵が存在します。

```text
Sync Chain
├── Chain ID
├── Chain Encryption Key
├── Authentication Secret
├── Devices
├── Records
└── Change Log
```

最初の端末が同期チェーンを作成し、他の端末は既存端末から発行された招待情報を使って参加します。

## 鍵構成

最初の端末は、暗号学的に安全な乱数生成器を使用して32バイト以上の同期シードを生成します。

同期シードから、HKDFなどの鍵導出関数を使用して用途ごとの鍵を生成します。

```text
Sync Seed
├── Chain ID Key
├── Data Encryption Key
├── Authentication Key
└── Recovery Key
```

用途の異なる処理で同一の鍵を直接使い回してはいけません。

各端末は、同期チェーン共通の暗号鍵とは別に、端末固有の署名鍵ペアを生成します。

```text
Device
├── Device ID
├── Device Name
├── Public Key
├── Private Key
├── Created At
└── Revoked At
```

秘密鍵は端末外へ送信しません。

## 同期チェーンの作成

最初の端末で同期を有効にすると、次の処理を行います。

1. 同期シードを生成する
2. 同期チェーンIDを生成する
3. データ暗号鍵を導出する
4. 端末固有の署名鍵ペアを生成する
5. Syncサーバーに同期チェーンを作成する
6. 最初の端末の公開鍵を登録する
7. リカバリーコードを生成する

Syncサーバーには、データ暗号鍵や端末秘密鍵を送信しません。

## 端末の追加

新しい端末は、既存端末が発行したQRコードまたは同期コードを使用して同期チェーンへ参加します。

推奨する追加手順は次のとおりです。

```text
既存端末
  │
  ├─ 一回限りの招待トークンを発行
  ├─ QRコードを表示
  │
  ▼
新規端末
  │
  ├─ QRコードを読み取る
  ├─ 端末固有の鍵ペアを生成
  ├─ 参加要求を送信
  │
  ▼
既存端末
  │
  ├─ 新規端末の名前と公開鍵を確認
  ├─ 参加を承認
  └─ チェーン鍵を新規端末向けに暗号化
```

招待トークンには、次の制約を設けます。

- 一回限り使用可能
- 短い有効期限
- 使用後は即時失効
- 同期チェーン単位で発行
- 推測困難な十分な長さ
- サーバーにはハッシュ化して保存

QRコードの概念的な内容は次のとおりです。

```json
{
  "version": 1,
  "server": "https://sync.example.com",
  "chainId": "chain_xxxxxxxxx",
  "inviteToken": "xxxxxxxxxxxxxxxx",
  "expiresAt": 1785580200
}
```

同期チェーンの暗号鍵を、そのままQRコードへ含める設計は推奨しません。

## 接続方式

端末間同期では、次の順序で接続を試行します。

```text
1. 同一LAN内の直接接続
2. インターネット経由のP2P接続
3. TURNまたは専用リレー
4. Syncサーバー経由の非同期同期
```

### LAN接続

同一LAN内では、Android Network Service Discovery、mDNS、DNS-SDなどを使用して端末を発見します。

発見情報には秘密情報を含めず、次のような最小限の情報だけを広告します。

```text
Service Type
Protocol Version
Temporary Peer ID
Connection Port
```

同期チェーンIDを平文でLANへ広告しないことを推奨します。

### インターネットP2P接続

インターネット経由では、STUNを使用して外部アドレスとNAT状態を確認し、UDPホールパンチングを試行します。

接続確立には、WebRTCまたはQUICベースの独自プロトコルを使用できます。

Syncサーバーは接続候補情報の交換のみを仲介します。

### リレー接続

直接接続できない場合は、TURNまたは専用リレーを使用します。

リレーサーバーは通信内容を復号できない設計とします。

### サーバー同期

端末同士が同時にオンラインでない場合は、Syncサーバーへ暗号化済みの変更データを保存します。

後からオンラインになった端末は、前回の同期カーソル以降の変更を取得します。

## 同期対象データ

初期実装では、次のデータを同期対象とします。

- ブックマーク
- 閲覧履歴
- 検索履歴
- アプリ設定
- ミュート設定
- フォロー関連のローカル情報
- ダウンロード情報
- 同期対象データの削除状態

画像、動画、サムネイル、キャッシュなどの大容量データは、原則として通常のSyncサーバーへ保存しません。

大容量データは、同一LANまたはP2P接続時のみ転送可能とします。

## レコード形式

同期対象となる各データをレコードとして扱います。

```json
{
  "recordId": "bookmark_01JXXXXXXX",
  "recordType": "bookmark",
  "operation": "update",
  "revision": 14,
  "baseRevision": 13,
  "deviceId": "device_01JXXXXXXX",
  "timestamp": "2026-08-01T10:00:00Z",
  "nonce": "base64-encoded-nonce",
  "ciphertext": "base64-encoded-ciphertext"
}
```

サーバーが扱う情報は最小限にします。

```text
chainId
recordId
recordType
revision
serverSequence
deviceId
ciphertext
nonce
createdAt
```

可能な限り、作品ID、URL、タイトル、タグ、検索語なども暗号化します。

## レコード識別子

各レコードには、端末間で重複しない識別子を使用します。

推奨形式はUUIDv7またはULIDです。

```text
bookmark_01JXXXXXXXXXXXXXXXXXXXXXXX
history_01JXXXXXXXXXXXXXXXXXXXXXXXX
setting_01JXXXXXXXXXXXXXXXXXXXXXXXX
```

データベースのローカル連番を、そのまま同期用IDとして使用してはいけません。

## 差分同期

毎回すべてのデータを送受信せず、変更されたレコードのみを同期します。

Syncサーバーは、同期チェーンごとに単調増加するサーバーシーケンス番号を割り当てます。

```text
sequence 101: Device A updated bookmark X
sequence 102: Device B deleted history Y
sequence 103: Device A updated setting Z
```

端末は最後に取得したシーケンス番号を同期カーソルとして保存します。

```json
{
  "cursor": 103
}
```

次回同期時は、カーソルより後の変更のみを取得します。

```http
GET /v1/sync/changes?cursor=103
```

大量の変更がある場合はページ分割します。

## Push処理

```http
POST /v1/sync/push
```

```json
{
  "requestId": "req_01JXXXXXXXX",
  "deviceId": "device_01JXXXXXXXX",
  "changes": [
    {
      "recordId": "bookmark_01JXXXXXXXX",
      "recordType": "bookmark",
      "operation": "update",
      "baseRevision": 12,
      "revision": 13,
      "nonce": "...",
      "ciphertext": "..."
    }
  ]
}
```

`requestId`は冪等性キーとして使用します。

同じ`requestId`を複数回受信した場合、サーバーは同じ処理結果を返し、変更を重複登録しません。

## Pull処理

```http
GET /v1/sync/pull?cursor=103&limit=500
```

```json
{
  "changes": [
    {
      "serverSequence": 104,
      "recordId": "bookmark_01JXXXXXXXX",
      "recordType": "bookmark",
      "revision": 14,
      "deviceId": "device_01JXXXXXXXX",
      "nonce": "...",
      "ciphertext": "..."
    }
  ],
  "nextCursor": 104,
  "hasMore": false
}
```

端末は変更の復号、検証、ローカルDBへの適用が完了した後にカーソルを更新します。

## 削除処理

同期済みデータを削除する場合、レコードを即座に完全削除してはいけません。

削除操作はTombstoneとして同期します。

```json
{
  "recordId": "history_01JXXXXXXXX",
  "recordType": "history",
  "operation": "delete",
  "revision": 8,
  "deletedAt": "2026-08-01T10:00:00Z"
}
```

Tombstoneを使用しない場合、長期間オフラインだった端末から削除済みデータが復活する可能性があります。

## 競合処理

複数端末が同じレコードを変更した場合、競合として扱います。

競合判定には`baseRevision`を使用します。

### 設定

設定項目は、原則としてLast Write Winsを使用します。

### 閲覧履歴

同一作品の閲覧履歴は、より新しい閲覧時刻を優先します。異なる作品の履歴は統合します。

### ブックマーク

ブックマーク追加同士は統合します。片方が削除、片方が更新の場合は、revisionと操作時刻を比較します。

### コレクション

コレクション内の項目は、項目単位で追加と削除を管理します。配列全体を上書きしない設計を推奨します。

### 解決不能な競合

自動解決できない競合は、両方の暗号化レコードを保持し、クライアント側でユーザーに選択させます。

## 暗号化

同期データはクライアント側で暗号化します。

推奨方式:

- XChaCha20-Poly1305
- AES-256-GCM

暗号化時は、レコードごとに一意なnonceを生成します。同じ鍵とnonceの組み合わせを再利用してはいけません。

Additional Authenticated Dataには、次の情報を含めることを推奨します。

```text
protocolVersion
chainId
recordId
recordType
revision
deviceId
```

## 通信認証

各端末は、端末固有の秘密鍵でAPIリクエストへ署名します。

署名対象には次の情報を含めます。

```text
HTTP Method
Request Path
Request Body Hash
Timestamp
Nonce
Device ID
Chain ID
```

概念的な認証ヘッダー:

```http
Authorization: PalleriaSync deviceId="device_xxx", timestamp="1785579000", nonce="xxxx", signature="xxxx"
```

サーバーは登録済みの端末公開鍵を使用して署名を検証します。

## 端末管理

各端末について、次の情報を管理します。

- 端末ID
- 表示名
- OS
- アプリバージョン
- 公開鍵
- 登録日時
- 最終接続日時
- 失効状態

## 端末削除

端末を同期チェーンから削除した場合、サーバー上の端末公開鍵を失効させます。

高い安全性が必要な場合は、端末削除時にチェーン暗号鍵をローテーションします。

```text
1. 新しいチェーン暗号鍵を生成
2. 有効な各端末の公開鍵で新しい鍵を暗号化
3. 有効端末へ配布
4. 新規レコードは新しい鍵で暗号化
5. 古い鍵を段階的に廃止
```

## リカバリー

同期コードはアカウントの代わりとなります。

同期コードとすべての参加端末を失った場合、同期データを復元できません。

```text
この同期コードはアカウントの代わりになります。

同期コードとすべての端末を失うと、
同期データを復元できません。

同期コードを他人へ共有しないでください。
```

AndroidではAndroid Keystore、WindowsではDPAPIなどを使用して秘密情報を保存します。

## P2P同期手順

P2P接続が確立した端末は、最初に同期状態を交換します。

```json
{
  "deviceId": "device_xxx",
  "protocolVersion": 1,
  "cursor": 104,
  "supportedRecordTypes": [
    "bookmark",
    "history",
    "setting"
  ]
}
```

P2P同期で交換した変更も、必要に応じてSyncサーバーへアップロードします。

## サーバーの役割

- 同期チェーンの管理
- 端末公開鍵の管理
- 招待トークンの管理
- 暗号化済み変更データの保管
- サーバーシーケンスの発行
- 同期カーソルによる差分配信
- P2P接続候補の仲介
- 端末失効の管理
- レート制限
- 不正リクエストの拒否

Syncサーバーは、次の情報を保持しません。

- 平文の同期データ
- チェーン暗号鍵
- 端末秘密鍵
- リカバリーコード
- ユーザーのログインパスワード

## API

### チェーン作成

```http
POST /v1/chains
```

### 招待作成

```http
POST /v1/chains/{chainId}/invites
```

### チェーン参加

```http
POST /v1/chains/{chainId}/join
```

### 参加承認

```http
POST /v1/chains/{chainId}/join/{requestId}/approve
```

### 変更送信

```http
POST /v1/sync/push
```

### 変更取得

```http
GET /v1/sync/pull?cursor={cursor}
```

### 端末一覧

```http
GET /v1/chains/{chainId}/devices
```

### 端末失効

```http
DELETE /v1/chains/{chainId}/devices/{deviceId}
```

### シグナリング

```http
POST /v1/peers/offer
POST /v1/peers/answer
POST /v1/peers/candidates
```

### チェーン削除

```http
DELETE /v1/chains/{chainId}
```

## オフライン動作

クライアントはオフライン中の変更をローカルキューへ保存します。

```text
Pending
Sending
Acknowledged
Conflict
Failed
```

ネットワーク接続が復旧したら、未送信変更を古い順に再送します。

## エラー処理

```text
NETWORK_ERROR
AUTHENTICATION_FAILED
DEVICE_REVOKED
CHAIN_NOT_FOUND
INVITE_EXPIRED
INVITE_ALREADY_USED
REVISION_CONFLICT
DECRYPTION_FAILED
UNSUPPORTED_PROTOCOL
RATE_LIMITED
SERVER_ERROR
```

復号に失敗したデータを無視してカーソルだけ進めてはいけません。

## プロトコルバージョン

すべてのリクエストと同期レコードにプロトコルバージョンを含めます。

```json
{
  "protocolVersion": 1
}
```

## 制限

- 1チェーンあたりの端末数上限
- 1リクエストあたりの変更件数上限
- 1レコードあたりの最大サイズ
- 1チェーンあたりの保存容量上限
- 1分あたりのAPIリクエスト数上限
- 1日あたりのリレー通信量上限

## セキュリティ要件

- TLS 1.3またはTLS 1.2以降
- クライアント側E2EE
- 端末ごとの署名鍵
- リクエスト署名
- nonceによるリプレイ防止
- タイムスタンプ検証
- 招待トークンの短期失効
- 招待トークンの一回限り利用
- APIレート制限
- リクエストサイズ制限
- 端末失効
- 監査ログ
- 暗号鍵の安全なローカル保存
- 暗号学的に安全な乱数生成

独自暗号アルゴリズムは実装せず、十分に検証された暗号ライブラリを使用します。

## プライバシー

Syncサーバーは同期内容を復号できませんが、次のメタデータを観測できる可能性があります。

- 接続元IPアドレス
- 接続時刻
- 同期チェーンID
- 端末数
- 暗号化レコードのサイズ
- 同期頻度
- 通信量

## 実装段階

### Phase 1

- 同期チェーン作成
- QRコードによる端末追加
- 端末固有の鍵ペア
- サーバー経由の差分同期
- ブックマーク同期
- 閲覧履歴同期
- 設定同期
- Tombstone
- 端末一覧
- 端末失効

### Phase 2

- LAN内端末発見
- LAN直接同期
- 同期状態表示
- 競合ログ
- 大容量データのLAN転送

### Phase 3

- STUNによるNAT判定
- インターネットP2P同期
- TURNまたは専用リレー
- P2Pシグナリング
- 接続経路の自動選択

### Phase 4

- チェーン暗号鍵のローテーション
- 高度な競合解決
- 複数世代の鍵管理
- データ圧縮
- 変更ログの安全な圧縮
- 複数Syncサーバー対応

## 非目標

- VPN機能
- 一般的なファイル共有サービス
- 任意の第三者との公開共有
- サーバー側での同期データ検索
- サーバー側での同期データ分析
- パスワードによるユーザーアカウント管理
- 無制限のクラウドストレージ

## ライセンス

このプロジェクトのライセンスは、リポジトリ内の`LICENSE`を参照してください。

## 注意事項

Palleria Syncは、同期コードまたは既存端末を所有していることを同期チェーンへの参加条件とします。

同期コードを第三者へ渡した場合、その第三者が同期データへアクセスできる可能性があります。

同期コードはパスワードと同様に安全に保管してください。
