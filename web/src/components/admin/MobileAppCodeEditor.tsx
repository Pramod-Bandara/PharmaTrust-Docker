"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Code,
  Play,
  Save,
  RefreshCw,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  FileCode,
  Smartphone,
  Eye,
} from "lucide-react";

interface MobileAppCodeEditorProps {
  onCodeUpdate?: (code: string) => void;
}

const MobileAppCodeEditor = ({ onCodeUpdate }: MobileAppCodeEditorProps) => {
  const [code, setCode] = useState<string>("");
  const [originalCode, setOriginalCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [selectedTab, setSelectedTab] = useState<"editor" | "preview">(
    "editor",
  );

  useEffect(() => {
    loadAppCode();
  }, []);

  useEffect(() => {
    setHasChanges(code !== originalCode && code.length > 0);
  }, [code, originalCode]);

  const loadAppCode = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/mobile/app-code");
      const result = await response.json();

      if (result.success && result.data) {
        const appCode = result.data.appCode;
        setCode(appCode);
        setOriginalCode(appCode);

        if (result.data.isFallback) {
          setErrorMessage(
            "Note: Using fallback demo code. Mobile app source not accessible from this environment.",
          );
        }
      } else {
        setErrorMessage(result.error || "Failed to load mobile app code");
      }
    } catch (error) {
      setErrorMessage(
        `Failed to fetch mobile app code: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      console.error("Error loading app code:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    setErrorMessage("");

    try {
      const response = await fetch("/api/mobile/app-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          autoSave: true,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSaveStatus("success");
        setOriginalCode(code);
        setHasChanges(false);

        if (onCodeUpdate) {
          onCodeUpdate(code);
        }

        // Auto-clear success message after 3 seconds
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
        setErrorMessage(result.error || "Failed to save code");
      }
    } catch (error) {
      setSaveStatus("error");
      setErrorMessage(
        `Failed to save: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      console.error("Error saving code:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (
      confirm(
        "Are you sure you want to discard all changes and reset to the original code?",
      )
    ) {
      setCode(originalCode);
      setHasChanges(false);
      setSaveStatus("idle");
      setErrorMessage("");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/typescript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `App-${new Date().toISOString().slice(0, 10)}.tsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCode(content);
    };
    reader.readAsText(file);
  };

  const generateSnackPreview = () => {
    // Generate Expo Snack URL with the current code
    const encodedCode = encodeURIComponent(code);
    const snackUrl = `https://snack.expo.dev/embedded/@pharmatrust/app?platform=web&preview=true&code=${encodedCode}`;
    setPreviewUrl(snackUrl);
    setSelectedTab("preview");
  };

  const getLineCount = () => {
    return code.split("\n").length;
  };

  const getCharacterCount = () => {
    return code.length;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileCode className="h-6 w-6 text-blue-600" />
            <div>
              <CardTitle>Mobile App Code Editor</CardTitle>
              <CardDescription>
                Edit and preview React Native mobile app code in real-time
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {saveStatus === "success" && (
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Saved
              </Badge>
            )}
            {saveStatus === "error" && (
              <Badge
                variant="outline"
                className="bg-red-50 text-red-700 border-red-200"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Save Failed
              </Badge>
            )}
            {hasChanges && saveStatus !== "success" && (
              <Badge
                variant="outline"
                className="bg-yellow-50 text-yellow-700 border-yellow-200"
              >
                Unsaved Changes
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error/Info Alert */}
        {errorMessage && (
          <Alert
            variant={errorMessage.includes("Note:") ? "default" : "destructive"}
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b">
          <div className="flex items-center space-x-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || isSaving || isLoading}
            >
              <Save
                className={`h-4 w-4 mr-1 ${isSaving ? "animate-pulse" : ""}`}
              />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!hasChanges || isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadAppCode}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`}
              />
              Reload
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <label htmlFor="file-upload">
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-1" />
                  Upload
                </span>
              </Button>
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".tsx,.ts,.jsx,.js"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="default"
              size="sm"
              onClick={generateSnackPreview}
              disabled={isLoading}
            >
              <Play className="h-4 w-4 mr-1" />
              Preview
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-4 text-xs text-gray-600">
          <span>Lines: {getLineCount()}</span>
          <span>Characters: {getCharacterCount()}</span>
          <span>Language: TypeScript (React Native)</span>
        </div>

        {/* Tabs */}
        <Tabs
          value={selectedTab}
          onValueChange={(v) => setSelectedTab(v as "editor" | "preview")}
        >
          <TabsList>
            <TabsTrigger value="editor">
              <Code className="h-4 w-4 mr-2" />
              Code Editor
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              Live Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Loading mobile app code...
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full h-[600px] font-mono text-sm p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  style={{
                    resize: "vertical",
                    minHeight: "400px",
                    tabSize: 2,
                  }}
                  placeholder="// Mobile app code will appear here..."
                  spellCheck={false}
                />
                <div className="absolute top-2 right-2">
                  <Badge variant="outline" className="bg-white">
                    App.tsx
                  </Badge>
                </div>
              </div>
            )}

            {/* Editor Info */}
            <Alert className="mt-4 bg-blue-50 border-blue-200">
              <Code className="h-4 w-4" />
              <AlertDescription className="text-sm text-blue-800">
                <strong>Editor Features:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Direct editing of mobile/App.tsx (React Native)</li>
                  <li>Auto-save functionality in development mode</li>
                  <li>Syntax highlighting (basic) with monospace font</li>
                  <li>Download and upload code files</li>
                  <li>Live preview with Expo Snack integration</li>
                </ul>
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            {previewUrl ? (
              <div className="space-y-4">
                <Alert className="bg-green-50 border-green-200">
                  <Smartphone className="h-4 w-4" />
                  <AlertDescription className="text-sm text-green-800">
                    <strong>Live Preview Active:</strong> Your code is running
                    in Expo Snack. Changes will reflect after you click
                    &quot;Preview&quot; again.
                  </AlertDescription>
                </Alert>

                <div
                  className="border rounded-lg overflow-hidden"
                  style={{ height: "700px" }}
                >
                  <iframe
                    src={previewUrl}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                    }}
                    title="Expo Snack Preview"
                  />
                </div>

                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(previewUrl, "_blank")}
                  >
                    Open in New Tab
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg">
                <Smartphone className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  No Preview Generated
                </h3>
                <p className="text-sm text-gray-500 mb-4 text-center max-w-md">
                  Click the &quot;Preview&quot; button to generate a live
                  preview of your mobile app code using Expo Snack.
                </p>
                <Button onClick={generateSnackPreview}>
                  <Play className="h-4 w-4 mr-2" />
                  Generate Preview
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Development Warning */}
        {process.env.NODE_ENV === "production" && (
          <Alert variant="default" className="bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm text-yellow-800">
              <strong>Production Mode:</strong> Code changes will not be
              persisted to the file system. Download your changes to save them
              locally.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default MobileAppCodeEditor;
