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
import {
  Smartphone,
  RefreshCw,
  ExternalLink,
  Code,
  Maximize2,
  Minimize2,
  AlertTriangle,
  CheckCircle,
  QrCode,
  Terminal,
  Info,
} from "lucide-react";

interface MobileAppPreviewProps {
  onRefresh?: () => void;
}

const MobileAppPreview = ({ onRefresh }: MobileAppPreviewProps) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<"ios" | "android">(
    "ios",
  );
  const [previewMode, setPreviewMode] = useState<
    "qr" | "local" | "instructions"
  >("qr");
  const [isLoading, setIsLoading] = useState(false);
  const [appStatus, setAppStatus] = useState<
    "connected" | "disconnected" | "loading"
  >("loading");
  const [localDevError, setLocalDevError] = useState(false);

  useEffect(() => {
    checkAppStatus();
    const interval = setInterval(checkAppStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkAppStatus = async () => {
    try {
      const response = await fetch("/api/health");
      if (response.ok) {
        setAppStatus("connected");
      } else {
        setAppStatus("disconnected");
      }
    } catch {
      setAppStatus("disconnected");
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    if (onRefresh) {
      onRefresh();
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  const handleOpenExpoGo = () => {
    window.open("https://expo.dev/client", "_blank");
  };

  const handleOpenDocs = () => {
    window.open("https://docs.expo.dev/get-started/expo-go/", "_blank");
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const getDeviceFrame = () => {
    if (selectedDevice === "ios") {
      return {
        width: "375px",
        height: "667px",
        borderRadius: "40px",
        border: "12px solid #000",
        name: "iPhone SE",
      };
    } else {
      return {
        width: "360px",
        height: "640px",
        borderRadius: "20px",
        border: "10px solid #333",
        name: "Android Device",
      };
    }
  };

  const deviceFrame = getDeviceFrame();

  const renderQRCodeMode = () => (
    <div className="flex flex-col items-center justify-center space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-lg">
        <div className="text-center mb-6">
          <QrCode className="h-16 w-16 text-blue-600 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-gray-800">
            Scan to Test Mobile App
          </h3>
          <p className="text-sm text-gray-600 mt-2">
            Use Expo Go app to scan and test
          </p>
        </div>

        <div className="bg-gray-100 border-4 border-gray-300 rounded-xl p-4 mb-4">
          <div className="bg-white p-6 rounded-lg">
            <div className="grid grid-cols-8 gap-1">
              {Array.from({ length: 64 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 ${
                    Math.random() > 0.5 ? "bg-black" : "bg-white"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500 text-center space-y-1">
          <p className="font-mono">exp://localhost:8081</p>
          <p className="text-gray-400">
            Start dev server with:{" "}
            <code className="bg-gray-100 px-1 py-0.5 rounded">
              cd mobile && npm start
            </code>
          </p>
        </div>
      </div>

      <Alert className="max-w-md">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>How to test:</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1 text-xs">
            <li>Start the mobile dev server (see instructions tab)</li>
            <li>Install Expo Go app on your phone</li>
            <li>Scan the QR code that appears in terminal</li>
            <li>Test batch verification with real QR codes</li>
          </ol>
        </AlertDescription>
      </Alert>

      <div className="flex gap-3">
        <Button onClick={handleOpenExpoGo} variant="outline" size="sm">
          <ExternalLink className="h-4 w-4 mr-2" />
          Get Expo Go App
        </Button>
        <Button onClick={handleOpenDocs} variant="outline" size="sm">
          <ExternalLink className="h-4 w-4 mr-2" />
          View Expo Docs
        </Button>
      </div>
    </div>
  );

  const renderLocalDevMode = () => (
    <div className="relative">
      <div
        style={{
          width: deviceFrame.width,
          height: deviceFrame.height,
          borderRadius: deviceFrame.borderRadius,
          border: deviceFrame.border,
          backgroundColor: "#000",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {selectedDevice === "ios" && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: "150px",
              height: "25px",
              backgroundColor: "#000",
              borderBottomLeftRadius: "20px",
              borderBottomRightRadius: "20px",
              zIndex: 10,
            }}
          />
        )}

        <div
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: "#fff",
            overflow: "hidden",
          }}
        >
          {localDevError ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-red-50">
              <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Dev Server Not Running
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Cannot connect to http://localhost:19006
              </p>
              <div className="text-xs text-left bg-gray-900 text-green-400 p-3 rounded font-mono">
                <p>$ cd mobile</p>
                <p>$ npm start</p>
              </div>
              <Button
                onClick={() => setLocalDevError(false)}
                size="sm"
                className="mt-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Connection
              </Button>
            </div>
          ) : (
            <>
              <iframe
                src="http://localhost:19006"
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                }}
                title="Local Expo Dev Server"
                onError={() => setLocalDevError(true)}
              />
            </>
          )}
        </div>
      </div>

      <Alert className="mt-4 bg-amber-50 border-amber-200">
        <Info className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-sm text-amber-800">
          <strong>Camera Note:</strong> Camera scanning doesn&apos;t work in web
          browsers. For full camera functionality, use{" "}
          <strong>QR Code mode</strong> above to test on a physical device with
          Expo Go, or test the app using manual batch ID entry.
        </AlertDescription>
      </Alert>

      <div className="text-center mt-4">
        <Badge variant="outline" className="font-mono">
          {deviceFrame.name} - Local Dev
        </Badge>
      </div>
    </div>
  );

  const renderInstructionsMode = () => (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <Terminal className="h-16 w-16 text-blue-600 mx-auto mb-3" />
        <h3 className="text-2xl font-bold text-gray-800">
          Setup Mobile Development
        </h3>
        <p className="text-gray-600 mt-2">
          Follow these steps to run and test the PharmaTrust mobile app
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
              1
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-800 mb-2">
                Install Dependencies
              </h4>
              <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm mb-2">
                cd mobile && npm install
              </div>
              <p className="text-sm text-gray-600">
                Install all required npm packages for the mobile app
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
              2
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-800 mb-2">
                Start Development Server
              </h4>
              <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm mb-2">
                npm start
              </div>
              <p className="text-sm text-gray-600">
                Launch Expo development server. A QR code will appear in your
                terminal.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
              3
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-800 mb-2">
                Install Expo Go on Your Device
              </h4>
              <div className="flex gap-3 mb-2">
                <Button onClick={handleOpenExpoGo} variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Get Expo Go
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                Download Expo Go from App Store (iOS) or Play Store (Android)
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
              4
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-800 mb-2">
                Test on Your Device
              </h4>
              <p className="text-sm text-gray-600 mb-2">
                Open Expo Go app and scan the QR code from your terminal
              </p>
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs text-blue-800">
                  <strong>Alternative testing methods:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>
                      Press <code className="bg-blue-100 px-1 rounded">i</code>{" "}
                      for iOS Simulator (macOS only)
                    </li>
                    <li>
                      Press <code className="bg-blue-100 px-1 rounded">a</code>{" "}
                      for Android Emulator
                    </li>
                    <li>
                      Press <code className="bg-blue-100 px-1 rounded">w</code>{" "}
                      to run in web browser
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <div className="bg-green-100 text-green-600 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
              5
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-800 mb-2">
                Test Batch Verification
              </h4>
              <p className="text-sm text-gray-600 mb-2">
                Use the mobile app to scan batch QR codes or enter batch IDs
                manually
              </p>
              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded border border-gray-200">
                <strong>API Endpoint:</strong> The mobile app connects to{" "}
                <code className="bg-white px-1 py-0.5 rounded border">
                  {typeof window !== "undefined"
                    ? window.location.origin
                    : "http://localhost:3000"}
                  /api/mobile/verify
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Alert className="bg-yellow-50 border-yellow-200">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-sm text-yellow-800">
          <strong>Important Notes:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>
              Ensure your mobile device is on the same network as your
              development machine
            </li>
            <li>
              The PharmaTrust backend services must be running (use{" "}
              <code className="bg-yellow-100 px-1 rounded">
                docker-compose up
              </code>
              )
            </li>
            <li>
              For iOS physical devices, you may need to trust the development
              certificate
            </li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderPreviewContent = () => {
    switch (previewMode) {
      case "qr":
        return renderQRCodeMode();
      case "local":
        return (
          <div className="flex justify-center items-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-8 min-h-[700px]">
            {renderLocalDevMode()}
          </div>
        );
      case "instructions":
        return (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-8 min-h-[700px]">
            {renderInstructionsMode()}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card className={isFullScreen ? "fixed inset-0 z-50 rounded-none" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Smartphone className="h-6 w-6 text-blue-600" />
            <div>
              <CardTitle>Mobile App Preview</CardTitle>
              <CardDescription>
                Test and preview PharmaTrust mobile application
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge
              variant="outline"
              className={
                appStatus === "connected"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : appStatus === "disconnected"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-yellow-50 text-yellow-700 border-yellow-200"
              }
            >
              {appStatus === "connected" && (
                <CheckCircle className="h-3 w-3 mr-1" />
              )}
              {appStatus === "disconnected" && (
                <AlertTriangle className="h-3 w-3 mr-1" />
              )}
              {appStatus === "connected"
                ? "Backend Connected"
                : appStatus === "disconnected"
                  ? "Backend Disconnected"
                  : "Checking..."}
            </Badge>
            <Button variant="ghost" size="sm" onClick={toggleFullScreen}>
              {isFullScreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Mode:</span>
            <Button
              variant={previewMode === "qr" ? "default" : "outline"}
              size="sm"
              onClick={() => setPreviewMode("qr")}
            >
              <QrCode className="h-4 w-4 mr-1" />
              QR Code
            </Button>
            <Button
              variant={previewMode === "local" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPreviewMode("local");
                setLocalDevError(false);
              }}
            >
              <Smartphone className="h-4 w-4 mr-1" />
              Local Dev
            </Button>
            <Button
              variant={previewMode === "instructions" ? "default" : "outline"}
              size="sm"
              onClick={() => setPreviewMode("instructions")}
            >
              <Terminal className="h-4 w-4 mr-1" />
              Instructions
            </Button>
          </div>

          {previewMode === "local" && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Device:</span>
              <Button
                variant={selectedDevice === "ios" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDevice("ios")}
              >
                iOS
              </Button>
              <Button
                variant={selectedDevice === "android" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDevice("android")}
              >
                Android
              </Button>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Info Alert */}
        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="text-sm text-blue-800">
            {previewMode === "qr" ? (
              <>
                <strong>QR Code Mode:</strong> Start the Expo dev server in the{" "}
                <code className="bg-blue-100 px-1 py-0.5 rounded">mobile/</code>{" "}
                directory and scan the QR code with Expo Go app on your phone.
              </>
            ) : previewMode === "local" ? (
              <>
                <strong>Local Dev Mode:</strong> Requires Expo dev server
                running on{" "}
                <code className="bg-blue-100 px-1 py-0.5 rounded">
                  http://localhost:19006
                </code>
                . Run{" "}
                <code className="bg-blue-100 px-1 py-0.5 rounded">
                  npm start
                </code>{" "}
                in the mobile directory first.
              </>
            ) : (
              <>
                <strong>Instructions Mode:</strong> Complete setup guide for
                running and testing the mobile app on physical devices or
                emulators.
              </>
            )}
          </AlertDescription>
        </Alert>

        {/* Preview Area */}
        {renderPreviewContent()}

        {/* Features Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          <div className="flex items-start space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <QrCode className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700">
                QR Scanning
              </h4>
              <p className="text-xs text-gray-500">
                Scan medicine batch QR codes for verification
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700">
                Real-time Verification
              </h4>
              <p className="text-xs text-gray-500">
                Instant batch authenticity and quality checks
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Smartphone className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700">
                Cross-platform
              </h4>
              <p className="text-xs text-gray-500">
                Works on iOS and Android devices seamlessly
              </p>
            </div>
          </div>
        </div>

        {/* Development Info */}
        <Alert>
          <Code className="h-4 w-4" />
          <AlertDescription>
            <strong>Mobile App Location:</strong>{" "}
            <code className="bg-gray-100 px-1 py-0.5 rounded">
              mobile/App.tsx
            </code>
            <br />
            <strong>API Endpoint:</strong>{" "}
            <code className="bg-gray-100 px-1 py-0.5 rounded">
              /api/mobile/verify
            </code>
            <br />
            <strong>Tech Stack:</strong> React Native, Expo, Expo Camera,
            Barcode Scanner
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default MobileAppPreview;
