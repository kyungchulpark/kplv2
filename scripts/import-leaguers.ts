/**
 * KPL 26 1st Season 리거 데이터 임포트 스크립트
 *
 * 기능:
 * 1. pkc0906@gmail.com 제외 기존 유저 삭제
 * 2. 리그 유저 생성 (이메일: {psnid}@kpl.test, 비밀번호: Test1234!)
 * 3. team_rosters에 선수-팀 매핑
 *
 * 실행 방법:
 * npx tsx scripts/import-leaguers.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local 파일 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Admin client (Service Role Key 사용)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface Leaguer {
  psnId: string;
  teamName: string;
  position: 'PG' | 'SG' | 'SF' | 'PF' | 'C';
}

// 리그 데이터 (원본 SQL에서 추출)
const LEAGUERS: Leaguer[] = [
  { psnId: 'BLK_CAPTAIN-GO', teamName: 'BLACK OUT', position: 'PG' },
  { psnId: 'BLK_GIo', teamName: 'BLACK OUT', position: 'PG' },
  { psnId: 'BLK_KOOL ', teamName: 'BLACK OUT', position: 'SG' },
  { psnId: 'BLK_GISULJA', teamName: 'BLACK OUT', position: 'SF' },
  { psnId: 'LAMBORGHINI700LP', teamName: 'BLACK OUT', position: 'SF' },
  { psnId: 'BLK_HWASHIN', teamName: 'BLACK OUT', position: 'PF' },
  { psnId: 'BLK_pebacks', teamName: 'BLACK OUT', position: 'C' },
  { psnId: 'BLK_Vulchu', teamName: 'BLACK OUT', position: 'C' },
  { psnId: 'SKT_Mong', teamName: 'SKT', position: 'PG' },
  { psnId: 'SKT_Honran', teamName: 'SKT', position: 'PF' },
  { psnId: 'SKT_Kante', teamName: 'SKT', position: 'SG' },
  { psnId: 'SKT_Mine', teamName: 'SKT', position: 'SF' },
  { psnId: 'SKT_Gom', teamName: 'SKT', position: 'SF' },
  { psnId: 'SKT_Acuna_Jr', teamName: 'SKT', position: 'C' },
  { psnId: 'SKT_Guy', teamName: 'SKT', position: 'SF' },
  { psnId: 'SKT_Gati', teamName: 'SKT', position: 'PG' },
  { psnId: 'SKT_BIYOMBO', teamName: 'SKT', position: 'SF' },
  { psnId: 'SKT_Kazusa', teamName: 'SKT', position: 'SG' },
  { psnId: 'Magnumdlo', teamName: 'La go Crazy', position: 'PG' },
  { psnId: 'xSpecial Gx', teamName: 'La go Crazy', position: 'SG' },
  { psnId: 'xFinche', teamName: 'La go Crazy', position: 'SF' },
  { psnId: 'YquEmx__', teamName: 'La go Crazy', position: 'PF' },
  { psnId: 'greentobule_', teamName: 'La go Crazy', position: 'C' },
  { psnId: 'AustinR1vers', teamName: 'Joker', position: 'PG' },
  { psnId: 'BIGBEN_ShowBen_3', teamName: 'Joker', position: 'PF' },
  { psnId: 'DaitenX5', teamName: 'Joker', position: 'C' },
  { psnId: 'FUJI-_-7777', teamName: 'Joker', position: 'PG' },
  { psnId: 'OBQRN', teamName: 'Joker', position: 'SF' },
  { psnId: 'PTG_MuStache-_-1', teamName: 'Joker', position: 'SG' },
  { psnId: 'ZazaWell', teamName: 'Joker', position: 'C' },
  { psnId: 'ichi_5867', teamName: 'Joker', position: 'PF' },
  { psnId: 'takatomo25', teamName: 'Joker', position: 'SF' },
  { psnId: 'Cocoa_Fabulous', teamName: 'Raven Claws', position: 'PG' },
  { psnId: 'kk-_-2-_-', teamName: 'Raven Claws', position: 'SG' },
  { psnId: 'AR15Loading—-', teamName: 'Raven Claws', position: 'SF' },
  { psnId: 'ken3828', teamName: 'Raven Claws', position: 'PF' },
  { psnId: 'baioriki', teamName: 'Raven Claws', position: 'C' },
  { psnId: 'TANAKA_JPN_51', teamName: 'Raven Claws', position: 'C' },
  { psnId: 'DeAndreRoberson', teamName: 'Marifana', position: 'SF' },
  { psnId: 'Jane-Doe-_-zZ', teamName: 'Marifana', position: 'C' },
  { psnId: 'T---MOSAD---X', teamName: 'Marifana', position: 'PF' },
  { psnId: 'konnjac', teamName: 'Marifana', position: 'SG' },
  { psnId: 'xxKo99xx', teamName: 'Marifana', position: 'PG' },
  { psnId: 'Polyphia-0225K', teamName: 'Marifana', position: 'PF' },
  { psnId: 'rn0vi7', teamName: 'Marifana', position: 'SG' },
  { psnId: 'JYP_StrayKids', teamName: 'Marifana', position: 'SG' },
  { psnId: 'xJkarystyx', teamName: 'Ride or die', position: 'SG' },
  { psnId: 'vsCoffe', teamName: 'Ride or die', position: 'SF' },
  { psnId: 'xR1chardZedd-', teamName: 'Ride or die', position: 'PF' },
  { psnId: 'xIsaGi3300_', teamName: 'Ride or die', position: 'PG' },
  { psnId: 'Despai1rr', teamName: 'Ride or die', position: 'C' },
  { psnId: 'I-EnzoMartinez-I', teamName: 'Blitz United', position: 'PG' },
  { psnId: 'Alexxnossll', teamName: 'Blitz United', position: 'SF' },
  { psnId: 'rockysz023', teamName: 'Blitz United', position: 'PF' },
  { psnId: 'KaelEclipse-', teamName: 'Blitz United', position: 'C' },
  { psnId: 'TheRealJimmy_2K', teamName: 'Blitz United', position: 'PG' },
  { psnId: 'Dowseylolz', teamName: 'Blitz United', position: 'SF' },
  { psnId: 'PainDiao', teamName: 'Blitz United', position: 'C' },
  { psnId: 'Vaxee__', teamName: 'Blitz United', position: 'SF' },
  { psnId: 'xDaniLai', teamName: 'Blitz United', position: 'PF' },
  { psnId: 'GingerB1ng', teamName: 'Blitz United', position: 'C' },
  { psnId: 'BillyM_Thorfinn_', teamName: 'Blitz United', position: 'SG' },
  { psnId: 'JackyHungry', teamName: 'Blitz United', position: 'C' },
  { psnId: 'SK16ri', teamName: 'SCOTTIES', position: 'PG' },
  { psnId: 'att__ty', teamName: 'SCOTTIES', position: 'SG' },
  { psnId: 'I1kegawa', teamName: 'SCOTTIES', position: 'SF' },
  { psnId: 'IfLovers', teamName: 'SCOTTIES', position: 'PF' },
  { psnId: 'Reon_Day-Day2418', teamName: 'SCOTTIES', position: 'PF' },
  { psnId: 'kani_kama96', teamName: 'SCOTTIES', position: 'PF' },
  { psnId: 'VaLstRqx_52Ks', teamName: 'SCOTTIES', position: 'C' },
  { psnId: 'U1-C_Forever', teamName: 'Unity One Crew', position: 'PG' },
  { psnId: 'U1-C_Venom-', teamName: 'Unity One Crew', position: 'SG' },
  { psnId: 'U1-C_Sco-', teamName: 'Unity One Crew', position: 'SF' },
  { psnId: 'U1-C_chilliness', teamName: 'Unity One Crew', position: 'PF' },
  { psnId: 'U1-C_Memory-', teamName: 'Unity One Crew', position: 'C' },
  { psnId: 'U1-C_Godori', teamName: 'Unity One Crew', position: 'PF' },
  { psnId: 'U1-C_Zone-', teamName: 'Unity One Crew', position: 'PF' },
  { psnId: 'solorechero', teamName: 'Unity One Crew', position: 'PG' },
  { psnId: 'Won_Jang', teamName: 'Unity One Crew', position: 'C' },
  { psnId: 'TT_VerdictorXX', teamName: 'Vortex', position: 'PG' },
  { psnId: 'drfstillhustle', teamName: 'Vortex', position: 'SF' },
  { psnId: ' Monster_kk82', teamName: 'Vortex', position: 'SF' },
  { psnId: 'Ucant_dr1bblE', teamName: 'Vortex', position: 'PF' },
  { psnId: 'xKingsMelo', teamName: 'Vortex', position: 'C' },
  { psnId: 'Xjy999_', teamName: 'Chill', position: 'PG' },
  { psnId: '|CA1N_', teamName: 'Chill', position: 'SG' },
  { psnId: 'Painterf', teamName: 'Chill', position: 'SF' },
  { psnId: 'Jieyushen', teamName: 'Chill', position: 'PG' },
  { psnId: 'Motivat1ng', teamName: 'Chill', position: 'C' },
  { psnId: 'x__5TA__j', teamName: 'N.EX.T', position: 'PG' },
  { psnId: 'Dybs___b', teamName: 'N.EX.T', position: 'SG' },
  { psnId: 'Toni-Kukoc-', teamName: 'N.EX.T', position: 'SG' },
  { psnId: 'ClampX_Hush43', teamName: 'N.EX.T', position: 'SF' },
  { psnId: 'Kkidding_', teamName: 'N.EX.T', position: 'SF' },
  { psnId: 'Iridescent_SEH', teamName: 'N.EX.T', position: 'PF' },
  { psnId: 'GlSELLEae', teamName: 'N.EX.T', position: 'PF' },
  { psnId: 'AGI_MulTissue', teamName: 'N.EX.T', position: 'C' },
  { psnId: 'EHOTJL_YT', teamName: 'N.EX.T', position: 'C' },
  { psnId: 'NOYORKMAN', teamName: 'DIGIMON', position: 'PG' },
  { psnId: 'ibo_odi_', teamName: 'DIGIMON', position: 'SF' },
  { psnId: 'SakaChu--', teamName: 'DIGIMON', position: 'SG' },
  { psnId: 'HxntaiClampz-_-', teamName: 'DIGIMON', position: 'SF' },
  { psnId: 'VIXVIXI', teamName: 'DIGIMON', position: 'SF' },
  { psnId: 'llDam_x', teamName: 'DIGIMON', position: 'SF' },
  { psnId: 'Confiance98', teamName: 'DIGIMON', position: 'PF' },
  { psnId: 'LA_Eon', teamName: 'DIGIMON', position: 'SG' },
  { psnId: 'Akihqru', teamName: 'No fear', position: 'PG' },
  { psnId: 'Lagginglay', teamName: 'No fear', position: 'SG' },
  { psnId: 'mito0612uni', teamName: 'No fear', position: 'SF' },
  { psnId: 'Sloooth', teamName: 'No fear', position: 'PF' },
  { psnId: 'Chlkil', teamName: 'No fear', position: 'C' },
  { psnId: 'T_O_S-0505', teamName: 'No fear', position: 'SF' },
  { psnId: 'deka-_-zaru', teamName: 'No fear', position: 'SF' },
  { psnId: 'llelfq', teamName: 'No fear', position: 'PF' },
  { psnId: 'KaeHeun', teamName: 'GongGam', position: 'PG' },
  { psnId: 'H___oodie', teamName: 'GongGam', position: 'C' },
  { psnId: 'ImHodu', teamName: 'GongGam', position: 'PF' },
  { psnId: 'llLaVine', teamName: 'GongGam', position: 'SF' },
  { psnId: 'chul_keok', teamName: 'GongGam', position: 'SG' },
  { psnId: 'lxHelijiaoterxl', teamName: 'Blitz United', position: 'SG' },
  { psnId: 'Special P 5982', teamName: 'La go Crazy', position: 'SF' },
  { psnId: 'NotEnoughRaf', teamName: 'BaekYa', position: 'PG' },
  { psnId: 'ReneGadeSunu', teamName: 'BaekYa', position: 'C' },
  { psnId: 'ReneGadeChang', teamName: 'BaekYa', position: 'SF' },
  { psnId: 'OnlyRocky_', teamName: 'BaekYa', position: 'SG' },
  { psnId: 'PGE_GuKBoP', teamName: 'BaekYa', position: 'PF' },
  { psnId: 'DongHyun_J', teamName: 'BaekYa', position: 'PF' },
  { psnId: 'Ggame_green', teamName: 'BaekYa', position: 'PF' },
  { psnId: 'KR_PILOT', teamName: 'BaekYa', position: 'PG' },
  { psnId: 'Asher_rascal', teamName: 'Trigger', position: 'PG' },
  { psnId: 'urasijimi', teamName: 'Trigger', position: 'C' },
  { psnId: 'Yuzu_Lemon_11', teamName: 'Trigger', position: 'SG' },
  { psnId: 'Jahhxncho', teamName: 'Trigger', position: 'SF' },
  { psnId: 'Lame_niki-_-', teamName: 'Trigger', position: 'PF' },
  { psnId: 'llHezxLy-', teamName: 'Trigger', position: 'PG' },
  { psnId: 'Sttewwie', teamName: 'Trigger', position: 'SF' },
  { psnId: 'Hy-vvs', teamName: 'Ride or die', position: 'PG' },
  { psnId: 'sxneif', teamName: 'Marifana', position: 'SG' },
  { psnId: 'Hirai_D_Ayuni', teamName: 'Emperor Penguin', position: 'SF' },
  { psnId: 'kurachy_', teamName: 'Emperor Penguin', position: 'SG' },
  { psnId: 'l-ligher', teamName: 'Emperor Penguin', position: 'PG' },
  { psnId: 'nqm41ess', teamName: 'Emperor Penguin', position: 'PF' },
  { psnId: 'inkyadegozaru-33', teamName: 'Emperor Penguin', position: 'C' },
  { psnId: 'Benjazzy-1', teamName: 'Emperor Penguin', position: 'C' },
  { psnId: 'Geass-RR', teamName: 'Emperor Penguin', position: 'PF' },
  { psnId: 'ken-k_e_n', teamName: 'Emperor Penguin', position: 'SF' },
  { psnId: 'Park_Mando', teamName: 'GongGam', position: 'C' },
  { psnId: 'Qz_TeO', teamName: 'Quartz', position: 'PG' },
  { psnId: 'BLK_KORVER', teamName: 'Quartz', position: 'SG' },
  { psnId: 'Surfer_mk', teamName: 'Quartz', position: 'SG' },
  { psnId: 'ERA_VATO', teamName: 'Quartz', position: 'SF' },
  { psnId: 'Qz_Yongki', teamName: 'Quartz', position: 'PF' },
  { psnId: 'Qz__Beo', teamName: 'Quartz', position: 'PF' },
  { psnId: 'Qz_Villain', teamName: 'Quartz', position: 'C' },
  { psnId: 'YPGreen', teamName: 'Ride or die', position: 'C' },
  { psnId: 'drosezzz__', teamName: 'Bright Sword', position: 'PG' },
  { psnId: 'ShuT1ao_', teamName: 'Bright Sword', position: 'SG' },
  { psnId: 'Cr2Tr0ybo1', teamName: 'Bright Sword', position: 'SF' },
  { psnId: 'KKepac__', teamName: 'Bright Sword', position: 'PF' },
  { psnId: 'AuroraSn1per_', teamName: 'Bright Sword', position: 'C' },
  { psnId: 'KindnessMQDDT', teamName: 'Bright Sword', position: 'SF' },
  { psnId: 'lllFannlll', teamName: 'Bright Sword', position: 'PF' },
  { psnId: 'LynXeth', teamName: 'Taco Tuesday', position: 'PG' },
  { psnId: 'x1aoZh0n-33', teamName: 'Taco Tuesday', position: 'SG' },
  { psnId: 'xGakki_', teamName: 'Taco Tuesday', position: 'SF' },
  { psnId: 'Qingshu-0316', teamName: 'Taco Tuesday', position: 'PF' },
  { psnId: 'lllBoBOlll', teamName: 'Taco Tuesday', position: 'C' },
  { psnId: 'DaWeige223', teamName: 'Taco Tuesday', position: 'PG' },
  { psnId: 'xChezPie-', teamName: 'Taco Tuesday', position: 'C' },
  { psnId: 'Poole1of1', teamName: 'SKT', position: 'SF' },
  { psnId: 'Dolph1nowo_', teamName: 'La go Crazy', position: 'PF' },
  { psnId: 'Qiiiu_T', teamName: 'Bright Sword', position: 'SF' },
  { psnId: 'IPGETBACKo_O', teamName: 'Bright Sword', position: 'SF' },
  { psnId: 'zxi_irr', teamName: 'Chill', position: 'SG' },
  { psnId: 'shimicha_n', teamName: 'Marifana', position: 'SF' },
  { psnId: 'Lucchi33', teamName: 'No fear', position: 'SG' },
  { psnId: 'Kamui___84', teamName: 'N.EX.T', position: 'SF' },
  { psnId: 'IXnnco', teamName: 'Blitz United', position: 'SG' },
  { psnId: 'BrokenDontMiss-', teamName: 'Chill', position: 'PF' },
  { psnId: 'Zhffk420', teamName: 'Chill', position: 'SF' },
  { psnId: 'Bulesss_zz-', teamName: 'Vortex', position: 'SF' },
  { psnId: 'xxAzazel_', teamName: 'La go Crazy', position: 'PG' },
  { psnId: 'SHINTAROSU_7', teamName: 'Raven Claws', position: 'SG' },
  { psnId: 'ayumu_wade', teamName: 'No fear', position: 'SG' },
  { psnId: 'playcore', teamName: 'Quartz', position: 'SG' },
  { psnId: 'ML_BBONG', teamName: 'Quartz', position: 'PF' },
  { psnId: 'XiaoDizzz', teamName: 'Chill', position: 'PG' },
  { psnId: 'll-ZinO-ll', teamName: 'DIGIMON', position: 'PG' },
  { psnId: 'S10vvD4ncer', teamName: 'Marifana', position: 'PF' },
  { psnId: 'dorin1005', teamName: 'SKT', position: 'SG' },
  { psnId: 'xChrisuel', teamName: 'Vortex', position: 'PG' },
  { psnId: 'callMevvvVD', teamName: 'Blitz United', position: 'SG' },
  { psnId: 'Ai-13X', teamName: 'Chill', position: 'PG' },
  { psnId: 'GongChill', teamName: 'BaekYa', position: 'SF' },
  { psnId: 'splash-l95l', teamName: 'Blitz United', position: 'SG' },
  { psnId: 'kaelixNono', teamName: 'La go Crazy', position: 'SF' },
  { psnId: 'Shaanxi Ren', teamName: 'Bright Sword', position: 'SF' },
  { psnId: 'Tz_Ryopion', teamName: 'Marifana', position: 'C' },
  { psnId: 'l3eers_', teamName: 'SCOTTIES', position: 'SG' },
  { psnId: 'ZiiClass_', teamName: 'N.EX.T', position: 'C' },
  { psnId: 'Not Kylrevsu', teamName: 'Chill', position: 'PG' },
  { psnId: 'HoleBingo_', teamName: 'Ride or die', position: 'SG' },
  { psnId: 'xWater1ove', teamName: 'Chill', position: 'C' },
  { psnId: 'Sikarceus', teamName: 'Blitz United', position: 'SG' },
  { psnId: 'Heize1of1_', teamName: 'GongGam', position: 'PG' },
  { psnId: 'PGE_Jvckixs', teamName: 'SKT', position: 'PG' },
  { psnId: 'llSukil', teamName: 'SKT', position: 'C' },
  { psnId: 'lllll798II', teamName: 'Ride or die', position: 'SG' },
  { psnId: 'ERA_LeeK1nG-xx', teamName: 'SKT', position: 'C' },
  { psnId: 'GanG_Kx', teamName: 'SKT', position: 'SF' },
  { psnId: 'LaMarcuscusmas6', teamName: 'Marifana', position: 'PF' },
  { psnId: 'IIRYOCHINII ', teamName: 'Marifana', position: 'C' },
  { psnId: 'TTT_woodol', teamName: 'Unity One Crew', position: 'PG' },
  { psnId: 'King_chan-_-2', teamName: 'Unity One Crew', position: 'SF' },
  { psnId: 'XiaoWu_niubility', teamName: 'Ride or die', position: 'PF' },
  { psnId: 'omameking', teamName: 'Emperor Penguin', position: 'SG' },
  { psnId: 'YangChundol79', teamName: 'SKT', position: 'C' },
  { psnId: 'RenW_2k_JPN', teamName: 'Raven Claws', position: 'SF' },
  { psnId: 'SoloRecHero', teamName: 'SKT', position: 'SG' },
  { psnId: 'kai__y__', teamName: 'SCOTTIES', position: 'SF' },
  { psnId: 'Dast0403', teamName: 'Marifana', position: 'PF' },
  { psnId: 'LyraRythem', teamName: 'Marifana', position: 'SF' },
  { psnId: 'Imgbc', teamName: 'Ride or die', position: 'PF' },
];

/**
 * PSN ID를 이메일에 사용 가능한 형태로 변환
 * - 공백 제거
 * - 이메일에 사용할 수 없는 특수문자 제거/변환
 */
