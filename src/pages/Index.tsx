import { useState } from "react";
import Header from "@/components/Header";
import UploadSection from "@/components/UploadSection";
import StatsCards from "@/components/StatsCards";
import JobsTable from "@/components/JobsTable";
import ActiveJobMonitor from "@/components/ActiveJobMonitor";
import { ScreenshotTest } from "@/components/ScreenshotTest";
import { InstagramScraper } from "@/components/InstagramScraper";

const Index = () => {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const handleJobCreated = (jobId: string, projectId: string) => {
    setActiveJobId(jobId);
    setActiveProjectId(projectId);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8 space-y-8">
        <StatsCards />
        
        <ScreenshotTest />
        
        <InstagramScraper />
        
        <UploadSection onJobCreated={handleJobCreated} />
        
        {activeJobId && activeProjectId && (
          <ActiveJobMonitor jobId={activeJobId} projectId={activeProjectId} />
        )}
        
        <JobsTable />
      </main>
    </div>
  );
};

export default Index;
