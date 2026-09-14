-- 이미 저장된 일본어 장르를 한국어 장르로 합친다.
-- 앞으로 들어오는 값은 lib/genres.ts 의 normalizeGenre 가 저장 전에 옮긴다 —
-- 이 파일은 그 규칙이 생기기 전에 쌓인 행을 한 번 정리하는 용도라 목록이 여기 따로 적혀 있다(그때의 스냅샷).
-- DO 블록으로 도는 이유: 단계마다 앞 단계 결과를 봐야 해서 데이터 수정 CTE 로는 안 된다(같은 스냅샷을 본다).
DO $$
DECLARE a record;
BEGIN
  FOR a IN SELECT * FROM (VALUES
    ('アクション','액션'), ('アドベンチャー','어드벤처'), ('ロールプレイング','RPG'),
    ('シミュレーション','시뮬레이션'), ('ストラテジー','전략'), ('パズル','퍼즐'),
    ('アーケード','아케이드'), ('スポーツ','스포츠'), ('レース','레이싱'),
    ('シューティング','슈팅'), ('格闘','격투'), ('パーティー','파티'),
    ('テーブル','보드'), ('コミュニケーション','커뮤니케이션'), ('音楽','음악'),
    ('学習','학습'), ('実用','유틸리티'), ('トレーニング','트레이닝'), ('その他','기타')
  ) AS t(ja, ko) LOOP
    -- 옮겨 갈 한국어 장르가 아직 없으면 만든다
    INSERT INTO genres (name)
    SELECT a.ko
    WHERE EXISTS (SELECT 1 FROM genres WHERE name = a.ja)
      AND NOT EXISTS (SELECT 1 FROM genres WHERE name = a.ko);

    -- 연결을 옮긴다. 그 게임에 이미 한국어 장르가 붙어 있으면 옮기지 않는다(PK 충돌)
    UPDATE game_genres gg
    SET genre_id = (SELECT id FROM genres WHERE name = a.ko)
    WHERE gg.genre_id = (SELECT id FROM genres WHERE name = a.ja)
      AND NOT EXISTS (
        SELECT 1 FROM game_genres x
        WHERE x.game_id = gg.game_id AND x.genre_id = (SELECT id FROM genres WHERE name = a.ko)
      );

    -- 위에서 옮기지 못한 것은 중복이라 지운다
    DELETE FROM game_genres WHERE genre_id = (SELECT id FROM genres WHERE name = a.ja);
    -- 빈 껍데기가 된 일본어 장르 행
    DELETE FROM genres WHERE name = a.ja;
  END LOOP;
END $$;
