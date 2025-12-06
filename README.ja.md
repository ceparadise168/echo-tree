# Echo Tree: モダンなクラウドアプリケーションショーケース

Echo Tree へようこそ！このプロジェクトは 3D 体験にとどまらず、最新のクラウドアーキテクチャ、DevOps、そして自動化されたデプロイメントを一体となって実演するデモです。本ドキュメントではアーキテクチャの全体像を説明し、ステップバイステップでデプロイ方法を解説します。

## 🏛️ アーキテクチャ概要

本プロジェクトは **12-Factor App** の原則に基づき、**Serverless-First** の思想で AWS 上に構築されています。すべてのインフラは Terraform によってコード化され、GitHub Actions を用いて自動的にデプロイされます。

### キーコンセプト
- **Infrastructure as Code**：データベースや API、CDN などのリソースはすべて Terraform で定義し、AWS コンソールでの手作業をなくします。
- **CI/CD オートメーション**：`git push main` を行うたびに、自動的にビルド・テスト・デプロイが実行されます。
- **サーバーレスコンピューティング**：バックエンドは AWS Lambda を使用し、サーバー管理不要で自動スケールします。
- **高スケーラビリティ & 低コスト**：トラフィックが少ないときはほぼコストが発生しない従量課金モデルです。

### 技術スタック

| 領域 | 技術 | 役割 |
| :--- | :--- | :--- |
| クラウド基盤 | AWS | すべてのサービスをホストするプラットフォーム |
| フロントエンド | React, Three.js, Vite | 没入型 3D 体験を提供 |
| フロントエンド配信 | S3 + CloudFront | グローバル CDN、HTTPS サポート |
| バックエンド API | API Gateway + Lambda | サーバーレスの REST API |
| データベース | DynamoDB | 高パフォーマンスな NoSQL、Lambda と高い親和性 |
| IaC | Terraform | すべてのリソースをコードで記述 |
| CI/CD | GitHub Actions | 自動ビルド・テスト・デプロイ |

### アーキテクチャ図

```mermaid
graph TD
    subgraph "Development"
        A[Developer] -- "git push" --> B{GitHub}
    end

    subgraph "CI/CD Pipeline (GitHub Actions)"
        B -- "Trigger" --> C{CI/CD Workflow}
        C -- "1. Lint & Test" --> D[Run Tests]
        D -- "2. Build Frontend" --> E[Vite Build]
        E -- "3. Deploy Frontend" --> F[Sync to S3]
        F -- "4. Build & Deploy Backend" --> G[Package Lambda]
        G -- "5. Deploy Infra" --> H[Terraform Apply]
    end

    subgraph "AWS Cloud Environment (Managed by Terraform)"
        I(User) -- "HTTPS" --> J[CloudFront CDN]
        J -- "Static Content" --> K[(S3 Bucket)]
        J -- "API Request /api/*" --> L[API Gateway]
        L -- "Trigger" --> M[Lambda Function]
        M -- "Read/Write Data" --> N[(DynamoDB)]
    end
```

---

## 🚀 デプロイメントガイド（初心者向けステップ別）

以下の手順は経験 0〜2 年程度のジュニアエンジニアでも実践できるよう、可能な限り細かく説明しています。

### フェーズ 1: ローカル環境の準備と手動デプロイ

#### Step 1.1 リポジトリの取得
1. GitHub で本プロジェクトを **Fork** します。
2. ターミナルで以下を実行し、フォークしたリポジトリをクローンします。
   ```bash
   git clone https://github.com/YOUR_USERNAME/echo-tree.git
   cd echo-tree
   ```

