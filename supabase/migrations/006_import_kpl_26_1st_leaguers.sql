-- ============================================================================
-- Migration: 006_import_kpl_26_1st_leaguers
-- Description: KPL 26 1st Season 리거 데이터 마이그레이션
-- Date: 2025-12-09
--
-- 작업 내용:
-- 1. pkc0906@gmail.com 제외 기존 유저 삭제
-- 2. 리그 유저 생성 (이메일: {psnid}@kpl.test, 비밀번호: Test1234!)
-- 3. team_rosters에 선수-팀 매핑
-- ============================================================================

-- Step 1: 기존 유저 정리 (pkc0906@gmail.com 제외)
-- 주의: Supabase Auth 유저도 함께 삭제해야 함
-- 이 작업은 Supabase Dashboard > Authentication에서 수동으로 진행해야 합니다.
-- 또는 Supabase Management API를 사용해야 합니다.

-- profiles 테이블에서 먼저 삭제 (cascade로 team_rosters도 함께 삭제됨)
DELETE FROM profiles
WHERE id NOT IN (
  SELECT id FROM auth.users WHERE email = 'pkc0906@gmail.com'
);

-- Step 2: 임시 테이블 생성 및 데이터 로드
CREATE TEMP TABLE temp_leaguers (
  psn_id TEXT,
  team_name TEXT,
  position TEXT
);

