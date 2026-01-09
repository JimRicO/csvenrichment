import { useState } from "react";
import Header from "@/components/Header";
import UploadSection from "@/components/UploadSection";
import StatsCards from "@/components/StatsCards";
import JobsTable from "@/components/JobsTable";
import ActiveJobMonitor from "@/components/ActiveJobMonitor";
import { ScreenshotTest } from "@/components/ScreenshotTest";
import { InstagramScraper } from "@/components/InstagramScraper";
import { WebsiteBrandingScraper } from "@/components/WebsiteBrandingScraper";
import InstagramIntelligenceSection from "@/components/InstagramIntelligenceSection";
import InstagramJobsTable from "@/components/InstagramJobsTable";
import ActiveInstagramJobMonitor from "@/components/ActiveInstagramJobMonitor";

const Index = () => {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeInstagramJobId, setActiveInstagramJobId] = useState<string | null>(null);

  const handleJobCreated = (jobId: string, projectId: string) => {
    setActiveJobId(jobId);
    setActiveProjectId(projectId);
  };

  const handleInstagramJobCreated = (jobId: string, projectId: string) => {
    setActiveInstagramJobId(jobId);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8 space-y-8">
        <StatsCards />
        
        <ScreenshotTest />
        
        <WebsiteBrandingScraper />
        
        <UploadSection onJobCreated={handleJobCreated} />
        
        {activeJobId && activeProjectId && (
          <ActiveJobMonitor jobId={activeJobId} projectId={activeProjectId} />
        )}
        
        <JobsTable />

        <InstagramScraper />

        {/* Instagram Intelligence Section */}
        <div className="pt-12 border-t-2 border-primary/20">
          <InstagramIntelligenceSection onJobCreated={handleInstagramJobCreated} />
          
          {activeInstagramJobId && (
            <div className="mt-8">
              <ActiveInstagramJobMonitor jobId={activeInstagramJobId} />
            </div>
          )}
          
          <div className="mt-8">
            <InstagramJobsTable />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
