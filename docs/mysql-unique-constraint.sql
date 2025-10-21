-- MySQL一意制約追加（重複防止）
-- 部署名の重複を物理的に防止する

-- 既存のテーブル構造を確認
DESCRIBE departments;

-- 一意制約を追加（部署名の重複を防止）
ALTER TABLE departments
  ADD CONSTRAINT uniq_department_name UNIQUE (name);

-- 制約が正しく追加されたか確認
SHOW CREATE TABLE departments;

-- 既存の「？」データをクリーンアップ
-- 確認用クエリ（実行前に確認）
SELECT * FROM departments WHERE TRIM(name) = '' OR name REGEXP '^[\\?？]+$';

-- 削除用クエリ（問題ないことを確認してから実行）
-- DELETE FROM departments WHERE TRIM(name) = '' OR name REGEXP '^[\\?？]+$';

-- 空の部署名を削除
-- DELETE FROM departments WHERE TRIM(name) = '';

-- 最終確認
SELECT * FROM departments ORDER BY id;
