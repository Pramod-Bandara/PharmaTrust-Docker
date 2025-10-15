"use client";

import React, { useState } from "react";
import { useAuth, withAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import MobileAppPreview from "@/components/admin/MobileAppPreview";
import MobileAppCodeEditor from "@/components/admin/MobileAppCodeEditor";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Smartphone,
  Code,
  Download,
  ExternalLink,
  Package,
  Settings,
  QrCode,
  Play,
  Info,
  CheckCircle,
  Terminal,
  GitBranch,
} from "lucide-react";

const AdminMobilePage = () => {
  const { user: _user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("preview");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const mobileStats = {
    version: "1.0.0",
    platform: "React Native (Expo)",
    lastUpdate: new Date().toLocaleDateString(),
    dependencies: 8,
    components: 1,
  };

  const setupInstructions = [
    {
      title: "Install Dependencies",
      command: "cd mobile && npm install",
      description: "Install all required npm packages for the mobile app",
    },
    {
      title: "Start Development Server",
      command: "npm start",
      description: "Launch Expo development server with hot reload",
    },
    {
      title: "Run on iOS Simulator",
      command: "npm run ios",
      description: "Build and run app on iOS simulator (macOS only)",
    },
    {
      title: "Run on Android Emulator",
      command: "npm run android",
      description: "Build and run app on Android emulator",
    },
    {
      title: "Open in Expo Go",
      command: "Scan QR code with Expo Go app",
      description: "Test on physical device using Expo Go mobile app",
    },
  ];

  const features = [
    {
      icon: QrCode,
      title: "QR Code Scanning",
      description: "Scan batch QR codes using device camera",
      status: "Active",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      icon: CheckCircle,
      title: "Batch Verification",
      description: "Real-time batch authenticity verification",
      status: "Active",
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      icon: Package,
      title: "Batch Details",
      description: "View comprehensive batch information",
      status: "Active",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      icon: Settings,
      title: "IoT Integration",
      description: "Display environmental sensor data",
      status: "Active",
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <DashboardLayout
      title="Mobile App Management"
      subtitle="Manage, preview, and edit the PharmaTrust mobile application"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Version</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mobileStats.version}</div>
            <p className="text-xs text-muted-foreground">Current release</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">Expo</div>
            <p className="text-xs text-muted-foreground">React Native</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Update</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{mobileStats.lastUpdate}</div>
            <p className="text-xs text-muted-foreground">Latest changes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dependencies</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mobileStats.dependencies}</div>
            <p className="text-xs text-muted-foreground">NPM packages</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Components</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mobileStats.components}</div>
            <p className="text-xs text-muted-foreground">Main app file</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="preview">
            <Smartphone className="h-4 w-4 mr-2" />
            Live Preview
          </TabsTrigger>
          <TabsTrigger value="editor">
            <Code className="h-4 w-4 mr-2" />
            Code Editor
          </TabsTrigger>
          <TabsTrigger value="features">
            <Package className="h-4 w-4 mr-2" />
            Features
          </TabsTrigger>
          <TabsTrigger value="setup">
            <Terminal className="h-4 w-4 mr-2" />
            Setup Guide
          </TabsTrigger>
        </TabsList>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <MobileAppPreview key={refreshKey} onRefresh={handleRefresh} />
        </TabsContent>

        {/* Code Editor Tab */}
        <TabsContent value="editor" className="space-y-6">
          <MobileAppCodeEditor onCodeUpdate={handleRefresh} />
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mobile App Features</CardTitle>
              <CardDescription>
                Overview of available features in the PharmaTrust mobile application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <Card key={index} className="border-2">
                      <CardContent className="pt-6">
                        <div className="flex items-start space-x-4">
                          <div className={`${feature.bgColor} p-3 rounded-lg`}>
                            <Icon className={`h-6 w-6 ${feature.color}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-lg">
                                {feature.title}
                              </h3>
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200"
                              >
                                {feature.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* API Integration Info */}
          <Card>
            <CardHeader>
              <CardTitle>API Integration</CardTitle>
              <CardDescription>
                Mobile app connects to backend services via API endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Batch Verification</h4>
                    <Badge variant="outline">GET</Badge>
                  </div>
                  <code className="text-sm bg-gray-100 p-2 rounded block">
                    /api/mobile/verify?batchId=BATCH_XXX
                  </code>
                  <p className="text-xs text-gray-600 mt-2">
                    Verifies batch authenticity and retrieves batch details
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Batch Summary</h4>
                    <Badge variant="outline">GET</Badge>
                  </div>
                  <code className="text-sm bg-gray-100 p-2 rounded block">
                    /api/mobile/batch/:id/summary
                  </code>
                  <p className="text-xs text-gray-600 mt-2">
                    Retrieves compact batch summary with IoT readings
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Authentication</h4>
                    <Badge variant="outline">POST</Badge>
                  </div>
                  <code className="text-sm bg-gray-100 p-2 rounded block">
                    /api/mobile/auth/login
                  </code>
                  <p className="text-xs text-gray-600 mt-2">
                    User authentication with JWT token generation
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Setup Guide Tab */}
        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Development Setup</CardTitle>
              <CardDescription>
                Follow these steps to set up and run the mobile app locally
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {setupInstructions.map((instruction, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start space-x-4">
                      <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">
                          {instruction.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">
                          {instruction.description}
                        </p>
                        <div className="bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-sm flex items-center justify-between">
                          <span>{instruction.command}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-300 hover:text-white"
                            onClick={() => {
                              navigator.clipboard.writeText(instruction.command);
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Requirements Card */}
          <Card>
            <CardHeader>
              <CardTitle>Requirements</CardTitle>
              <CardDescription>
                Software and tools needed for mobile app development
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                    Node.js & npm
                  </h4>
                  <p className="text-sm text-gray-600">
                    Version 18.x or higher required for development
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                    Expo CLI
                  </h4>
                  <p className="text-sm text-gray-600">
                    Global Expo CLI installation for project management
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                    iOS Simulator (macOS)
                  </h4>
                  <p className="text-sm text-gray-600">
                    Xcode required for iOS app development and testing
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                    Android Studio
                  </h4>
                  <p className="text-sm text-gray-600">
                    Android emulator and SDK tools for Android development
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Links & Resources</CardTitle>
              <CardDescription>
                External resources and documentation for mobile development
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() =>
                    window.open("https://docs.expo.dev/", "_blank")
                  }
                >
                  <span className="flex items-center">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Expo Documentation
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() =>
                    window.open("https://reactnative.dev/", "_blank")
                  }
                >
                  <span className="flex items-center">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    React Native Documentation
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() =>
                    window.open("https://snack.expo.dev/", "_blank")
                  }
                >
                  <span className="flex items-center">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Expo Snack (Online Editor)
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => window.open("http://localhost:19006", "_blank")}
                >
                  <span className="flex items-center">
                    <Play className="h-4 w-4 mr-2" />
                    Open Local Dev Server
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Alert */}
      <Alert className="bg-blue-50 border-blue-200 mt-8">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm text-blue-800">
          <strong>Tip:</strong> Use the Live Preview tab to see changes in real-time, or
          edit the code directly in the Code Editor tab. All changes to{" "}
          <code className="bg-blue-100 px-1 py-0.5 rounded">mobile/App.tsx</code> will be
          reflected in the preview after saving.
        </AlertDescription>
      </Alert>
    </DashboardLayout>
  );
};

export default withAuth(AdminMobilePage);
