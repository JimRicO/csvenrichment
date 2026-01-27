import { useState } from "react";
import Header from "@/components/Header";
import UploadSection from "@/components/UploadSection";
import StatsCards from "@/components/StatsCards";
import JobsTable from "@/components/JobsTable";
import ActiveJobMonitor from "@/components/ActiveJobMonitor";
import { ScreenshotTest } from "@/components/ScreenshotTest";
import { WebsiteBrandingScraper } from "@/components/WebsiteBrandingScraper";
import InstagramIntelligenceSection from "@/components/InstagramIntelligenceSection";
import InstagramJobsTable from "@/components/InstagramJobsTable";
import ActiveInstagramJobMonitor from "@/components/ActiveInstagramJobMonitor";
import ClubEnrichmentSection from "@/components/ClubEnrichmentSection";
import EnrichmentJobsTable from "@/components/EnrichmentJobsTable";
import ActiveEnrichmentJobMonitor from "@/components/ActiveEnrichmentJobMonitor";

const Index = () => {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeInstagramJobId, setActiveInstagramJobId] = useState<string | null>(null);
  const [activeEnrichmentJobId, setActiveEnrichmentJobId] = useState<string | null>(null);

  const handleJobCreated = (jobId: string, projectId: string) => {
    setActiveJobId(jobId);
    setActiveProjectId(projectId);
  };

  const handleInstagramJobCreated = (jobId: string, projectId: string) => {
    setActiveInstagramJobId(jobId);
  };

  const handleEnrichmentJobCreated = (jobId: string, projectId: string) => {
    setActiveEnrichmentJobId(jobId);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8 space-y-8">
        <StatsCards />
        
        {/* Club Intelligence Enrichment Section */}
        <div className="pt-8 border-t-2 border-primary/20 space-y-8">
          <ClubEnrichmentSection onJobCreated={handleEnrichmentJobCreated} />
          
          {activeEnrichmentJobId && (
            <ActiveEnrichmentJobMonitor jobId={activeEnrichmentJobId} />
          )}
          
          <EnrichmentJobsTable />
        </div>
        
        <ScreenshotTest />
        
        <WebsiteBrandingScraper />
        
        <UploadSection onJobCreated={handleJobCreated} />
        
        {activeJobId && activeProjectId && (
          <ActiveJobMonitor jobId={activeJobId} projectId={activeProjectId} />
        )}
        
        <JobsTable />

        {/* Instagram Intelligence Section */}
        <div className="pt-12 border-t-2 border-primary/20 space-y-8">
          
          <InstagramIntelligenceSection onJobCreated={handleInstagramJobCreated} />
          
          {activeInstagramJobId && (
            <ActiveInstagramJobMonitor jobId={activeInstagramJobId} />
          )}
          
          <InstagramJobsTable />
        </div>
      </main>
    </div>
  );
};

export default Index;