#### Step 1.2 必須ツールのインストール
以下をインストールしてください：
- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Node.js v18 以上](https://nodejs.org/en/download/)
- [Terraform CLI v1.5+](https://learn.hashicorp.com/tutorials/terraform/install-cli)
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

#### Step 1.3 AWS 認証情報の設定
1. [AWS コンソール](https://aws.amazon.com/console/) にログインし、IAM サービスを開きます。
2. ユーザーを作成（例: `echo-tree-local-admin`）、ポリシー `AdministratorAccess` を付与します。
3. ユーザー詳細ページの **Security credentials** タブでアクセスキーを作成し、`Access key ID` と `Secret access key` を保存します。
4. ターミナルで以下を実行し、AWS CLI に認証情報を設定します：
   ```bash
   aws configure
   ```
   プロンプトに従ってアクセスキー、リージョン（例: `us-east-1`）などを入力します。

#### Step 1.4 Terraform で初期デプロイ
1. Terraform ディレクトリに移動：
   ```bash
   cd terraform
   ```
2. 初期化（プロバイダーのダウンロード）：
   ```bash
   terraform init
   ```
3. デプロイ（プラン確認後に `yes` と入力）：
   ```bash
   terraform apply
   ```
4. 数分待つと AWS リソースが作成され、最後に `Outputs` が表示されます。
   **ここで `cloudfront_domain_name` や `s3_bucket_name`、`api_gateway_invoke_url` を控えてください。**

---

### フェーズ 2: GitHub Actions と AWS の連携（OIDC）

#### Step 2.1 OIDC プロバイダーの登録
1. IAM サービスで左メニューの **Identity providers** → **Add provider** を開きます。
2. `OpenID Connect` を選択し、以下を入力：
   - Provider URL: `https://token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`

#### Step 2.2 GitHub Actions 用 IAM ロール
1. IAM → **Roles** → **Create role**。
2. Trusted entity として `Web identity` を選び、先ほどの OIDC プロバイダーを指定します。
3. Audience に `sts.amazonaws.com` を選択。
4. GitHub リポジトリ（例: `YOUR_USERNAME/echo-tree`）とブランチ `main` を設定。
5. 権限 `AdministratorAccess` を付与し、`github-actions-echo-tree-role` などの名前で作成。
6. 作成後、ロール詳細画面で **Role ARN** をコピーします。

#### Step 2.3 GitHub シークレットの設定
1. GitHub リポジトリ → **Settings → Secrets and variables → Actions**。
2. 以下のシークレットを追加：
   - `AWS_IAM_ROLE_ARN`: ロール ARN。
   - `S3_BUCKET_NAME`: Terraform 出力の S3 バケット名。
   - `CLOUDFRONT_DISTRIBUTION_ID`: CloudFront のディストリビューション ID。

---

### フェーズ 3: フロントエンドを API に接続し、本番環境へ

#### Step 3.1 フロントエンドコードの更新
1. `app/src/App.jsx` を開きます。
2. `seedCardsData` を読み込む `useEffect` を、API 呼び出しに差し替えます。
3. Terraform 出力の `api_gateway_invoke_url` を利用し、以下のように修正します：

```javascript
const API_URL = "PASTE_YOUR_API_GATEWAY_INVOKE_URL_HERE/cards";

useEffect(() => {
  const fetchAllCards = async () => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const fetchedCards = await response.json();
      const processed = fetchedCards.map(card => ({
        ...card,
        position: [
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 15,
        ],
        colorObj: new THREE.Color(card.color),
      }));
      setUserCards(processed);
    } catch (error) {
      console.error('Failed to fetch cards:', error);
    }
  };
  fetchAllCards();
}, []);
```

`handleCardSubmit` も `API_URL` に対して `POST` を行うよう更新し、戻り値をシーンに追加します。

#### Step 3.2 Push して CI/CD を確認
1. 変更を保存し、以下を実行：
   ```bash
   git add app/src/App.jsx
   git commit -m "feat: connect frontend to live API"
   git push origin main
   ```
2. GitHub の **Actions** タブを開き、ワークフローが動いていることを確認します。
   - フロントエンドをビルドして S3 に同期。
   - バックエンドを zip 化して Lambda へ更新。
   - Terraform でインフラを apply。
   - CloudFront のキャッシュを無効化。
3. 成功 (緑色) になったら、`cloudfront_domain_name` をブラウザで開きます。

**これで Echo Tree が本番環境で稼働を開始しました！** 以降は `main` ブランチへ push するたびに、自動デプロイが行われます。

---

お疲れさまでした。これでサーバーレス + IaC + CI/CD をフル活用した最新アーキテクチャを実装できました。オールハンズ・ミーティングでのライブデモも安心して臨んでください！