INSERT INTO temp_leaguers (psn_id, team_name, position) VALUES
('BLK_CAPTAIN-GO', 'BLACK OUT', 'PG'),
('BLK_GIo', 'BLACK OUT', 'PG'),
('BLK_KOOL ', 'BLACK OUT', 'SG'),
('BLK_GISULJA', 'BLACK OUT', 'SF'),
('LAMBORGHINI700LP', 'BLACK OUT', 'SF'),
('BLK_HWASHIN', 'BLACK OUT', 'PF'),
('BLK_pebacks', 'BLACK OUT', 'C'),
('BLK_Vulchu', 'BLACK OUT', 'C'),
('SKT_Mong', 'SKT', 'PG'),
('SKT_Honran', 'SKT', 'PF'),
('SKT_Kante', 'SKT', 'SG'),
('SKT_Mine', 'SKT', 'SF'),
('SKT_Gom', 'SKT', 'SF'),
('SKT_Acuna_Jr', 'SKT', 'C'),
('SKT_Guy', 'SKT', 'SF'),
('SKT_Gati', 'SKT', 'PG'),
('SKT_BIYOMBO', 'SKT', 'SF'),
('SKT_Kazusa', 'SKT', 'SG'),
('Magnumdlo', 'La go Crazy', 'PG'),
('xSpecial Gx', 'La go Crazy', 'SG'),
('xFinche', 'La go Crazy', 'SF'),
('YquEmx__', 'La go Crazy', 'PF'),
('greentobule_', 'La go Crazy', 'C'),
('AustinR1vers', 'Joker', 'PG'),
('BIGBEN_ShowBen_3', 'Joker', 'PF'),
('DaitenX5', 'Joker', 'C'),
('FUJI-_-7777', 'Joker', 'PG'),
('OBQRN', 'Joker', 'SF'),
('PTG_MuStache-_-1', 'Joker', 'SG'),
('ZazaWell', 'Joker', 'C'),
('ichi_5867', 'Joker', 'PF'),
('takatomo25', 'Joker', 'SF'),
('Cocoa_Fabulous', 'Raven Claws', 'PG'),
('kk-_-2-_-', 'Raven Claws', 'SG'),
('AR15Loading—-', 'Raven Claws', 'SF'),
('ken3828', 'Raven Claws', 'PF'),
('baioriki', 'Raven Claws', 'C'),
('TANAKA_JPN_51', 'Raven Claws', 'C'),
('DeAndreRoberson', 'Marifana', 'SF'),
('Jane-Doe-_-zZ', 'Marifana', 'C'),
('T---MOSAD---X', 'Marifana', 'PF'),
('konnjac', 'Marifana', 'SG'),
('xxKo99xx', 'Marifana', 'PG'),
('Polyphia-0225K', 'Marifana', 'PF'),
('rn0vi7', 'Marifana', 'SG'),
('JYP_StrayKids', 'Marifana', 'SG'),
('xJkarystyx', 'Ride or die', 'SG'),
('vsCoffe', 'Ride or die', 'SF'),
('xR1chardZedd-', 'Ride or die', 'PF'),
('xIsaGi3300_', 'Ride or die', 'PG'),
('Despai1rr', 'Ride or die', 'C'),
('I-EnzoMartinez-I', 'Blitz United', 'PG'),
('Alexxnossll', 'Blitz United', 'SF'),
('rockysz023', 'Blitz United', 'PF'),
('KaelEclipse-', 'Blitz United', 'C'),
('TheRealJimmy_2K', 'Blitz United', 'PG'),
('Dowseylolz', 'Blitz United', 'SF'),
('PainDiao', 'Blitz United', 'C'),
('Vaxee__', 'Blitz United', 'SF'),
('xDaniLai', 'Blitz United', 'PF'),
('GingerB1ng', 'Blitz United', 'C'),
('BillyM_Thorfinn_', 'Blitz United', 'SG'),
('JackyHungry', 'Blitz United', 'C'),
('SK16ri', 'SCOTTIES', 'PG'),
('att__ty', 'SCOTTIES', 'SG'),
('I1kegawa', 'SCOTTIES', 'SF'),
('IfLovers', 'SCOTTIES', 'PF'),
('Reon_Day-Day2418', 'SCOTTIES', 'PF'),
('kani_kama96', 'SCOTTIES', 'PF'),
('VaLstRqx_52Ks', 'SCOTTIES', 'C'),
('U1-C_Forever', 'Unity One Crew', 'PG'),
('U1-C_Venom-', 'Unity One Crew', 'SG'),
('U1-C_Sco-', 'Unity One Crew', 'SF'),
('U1-C_chilliness', 'Unity One Crew', 'PF'),
('U1-C_Memory-', 'Unity One Crew', 'C'),
('U1-C_Godori', 'Unity One Crew', 'PF'),
('U1-C_Zone-', 'Unity One Crew', 'PF'),
('solorechero', 'Unity One Crew', 'PG'),
('Won_Jang', 'Unity One Crew', 'C'),
('TT_VerdictorXX', 'Vortex', 'PG'),
('drfstillhustle', 'Vortex', 'SF'),
(' Monster_kk82', 'Vortex', 'SF'),
('Ucant_dr1bblE', 'Vortex', 'PF'),
('xKingsMelo', 'Vortex', 'C'),
('Xjy999_', 'Chill', 'PG'),
('|CA1N_', 'Chill', 'SG'),
('Painterf', 'Chill', 'SF'),
('Jieyushen', 'Chill', 'PG'),
('Motivat1ng', 'Chill', 'C'),
('x__5TA__j', 'N.EX.T', 'PG'),
('Dybs___b', 'N.EX.T', 'SG'),
('Toni-Kukoc-', 'N.EX.T', 'SG'),
('ClampX_Hush43', 'N.EX.T', 'SF'),
('Kkidding_', 'N.EX.T', 'SF'),
('Iridescent_SEH', 'N.EX.T', 'PF'),
('GlSELLEae', 'N.EX.T', 'PF'),
('AGI_MulTissue', 'N.EX.T', 'C'),
('EHOTJL_YT', 'N.EX.T', 'C'),
('NOYORKMAN', 'DIGIMON', 'PG'),
('ibo_odi_', 'DIGIMON', 'SF'),
('SakaChu--', 'DIGIMON', 'SG'),
('HxntaiClampz-_-', 'DIGIMON', 'SF'),
('VIXVIXI', 'DIGIMON', 'SF'),
('llDam_x', 'DIGIMON', 'SF'),
('Confiance98', 'DIGIMON', 'PF'),
('LA_Eon', 'DIGIMON', 'SG'),
('Akihqru', 'No fear', 'PG'),
('Lagginglay', 'No fear', 'SG'),
('mito0612uni', 'No fear', 'SF'),
('Sloooth', 'No fear', 'PF'),
('Chlkil', 'No fear', 'C'),
('T_O_S-0505', 'No fear', 'SF'),
('deka-_-zaru', 'No fear', 'SF'),
('llelfq', 'No fear', 'PF'),
('KaeHeun', 'GongGam', 'PG'),
('H___oodie', 'GongGam', 'C'),
('ImHodu', 'GongGam', 'PF'),
('llLaVine', 'GongGam', 'SF'),
('chul_keok', 'GongGam', 'SG'),
('lxHelijiaoterxl', 'Blitz United', 'SG'),
('Special P 5982', 'La go Crazy', 'SF'),
('NotEnoughRaf', 'BaekYa', 'PG'),
('ReneGadeSunu', 'BaekYa', 'C'),
('ReneGadeChang', 'BaekYa', 'SF'),
('OnlyRocky_', 'BaekYa', 'SG'),
('PGE_GuKBoP', 'BaekYa', 'PF'),
('DongHyun_J', 'BaekYa', 'PF'),
('Ggame_green', 'BaekYa', 'PF'),
('KR_PILOT', 'BaekYa', 'PG'),
('Asher_rascal', 'Trigger', 'PG'),
('urasijimi', 'Trigger', 'C'),
('Yuzu_Lemon_11', 'Trigger', 'SG'),
('Jahhxncho', 'Trigger', 'SF'),
('Lame_niki-_-', 'Trigger', 'PF'),
('llHezxLy-', 'Trigger', 'PG'),
('Sttewwie', 'Trigger', 'SF'),
('Hy-vvs', 'Ride or die', 'PG'),
('sxneif', 'Marifana', 'SG'),
('Hirai_D_Ayuni', 'Emperor Penguin', 'SF'),
('kurachy_', 'Emperor Penguin', 'SG'),
('l-ligher', 'Emperor Penguin', 'PG'),
('nqm41ess', 'Emperor Penguin', 'PF'),
('inkyadegozaru-33', 'Emperor Penguin', 'C'),
('Benjazzy-1', 'Emperor Penguin', 'C'),
('Geass-RR', 'Emperor Penguin', 'PF'),
('ken-k_e_n', 'Emperor Penguin', 'SF'),
('Park_Mando', 'GongGam', 'C'),
('Qz_TeO', 'Quartz', 'PG'),
('BLK_KORVER', 'Quartz', 'SG'),
('Surfer_mk', 'Quartz', 'SG'),
('ERA_VATO', 'Quartz', 'SF'),
('Qz_Yongki', 'Quartz', 'PF'),
('Qz__Beo', 'Quartz', 'PF'),
('Qz_Villain', 'Quartz', 'C'),
('YPGreen', 'Ride or die', 'C'),
('drosezzz__', 'Bright Sword', 'PG'),
('ShuT1ao_', 'Bright Sword', 'SG'),
('Cr2Tr0ybo1', 'Bright Sword', 'SF'),
('KKepac__', 'Bright Sword', 'PF'),
('AuroraSn1per_', 'Bright Sword', 'C'),
('KindnessMQDDT', 'Bright Sword', 'SF'),
('lllFannlll', 'Bright Sword', 'PF'),
('LynXeth', 'Taco Tuesday', 'PG'),
('x1aoZh0n-33', 'Taco Tuesday', 'SG'),
('xGakki_', 'Taco Tuesday', 'SF'),
('Qingshu-0316', 'Taco Tuesday', 'PF'),
('lllBoBOlll', 'Taco Tuesday', 'C'),
('DaWeige223', 'Taco Tuesday', 'PG'),
('xChezPie-', 'Taco Tuesday', 'C'),
('Poole1of1', 'SKT', 'SF'),
('Dolph1nowo_', 'La go Crazy', 'PF'),
('Qiiiu_T', 'Bright Sword', 'SF'),
('IPGETBACKo_O', 'Bright Sword', 'SF'),
('zxi_irr', 'Chill', 'SG'),
('shimicha_n', 'Marifana', 'SF'),
('Lucchi33', 'No fear', 'SG'),
('Kamui___84', 'N.EX.T', 'SF'),
('IXnnco', 'Blitz United', 'SG'),
('BrokenDontMiss-', 'Chill', 'PF'),
('Zhffk420', 'Chill', 'SF'),
('Bulesss_zz-', 'Vortex', 'SF'),
('xxAzazel_', 'La go Crazy', 'PG'),
('SHINTAROSU_7', 'Raven Claws', 'SG'),
('ayumu_wade', 'No fear', 'SG'),
('playcore', 'Quartz', 'SG'),
('ML_BBONG', 'Quartz', 'PF'),
('XiaoDizzz', 'Chill', 'PG'),
('ll-ZinO-ll', 'DIGIMON', 'PG'),
('S10vvD4ncer', 'Marifana', 'PF'),
('dorin1005', 'SKT', 'SG'),
('xChrisuel', 'Vortex', 'PG'),
('callMevvvVD', 'Blitz United', 'SG'),
('Ai-13X', 'Chill', 'PG'),
('GongChill', 'BaekYa', 'SF'),
('splash-l95l', 'Blitz United', 'SG'),
('kaelixNono', 'La go Crazy', 'SF'),
('Shaanxi Ren', 'Bright Sword', 'SF'),
('Tz_Ryopion', 'Marifana', 'C'),
('l3eers_', 'SCOTTIES', 'SG'),
('ZiiClass_', 'N.EX.T', 'C'),
('Not Kylrevsu', 'Chill', 'PG'),
('HoleBingo_', 'Ride or die', 'SG'),
('xWater1ove', 'Chill', 'C'),
('Sikarceus', 'Blitz United', 'SG'),
('Heize1of1_', 'GongGam', 'PG'),
('PGE_Jvckixs', 'SKT', 'PG'),
('llSukil', 'SKT', 'C'),
('lllll798II', 'Ride or die', 'SG'),
('ERA_LeeK1nG-xx', 'SKT', 'C'),
('GanG_Kx', 'SKT', 'SF'),
('LaMarcuscusmas6', 'Marifana', 'PF'),
('IIRYOCHINII ', 'Marifana', 'C'),
('TTT_woodol', 'Unity One Crew', 'PG'),
('King_chan-_-2', 'Unity One Crew', 'SF'),
('XiaoWu_niubility', 'Ride or die', 'PF'),
('omameking', 'Emperor Penguin', 'SG'),
('YangChundol79', 'SKT', 'C'),
('RenW_2k_JPN', 'Raven Claws', 'SF'),
('SoloRecHero', 'SKT', 'SG'),
('kai__y__', 'SCOTTIES', 'SF'),
('Dast0403', 'Marifana', 'PF'),
('LyraRythem', 'Marifana', 'SF'),
('Imgbc', 'Ride or die', 'PF');

