# Pages公開前の最小検証パッチ

基準コミット: `beadcd3dfefb929d054686e5226b0322855cae2b`

## 変更

- 追加: `.github/scripts/validate_pages.py`（Python標準ライブラリのみ）
- 追加: `.github/scripts/test_validate_pages.py`（13テスト、複数の異常ケース）
- 追加: この検証仕様書
- 変更: `.github/workflows/pages.yml`に次の5行だけを追加

```diff
       - name: Setup Pages
         uses: actions/configure-pages@v5
         with:
           enablement: true

+      - name: Validate site before upload
+        run: |
+          python3 -m unittest discover -s .github/scripts -p "test_validate_pages.py" -v
+          python3 .github/scripts/validate_pages.py . --base-path /Minamitane-life-demo/
+
       - name: Upload site
         uses: actions/upload-pages-artifact@v3
         with:
           path: "."
```

Checkout → Setup Pages → Validate → Upload → Deploy。
トリガー、権限、同時実行制御、environment、actionsのバージョン、Uploadのpathは維持。
continue-on-error、always()は追加しない。失敗は終了コード1。
GitHub Actionsの標準の成功条件により後続Upload・Deployを実行しない。
Pythonは既存のubuntu-latestにあるpython3を使用し、依存インストールは不要。
追加物はすべて.github配下。既存Upload actionの隠しファイル除外対象。

## 検査ロジック

1. ルートindex.htmlが通常ファイルとして存在し、空白だけでないこと。
2. 公開対象の隠しディレクトリ以外の*.htmlをUTF-8として読み取る。
3. HTMLParserで静的なsrc/hrefを抽出。HTMLエンティティ、URLのpercent encodingを扱う。
4. 外部HTTP(S)、//host、data、blob、mailto、tel、javascript、空値、同一ページfragmentはローカル存在検査から除外。外部疎通は行わない。
5. queryとfragmentを外して、相対パスは各HTMLの親から解決。ディレクトリ参照にはindex.htmlを要求。
6. /Minamitane-life-demo/で始まる絶対URLパスは公開ルートに対応。それ以外のルートURLはプロジェクト配下から外れるため失敗。
7. resolve後のルート外参照（..、percent encoding、symlink経由を含む）と欠落したローカルファイルを失敗にする。
8. src/hrefのデコード値とHTMLソース全体を検査し、file://、Windowsドライブ、UNC、~/、代表的な開発端末パス（/Users/、/home/、/Volumes/、/tmp/、/workspace/等）を検出。HTML内のCSS/JSに直接書かれた禁止パスも対象。
9. URL解決を変えるbase要素、未知のscheme、不正URL、NUL、読み取りエラーも停止する。

エラーには対象HTMLと行番号を表示。画像base64や全文はログに出さない。

## 検査範囲の限界

ブラウザやJavaScriptを実行する検査ではない。JSで動的に構築されるsrc/href、CSSの一般的なurl()参照、srcset、fetch、外部URLの応答、fragmentのID存在、HTML構文全般、アプリ操作は対象外。
現行HTMLの画像参照はJSで組み立てられるdata URIであり、画像分離は実施していない。
禁止パスの生ソース検索はコメントや説明文にも反応する。該当時は内容をレビューする。
OSパスは代表パターン検出であり、あらゆる任意のローカルパスを推定するものではない。

## 実行結果

```sh
python3 -m unittest discover -s .github/scripts -p "test_validate_pages.py" -v
python3 .github/scripts/validate_pages.py . --base-path /Minamitane-life-demo/
git diff --check
```

ローカル実行: 13テストPASS、現行HTML検査PASS、diffチェックPASS。
index.htmlのblob SHAは変更前後とも`7105610a2d6cfb88bd3ff42b1a8a4a1641990c91`。
アプリファイルをバイト単位で変更していない。ブラウザ表示比較やGitHub Actions実行済みとは扱わない。

| テスト | 期待 |
|---|---|
| 相対パス、日本語以外の空白percent encoding、query/fragment、project base、入れ子HTML、ディレクトリindex | PASS |
| 外部リンク、data URI、blob、mailto、tel、fragment、空値 | PASS |
| index欠落、空、空白のみ | FAIL |
| src/href参照先欠落 | FAIL |
| file URI、Mac/Linux/Windows/UNCパス、encoded禁止パス | FAIL |
| HTML内CSS/JSの禁止パス | FAIL |
| root外参照、project base外のroot URL | FAIL |
| indexなしディレクトリ | FAIL |
| base、不正URL、未知scheme、NUL、UTF-8不正 | FAIL |
| 隠しディレクトリ内の欠落参照 | 公開対象外 |
| symlinkによるroot外参照 | FAIL |
| CLI正常/異常 | 終了コード0/1 |

## HARD STOP

- テスト失敗、実サイト検査エラー、Python実行エラーの場合はUpload・Deployへ進まない。
- index欠落/空、欠落参照、禁止パス、root外参照、baseなど上記失敗条件を推測で許可しない。
- 現行HTMLを変更しないと検査が通らない場合は、公開を進めず該当箇所を報告する。
- 本パッチはレビュー用。mainへのマージ、公開実行はこの作成作業には含めない。

## 受け入れ基準

- workflowの差分はUpload直前の5行のみ。既存公開設定を保持する。
- index.htmlのblob SHA一致、画像分離・軽量化なし。
- 13テストと現行HTML検査が成功。異常CLIが非ゼロで終了する。
- 検証ステップにcontinue-on-errorがなく、後続に失敗を無視する条件がない。
- マージ後の正常runではValidate成功後にUpload・Deployが実行される。
- 必要な実Actions確認は公開を伴わない隔離workflowで行う。異常fixtureでValidate失敗、Upload/Deploy相当の後続がskippedとなること。今回この実Actions確認は未実行。
