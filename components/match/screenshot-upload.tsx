"use client";

import { useState } from "react";
import { Upload, Loader2, CheckCircle, AlertCircle, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  extractStatsFromScreenshot,
  type OCRMatchResult,
} from "@/lib/ocr/tesseract-service";
import { toast } from "sonner";

interface ScreenshotUploadProps {
  onOCRComplete: (result: OCRMatchResult) => void;
  onFileSelected: (file: File) => void;
}

export function ScreenshotUpload({
  onOCRComplete,
  onFileSelected,
}: ScreenshotUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ocrResult, setOCRResult] = useState<OCRMatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다");
      return;
    }

    // Validate file size (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("파일 크기는 10MB 이하여야 합니다");
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setError(null);
    setOCRResult(null);
    onFileSelected(selectedFile);
    toast.success("스크린샷이 선택되었습니다");
  };

  const handleOCRProcess = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const result = await extractStatsFromScreenshot(file, (p) =>
        setProgress(p)
      );

      setOCRResult(result);
      onOCRComplete(result);
      toast.success(
        `OCR 완료! 정확도: ${Math.round(result.confidence * 100)}%`
      );
    } catch (err) {
      console.error("OCR Error:", err);
      setError(
        "스크린샷 인식에 실패했습니다. 이미지가 선명한지 확인하고 다시 시도하거나 수동으로 입력해주세요."
      );
      toast.error("OCR 처리 실패");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          경기 결과 스크린샷 업로드
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Input */}
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="screenshot-upload"
            disabled={isProcessing}
          />
          <label htmlFor="screenshot-upload">
            <Button
              asChild
              variant="outline"
              className="w-full cursor-pointer"
              disabled={isProcessing}
            >
              <span>
                <ImageIcon className="mr-2 h-4 w-4" />
                스크린샷 선택
              </span>
            </Button>
          </label>
          <p className="text-xs text-muted-foreground mt-2">
            NBA 2K 경기 결과 화면 (PNG, JPG, 최대 10MB)
          </p>
        </div>

        {/* Preview */}
        {preview && (
          <div className="space-y-2">
            <img
              src={preview}
              alt="Screenshot preview"
              className="w-full rounded-lg border"
            />
            <Button
              onClick={handleOCRProcess}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  OCR 처리 중... {progress}%
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  자동 입력 시작
                </>
              )}
            </Button>
          </div>
        )}

        {/* Progress Bar */}
        {isProcessing && <Progress value={progress} className="w-full" />}

        {/* OCR Result Info */}
        {ocrResult && (
          <div className="rounded-lg bg-green-50 p-3 text-sm dark:bg-green-950">
            <p className="font-medium text-green-900 dark:text-green-100">
              ✓ OCR 완료! 정확도: {Math.round(ocrResult.confidence * 100)}%
            </p>
            <p className="text-green-700 dark:text-green-300 mt-1">
              아래 입력 필드를 확인하고 틀린 부분이 있으면 수정해주세요.
            </p>
            {ocrResult.homeTeamPlayers.length === 0 && (
              <p className="text-orange-700 dark:text-orange-300 mt-1">
                ⚠️ 선수 데이터를 자동으로 인식하지 못했습니다. 수동으로 입력해주세요.
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm dark:bg-red-950">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
            <p className="text-red-900 dark:text-red-100">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