-- Step 3: 유저 생성을 위한 안내
-- 주의: Supabase에서는 auth.users 테이블에 직접 INSERT할 수 없습니다.
-- Supabase Management API나 Admin SDK를 사용해야 합니다.
--
-- 아래는 참고용 로직입니다. 실제 실행은 별도 스크립트로 진행해야 합니다.
--
-- FOR EACH psn_id IN temp_leaguers:
--   1. Create auth user with email: {psn_id}@kpl.test, password: Test1234!
--   2. Insert profile with psn_id
--   3. Insert team_roster based on team_name matching

-- Step 4: 활성 시즌 ID 확인 (이 값을 실제 값으로 대체해야 함)
DO $$
DECLARE
  v_season_id UUID;
BEGIN
  -- 활성 시즌 ID 가져오기
  SELECT id INTO v_season_id FROM seasons WHERE is_active = TRUE LIMIT 1;

  IF v_season_id IS NULL THEN
    RAISE EXCEPTION 'No active season found. Please create and activate a season first.';
  END IF;

  RAISE NOTICE 'Active season ID: %', v_season_id;
END $$;

-- ============================================================================
-- 실행 방법:
-- ============================================================================
--
-- 이 SQL은 준비 단계입니다. 실제 유저 생성은 다음 방법 중 하나로 진행해야 합니다:
--
-- 옵션 1: Supabase Dashboard에서 수동 생성
-- - Authentication > Add user 반복
--
-- 옵션 2: Node.js 스크립트 사용 (추천)
-- - Supabase Admin SDK로 일괄 생성
-- - 별도 마이그레이션 스크립트 파일 참조: scripts/import_leaguers.ts
--
-- ============================================================================

-- 임시 테이블 삭제
DROP TABLE IF EXISTS temp_leaguers;
