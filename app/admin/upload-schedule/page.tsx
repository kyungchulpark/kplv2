"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, Key } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import * as XLSX from "xlsx";

interface ParsedMatch {
  match_sequence: string;
  match_date: string;
  home_team: string;
  away_team: string;
  match_time: string;
  game_password: string;
}

// 랜덤 알파벳 4글자 생성
const generatePassword = (): string => {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // 혼동되기 쉬운 I, O 제외
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return result;
};

// match_sequence 생성 (YYYYMMDD_XXX 형식)
const generateSequence = (dateStr: string, index: number): string => {
  const dateOnly = dateStr.replace(/-/g, '');
  const seq = String(index + 1).padStart(3, '0');
  return `${dateOnly}_${seq}`;
};

export default function UploadSchedulePage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedMatch[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [createdTeams, setCreatedTeams] = useState<string[]>([]); // 새로 생성된 팀 목록

  useEffect(() => {
    loadSeasonAndTeams();
  }, []);

  const loadSeasonAndTeams = async () => {
    const supabase = createClient();

    // Get active season
    const { data: season } = await supabase
      .from("seasons")
      .select("*")
      .eq("is_active", true)
      .single();

    setActiveSeason(season);

    if (season) {
      // Get teams for active season
      const { data: teamsData } = await supabase
        .from("teams")
        .select("id, name")
        .eq("season_id", season.id);

      setTeams(teamsData || []);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParsedData(null);
      setErrors([]);
      setUploadComplete(false);
      setCreatedTeams([]);
    }
  };

  const handleParse = async () => {
    if (!file) return;

    setParsing(true);
    setErrors([]);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        setErrors(["엑셀 파일에 데이터가 없습니다."]);
        setParsing(false);
        return;
      }

      // Validate and parse
      const parsed: ParsedMatch[] = [];
      const validationErrors: string[] = [];

      // 날짜별 경기 수를 추적하여 sequence 번호 부여
      const dateCountMap = new Map<string, number>();

      // 엑셀에서 발견된 모든 팀 이름 수집
      const teamNamesInExcel = new Set<string>();

      // 엑셀 날짜를 YYYY-MM-DD 문자열로 변환하는 함수
      const formatDate = (value: any): string | null => {
        if (!value) return null;

        // 이미 YYYY-MM-DD 문자열인 경우
        if (typeof value === 'string') {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (dateRegex.test(value)) return value;

          // 2025/10/26 형식
          const slashRegex = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/;
          const slashMatch = value.match(slashRegex);
          if (slashMatch) {
            return `${slashMatch[1]}-${slashMatch[2].padStart(2, '0')}-${slashMatch[3].padStart(2, '0')}`;
          }
          return null;
        }

        // Date 객체인 경우
        if (value instanceof Date) {
          const year = value.getFullYear();
          const month = String(value.getMonth() + 1).padStart(2, '0');
          const day = String(value.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }

        // 숫자(Excel serial number)인 경우
        if (typeof value === 'number') {
          const date = new Date((value - 25569) * 86400 * 1000);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }

        return null;
      };

      // 엑셀 시간을 HH:MM 문자열로 변환하는 함수
      const formatTime = (value: any): string | null => {
        if (!value) return null;

        // 이미 HH:MM 문자열인 경우
        if (typeof value === 'string') {
          const timeRegex = /^\d{2}:\d{2}$/;
          if (timeRegex.test(value)) return value;

          // H:MM 형식 (예: 9:30)
          const shortTimeRegex = /^(\d{1,2}):(\d{2})$/;
          const shortMatch = value.match(shortTimeRegex);
          if (shortMatch) {
            return `${shortMatch[1].padStart(2, '0')}:${shortMatch[2]}`;
          }
          return null;
        }

        // Date 객체인 경우 (시간 정보 포함)
        if (value instanceof Date) {
          const hours = String(value.getHours()).padStart(2, '0');
          const minutes = String(value.getMinutes()).padStart(2, '0');
          return `${hours}:${minutes}`;
        }

        // 숫자인 경우 (Excel time fraction: 0.0 ~ 1.0)
        if (typeof value === 'number' && value < 1) {
          const totalMinutes = Math.round(value * 24 * 60);
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }

        return null;
      };

      jsonData.forEach((row, index) => {
        const rowNum = index + 2; // Excel row number (1-indexed + header)

        // Check required fields
        if (!row.match_date) {
          validationErrors.push(`Row ${rowNum}: match_date is required`);
          return;
        }
        if (!row.home_team) {
          validationErrors.push(`Row ${rowNum}: home_team is required`);
          return;
        }
        if (!row.away_team) {
          validationErrors.push(`Row ${rowNum}: away_team is required`);
          return;
        }
        if (!row.match_time) {
          validationErrors.push(`Row ${rowNum}: match_time is required`);
          return;
        }

        // 팀 이름 수집 (팀 자동 생성을 위해)
        teamNamesInExcel.add(String(row.home_team).trim());
        teamNamesInExcel.add(String(row.away_team).trim());

        // 날짜 변환
        const matchDate = formatDate(row.match_date);
        if (!matchDate) {
          validationErrors.push(
            `Row ${rowNum}: match_date 형식 오류 (YYYY-MM-DD 형식 필요, 현재 값: ${row.match_date})`
          );
          return;
        }

        // 시간 변환
        const matchTime = formatTime(row.match_time);
        if (!matchTime) {
          validationErrors.push(
            `Row ${rowNum}: match_time 형식 오류 (HH:MM 형식 필요, 현재 값: ${row.match_time})`
          );
          return;
        }

        // 날짜별 경기 순번 계산
        const currentCount = dateCountMap.get(matchDate) || 0;
        dateCountMap.set(matchDate, currentCount + 1);

        // match_sequence와 game_password 자동 생성
        const autoSequence = generateSequence(matchDate, currentCount);
        const autoPassword = generatePassword();

        parsed.push({
          match_sequence: autoSequence,
          match_date: matchDate,
          home_team: String(row.home_team).trim(),
          away_team: String(row.away_team).trim(),
          match_time: matchTime,
          game_password: autoPassword,
        });
      });

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
      }

      setParsedData(parsed);
    } catch (error: any) {
      setErrors([`파일 파싱 실패: ${error.message}`]);
    } finally {
      setParsing(false);
    }
  };

  const handleUpload = async () => {
    if (!parsedData || !activeSeason) return;

    setUploading(true);
    setCreatedTeams([]);

    try {
      const supabase = createClient();

      // 현재 팀 목록
      let teamMap = new Map(teams.map((t) => [t.name, t.id]));

      // 엑셀에서 발견된 모든 팀 이름 수집
      const allTeamNames = new Set<string>();
      parsedData.forEach((match) => {
        allTeamNames.add(match.home_team);
        allTeamNames.add(match.away_team);
      });

      // 없는 팀 찾기
      const missingTeams: string[] = [];
      allTeamNames.forEach((teamName) => {
        if (!teamMap.has(teamName)) {
          missingTeams.push(teamName);
        }
      });

      // 없는 팀 자동 생성
      if (missingTeams.length > 0) {
        const newTeams = missingTeams.map((name) => ({
          season_id: activeSeason.id,
          name: name,
          conference: null, // 컨퍼런스는 나중에 설정
          wins: 0,
          losses: 0,
          points_for: 0,
          points_against: 0,
        }));

        const { data: insertedTeams, error: teamError } = await supabase
          .from("teams")
          .insert(newTeams)
          .select("id, name");

        if (teamError) {
          setErrors([`팀 생성 실패: ${teamError.message}`]);
          setUploading(false);
          return;
        }

        // 새로 생성된 팀을 teamMap에 추가
        insertedTeams?.forEach((team) => {
          teamMap.set(team.name, team.id);
        });

        // 생성된 팀 목록 저장
        setCreatedTeams(missingTeams);

        // 팀 목록 갱신
        setTeams([...teams, ...(insertedTeams || [])]);
      }

      // Prepare matches for insert
      const matches = parsedData.map((match) => ({
        season_id: activeSeason.id,
        home_team_id: teamMap.get(match.home_team),
        away_team_id: teamMap.get(match.away_team),
        match_date: `${match.match_date}T${match.match_time}:00`,
        status: "scheduled",
        match_sequence: match.match_sequence,
        game_password: match.game_password,
        result_uploaded: false,
      }));

      // Bulk insert
      const { error } = await supabase.from("matches").insert(matches);

      if (error) {
        setErrors([`업로드 실패: ${error.message}`]);
      } else {
        setUploadComplete(true);
      }
    } catch (error: any) {
      setErrors([`업로드 실패: ${error.message}`]);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Create template data - match_sequence와 game_password 컬럼 제거
    const template = [
      {
        match_date: "2025-04-17",
        home_team: "Lakers",
        away_team: "Warriors",
        match_time: "22:40",
      },
      {
        match_date: "2025-04-17",
        home_team: "Celtics",
        away_team: "Heat",
        match_time: "22:40",
      },
      {
        match_date: "2025-04-17",
        home_team: "Clippers",
        away_team: "Nets",
        match_time: "22:40",
      },
      {
        match_date: "2025-04-17",
        home_team: "Suns",
        away_team: "76ers",
        match_time: "22:40",
      },
      {
        match_date: "2025-04-17",
        home_team: "Mavericks",
        away_team: "Bucks",
        match_time: "22:40",
      },
      {
        match_date: "2025-04-17",
        home_team: "Warriors",
        away_team: "Lakers",
        match_time: "23:20",
      },
      {
        match_date: "2025-04-17",
        home_team: "Heat",
        away_team: "Celtics",
        match_time: "23:20",
      },
      {
        match_date: "2025-04-17",
        home_team: "Nets",
        away_team: "Clippers",
        match_time: "23:20",
      },
      {
        match_date: "2025-04-17",
        home_team: "76ers",
        away_team: "Suns",
        match_time: "23:20",
      },
      {
        match_date: "2025-04-17",
        home_team: "Bucks",
        away_team: "Mavericks",
        match_time: "23:20",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Schedule");
    XLSX.writeFile(wb, "kpl_schedule_template.xlsx");
  };

  if (!activeSeason) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Upload Schedule</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            활성화된 시즌이 없습니다. 먼저 시즌을 생성하고 활성화하세요.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Upload Schedule</h1>
        <p className="text-muted-foreground">
          Excel 파일로 경기 일정 일괄 등록 - {(activeSeason as any).name}
        </p>
      </div>

      {/* Excel Format Guide */}
      <Card className="border-nba-red/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileSpreadsheet className="h-5 w-5" />
            <span>Excel Format Guide</span>
          </CardTitle>
          <CardDescription>
            아래 형식에 맞춰 Excel 파일을 작성하세요 (한 날짜에 여러 경기 가능)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-muted">
                <tr>
                  <th className="border px-3 py-2 text-left">match_date</th>
                  <th className="border px-3 py-2 text-left">home_team</th>
                  <th className="border px-3 py-2 text-left">away_team</th>
                  <th className="border px-3 py-2 text-left">match_time</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-3 py-2">2025-04-17</td>
                  <td className="border px-3 py-2">Lakers</td>
                  <td className="border px-3 py-2">Warriors</td>
                  <td className="border px-3 py-2">22:40</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2">2025-04-17</td>
                  <td className="border px-3 py-2">Celtics</td>
                  <td className="border px-3 py-2">Heat</td>
                  <td className="border px-3 py-2">22:40</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2">같은 날짜</td>
                  <td className="border px-3 py-2">...</td>
                  <td className="border px-3 py-2">...</td>
                  <td className="border px-3 py-2">23:20</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-semibold">📌 입력 사항:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>match_date: YYYY-MM-DD 형식 (예: 2025-04-17)</li>
              <li>home_team / away_team: 현재 시즌에 등록된 팀 이름</li>
              <li>match_time: HH:MM 형식 (예: 22:40 또는 23:20)</li>
            </ul>
            <p className="font-semibold mt-3">✨ 자동 생성:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong>match_sequence</strong>: YYYYMMDD_001 형식으로 자동 생성</li>
              <li><strong>game_password</strong>: 알파벳 4글자 자동 생성 (예: KPLX)</li>
            </ul>
          </div>

          <div className="bg-muted p-3 rounded text-sm">
            <p className="font-semibold mb-2">현재 시즌 팀 목록:</p>
            <div className="flex flex-wrap gap-2">
              {teams.map((team) => (
                <Badge key={team.id} variant="outline">
                  {team.name}
                </Badge>
              ))}
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Download Template (10경기 예시)
          </Button>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>1. Upload Excel File</CardTitle>
          <CardDescription>
            .xlsx 또는 .csv 파일을 선택하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm font-medium mb-1">
                {file ? file.name : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-muted-foreground">
                Excel (.xlsx, .xls) or CSV (.csv)
              </p>
            </label>
          </div>

          {file && (
            <div className="flex items-center justify-between p-3 bg-muted rounded">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">{file.name}</span>
                <Badge variant="outline">{(file.size / 1024).toFixed(1)} KB</Badge>
              </div>
              <Button onClick={handleParse} disabled={parsing}>
                {parsing ? "파싱 중..." : "Parse File"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Parsed Data */}
      {parsedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>2. Preview & Validate</span>
            </CardTitle>
            <CardDescription>
              {parsedData.length}개의 경기가 파싱되었습니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 새로 생성될 팀 미리 알림 */}
            {(() => {
              const existingTeamNames = new Set(teams.map((t) => t.name));
              const newTeamNames = new Set<string>();
              parsedData.forEach((match) => {
                if (!existingTeamNames.has(match.home_team)) newTeamNames.add(match.home_team);
                if (!existingTeamNames.has(match.away_team)) newTeamNames.add(match.away_team);
              });

              if (newTeamNames.size > 0) {
                return (
                  <Alert className="border-blue-300 bg-blue-50 dark:bg-blue-950/20">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-700 dark:text-blue-400">
                      <p className="font-semibold">🆕 자동으로 생성될 팀 ({newTeamNames.size}개):</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Array.from(newTeamNames).map((name) => (
                          <Badge key={name} className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {name}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs mt-2">업로드 시 위 팀들이 자동으로 생성됩니다.</p>
                    </AlertDescription>
                  </Alert>
                );
              }
              return null;
            })()}

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="border-b sticky top-0 bg-background">
                  <tr>
                    <th className="text-left py-2 px-2">Sequence</th>
                    <th className="text-left py-2 px-2">Date</th>
                    <th className="text-left py-2 px-2">Time</th>
                    <th className="text-left py-2 px-2">Home</th>
                    <th className="text-left py-2 px-2">Away</th>
                    <th className="text-center py-2 px-2">Password</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((match, idx) => {
                    const existingTeamNames = new Set(teams.map((t) => t.name));
                    const isNewHomeTeam = !existingTeamNames.has(match.home_team);
                    const isNewAwayTeam = !existingTeamNames.has(match.away_team);

                    return (
                      <tr key={idx} className="border-b">
                        <td className="py-2 px-2">
                          <code className="text-xs bg-muted px-1 rounded">
                            {match.match_sequence}
                          </code>
                        </td>
                        <td className="py-2 px-2">{match.match_date}</td>
                        <td className="py-2 px-2">{match.match_time}</td>
                        <td className="py-2 px-2 font-medium">
                          {isNewHomeTeam ? (
                            <span className="text-blue-600 dark:text-blue-400">🆕 {match.home_team}</span>
                          ) : (
                            match.home_team
                          )}
                        </td>
                        <td className="py-2 px-2 font-medium">
                          {isNewAwayTeam ? (
                            <span className="text-blue-600 dark:text-blue-400">🆕 {match.away_team}</span>
                          ) : (
                            match.away_team
                          )}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <Badge variant="outline" className="text-xs font-mono bg-green-50 border-green-300 text-green-700">
                            <Key className="h-3 w-3 mr-1" />
                            {match.game_password}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">Validation Errors:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, idx) => (
                      <li key={idx} className="text-sm">
                        {error}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleUpload}
              disabled={uploading || errors.length > 0}
              className="w-full"
            >
              {uploading ? "업로드 중..." : `${parsedData.length}개 경기 업로드`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {uploadComplete && (
        <Alert className="border-green-600 bg-green-50 dark:bg-green-950/20">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">
            <p className="font-semibold">Upload Complete!</p>
            <p className="text-sm">
              {parsedData?.length}개의 경기가 성공적으로 등록되었습니다.
            </p>
            {createdTeams.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-800">
                <p className="font-semibold text-blue-700 dark:text-blue-400">
                  🆕 자동 생성된 팀 ({createdTeams.length}개):
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {createdTeams.map((teamName) => (
                    <Badge key={teamName} className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {teamName}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  ⚠️ 생성된 팀의 컨퍼런스, 로고, 주장은 Teams 메뉴에서 설정해주세요.
                </p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