function sanitizeForEmail(psnId: string): string {
  return psnId
    .trim()
    .replace(/\s+/g, '_')    // 공백을 언더스코어로
    .replace(/\|/g, 'l')     // 파이프를 'l'로
    .replace(/[^a-zA-Z0-9._-]/g, ''); // 허용되지 않는 문자 제거
}

async function main() {
  console.log('🚀 KPL 26 1st Season 리거 임포트 시작...\n');

  // Step 1: 활성 시즌 확인
  console.log('📌 Step 1: 활성 시즌 확인 중...');
  const { data: activeSeason, error: seasonError } = await supabase
    .from('seasons')
    .select('id, name')
    .eq('is_active', true)
    .single();

  if (seasonError || !activeSeason) {
    console.error('❌ 활성 시즌을 찾을 수 없습니다. 먼저 시즌을 생성하고 활성화하세요.');
    process.exit(1);
  }

  console.log(`✅ 활성 시즌: ${activeSeason.name} (${activeSeason.id})\n`);

  // Step 2: 팀 ID 매핑 생성
  console.log('📌 Step 2: 팀 정보 로드 중...');
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, name')
    .eq('season_id', activeSeason.id);

  if (teamsError || !teams) {
    console.error('❌ 팀 정보를 불러올 수 없습니다:', teamsError);
    process.exit(1);
  }

  const teamMap = new Map<string, string>();
  teams.forEach((team) => {
    teamMap.set(team.name, team.id);
  });

  console.log(`✅ ${teams.length}개 팀 로드 완료\n`);

  // Step 3: 기존 유저 삭제 (pkc0906@gmail.com 제외)
  console.log('📌 Step 3: 기존 유저 정리 중...');

  // 페이지네이션으로 모든 유저 가져오기
  let allUsers: any[] = [];
  let page = 1;
  const perPage = 1000; // 최대값

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      console.error('❌ 유저 목록 조회 실패:', error.message);
      break;
    }

    if (!data?.users || data.users.length === 0) {
      break;
    }

    allUsers = allUsers.concat(data.users);
    console.log(`  📄 페이지 ${page}: ${data.users.length}명`);

    if (data.users.length < perPage) {
      break; // 마지막 페이지
    }

    page++;
  }

  const usersToDelete = allUsers.filter(
    (u) => u.email !== 'pkc0906@gmail.com'
  );

  console.log(`⚠️  총 ${allUsers.length}명 중 ${usersToDelete.length}명을 삭제합니다 (pkc0906@gmail.com 제외)...\n`);

  for (const user of usersToDelete) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      console.error(`  ❌ 유저 삭제 실패: ${user.email}`, error.message);
    } else {
      console.log(`  ✅ 삭제: ${user.email}`);
    }
  }

  console.log('✅ 기존 유저 정리 완료\n');

  // Step 4: 리거 유저 생성 및 팀 매핑
  console.log('📌 Step 4: 리거 유저 생성 및 팀 매핑 중...');

  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const leaguer of LEAGUERS) {
    const sanitizedPsnId = sanitizeForEmail(leaguer.psnId);
    const email = `${sanitizedPsnId}@kpl.test`;
    const password = 'Test1234!';
    const teamId = teamMap.get(leaguer.teamName);

    if (!teamId) {
      console.warn(`  ⚠️  팀을 찾을 수 없음: ${leaguer.teamName} (${leaguer.psnId})`);
      errors.push(`팀 없음: ${leaguer.teamName} - ${leaguer.psnId}`);
      errorCount++;
      continue;
    }

    let userId: string;

    // 유저 생성 (중복 체크는 Supabase가 자동으로 처리)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 이메일 인증 스킵
      user_metadata: {
        psn_id: leaguer.psnId.trim(),
      },
    });

    if (authError) {
      // 이미 존재하는 유저인 경우 무시하고 계속 진행
      if (authError.message?.includes('already') || authError.message?.includes('exists')) {
        console.log(`  ℹ️  기존 유저 건너뛰기: ${leaguer.psnId} (${email})`);
        // 기존 유저 ID 찾기 (profiles 테이블에서)
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();

        if (existingProfile) {
          userId = existingProfile.id;
        } else {
          console.warn(`  ⚠️  기존 유저를 찾을 수 없음: ${email}`);
          errorCount++;
          continue;
        }
      } else {
        console.error(`  ❌ 유저 생성 실패: ${leaguer.psnId}`);
        console.error(`     이메일: ${email}`);
        console.error(`     에러: ${authError.message}`);
        console.error(`     전체 에러:`, JSON.stringify(authError, null, 2));
        errors.push(`유저 생성 실패: ${leaguer.psnId} - ${authError.message}`);
        errorCount++;
        continue;
      }
    } else if (!authData?.user) {
      console.error(`  ❌ 유저 생성 실패: ${leaguer.psnId} - authData.user가 없음`);
      errorCount++;
      continue;
    } else {
      userId = authData.user.id;
      console.log(`  ✅ 유저 생성: ${leaguer.psnId} (${email})`);
    }

    // Profile 생성 (auto trigger로 이미 생성되었을 수 있음)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email,
        psn_id: leaguer.psnId.trim(),
        role: 'user',
      });

    if (profileError) {
      console.error(`  ❌ Profile 생성 실패: ${leaguer.psnId}`, profileError.message);
      errors.push(`Profile 생성 실패: ${leaguer.psnId} - ${profileError.message}`);
    }

    // Team roster 생성
    const { error: rosterError } = await supabase
      .from('team_rosters')
      .insert({
        team_id: teamId,
        player_id: userId,
        season_id: activeSeason.id,
        position: leaguer.position,
        is_active: true,
      });

    if (rosterError) {
      console.error(`  ❌ Roster 생성 실패: ${leaguer.psnId}`, rosterError.message);
      errors.push(`Roster 생성 실패: ${leaguer.psnId} - ${rosterError.message}`);
      errorCount++;
    } else {
      console.log(`  ✅ ${leaguer.psnId} → ${leaguer.teamName} (${leaguer.position})`);
      successCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 임포트 결과:');
  console.log(`  ✅ 성공: ${successCount}명`);
  console.log(`  ❌ 실패: ${errorCount}명`);
  console.log('='.repeat(60));

  if (errors.length > 0) {
    console.log('\n⚠️  오류 목록:');
    errors.forEach((err) => console.log(`  - ${err}`));
  }

  console.log('\n✅ 마이그레이션 완료!');
}

main().catch((err) => {
  console.error('💥 스크립트 실행 중 오류:', err);
  process.exit(1);
});
