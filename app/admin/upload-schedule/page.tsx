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
    }
  };

  const handleParse = async () => {
    if (!file) return;

    setParsing(true);
    setErrors([]);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      // Validate and parse
      const parsed: ParsedMatch[] = [];
      const validationErrors: string[] = [];
      const teamNames = new Set(teams.map((t) => t.name));

      // 날짜별 경기 수를 추적하여 sequence 번호 부여
      const dateCountMap = new Map<string, number>();

      jsonData.forEach((row, index) => {
        const rowNum = index + 2; // Excel row number (1-indexed + header)

        // Check required fields (match_sequence와 game_password는 더 이상 필수 아님)
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

        // Validate team names
        if (!teamNames.has(row.home_team)) {
          validationErrors.push(
            `Row ${rowNum}: Home team "${row.home_team}" not found in active season`
          );
        }
        if (!teamNames.has(row.away_team)) {
          validationErrors.push(
            `Row ${rowNum}: Away team "${row.away_team}" not found in active season`
          );
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(row.match_date)) {
          validationErrors.push(
            `Row ${rowNum}: match_date must be in YYYY-MM-DD format`
          );
        }

        // Validate time format
        const timeRegex = /^\d{2}:\d{2}$/;
        if (!timeRegex.test(row.match_time)) {
          validationErrors.push(
            `Row ${rowNum}: match_time must be in HH:MM format`
          );
        }

        // 날짜별 경기 순번 계산
        const currentCount = dateCountMap.get(row.match_date) || 0;
        dateCountMap.set(row.match_date, currentCount + 1);

        // match_sequence와 game_password 자동 생성
        const autoSequence = generateSequence(row.match_date, currentCount);
        const autoPassword = generatePassword();

        parsed.push({
          match_sequence: autoSequence,
          match_date: row.match_date,
          home_team: row.home_team,
          away_team: row.away_team,
          match_time: row.match_time,
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

    try {
      const supabase = createClient();

      // Get team IDs
      const teamMap = new Map(teams.map((t) => [t.name, t.id]));

      // Prepare matches for insert
      const matches = parsedData.map((match) => ({
        season_id: (activeSeason as any).id,
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
                  {parsedData.map((match, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2 px-2">
                        <code className="text-xs bg-muted px-1 rounded">
                          {match.match_sequence}
                        </code>
                      </td>
                      <td className="py-2 px-2">{match.match_date}</td>
                      <td className="py-2 px-2">{match.match_time}</td>
                      <td className="py-2 px-2 font-medium">{match.home_team}</td>
                      <td className="py-2 px-2 font-medium">{match.away_team}</td>
                      <td className="py-2 px-2 text-center">
                        <Badge variant="outline" className="text-xs font-mono bg-green-50 border-green-300 text-green-700">
                          <Key className="h-3 w-3 mr-1" />
                          {match.game_password}
                        </Badge>
                      </td>
                    </tr>
                  ))}
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
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
